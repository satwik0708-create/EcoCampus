import { HttpError, requireApiStudent } from "@/lib/auth/guards";
import { assertSameOrigin, enforceRateLimit, handleApiError, jsonOk } from "@/lib/api";
import { RATE_LIMITS } from "@/lib/auth/rate-limit";
import { joinChallenge, leaveChallenge } from "@/lib/services/challenges";

/**
 * Join a challenge.
 *
 * Note what this endpoint does NOT accept: a progress value or a completion
 * flag. Progress is measured from the student's real records, both here and
 * on every subsequent activity.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireApiStudent();
    enforceRateLimit(request, "challenge-join", RATE_LIMITS.write, user.id);

    const { id } = await params;
    const result = await joinChallenge(user.id, id);

    return jsonOk({
      ok: true,
      ...result,
      message: result.joined
        ? "You have joined this challenge."
        : "You are already taking part in this challenge.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CHALLENGE_NOT_FOUND") {
      return handleApiError(
        new HttpError(404, "That challenge could not be found."),
        "challenges/join",
      );
    }
    if (error instanceof Error && error.message === "CHALLENGE_CLOSED") {
      return handleApiError(
        new HttpError(400, "This challenge is no longer open to new participants."),
        "challenges/join",
      );
    }
    return handleApiError(error, "challenges/join");
  }
}

/** Leave a challenge you have not completed. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await requireApiStudent();
    enforceRateLimit(request, "challenge-leave", RATE_LIMITS.write, user.id);

    const { id } = await params;
    await leaveChallenge(user.id, id);
    return jsonOk({ ok: true, message: "You have left this challenge." });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_JOINED") {
      return handleApiError(
        new HttpError(404, "You are not taking part in this challenge."),
        "challenges/leave",
      );
    }
    if (error instanceof Error && error.message === "ALREADY_COMPLETED") {
      return handleApiError(
        new HttpError(400, "You cannot leave a challenge you have completed."),
        "challenges/leave",
      );
    }
    return handleApiError(error, "challenges/leave");
  }
}
