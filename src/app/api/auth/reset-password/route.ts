import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import { destroyAllSessionsForUser } from "@/lib/auth/session";
import {
  assertSameOrigin,
  enforceRateLimit,
  handleApiError,
  jsonOk,
  parseJsonBody,
} from "@/lib/api";
import { RATE_LIMITS } from "@/lib/auth/rate-limit";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import { HttpError } from "@/lib/auth/guards";

/**
 * Complete a password reset.
 *
 * The token is single use, time limited, and matched by hash. On success
 * every existing session for the account is destroyed, so a reset also
 * evicts an attacker who already had a session.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, "reset", RATE_LIMITS.resetPassword);

    const input = await parseJsonBody(request, resetPasswordSchema);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(input.token) },
      include: { user: { select: { id: true, active: true } } },
    });

    const invalid = new HttpError(
      400,
      "This reset link is invalid or has expired. Request a new one.",
    );

    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw invalid;
    }
    if (!record.user.active) throw invalid;

    const passwordHash = await hashPassword(input.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null },
      }),
    ]);

    await destroyAllSessionsForUser(record.userId);

    return jsonOk({
      ok: true,
      message: "Your password has been updated. Sign in with your new password.",
    });
  } catch (error) {
    return handleApiError(error, "auth/reset-password");
  }
}
