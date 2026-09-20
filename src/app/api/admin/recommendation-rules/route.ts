import { AdminAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireApiAdmin } from "@/lib/auth/guards";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/api";
import { recommendationRuleSchema } from "@/lib/validation/schemas";
import { audit, beginAdminMutation } from "@/lib/admin-route";

export async function GET() {
  try {
    await requireApiAdmin();
    return jsonOk({
      rules: await prisma.recommendationRule.findMany({
        orderBy: [{ priority: "asc" }, { code: "asc" }],
      }),
    });
  } catch (error) {
    return handleApiError(error, "admin/recommendation-rules/list");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await beginAdminMutation(request, "admin-reco-rule");
    const input = await parseJsonBody(request, recommendationRuleSchema);

    const rule = await prisma.recommendationRule.create({
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
      AdminAction.CREATE,
      "RecommendationRule",
      rule.id,
      `Created recommendation rule ${rule.code}`,
    );
    return jsonOk({ ok: true, rule }, 201);
  } catch (error) {
    return handleApiError(error, "admin/recommendation-rules/create");
  }
}
