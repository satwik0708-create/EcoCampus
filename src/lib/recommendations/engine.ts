import {
  RecommendationTrigger,
  type FoodCategory,
  type RecommendationRule,
  type WasteCategory,
} from "@prisma/client";
import { daysBetween, type CampusDay } from "@/lib/time";

/**
 * Rule-based recommendation engine.
 *
 * There is no AI, no model and no external service here. The engine takes a
 * snapshot of the student's own recent activity, evaluates every active rule
 * from the `RecommendationRule` table against it, and returns the matching
 * rules ordered by the priority the administrator configured.
 *
 * The function is pure and total: the same snapshot always produces the same
 * recommendations, in the same order. Ties break on `code` so the output is
 * stable even if two rules share a priority.
 */

export type ActivitySnapshot = {
  today: CampusDay;
  /** Category of the student's most recent waste record, if any. */
  latestWasteCategory: WasteCategory | null;
  /** Category of the student's most recent food waste record, if any. */
  latestFoodCategory: FoodCategory | null;
  /** Campus day of the most recent qualifying activity of any kind. */
  lastActivityDay: CampusDay | null;
  /** Waste record counts per category, keyed by look-back window in days. */
  wasteCountsByWindow: Map<number, Map<WasteCategory, number>>;
  /** Food waste record counts per category, keyed by look-back window. */
  foodCountsByWindow: Map<number, Map<FoodCategory, number>>;
  /** Total food waste records, keyed by look-back window. */
  foodTotalsByWindow: Map<number, number>;
  /** True when the student has joined at least one in-flight challenge. */
  hasActiveChallenge: boolean;
  /** Current streak length in days. */
  currentStreak: number;
  /** Whether the student has already recorded something today. */
  recordedToday: boolean;
};

export type Recommendation = {
  code: string;
  title: string;
  message: string;
  actionLabel: string | null;
  actionHref: string | null;
  trigger: RecommendationTrigger;
};

function countIn<T extends string>(
  byWindow: Map<number, Map<T, number>>,
  windowDays: number,
  key: T,
): number {
  return byWindow.get(windowDays)?.get(key) ?? 0;
}

/** Does a single rule fire for this snapshot? */
export function ruleMatches(
  rule: RecommendationRule,
  snapshot: ActivitySnapshot,
): boolean {
  if (!rule.active) return false;

  switch (rule.trigger) {
    case RecommendationTrigger.LATEST_WASTE_CATEGORY:
      return (
        !!rule.matchWasteCategory &&
        snapshot.latestWasteCategory === rule.matchWasteCategory
      );

    case RecommendationTrigger.LATEST_FOOD_CATEGORY:
      return (
        !!rule.matchFoodCategory &&
        snapshot.latestFoodCategory === rule.matchFoodCategory
      );

    case RecommendationTrigger.FREQUENT_WASTE_CATEGORY: {
      if (!rule.matchWasteCategory || !rule.threshold || !rule.windowDays) return false;
      return (
        countIn(snapshot.wasteCountsByWindow, rule.windowDays, rule.matchWasteCategory) >=
        rule.threshold
      );
    }

    case RecommendationTrigger.FREQUENT_FOOD_CATEGORY: {
      if (!rule.matchFoodCategory || !rule.threshold || !rule.windowDays) return false;
      return (
        countIn(snapshot.foodCountsByWindow, rule.windowDays, rule.matchFoodCategory) >=
        rule.threshold
      );
    }

    case RecommendationTrigger.HIGH_FOOD_WASTE: {
      if (!rule.threshold || !rule.windowDays) return false;
      return (snapshot.foodTotalsByWindow.get(rule.windowDays) ?? 0) >= rule.threshold;
    }

    case RecommendationTrigger.NO_RECENT_ACTIVITY: {
      const threshold = rule.threshold ?? 3;
      if (!snapshot.lastActivityDay) return true;
      return daysBetween(snapshot.lastActivityDay, snapshot.today) >= threshold;
    }

    case RecommendationTrigger.NO_ACTIVE_CHALLENGE:
      return !snapshot.hasActiveChallenge;

    case RecommendationTrigger.STREAK_AT_RISK:
      return snapshot.currentStreak > 0 && !snapshot.recordedToday;

    case RecommendationTrigger.GENERAL:
      return true;

    default:
      return false;
  }
}

/** All matching rules, best first. */
export function evaluateRecommendations(
  rules: RecommendationRule[],
  snapshot: ActivitySnapshot,
  limit = 3,
): Recommendation[] {
  return rules
    .filter((rule) => ruleMatches(rule, snapshot))
    .sort((a, b) => a.priority - b.priority || a.code.localeCompare(b.code))
    .slice(0, limit)
    .map((rule) => ({
      code: rule.code,
      title: rule.title,
      message: rule.message,
      actionLabel: rule.actionLabel,
      actionHref: rule.actionHref,
      trigger: rule.trigger,
    }));
}

/**
 * The single best recommendation, or null when no rule matches.
 *
 * Seed data always includes a `GENERAL` fallback rule, so in practice this
 * returns something for every student — but the engine does not fabricate a
 * message when the administrator has deleted every rule.
 */
export function topRecommendation(
  rules: RecommendationRule[],
  snapshot: ActivitySnapshot,
): Recommendation | null {
  return evaluateRecommendations(rules, snapshot, 1)[0] ?? null;
}

/** Look-back windows a snapshot must populate, derived from the rule set. */
export function requiredWindows(rules: RecommendationRule[]): number[] {
  const windows = new Set<number>();
  for (const rule of rules) {
    if (rule.active && rule.windowDays) windows.add(rule.windowDays);
  }
  return [...windows].sort((a, b) => a - b);
}
