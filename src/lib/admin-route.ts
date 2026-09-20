import "server-only";
import { AdminAction } from "@prisma/client";
import { requireApiAdmin } from "@/lib/auth/guards";
import { assertSameOrigin, enforceRateLimit } from "@/lib/api";
import { RATE_LIMITS } from "@/lib/auth/rate-limit";
import { recordAdminActivity } from "@/lib/services/content";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Shared preamble for every admin mutation: same-origin check, administrator
 * role check (resolved from the database, never from the request), and rate
 * limiting. Any handler that forgets one of these simply will not compile
 * against this helper, which is the point.
 */
export async function beginAdminMutation(
  request: Request,
  scope: string,
): Promise<SessionUser> {
  assertSameOrigin(request);
  const admin = await requireApiAdmin();
  await enforceRateLimit(request, scope, RATE_LIMITS.adminWrite, admin.id);
  return admin;
}

export async function audit(
  adminId: string,
  action: AdminAction,
  entityType: string,
  entityId: string,
  summary: string,
): Promise<void> {
  await recordAdminActivity(adminId, action, entityType, entityId, summary);
}

export { AdminAction };
