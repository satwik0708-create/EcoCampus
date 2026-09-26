import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { createOpaqueToken, hashToken } from "@/lib/auth/tokens";

/**
 * Server-side session management.
 *
 * The browser only ever holds an opaque random token in an httpOnly cookie.
 * The role, identity and expiry all come from the database on every request —
 * a client can never assert "I am an admin".
 */

/**
 * A cookie for the caller to attach to the response it returns.
 *
 * `createSession` deliberately does NOT write to the ambient `cookies()`
 * store. Relying on Next to merge that store's mutations into a separately
 * constructed `NextResponse` works on a self-hosted Node server but drops the
 * Set-Cookie header on some serverless runtimes — the session is created in
 * the database, the browser never receives it, and the user is bounced back
 * to the sign-in page with no error. Returning the cookie and setting it on
 * the response is explicit and behaves identically everywhere.
 */
export type SessionCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
    expires?: Date;
    maxAge?: number;
  };
};

export type SessionUser = {
  id: string;
  name: string;
  displayName: string;
  email: string;
  role: Role;
  course: string | null;
  departmentId: string | null;
};

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    course: user.course,
    departmentId: user.departmentId,
  };
}

export async function createSession(
  userId: string,
  userAgent?: string | null,
): Promise<SessionCookie> {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 3_600_000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: userAgent?.slice(0, 200) ?? null,
    },
  });

  return {
    name: env.sessionCookieName,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProduction,
      path: "/",
      expires: expiresAt,
    },
  };
}

export async function destroyCurrentSession(): Promise<SessionCookie> {
  const store = await cookies();
  const token = store.get(env.sessionCookieName)?.value;
  if (token) {
    // deleteMany rather than delete: a stale cookie must not throw.
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  // Expire the cookie on the response, for the same reason createSession
  // returns it rather than mutating the ambient store.
  return {
    name: env.sessionCookieName,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProduction,
      path: "/",
      maxAge: 0,
    },
  };
}

/** Invalidate every session for a user (used after a password change/reset). */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * Resolve the signed-in user, or null.
 *
 * Wrapped in React `cache` so a single render that calls this from a layout,
 * a page and several components still performs exactly one query.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(env.sessionCookieName)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  if (!session.user.active) return null;

  return toSessionUser(session.user);
});

/** Best-effort housekeeping; safe to call from any write path. */
export async function pruneExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}
