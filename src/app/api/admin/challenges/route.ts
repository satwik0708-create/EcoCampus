import { AdminAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireApiAdmin } from "@/lib/auth/guards";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/api";
import { challengeInputSchema } from "@/lib/validation/schemas";
import { uniqueSlug } from "@/lib/services/content";
import { campusDayToDate } from "@/lib/time";
import { audit, beginAdminMutation } from "@/lib/admin-route";

export async function GET() {
  try {
    await requireApiAdmin();
    const challenges = await prisma.challenge.findMany({
      orderBy: { startDate: "desc" },
      include: { _count: { select: { participations: true } } },
    });
    return jsonOk({ challenges });
  } catch (error) {
    return handleApiError(error, "admin/challenges/list");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await beginAdminMutation(request, "admin-challenge");
    const input = await parseJsonBody(request, challengeInputSchema);

    const challenge = await prisma.challenge.create({
      data: {
        title: input.title,
        slug: await uniqueSlug("challenge", input.title),
        description: input.description,
        metric: input.metric,
        scope: input.scope,
        wasteCategory: input.wasteCategory ?? null,
        foodCategory: input.foodCategory ?? null,
        disposal: input.disposal ?? null,
        target: input.target,
        targetUnit: input.targetUnit,
        points: input.points,
        startDate: campusDayToDate(input.startDate),
        endDate: campusDayToDate(input.endDate),
        active: input.active,
      },
    });

    await audit(
      admin.id,
      AdminAction.CREATE,
      "Challenge",
      challenge.id,
      `Created challenge "${challenge.title}"`,
    );

    return jsonOk({ ok: true, challenge }, 201);
  } catch (error) {
    return handleApiError(error, "admin/challenges/create");
  }
}
