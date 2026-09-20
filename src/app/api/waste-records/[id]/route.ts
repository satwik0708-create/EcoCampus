import { prisma } from "@/lib/db/prisma";
import { assertOwnership, notFound, requireApiStudent } from "@/lib/auth/guards";
import { assertSameOrigin, enforceRateLimit, handleApiError, jsonOk } from "@/lib/api";
import { RATE_LIMITS } from "@/lib/auth/rate-limit";
import { recomputeDerivedState } from "@/lib/services/activity";

/**
 * Delete one of your own waste records.
 *
 * The ownership check is the point of this handler: changing the id in the
 * URL to another student's record returns 404, and nothing is deleted.
 * Points already earned stay on the ledger (it is append-only and audited);
 * the streak and challenge progress are recomputed from what remains.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireApiStudent();
    await enforceRateLimit(request, "waste-delete", RATE_LIMITS.write, user.id);

    const { id } = await params;
    const record = await prisma.wasteRecord.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!record) throw notFound("That record could not be found.");
    assertOwnership(record.userId, user);

    await prisma.wasteRecord.delete({ where: { id: record.id } });
    await recomputeDerivedState(user.id);

    return jsonOk({ ok: true, message: "Record deleted." });
  } catch (error) {
    return handleApiError(error, "waste-records/delete");
  }
}
