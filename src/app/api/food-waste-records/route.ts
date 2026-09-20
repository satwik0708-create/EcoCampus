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
import { foodWasteRecordSchema, paginationSchema } from "@/lib/validation/schemas";
import { recordFoodWasteActivity } from "@/lib/services/activity";
import { listOwnFoodWasteRecords } from "@/lib/services/records";

export async function GET(request: Request) {
  try {
    const user = await requireApiStudent();
    const { page, pageSize } = parseQuery(request, paginationSchema);
    return jsonOk(await listOwnFoodWasteRecords(user.id, page, pageSize));
  } catch (error) {
    return handleApiError(error, "food-waste-records/list");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiStudent();
    await enforceRateLimit(request, "food-write", RATE_LIMITS.write, user.id);

    const input = await parseJsonBody(request, foodWasteRecordSchema);
    const outcome = await recordFoodWasteActivity(user.id, input);

    return jsonOk(outcome, 201);
  } catch (error) {
    return handleApiError(error, "food-waste-records/create");
  }
}
