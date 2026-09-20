import { AdminAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/auth/guards";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/api";
import { educationalContentSchema } from "@/lib/validation/schemas";
import { audit, beginAdminMutation } from "@/lib/admin-route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await beginAdminMutation(request, "admin-content");
    const { id } = await params;
    const input = await parseJsonBody(request, educationalContentSchema);

    const existing = await prisma.educationalContent.findUnique({ where: { id } });
    if (!existing) throw notFound("That article could not be found.");

    const article = await prisma.educationalContent.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        content: input.content,
        readMinutes: input.readMinutes,
        published: input.published,
      },
    });

    await audit(
      admin.id,
      AdminAction.UPDATE,
      "EducationalContent",
      article.id,
      `Updated article "${article.title}"`,
    );
    return jsonOk({ ok: true, article });
  } catch (error) {
    return handleApiError(error, "admin/content/update");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await beginAdminMutation(request, "admin-content");
    const { id } = await params;

    const existing = await prisma.educationalContent.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!existing) throw notFound("That article could not be found.");

    await prisma.educationalContent.delete({ where: { id } });
    await audit(
      admin.id,
      AdminAction.DELETE,
      "EducationalContent",
      existing.id,
      `Deleted article "${existing.title}"`,
    );
    return jsonOk({ ok: true, message: "Article deleted." });
  } catch (error) {
    return handleApiError(error, "admin/content/delete");
  }
}
