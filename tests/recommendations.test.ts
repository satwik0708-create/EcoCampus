import { describe, expect, it } from "vitest";
import {
  FoodCategory,
  RecommendationTrigger,
  WasteCategory,
  type RecommendationRule,
} from "@prisma/client";
import {
  evaluateRecommendations,
  requiredWindows,
  ruleMatches,
  topRecommendation,
  type ActivitySnapshot,
} from "@/lib/recommendations/engine";

function makeRule(overrides: Partial<RecommendationRule>): RecommendationRule {
  return {
    id: overrides.code ?? "rule",
    code: overrides.code ?? "RULE",
    trigger: RecommendationTrigger.GENERAL,
    priority: 100,
    matchWasteCategory: null,
    matchFoodCategory: null,
    threshold: null,
    windowDays: null,
    title: "Title",
    message: "Message",
    actionLabel: null,
    actionHref: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as RecommendationRule;
}

function makeSnapshot(overrides: Partial<ActivitySnapshot> = {}): ActivitySnapshot {
  return {
    today: "2026-05-20",
    latestWasteCategory: null,
    latestFoodCategory: null,
    lastActivityDay: null,
    wasteCountsByWindow: new Map(),
    foodCountsByWindow: new Map(),
    foodTotalsByWindow: new Map(),
    hasActiveChallenge: false,
    currentStreak: 0,
    recordedToday: false,
    ...overrides,
  };
}

describe("recommendation triggers", () => {
  it("LATEST_WASTE_CATEGORY matches only its own category", () => {
    const rule = makeRule({
      trigger: RecommendationTrigger.LATEST_WASTE_CATEGORY,
      matchWasteCategory: WasteCategory.PLASTIC,
    });
    expect(
      ruleMatches(rule, makeSnapshot({ latestWasteCategory: WasteCategory.PLASTIC })),
    ).toBe(true);
    expect(
      ruleMatches(rule, makeSnapshot({ latestWasteCategory: WasteCategory.PAPER })),
    ).toBe(false);
    expect(ruleMatches(rule, makeSnapshot())).toBe(false);
  });

  it("LATEST_FOOD_CATEGORY matches only its own category", () => {
    const rule = makeRule({
      trigger: RecommendationTrigger.LATEST_FOOD_CATEGORY,
      matchFoodCategory: FoodCategory.COOKED_FOOD,
    });
    expect(
      ruleMatches(
        rule,
        makeSnapshot({ latestFoodCategory: FoodCategory.COOKED_FOOD }),
      ),
    ).toBe(true);
    expect(
      ruleMatches(rule, makeSnapshot({ latestFoodCategory: FoodCategory.FRUITS })),
    ).toBe(false);
  });

  it("FREQUENT_WASTE_CATEGORY respects the threshold and the window", () => {
    const rule = makeRule({
      trigger: RecommendationTrigger.FREQUENT_WASTE_CATEGORY,
      matchWasteCategory: WasteCategory.PLASTIC,
      threshold: 3,
      windowDays: 7,
    });

    const below = makeSnapshot({
      wasteCountsByWindow: new Map([[7, new Map([[WasteCategory.PLASTIC, 2]])]]),
    });
    const atThreshold = makeSnapshot({
      wasteCountsByWindow: new Map([[7, new Map([[WasteCategory.PLASTIC, 3]])]]),
    });
    const wrongWindow = makeSnapshot({
      wasteCountsByWindow: new Map([[30, new Map([[WasteCategory.PLASTIC, 9]])]]),
    });

    expect(ruleMatches(rule, below)).toBe(false);
    expect(ruleMatches(rule, atThreshold)).toBe(true);
    expect(ruleMatches(rule, wrongWindow)).toBe(false);
  });

  it("HIGH_FOOD_WASTE uses the total, not a per-category count", () => {
    const rule = makeRule({
      trigger: RecommendationTrigger.HIGH_FOOD_WASTE,
      threshold: 4,
      windowDays: 7,
    });
    expect(
      ruleMatches(rule, makeSnapshot({ foodTotalsByWindow: new Map([[7, 3]]) })),
    ).toBe(false);
    expect(
      ruleMatches(rule, makeSnapshot({ foodTotalsByWindow: new Map([[7, 4]]) })),
    ).toBe(true);
  });

  it("NO_RECENT_ACTIVITY fires for a brand new student and after a gap", () => {
    const rule = makeRule({
      trigger: RecommendationTrigger.NO_RECENT_ACTIVITY,
      threshold: 3,
    });
    expect(ruleMatches(rule, makeSnapshot({ lastActivityDay: null }))).toBe(true);
    expect(
      ruleMatches(rule, makeSnapshot({ lastActivityDay: "2026-05-17" })),
    ).toBe(true);
    expect(
      ruleMatches(rule, makeSnapshot({ lastActivityDay: "2026-05-19" })),
    ).toBe(false);
  });

  it("STREAK_AT_RISK only fires with a live streak and nothing today", () => {
    const rule = makeRule({ trigger: RecommendationTrigger.STREAK_AT_RISK });
    expect(
      ruleMatches(rule, makeSnapshot({ currentStreak: 5, recordedToday: false })),
    ).toBe(true);
    expect(
      ruleMatches(rule, makeSnapshot({ currentStreak: 5, recordedToday: true })),
    ).toBe(false);
    expect(
      ruleMatches(rule, makeSnapshot({ currentStreak: 0, recordedToday: false })),
    ).toBe(false);
  });

  it("NO_ACTIVE_CHALLENGE is the inverse of participation", () => {
    const rule = makeRule({ trigger: RecommendationTrigger.NO_ACTIVE_CHALLENGE });
    expect(ruleMatches(rule, makeSnapshot({ hasActiveChallenge: false }))).toBe(true);
    expect(ruleMatches(rule, makeSnapshot({ hasActiveChallenge: true }))).toBe(false);
  });

  it("GENERAL always matches, and inactive rules never do", () => {
    expect(ruleMatches(makeRule({}), makeSnapshot())).toBe(true);
    expect(ruleMatches(makeRule({ active: false }), makeSnapshot())).toBe(false);
  });

  it("a frequency rule missing its configuration never fires", () => {
    const rule = makeRule({
      trigger: RecommendationTrigger.FREQUENT_WASTE_CATEGORY,
      matchWasteCategory: WasteCategory.PLASTIC,
      threshold: null,
      windowDays: 7,
    });
    expect(ruleMatches(rule, makeSnapshot())).toBe(false);
  });
});

describe("rule selection", () => {
  const rules = [
    makeRule({ code: "FALLBACK", priority: 900 }),
    makeRule({
      code: "PLASTIC",
      priority: 20,
      trigger: RecommendationTrigger.LATEST_WASTE_CATEGORY,
      matchWasteCategory: WasteCategory.PLASTIC,
    }),
    makeRule({ code: "NO_CHALLENGE", priority: 60, trigger: RecommendationTrigger.NO_ACTIVE_CHALLENGE }),
  ];

  it("returns the lowest-priority-number match first", () => {
    const snapshot = makeSnapshot({ latestWasteCategory: WasteCategory.PLASTIC });
    const result = evaluateRecommendations(rules, snapshot);
    expect(result.map((r) => r.code)).toEqual(["PLASTIC", "NO_CHALLENGE", "FALLBACK"]);
    expect(topRecommendation(rules, snapshot)!.code).toBe("PLASTIC");
  });

  it("is deterministic: the same snapshot always yields the same order", () => {
    const snapshot = makeSnapshot({ latestWasteCategory: WasteCategory.PLASTIC });
    const first = evaluateRecommendations(rules, snapshot);
    const second = evaluateRecommendations(rules, snapshot);
    expect(second).toEqual(first);
  });

  it("breaks priority ties on the rule code, not insertion order", () => {
    const tied = [
      makeRule({ code: "ZEBRA", priority: 10 }),
      makeRule({ code: "ALPHA", priority: 10 }),
    ];
    expect(evaluateRecommendations(tied, makeSnapshot()).map((r) => r.code)).toEqual([
      "ALPHA",
      "ZEBRA",
    ]);
  });

  it("honours the limit", () => {
    expect(evaluateRecommendations(rules, makeSnapshot(), 1)).toHaveLength(1);
  });

  it("returns nothing rather than inventing a message when no rule matches", () => {
    const onlySpecific = [
      makeRule({
        code: "PLASTIC",
        trigger: RecommendationTrigger.LATEST_WASTE_CATEGORY,
        matchWasteCategory: WasteCategory.PLASTIC,
      }),
    ];
    expect(evaluateRecommendations(onlySpecific, makeSnapshot())).toEqual([]);
    expect(topRecommendation(onlySpecific, makeSnapshot())).toBeNull();
  });

  it("collects only the look-back windows active rules actually use", () => {
    const withWindows = [
      makeRule({ code: "A", windowDays: 7 }),
      makeRule({ code: "B", windowDays: 30 }),
      makeRule({ code: "C", windowDays: 7 }),
      makeRule({ code: "D", windowDays: 90, active: false }),
      makeRule({ code: "E", windowDays: null }),
    ];
    expect(requiredWindows(withWindows)).toEqual([7, 30]);
  });
});
