import { AdminAction, PointReason } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { badRequest, notFound } from "@/lib/auth/guards";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/api";
import { pointsRuleUpdateSchema } from "@/lib/validation/schemas";
import { audit, beginAdminMutation } from "@/lib/admin-route";

/**
 * Tune the points configuration.
 *
 * Only the value and the active flag are editable — the set of rule codes is
 * fixed by the engine, so an administrator cannot invent a reward the server
 * does not know how to award.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const admin = await beginAdminMutation(request, "admin-points-rule");
    const { code } = await params;

    if (!(code in PointReason)) {
      throw badRequest("Unknown points rule.");
    }

    const input = await parseJsonBody(request, pointsRuleUpdateSchema);

    const existing = await prisma.pointsRule.findUnique({
      where: { code: code as PointReason },
    });
    if (!existing) throw notFound("That points rule could not be found.");

    const rule = await prisma.pointsRule.update({
      where: { code: code as PointReason },
      data: { points: input.points, active: input.active },
    });

    await audit(
      admin.id,
      AdminAction.UPDATE,
      "PointsRule",
      rule.id,
      `Set ${rule.code} to ${rule.points} points, active=${rule.active}`,
    );

    return jsonOk({ ok: true, rule });
  } catch (error) {
    return handleApiError(error, "admin/points-rules/update");
  }
}
