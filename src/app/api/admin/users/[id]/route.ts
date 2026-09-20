import { AdminAction, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { HttpError, notFound } from "@/lib/auth/guards";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/api";
import { userAdminUpdateSchema } from "@/lib/validation/schemas";
import { destroyAllSessionsForUser } from "@/lib/auth/session";
import { audit, beginAdminMutation } from "@/lib/admin-route";

/**
 * Change a user's role or enabled state.
 *
 * Guard rails: an administrator cannot change their own role or deactivate
 * themselves (which would be an easy way to lock every admin out), and the
 * last remaining active administrator cannot be demoted or disabled.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await beginAdminMutation(request, "admin-user");
    const { id } = await params;
    const input = await parseJsonBody(request, userAdminUpdateSchema);

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, active: true },
    });
    if (!target) throw notFound("That user could not be found.");

    if (target.id === admin.id) {
      throw new HttpError(
        400,
        "You cannot change your own role or deactivate your own account.",
      );
    }

    const losingAdmin =
      target.role === Role.ADMIN &&
      target.active &&
      (input.role !== Role.ADMIN || !input.active);

    if (losingAdmin) {
      const remaining = await prisma.user.count({
        where: { role: Role.ADMIN, active: true, id: { not: target.id } },
      });
      if (remaining === 0) {
        throw new HttpError(
          400,
          "This is the last active administrator. Promote another account first.",
        );
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: input.role, active: input.active },
      select: { id: true, name: true, displayName: true, role: true, active: true },
    });

    // A demoted or deactivated user must not keep an open session.
    if (!input.active || (target.role === Role.ADMIN && input.role !== Role.ADMIN)) {
      await destroyAllSessionsForUser(user.id);
    }

    await audit(
      admin.id,
      AdminAction.UPDATE,
      "User",
      user.id,
      `Set ${user.displayName} to ${user.role}, active=${user.active}`,
    );

    return jsonOk({ ok: true, user });
  } catch (error) {
    return handleApiError(error, "admin/users/update");
  }
}
