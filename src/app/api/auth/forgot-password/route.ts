import { prisma } from "@/lib/db/prisma";
import { createOpaqueToken, hashToken } from "@/lib/auth/tokens";
import { env } from "@/lib/env";
import {
  assertSameOrigin,
  enforceRateLimit,
  handleApiError,
  jsonOk,
  parseJsonBody,
} from "@/lib/api";
import { RATE_LIMITS } from "@/lib/auth/rate-limit";
import { forgotPasswordSchema } from "@/lib/validation/schemas";

/**
 * Password reset request.
 *
 * The response is identical whether or not the email is registered — same
 * body, same status — so this endpoint cannot be used to enumerate accounts.
 *
 * EcoCampus integrates no external email provider by design (the product
 * brief rules out third-party APIs), so the reset URL is written to the
 * server log for an operator to deliver. In development only, and only when
 * ECOCAMPUS_EXPOSE_RESET_TOKENS=true, it is also returned in the response so
 * the flow can be exercised end to end without a mail server.
 */
const GENERIC_RESPONSE = {
  ok: true,
  message:
    "If an account exists for that email, a password reset link has been generated.",
};

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "forgot", RATE_LIMITS.forgotPassword);

    const { email } = await parseJsonBody(request, forgotPasswordSchema);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, active: true },
    });

    if (!user || !user.active) {
      return jsonOk(GENERIC_RESPONSE);
    }

    // Retire any outstanding tokens so only the newest link works.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = createOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });

    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password?token=${token}`;
    console.info(
      `[auth] Password reset link generated for user ${user.id}: ${resetUrl}`,
    );

    if (env.exposeResetTokens) {
      return jsonOk({ ...GENERIC_RESPONSE, devResetUrl: resetUrl });
    }
    return jsonOk(GENERIC_RESPONSE);
  } catch (error) {
    return handleApiError(error, "auth/forgot-password");
  }
}
