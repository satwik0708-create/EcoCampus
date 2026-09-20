import { AdminAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireApiAdmin } from "@/lib/auth/guards";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/api";
import { disposalGuideSchema } from "@/lib/validation/schemas";
import { uniqueSlug } from "@/lib/services/content";
import { audit, beginAdminMutation } from "@/lib/admin-route";

export async function GET() {
  try {
    await requireApiAdmin();
    return jsonOk({
      guides: await prisma.disposalGuide.findMany({
        orderBy: [{ category: "asc" }, { item: "asc" }],
      }),
    });
  } catch (error) {
    return handleApiError(error, "admin/guides/list");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await beginAdminMutation(request, "admin-guide");
    const input = await parseJsonBody(request, disposalGuideSchema);

    const guide = await prisma.disposalGuide.create({
      data: {
        item: input.item,
        slug: await uniqueSlug("disposalGuide", input.item),
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
      AdminAction.CREATE,
      "DisposalGuide",
      guide.id,
      `Created guide "${guide.item}"`,
    );
    return jsonOk({ ok: true, guide }, 201);
  } catch (error) {
    return handleApiError(error, "admin/guides/create");
  }
}
