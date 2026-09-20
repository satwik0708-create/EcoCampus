import { requireApiStudent } from "@/lib/auth/guards";
import {
  assertSameOrigin,
  enforceRateLimit,
  handleApiError,
  jsonOk,
  parseJsonBody,
  parseQuery,
} from "@/lib/api";
import { RATE_LIMITS } from "@/lib/auth/rate-limit";
import { paginationSchema, wasteRecordSchema } from "@/lib/validation/schemas";
import { recordWasteActivity } from "@/lib/services/activity";
import { listOwnWasteRecords } from "@/lib/services/records";

/** The signed-in student's own waste records. Scoped by session, never by a client-supplied user id. */
export async function GET(request: Request) {
  try {
    const user = await requireApiStudent();
    const { page, pageSize } = parseQuery(request, paginationSchema);
    return jsonOk(await listOwnWasteRecords(user.id, page, pageSize));
  } catch (error) {
    return handleApiError(error, "waste-records/list");
  }
}

/**
 * Record a waste activity.
 *
 * The body carries only what the student observed. Points, streak changes and
 * challenge progress are all computed server-side inside one transaction —
 * there is no field a client could send to grant itself points.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiStudent();
    enforceRateLimit(request, "waste-write", RATE_LIMITS.write, user.id);

    const input = await parseJsonBody(request, wasteRecordSchema);
    const outcome = await recordWasteActivity(user.id, input);

    return jsonOk(outcome, 201);
  } catch (error) {
    return handleApiError(error, "waste-records/create");
  }
}
