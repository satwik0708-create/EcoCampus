import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import {
  assertSameOrigin,
  enforceRateLimit,
  handleApiError,
  jsonOk,
  withCookie,
  parseJsonBody,
} from "@/lib/api";
import { RATE_LIMITS } from "@/lib/auth/rate-limit";
import { registerSchema } from "@/lib/validation/schemas";
import { HttpError } from "@/lib/auth/guards";

/**
 * Student self-registration.
 *
 * The `role` column is never read from the request body — every account
 * created here is a STUDENT. Administrator accounts are provisioned by an
 * existing administrator or by the seed script.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceRateLimit(request, "register", RATE_LIMITS.register);

    const input = await parseJsonBody(request, registerSchema);

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      // Registration is one of the few places where an "email in use" message
      // is unavoidable; the alternative silently locks people out of their own
      // account. The message is generic enough not to confirm a *password*.
      throw new HttpError(409, "An account with that email already exists.", {
        email: ["An account with that email already exists."],
      });
    }

    let departmentId: string | null = null;
    if (input.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: input.departmentId },
        select: { id: true },
      });
      if (!department) {
        throw new HttpError(422, "Please correct the highlighted fields.", {
          departmentId: ["Choose a department from the list."],
        });
      }
      departmentId = department.id;
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        displayName: input.displayName,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: Role.STUDENT,
        course: input.course || null,
        departmentId,
        streak: { create: {} },
      },
      select: { id: true },
    });

    const sessionCookie = await createSession(
      user.id,
      request.headers.get("user-agent"),
    );

    return withCookie(jsonOk({ ok: true, redirectTo: "/student" }, 201), sessionCookie);
  } catch (error) {
    return handleApiError(error, "auth/register");
  }
}
