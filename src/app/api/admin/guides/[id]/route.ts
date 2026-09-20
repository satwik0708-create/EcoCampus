import { AdminAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/auth/guards";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/api";
import { disposalGuideSchema } from "@/lib/validation/schemas";
import { audit, beginAdminMutation } from "@/lib/admin-route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await beginAdminMutation(request, "admin-guide");
    const { id } = await params;
    const input = await parseJsonBody(request, disposalGuideSchema);

    const existing = await prisma.disposalGuide.findUnique({ where: { id } });
    if (!existing) throw notFound("That guide could not be found.");

    const guide = await prisma.disposalGuide.update({
      where: { id },
      data: {
        item: input.item,
        category: input.category,
        summary: input.summary,
        reduceGuidance: input.reduceGuidance,
        reuseGuidance: input.reuseGuidance,
        recycleGuidance: input.recycleGuidance,
        disposeGuidance: input.disposeGuidance,
        recommendedAction: input.recommendedAction,
        keywords: input.keywords.map((k) => k.toLowerCase()),
        published: input.published,
      },
    });

    await audit(
      admin.id,
      AdminAction.UPDATE,
      "DisposalGuide",
      guide.id,
      `Updated guide "${guide.item}"`,
    );
    return jsonOk({ ok: true, guide });
  } catch (error) {
    return handleApiError(error, "admin/guides/update");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await beginAdminMutation(request, "admin-guide");
    const { id } = await params;

    const existing = await prisma.disposalGuide.findUnique({
      where: { id },
      select: { id: true, item: true },
    });
    if (!existing) throw notFound("That guide could not be found.");

    await prisma.disposalGuide.delete({ where: { id } });
    await audit(
      admin.id,
      AdminAction.DELETE,
      "DisposalGuide",
      existing.id,
      `Deleted guide "${existing.item}"`,
    );
    return jsonOk({ ok: true, message: "Guide deleted." });
  } catch (error) {
    return handleApiError(error, "admin/guides/delete");
  }
}
