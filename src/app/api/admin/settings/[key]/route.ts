import { AdminAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "@/lib/auth/guards";
import { handleApiError, jsonOk, parseJsonBody } from "@/lib/api";
import { systemSettingUpdateSchema } from "@/lib/validation/schemas";
import { audit, beginAdminMutation } from "@/lib/admin-route";

/** Update an existing system setting. New keys are added by migration only. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const admin = await beginAdminMutation(request, "admin-setting");
    const { key } = await params;
    const input = await parseJsonBody(request, systemSettingUpdateSchema);

    const existing = await prisma.systemSetting.findUnique({ where: { key } });
    if (!existing) throw notFound("That setting could not be found.");

    const setting = await prisma.systemSetting.update({
      where: { key },
      data: { value: input.value },
    });

    await audit(
      admin.id,
      AdminAction.UPDATE,
      "SystemSetting",
      setting.key,
      `Set ${setting.key} to "${setting.value}"`,
    );
    return jsonOk({ ok: true, setting });
  } catch (error) {
    return handleApiError(error, "admin/settings/update");
  }
}
