import { describe, expect, it } from "vitest";
import type { Challenge } from "@prisma/client";
import {
  challengeStatus,
  isChallengeOpen,
  progressPercent,
} from "@/lib/challenges/engine";
import { campusDayToDate } from "@/lib/time";

function makeChallenge(
  startDate: string,
  endDate: string,
  active = true,
): Challenge {
  return {
    startDate: campusDayToDate(startDate),
    endDate: campusDayToDate(endDate),
    active,
  } as Challenge;
}

describe("challenge windows", () => {
  const today = "2026-05-20";

  it("is upcoming before the start date", () => {
    expect(challengeStatus(makeChallenge("2026-05-25", "2026-06-01"), today)).toBe(
      "upcoming",
    );
  });

  it("is active inside the window, inclusive of both end days", () => {
    expect(challengeStatus(makeChallenge("2026-05-20", "2026-05-27"), today)).toBe(
      "active",
    );
    expect(challengeStatus(makeChallenge("2026-05-13", "2026-05-20"), today)).toBe(
      "active",
    );
  });

  it("is ended after the end date", () => {
    expect(challengeStatus(makeChallenge("2026-05-01", "2026-05-19"), today)).toBe(
      "ended",
    );
  });

  it("treats a deactivated in-window challenge as ended", () => {
    expect(
      challengeStatus(makeChallenge("2026-05-13", "2026-05-27", false), today),
    ).toBe("ended");
  });

  it("is only open when active and inside the window", () => {
    expect(isChallengeOpen(makeChallenge("2026-05-13", "2026-05-27"), today)).toBe(
      true,
    );
    expect(
      isChallengeOpen(makeChallenge("2026-05-13", "2026-05-27", false), today),
    ).toBe(false);
    expect(isChallengeOpen(makeChallenge("2026-05-25", "2026-06-01"), today)).toBe(
      false,
    );
  });
});

describe("progress percentage", () => {
  it("rounds to a whole percentage", () => {
    expect(progressPercent(1, 3)).toBe(33);
    expect(progressPercent(4, 7)).toBe(57);
  });

  it("caps at 100 when the target is exceeded", () => {
    expect(progressPercent(12, 7)).toBe(100);
  });

  it("is zero for a zero or negative target rather than dividing by zero", () => {
    expect(progressPercent(5, 0)).toBe(0);
    expect(progressPercent(5, -1)).toBe(0);
  });

  it("is zero with no progress", () => {
    expect(progressPercent(0, 7)).toBe(0);
  });
});
