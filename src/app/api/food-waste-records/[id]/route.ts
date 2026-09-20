import { prisma } from "@/lib/db/prisma";
import { assertOwnership, notFound, requireApiStudent } from "@/lib/auth/guards";
import { assertSameOrigin, enforceRateLimit, handleApiError, jsonOk } from "@/lib/api";
import { RATE_LIMITS } from "@/lib/auth/rate-limit";
import { recomputeDerivedState } from "@/lib/services/activity";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireApiStudent();
    await enforceRateLimit(request, "food-delete", RATE_LIMITS.write, user.id);

    const { id } = await params;
    const record = await prisma.foodWasteRecord.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!record) throw notFound("That record could not be found.");
    assertOwnership(record.userId, user);

    await prisma.foodWasteRecord.delete({ where: { id: record.id } });
    await recomputeDerivedState(user.id);

    return jsonOk({ ok: true, message: "Record deleted." });
  } catch (error) {
    return handleApiError(error, "food-waste-records/delete");
  }
}
