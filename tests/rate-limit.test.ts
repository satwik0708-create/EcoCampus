import { beforeEach, describe, expect, it } from "vitest";
import { RATE_LIMITS, rateLimit, resetRateLimits } from "@/lib/auth/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => resetRateLimits());

  it("allows requests up to the limit and blocks the next one", () => {
    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit("key", 3, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit("key", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each key independently", () => {
    rateLimit("a", 1, 60_000);
    expect(rateLimit("a", 1, 60_000).allowed).toBe(false);
    expect(rateLimit("b", 1, 60_000).allowed).toBe(true);
  });

  it("reports the remaining allowance", () => {
    expect(rateLimit("k", 3, 60_000).remaining).toBe(2);
    expect(rateLimit("k", 3, 60_000).remaining).toBe(1);
    expect(rateLimit("k", 3, 60_000).remaining).toBe(0);
  });

  it("resets once the window has elapsed", async () => {
    expect(rateLimit("short", 1, 20).allowed).toBe(true);
    expect(rateLimit("short", 1, 20).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(rateLimit("short", 1, 20).allowed).toBe(true);
  });

  it("configures a strict limit on sign-in", () => {
    // Sign-in must be meaningfully harder to brute force than a normal write.
    expect(RATE_LIMITS.login.limit).toBeLessThan(RATE_LIMITS.write.limit);
    expect(RATE_LIMITS.login.windowMs).toBeGreaterThan(RATE_LIMITS.write.windowMs);
  });
});
