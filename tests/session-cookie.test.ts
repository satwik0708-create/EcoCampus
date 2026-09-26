import { describe, expect, it } from "vitest";

import {
  DEFAULT_SESSION_COOKIE_NAME,
  resolveSessionCookieName,
} from "@/lib/session-cookie";

/**
 * Regression tests for a production incident: SESSION_COOKIE_NAME was set to
 * an empty string, `??` accepted it, and every sign-in emitted
 * `Set-Cookie: =<token>; ...`. Browsers discard a nameless cookie without
 * reporting anything, so the API returned 200, the session row was written,
 * and the user was bounced back to /login with no error to go on.
 */
describe("resolveSessionCookieName", () => {
  it("falls back when the variable is absent", () => {
    expect(resolveSessionCookieName(undefined)).toBe(DEFAULT_SESSION_COOKIE_NAME);
    expect(resolveSessionCookieName(null)).toBe(DEFAULT_SESSION_COOKIE_NAME);
  });

  it("treats an empty or whitespace-only value as absent, not as a name", () => {
    for (const blank of ["", " ", "   ", "\t", "\n"]) {
      expect(resolveSessionCookieName(blank)).toBe(DEFAULT_SESSION_COOKIE_NAME);
    }
  });

  it("never returns an empty name for any input it accepts", () => {
    for (const raw of [undefined, null, "", "  ", "custom_session", " padded "]) {
      expect(resolveSessionCookieName(raw).length).toBeGreaterThan(0);
    }
  });

  it("uses a configured name, trimmed", () => {
    expect(resolveSessionCookieName("custom_session")).toBe("custom_session");
    expect(resolveSessionCookieName("  custom_session  ")).toBe("custom_session");
  });

  it("rejects values that cannot be used as a cookie name", () => {
    // Each of these would produce a malformed Set-Cookie header rather than a
    // cookie the browser stores.
    for (const bad of ["has space", "has=equals", "has;semicolon", 'has"quote', "has,comma"]) {
      expect(() => resolveSessionCookieName(bad)).toThrow(/SESSION_COOKIE_NAME/);
    }
  });
});
