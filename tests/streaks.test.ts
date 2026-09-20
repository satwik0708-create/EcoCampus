import { describe, expect, it } from "vitest";
import {
  computeCurrentStreak,
  computeLongestRun,
  computeStreakState,
  newlyReachedMilestones,
} from "@/lib/streaks/engine";

const TODAY = "2026-05-20";

describe("streak engine", () => {
  it("is zero with no activity", () => {
    expect(computeCurrentStreak([], TODAY)).toBe(0);
    expect(computeStreakState([], TODAY)).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
    });
  });

  it("counts consecutive days ending today", () => {
    const days = ["2026-05-18", "2026-05-19", "2026-05-20"];
    expect(computeCurrentStreak(days, TODAY)).toBe(3);
  });

  it("keeps the streak alive when today has no activity yet", () => {
    // Yesterday counts: the day is not over, so the streak has not lapsed.
    const days = ["2026-05-18", "2026-05-19"];
    expect(computeCurrentStreak(days, TODAY)).toBe(2);
  });

  it("breaks the streak once a full day has been missed", () => {
    // Last activity two days ago — the chain is broken.
    const days = ["2026-05-17", "2026-05-18"];
    expect(computeCurrentStreak(days, TODAY)).toBe(0);
  });

  it("ignores gaps earlier in the history", () => {
    const days = [
      "2026-05-01",
      "2026-05-02",
      // gap
      "2026-05-19",
      "2026-05-20",
    ];
    expect(computeCurrentStreak(days, TODAY)).toBe(2);
  });

  it("de-duplicates several activities on the same day", () => {
    const days = ["2026-05-19", "2026-05-19", "2026-05-20", "2026-05-20"];
    expect(computeCurrentStreak(days, TODAY)).toBe(2);
  });

  it("finds the longest run anywhere in the history", () => {
    const days = [
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
      "2026-04-04", // run of 4
      "2026-05-19",
      "2026-05-20", // run of 2
    ];
    expect(computeLongestRun(days)).toBe(4);
    expect(computeStreakState(days, TODAY).longestStreak).toBe(4);
    expect(computeStreakState(days, TODAY).currentStreak).toBe(2);
  });

  it("never lowers a previously earned longest streak", () => {
    const state = computeStreakState(["2026-05-20"], TODAY, 12);
    expect(state.longestStreak).toBe(12);
    expect(state.currentStreak).toBe(1);
  });

  it("handles a run spanning a month boundary", () => {
    const days = ["2026-04-29", "2026-04-30", "2026-05-01"];
    expect(computeLongestRun(days)).toBe(3);
  });

  it("reports the last activity date", () => {
    const state = computeStreakState(["2026-05-01", "2026-05-20"], TODAY);
    expect(state.lastActivityDate).toBe("2026-05-20");
  });

  it("is recomputed, not incremented — recording twice changes nothing", () => {
    const once = computeStreakState(["2026-05-19", "2026-05-20"], TODAY);
    const twice = computeStreakState(
      ["2026-05-19", "2026-05-20", "2026-05-20"],
      TODAY,
    );
    expect(twice).toEqual(once);
  });

  describe("milestones", () => {
    it("reports only newly crossed milestones", () => {
      expect(newlyReachedMilestones(6, 7)).toEqual([7]);
      expect(newlyReachedMilestones(7, 8)).toEqual([]);
      expect(newlyReachedMilestones(0, 30)).toEqual([7, 14, 30]);
      expect(newlyReachedMilestones(14, 14)).toEqual([]);
    });

    it("reports nothing when the streak resets", () => {
      expect(newlyReachedMilestones(20, 1)).toEqual([]);
    });
  });
});
