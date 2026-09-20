import { AdminAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/auth/guards";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/api";
import { challengeInputSchema } from "@/lib/validation/schemas";
import { campusDayToDate } from "@/lib/time";
import { audit, beginAdminMutation } from "@/lib/admin-route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await beginAdminMutation(request, "admin-challenge");
    const { id } = await params;
    const input = await parseJsonBody(request, challengeInputSchema);

    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (!existing) throw notFound("That challenge could not be found.");

    const challenge = await prisma.challenge.update({
      where: { id },
      data: {
        title: input.title,
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
      AdminAction.UPDATE,
      "Challenge",
      challenge.id,
      `Updated challenge "${challenge.title}"`,
    );

    return jsonOk({ ok: true, challenge });
  } catch (error) {
    return handleApiError(error, "admin/challenges/update");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await beginAdminMutation(request, "admin-challenge");
    const { id } = await params;

    const existing = await prisma.challenge.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!existing) throw notFound("That challenge could not be found.");

    // Participations cascade; the point ledger does not, so students keep the
    // points they legitimately earned before the challenge was withdrawn.
    await prisma.challenge.delete({ where: { id } });

    await audit(
      admin.id,
      AdminAction.DELETE,
      "Challenge",
      existing.id,
      `Deleted challenge "${existing.title}"`,
    );

    return jsonOk({ ok: true, message: "Challenge deleted." });
  } catch (error) {
    return handleApiError(error, "admin/challenges/delete");
  }
}
