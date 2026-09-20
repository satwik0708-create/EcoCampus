import "server-only";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";

/**
 * Authorization guards.
 *
 * These run on the server for every protected page and every mutating API
 * route. `src/middleware.ts` only performs a cheap cookie-presence redirect
 * for UX — it is never the security boundary, because a cookie's *existence*
 * says nothing about who owns it or what role they have.
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const unauthorized = (msg = "You need to sign in to do that.") =>
  new HttpError(401, msg);

export const forbidden = (msg = "You do not have access to this resource.") =>
  new HttpError(403, msg);

export const notFound = (msg = "That resource could not be found.") =>
  new HttpError(404, msg);

export const badRequest = (msg: string, details?: unknown) =>
  new HttpError(400, msg, details);

export const tooManyRequests = (msg: string) => new HttpError(429, msg);

// --- Page guards (redirect) ------------------------------------------------

export async function requirePageUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePageStudent(): Promise<SessionUser> {
  const user = await requirePageUser();
  // Admins are bounced to their own console rather than shown a student view;
  // there is deliberately no shared "generic dashboard".
  if (user.role !== Role.STUDENT) redirect("/admin");
  return user;
}

export async function requirePageAdmin(): Promise<SessionUser> {
  const user = await requirePageUser();
  if (user.role !== Role.ADMIN) redirect("/student");
  return user;
}

// --- API guards (throw) ----------------------------------------------------

export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requireApiStudent(): Promise<SessionUser> {
  const user = await requireApiUser();
  if (user.role !== Role.STUDENT) {
    throw forbidden("This action is only available to student accounts.");
  }
  return user;
}

export async function requireApiAdmin(): Promise<SessionUser> {
  const user = await requireApiUser();
  if (user.role !== Role.ADMIN) throw forbidden("Administrator access required.");
  return user;
}

/**
 * Ownership check for per-record routes.
 *
 * Admins are NOT silently granted access here: student records are private,
 * and the admin console only ever reads them through aggregate/analytics
 * queries, never through the student-facing endpoints.
 */
export function assertOwnership(resourceUserId: string, actor: SessionUser): void {
  if (resourceUserId !== actor.id) {
    // 404 rather than 403 so that probing IDs cannot confirm a record exists.
    throw notFound("That record could not be found.");
  }
}
