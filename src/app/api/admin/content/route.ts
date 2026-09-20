import { AdminAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireApiAdmin } from "@/lib/auth/guards";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/api";
import { educationalContentSchema } from "@/lib/validation/schemas";
import { uniqueSlug } from "@/lib/services/content";
import { audit, beginAdminMutation } from "@/lib/admin-route";

export async function GET() {
  try {
    await requireApiAdmin();
    return jsonOk({
      articles: await prisma.educationalContent.findMany({
        orderBy: [{ category: "asc" }, { title: "asc" }],
      }),
    });
  } catch (error) {
    return handleApiError(error, "admin/content/list");
  }
}

export async function POST(request: Request) {
  try {
    const admin = await beginAdminMutation(request, "admin-content");
    const input = await parseJsonBody(request, educationalContentSchema);

    const article = await prisma.educationalContent.create({
      data: {
        title: input.title,
        slug: await uniqueSlug("educationalContent", input.title),
        description: input.description,
        category: input.category,
        content: input.content,
        readMinutes: input.readMinutes,
        published: input.published,
      },
    });

    await audit(
      admin.id,
      AdminAction.CREATE,
      "EducationalContent",
      article.id,
      `Created article "${article.title}"`,
    );
    return jsonOk({ ok: true, article }, 201);
  } catch (error) {
    return handleApiError(error, "admin/content/create");
  }
}
