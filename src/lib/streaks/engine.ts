import type { CampusDay } from "@/lib/time";
import { addDays, daysBetween } from "@/lib/time";
import { STREAK_MILESTONES } from "@/lib/rules/catalog";

/**
 * Streak engine (pure functions — no database, fully unit tested).
 *
 * Definition: a streak is the run of consecutive *campus* calendar days on
 * which the student recorded at least one qualifying activity, ending today
 * or yesterday. Today is included while it is still in progress; a streak
 * that last saw activity two or more days ago is broken and reads 0.
 *
 * The streak is always DERIVED from the set of days that actually have
 * records — it is never a counter that gets incremented. That makes it
 * correct when a student backdates an entry, deletes one, or logs several
 * activities in a day, and it cannot drift.
 */

export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: CampusDay | null;
};

function uniqueSortedDays(days: CampusDay[]): CampusDay[] {
  return [...new Set(days)].sort();
}

/** Longest run of consecutive days anywhere in the history. */
export function computeLongestRun(activityDays: CampusDay[]): number {
  const days = uniqueSortedDays(activityDays);
  if (days.length === 0) return 0;

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    const prev = days[i - 1]!;
    const current = days[i]!;
    run = daysBetween(prev, current) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  return longest;
}

/** The run ending today or yesterday; 0 if the streak has lapsed. */
export function computeCurrentStreak(
  activityDays: CampusDay[],
  today: CampusDay,
): number {
  const days = new Set(activityDays);
  if (days.size === 0) return 0;

  // Anchor on today when there is activity today, otherwise on yesterday.
  // Anything older means the chain is already broken.
  let anchor: CampusDay;
  if (days.has(today)) {
    anchor = today;
  } else if (days.has(addDays(today, -1))) {
    anchor = addDays(today, -1);
  } else {
    return 0;
  }

  let streak = 0;
  let cursor = anchor;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Full recomputation from the student's activity days.
 *
 * `previousLongest` is carried forward so that history trimmed out of the
 * query window can never reduce a record the student already earned.
 */
export function computeStreakState(
  activityDays: CampusDay[],
  today: CampusDay,
  previousLongest = 0,
): StreakState {
  const days = uniqueSortedDays(activityDays);
  const currentStreak = computeCurrentStreak(days, today);
  const longestRun = computeLongestRun(days);
  return {
    currentStreak,
    longestStreak: Math.max(previousLongest, longestRun, currentStreak),
    lastActivityDate: days.length ? days[days.length - 1]! : null,
  };
}

/**
 * Milestones newly reached when the streak moves from `before` to `after`.
 * Awarding is separately idempotent, so a re-run pays nothing extra.
 */
export function newlyReachedMilestones(before: number, after: number): number[] {
  return STREAK_MILESTONES.filter((m) => m > before && m <= after).map(Number);
}
