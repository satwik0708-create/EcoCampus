import { requireApiStudent } from "@/lib/auth/guards";
import { handleApiError, jsonOk } from "@/lib/api";
import { getRecommendationsFor } from "@/lib/services/recommendations";

/** Deterministic, rule-based recommendations for the signed-in student. */
export async function GET() {
  try {
    const user = await requireApiStudent();
    return jsonOk({ recommendations: await getRecommendationsFor(user.id, 3) });
  } catch (error) {
    return handleApiError(error, "recommendations");
  }
}
