import { requireApiStudent } from "@/lib/auth/guards";
import { handleApiError, jsonOk } from "@/lib/api";
import { getChallengesForStudent } from "@/lib/services/challenges";

export async function GET() {
  try {
    const user = await requireApiStudent();
    return jsonOk({ challenges: await getChallengesForStudent(user.id) });
  } catch (error) {
    return handleApiError(error, "challenges/list");
  }
}
