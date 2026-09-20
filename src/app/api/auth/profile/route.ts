import { prisma } from "@/lib/db/prisma";
import { requireApiUser } from "@/lib/auth/guards";
import {
  assertSameOrigin,
  enforceRateLimit,
  handleApiError,
  jsonOk,
  parseJsonBody,
} from "@/lib/api";
import { RATE_LIMITS } from "@/lib/auth/rate-limit";
import { updateProfileSchema } from "@/lib/validation/schemas";
import { HttpError } from "@/lib/auth/guards";

/**
 * Update the signed-in user's own profile.
 *
 * `role`, `email` and `active` are intentionally absent from the schema: a
 * user cannot promote themselves by adding a field to the request body.
 */
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiUser();
    await enforceRateLimit(request, "profile", RATE_LIMITS.write, user.id);

    const input = await parseJsonBody(request, updateProfileSchema);

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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        displayName: input.displayName,
        course: input.course || null,
        departmentId,
      },
    });

    return jsonOk({ ok: true, message: "Profile updated." });
  } catch (error) {
    return handleApiError(error, "auth/profile");
  }
}
