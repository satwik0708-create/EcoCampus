import "server-only";

/**
 * Fixed-window rate limiter held in process memory.
 *
 * Scope and limitation, stated plainly: this protects a single Node process.
 * A horizontally scaled deployment needs a shared store (Redis) or an edge
 * rate limit in front of the app — see the Deployment section of README.md.
 * It is included because "no limiter at all" is a worse default than
 * "limiter that covers the common single-instance deployment".
 */

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

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
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

/** Test/maintenance hook. */
export function resetRateLimits(): void {
  buckets.clear();
}

export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 10 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  forgotPassword: { limit: 5, windowMs: 60 * 60_000 },
  resetPassword: { limit: 8, windowMs: 60 * 60_000 },
  write: { limit: 60, windowMs: 60_000 },
  adminWrite: { limit: 120, windowMs: 60_000 },
} as const;
