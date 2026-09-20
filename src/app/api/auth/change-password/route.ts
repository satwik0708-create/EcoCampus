import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireApiUser } from "@/lib/auth/guards";
import { createSession, destroyAllSessionsForUser } from "@/lib/auth/session";
import {
  assertSameOrigin,
  enforceRateLimit,
  handleApiError,
  jsonOk,
  parseJsonBody,
} from "@/lib/api";
import { RATE_LIMITS } from "@/lib/auth/rate-limit";
import { changePasswordSchema } from "@/lib/validation/schemas";
import { HttpError } from "@/lib/auth/guards";

/** Change your own password. Requires the current one; rotates all sessions. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireApiUser();
    enforceRateLimit(request, "change-password", RATE_LIMITS.resetPassword, actor.id);

    const input = await parseJsonBody(request, changePasswordSchema);

    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { passwordHash: true },
    });
    if (!user) throw new HttpError(401, "You need to sign in to do that.");

    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new HttpError(400, "Your current password is incorrect.", {
        currentPassword: ["Your current password is incorrect."],
      });
    }

    await prisma.user.update({
      where: { id: actor.id },
      data: { passwordHash: await hashPassword(input.password) },
    });

    // Evict every session, then re-issue one for this browser so the user is
    // not signed out of the tab they are actively using.
    await destroyAllSessionsForUser(actor.id);
    await createSession(actor.id, request.headers.get("user-agent"));

    return jsonOk({
      ok: true,
      message: "Password updated. Other devices have been signed out.",
    });
  } catch (error) {
    return handleApiError(error, "auth/change-password");
  }
}
