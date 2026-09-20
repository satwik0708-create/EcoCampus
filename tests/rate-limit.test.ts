import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  RATE_LIMITS,
  rateLimit,
  rateLimitBackend,
  resetRateLimitBackend,
  resetRateLimits,
} from "@/lib/auth/rate-limit";

/**
 * These exercise the in-memory backend, which is what runs when Redis is not
 * configured — local development, CI, and any single-process deployment.
 * The Redis path is covered separately below at the level this suite can
 * verify without standing up an Upstash instance: that it is selected only
 * when both variables are present, and that the in-memory semantics it
 * mirrors are the ones asserted here.
 */
describe("rate limiter (in-memory backend)", () => {
  beforeEach(() => {
    resetRateLimits();
    resetRateLimitBackend();
  });

  it("uses the in-memory backend when Redis is not configured", () => {
    expect(rateLimitBackend()).toBe("memory");
  });

  it("allows requests up to the limit and blocks the next one", async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await rateLimit("key", 3, 60_000)).allowed).toBe(true);
    }
    const blocked = await rateLimit("key", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each key independently", async () => {
    await rateLimit("a", 1, 60_000);
    expect((await rateLimit("a", 1, 60_000)).allowed).toBe(false);
    expect((await rateLimit("b", 1, 60_000)).allowed).toBe(true);
  });

  it("reports the remaining allowance", async () => {
    expect((await rateLimit("k", 3, 60_000)).remaining).toBe(2);
    expect((await rateLimit("k", 3, 60_000)).remaining).toBe(1);
    expect((await rateLimit("k", 3, 60_000)).remaining).toBe(0);
  });

  it("never reports a negative allowance once blocked", async () => {
    await rateLimit("neg", 1, 60_000);
    for (let i = 0; i < 3; i += 1) {
      expect((await rateLimit("neg", 1, 60_000)).remaining).toBe(0);
    }
  });

  it("resets once the window has elapsed", async () => {
    expect((await rateLimit("short", 1, 20)).allowed).toBe(true);
    expect((await rateLimit("short", 1, 20)).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect((await rateLimit("short", 1, 20)).allowed).toBe(true);
  });

  it("configures a strict limit on sign-in", () => {
    // Sign-in must be meaningfully harder to brute force than a normal write.
    expect(RATE_LIMITS.login.limit).toBeLessThan(RATE_LIMITS.write.limit);
    expect(RATE_LIMITS.login.windowMs).toBeGreaterThan(RATE_LIMITS.write.windowMs);
  });
});

describe("backend selection", () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  afterEach(() => {
    if (url === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = url;
    if (token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = token;
    resetRateLimitBackend();
    resetRateLimits();
  });

  it("selects Redis only when BOTH variables are present", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetRateLimitBackend();
    // A half-configured deployment must not silently believe it is protected.
    expect(rateLimitBackend()).toBe("memory");

    delete process.env.UPSTASH_REDIS_REST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    resetRateLimitBackend();
    expect(rateLimitBackend()).toBe("memory");

    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    resetRateLimitBackend();
    expect(rateLimitBackend()).toBe("redis");
  });

  it("keeps serving, via the in-memory backend, when Redis is unreachable", async () => {
    // Points at a host that cannot answer, so the Redis call rejects.
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:1";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    resetRateLimitBackend();
    expect(rateLimitBackend()).toBe("redis");

    // Falling back is the deliberate choice: a limiter that takes the whole
    // application down with its cache is worse than a weaker limiter.
    const first = await rateLimit("unreachable", 2, 60_000);
    expect(first.allowed).toBe(true);

    await rateLimit("unreachable", 2, 60_000);
    const third = await rateLimit("unreachable", 2, 60_000);
    expect(third.allowed).toBe(false);
  }, 30_000);

  it("gives up on an unreachable Redis quickly", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:1";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    resetRateLimitBackend();

    // Regression guard. The client's default retry policy spent ~13 seconds
    // here before the fallback ran, which on a sign-in endpoint means every
    // request hangs that long while the cache is down. The limiter must
    // never be the slowest thing in the request.
    const started = Date.now();
    await rateLimit("slow", 5, 60_000);
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(3_000);
  }, 30_000);
});
