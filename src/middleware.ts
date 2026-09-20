import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware.
 *
 * One job: a cheap UX redirect that bounces anonymous visitors away from
 * /student and /admin before a full server render happens.
 *
 * This is NOT a security control. The middleware only sees that *a* cookie
 * exists — not whose it is, whether it is still valid, or what role it
 * carries. Every protected page and every API route independently resolves
 * the session against the database and checks the role (see
 * `src/lib/auth/guards.ts`). Forging a cookie value here buys an attacker
 * nothing beyond a redirect to /login one layer down.
 *
 * Security headers, including the CSP, are set in next.config.ts so they
 * apply uniformly to static and dynamic responses alike.
 */

const PROTECTED_PREFIXES = ["/student", "/admin"];
const AUTH_PAGES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const cookieName = process.env.SESSION_COOKIE_NAME ?? "ecocampus_session";
  const hasSessionCookie = Boolean(request.cookies.get(cookieName)?.value);
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Signed-in users have no use for the login/register screens. The landing
  // page stays reachable so they can still read the public material.
  if (hasSessionCookie && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/redirect";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except Next's own static output, the favicon and the image
     * optimiser — none of which need session logic.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)",
  ],
};
