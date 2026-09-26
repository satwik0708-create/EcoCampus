/**
 * Resolution of the session cookie's *name*.
 *
 * This lives on its own, without `import "server-only"`, because two callers
 * that must never disagree need it: `src/lib/env.ts` (which writes the cookie)
 * and `src/middleware.ts` (which runs on the edge runtime and reads it). If
 * they resolve different names the writer sets a cookie the reader cannot see,
 * and every sign-in ends in a redirect back to /login.
 *
 * It is also deliberately strict about what counts as "not set". An empty or
 * whitespace-only `SESSION_COOKIE_NAME` is a misconfiguration, not a name:
 * `??` alone accepts `""`, which produces the header
 *
 *     Set-Cookie: =<token>; Path=/; Secure; HttpOnly; SameSite=lax
 *
 * with no name before the `=`. That is not a valid cookie, so browsers discard
 * it silently — the API answers 200, no error appears anywhere, and the user
 * is simply never signed in. This module exists so that failure mode cannot
 * come back.
 */

export const DEFAULT_SESSION_COOKIE_NAME = "ecocampus_session";

/**
 * RFC 6265 `cookie-name` is an RFC 7230 token: no spaces, no control
 * characters, and none of the separators (`=`, `;`, `,`, quotes, brackets...).
 */
const COOKIE_NAME_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/**
 * Returns the configured cookie name, falling back to the default when the
 * variable is absent or blank.
 *
 * Throws when a value *is* supplied but cannot be used as a cookie name. That
 * is louder than falling back — a 500 naming the variable is diagnosable,
 * whereas quietly using a different name than the operator configured is the
 * kind of bug that reads as "sign-in does nothing and reports no error".
 */
export function resolveSessionCookieName(raw: string | undefined | null): string {
  if (raw === undefined || raw === null || raw.trim() === "") {
    return DEFAULT_SESSION_COOKIE_NAME;
  }

  const name = raw.trim();
  if (!COOKIE_NAME_TOKEN.test(name)) {
    throw new Error(
      `SESSION_COOKIE_NAME must be a valid cookie name (letters, digits, and ` +
        `any of !#$%&'*+-.^_\`|~ — no spaces, quotes, "=" or ";"). ` +
        `Received ${JSON.stringify(raw)}. Unset the variable to use ` +
        `"${DEFAULT_SESSION_COOKIE_NAME}".`,
    );
  }
  return name;
}
