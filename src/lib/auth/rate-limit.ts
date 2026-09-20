import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting, with two backends.
 *
 * **Redis (distributed)** — used when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are both set. Counters are shared across every
 * instance of the application, which is the only arrangement that actually
 * works on a serverless platform: there, each invocation may land on a fresh
 * instance, so a per-process counter lets an attacker multiply their budget
 * by spreading requests across cold starts.
 *
 * **In-memory (per process)** — the fallback when Redis is not configured.
 * Correct and sufficient for local development, for the test suite, and for
 * a single long-lived Node server. On a multi-instance deployment it
 * degrades to a per-instance limit, which is why the Redis path exists.
 *
 * The backend is chosen once, lazily, from the environment. Nothing else in
 * the codebase needs to know which one is active.
 *
 * Note on scope: Redis here is infrastructure, in the same category as
 * PostgreSQL. It is not a data or intelligence service, and it does not
 * affect the product's rule-based, deterministic behaviour.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimitBackend = "redis" | "memory";

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

// ---------------------------------------------------------------------------
// Redis backend
// ---------------------------------------------------------------------------

/**
 * One Ratelimit instance per (limit, window) pair.
 *
 * `@upstash/ratelimit` applies the window atomically with a Lua script, which
 * a hand-rolled INCR-then-EXPIRE cannot guarantee: if the EXPIRE is lost, the
 * key never resets and the caller is locked out permanently.
 */
const limiters = new Map<string, Ratelimit>();
let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redis = null;
    return redis;
  }

  redis = new Redis({
    url,
    token,
    // One quick retry absorbs a transient blip. Beyond that the timeout
    // below takes over — the default policy retries for many seconds, which
    // on a sign-in endpoint means the user waits that long before the
    // fallback even begins.
    retry: { retries: 1, backoff: () => 50 },
  });
  return redis;
}

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;

  const cacheKey = `${limit}:${windowMs}`;
  const existing = limiters.get(cacheKey);
  if (existing) return existing;

  const created = new Ratelimit({
    redis: client,
    // Fixed window, matching the in-memory backend's semantics so behaviour
    // does not change when Redis is switched on.
    limiter: Ratelimit.fixedWindow(limit, `${windowMs} ms`),
    prefix: "ecocampus:rl",
    analytics: false,
  });
  limiters.set(cacheKey, created);
  return created;
}

/**
 * How long to wait for Redis before giving up and using the local counter.
 *
 * A rate limiter must never become the slowest thing in the request. If the
 * store is unreachable, spending seconds discovering that turns a degraded
 * cache into a degraded application, so the wait is bounded tightly: a
 * healthy Upstash round trip is single-digit milliseconds.
 */
const REDIS_TIMEOUT_MS = 1_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Redis did not respond within ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** Which backend is in use. Exposed for diagnostics and for the tests. */
export function rateLimitBackend(): RateLimitBackend {
  return getRedis() ? "redis" : "memory";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const limiter = getLimiter(limit, windowMs);

  if (!limiter) {
    return memoryRateLimit(key, limit, windowMs);
  }

  try {
    const result = await withTimeout(limiter.limit(key), REDIS_TIMEOUT_MS);
    return {
      allowed: result.success,
      remaining: Math.max(0, result.remaining),
      retryAfterSeconds: result.success
        ? 0
        : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch (error) {
    // Redis is unreachable. Fail CLOSED for the caller's safety? No — that
    // would take the whole application down with the cache. Fall back to the
    // in-memory counter instead: weaker than Redis, but strictly better than
    // no limit at all, and the application keeps serving.
    console.error(
      "[rate-limit] Redis unavailable, falling back to the in-memory counter:",
      error instanceof Error ? error.message : error,
    );
    return memoryRateLimit(key, limit, windowMs);
  }
}

/** Test and maintenance hook. Clears the in-memory buckets only. */
export function resetRateLimits(): void {
  buckets.clear();
}

/** Test hook: drop the cached backend so the environment is re-read. */
export function resetRateLimitBackend(): void {
  redis = undefined;
  limiters.clear();
}

export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 10 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  forgotPassword: { limit: 5, windowMs: 60 * 60_000 },
  resetPassword: { limit: 8, windowMs: 60 * 60_000 },
  write: { limit: 60, windowMs: 60_000 },
  adminWrite: { limit: 120, windowMs: 60_000 },
} as const;
