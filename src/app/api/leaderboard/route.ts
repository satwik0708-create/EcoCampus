import { requireApiUser } from "@/lib/auth/guards";
import { handleApiError, jsonOk } from "@/lib/api";
import { getLeaderboard } from "@/lib/services/leaderboard";

/**
 * Campus leaderboard. Requires a session — the rankings are not public — and
 * exposes only display names and aggregate figures.
 */
export async function GET() {
  try {
    const user = await requireApiUser();
    return jsonOk(await getLeaderboard(user.id));
  } catch (error) {
    return handleApiError(error, "leaderboard");
  }
}
