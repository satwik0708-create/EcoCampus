import { AdminAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/auth/guards";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/api";
import { recommendationRuleSchema } from "@/lib/validation/schemas";
import { audit, beginAdminMutation } from "@/lib/admin-route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await beginAdminMutation(request, "admin-reco-rule");
    const { id } = await params;
    const input = await parseJsonBody(request, recommendationRuleSchema);

    const existing = await prisma.recommendationRule.findUnique({ where: { id } });
    if (!existing) throw notFound("That rule could not be found.");

    const rule = await prisma.recommendationRule.update({
      where: { id },
      data: {
        code: input.code,
        trigger: input.trigger,
        priority: input.priority,
        matchWasteCategory: input.matchWasteCategory ?? null,
        matchFoodCategory: input.matchFoodCategory ?? null,
        threshold: input.threshold ?? null,
        windowDays: input.windowDays ?? null,
        title: input.title,
        message: input.message,
        actionLabel: input.actionLabel || null,
        actionHref: input.actionHref || null,
        active: input.active,
      },
    });

    await audit(
      admin.id,
      AdminAction.UPDATE,
      "RecommendationRule",
      rule.id,
      `Updated recommendation rule ${rule.code}`,
    );
    return jsonOk({ ok: true, rule });
  } catch (error) {
    return handleApiError(error, "admin/recommendation-rules/update");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await beginAdminMutation(request, "admin-reco-rule");
    const { id } = await params;

    const existing = await prisma.recommendationRule.findUnique({
      where: { id },
      select: { id: true, code: true },
    });
    if (!existing) throw notFound("That rule could not be found.");

    await prisma.recommendationRule.delete({ where: { id } });
    await audit(
      admin.id,
      AdminAction.DELETE,
      "RecommendationRule",
      existing.id,
      `Deleted recommendation rule ${existing.code}`,
    );
    return jsonOk({ ok: true, message: "Rule deleted." });
  } catch (error) {
    return handleApiError(error, "admin/recommendation-rules/delete");
  }
}
