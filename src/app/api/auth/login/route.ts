import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { fakeVerifyPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, pruneExpiredSessions } from "@/lib/auth/session";
import {
  assertSameOrigin,
  enforceRateLimit,
  handleApiError,
  jsonOk,
  parseJsonBody,
} from "@/lib/api";
import { RATE_LIMITS } from "@/lib/auth/rate-limit";
import { loginSchema } from "@/lib/validation/schemas";
import { HttpError } from "@/lib/auth/guards";

/** The one message returned for every failed sign-in, whatever went wrong. */
const GENERIC_FAILURE = "Email or password is incorrect.";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = await parseJsonBody(request, loginSchema);

    // Limit per client AND per targeted account, so one attacker cannot
    // spread a password-spray across many IPs against a single mailbox.
    enforceRateLimit(request, "login", RATE_LIMITS.login);
    enforceRateLimit(request, "login-account", RATE_LIMITS.login, input.email);

    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      // Spend comparable time so response latency does not reveal whether the
      // address is registered.
      await fakeVerifyPassword(input.password);
      throw new HttpError(401, GENERIC_FAILURE);
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid || !user.active) {
      throw new HttpError(401, GENERIC_FAILURE);
    }

    await createSession(user.id, request.headers.get("user-agent"));
    void pruneExpiredSessions().catch(() => undefined);

    return jsonOk({
      ok: true,
      redirectTo: user.role === Role.ADMIN ? "/admin" : "/student",
    });
  } catch (error) {
    return handleApiError(error, "auth/login");
  }
}
