import { describe, expect, it } from "vitest";
import { DisposalAction, PointReason, type PointsRule } from "@prisma/client";
import {
  DEFAULT_POINT_VALUES,
  awardForChallengeCompletion,
  awardForDailyCheckIn,
  awardForStreakMilestone,
  awardsForFoodWasteRecord,
  awardsForWasteRecord,
  pointsFor,
  toPointsConfig,
} from "@/lib/points/engine";

function rule(
  code: PointReason,
  points: number,
  active = true,
): PointsRule {
  return {
    id: `rule-${code}`,
    code,
    label: code,
    description: "",
    points,
    active,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const CONFIG = toPointsConfig([
  rule(PointReason.WASTE_RECORD, 5),
  rule(PointReason.FOOD_WASTE_RECORD, 5),
  rule(PointReason.DAILY_FIRST_ACTIVITY, 3),
  rule(PointReason.SEGREGATION_BONUS, 2),
  rule(PointReason.STREAK_MILESTONE, 10),
]);

describe("points configuration", () => {
  it("reads configured values", () => {
    expect(pointsFor(CONFIG, PointReason.WASTE_RECORD)).toBe(5);
  });

  it("falls back to the built-in default when a rule row is missing", () => {
    const empty = toPointsConfig([]);
    expect(pointsFor(empty, PointReason.WASTE_RECORD)).toBe(
      DEFAULT_POINT_VALUES.WASTE_RECORD,
    );
  });

  it("awards nothing for a deactivated rule", () => {
    const config = toPointsConfig([rule(PointReason.WASTE_RECORD, 5, false)]);
    expect(pointsFor(config, PointReason.WASTE_RECORD)).toBe(0);
  });
});

describe("waste record awards", () => {
  it("pays the base award plus a segregation bonus for recycling", () => {
    const awards = awardsForWasteRecord(CONFIG, {
      recordId: "rec-1",
      itemType: "Plastic bottle",
      disposal: DisposalAction.RECYCLE,
    });
    expect(awards).toHaveLength(2);
    expect(awards.reduce((sum, a) => sum + a.points, 0)).toBe(7);
    expect(awards.map((a) => a.reason)).toEqual([
      PointReason.WASTE_RECORD,
      PointReason.SEGREGATION_BONUS,
    ]);
  });

  it.each([
    DisposalAction.COMPOST,
    DisposalAction.REUSE,
    DisposalAction.SPECIAL_DISPOSAL,
  ])("pays the segregation bonus for %s", (disposal) => {
    const awards = awardsForWasteRecord(CONFIG, {
      recordId: "rec-1",
      itemType: "Item",
      disposal,
    });
    expect(awards).toHaveLength(2);
  });

  it("pays no segregation bonus for landfill", () => {
    const awards = awardsForWasteRecord(CONFIG, {
      recordId: "rec-2",
      itemType: "Snack wrapper",
      disposal: DisposalAction.GENERAL_WASTE,
    });
    expect(awards).toHaveLength(1);
    expect(awards[0]!.points).toBe(5);
  });

  it("scopes every award to the record, so re-running cannot double-pay", () => {
    const awards = awardsForWasteRecord(CONFIG, {
      recordId: "rec-3",
      itemType: "Can",
      disposal: DisposalAction.RECYCLE,
    });
    for (const award of awards) {
      expect(award.sourceId).toBe("rec-3");
      expect(award.sourceType).toBeTruthy();
    }
    // The two awards must not collide on the same unique key.
    expect(awards[0]!.sourceType).not.toBe(awards[1]!.sourceType);
  });
});

describe("food waste awards", () => {
  it("pays the configured base award", () => {
    const awards = awardsForFoodWasteRecord(CONFIG, {
      recordId: "food-1",
      itemType: "Leftover rice",
    });
    expect(awards).toHaveLength(1);
    expect(awards[0]!.points).toBe(5);
    expect(awards[0]!.sourceId).toBe("food-1");
  });

  it("pays nothing when the rule is switched off", () => {
    const config = toPointsConfig([rule(PointReason.FOOD_WASTE_RECORD, 5, false)]);
    expect(
      awardsForFoodWasteRecord(config, { recordId: "f", itemType: "x" }),
    ).toEqual([]);
  });
});

describe("daily check-in", () => {
  it("keys the award on the campus day so it can only be paid once", () => {
    const award = awardForDailyCheckIn(CONFIG, "2026-05-20");
    expect(award).not.toBeNull();
    expect(award!.sourceType).toBe("daily_check_in");
    expect(award!.sourceId).toBe("2026-05-20");
    expect(award!.points).toBe(3);
  });

  it("returns null when the rule pays nothing", () => {
    const config = toPointsConfig([rule(PointReason.DAILY_FIRST_ACTIVITY, 0)]);
    expect(awardForDailyCheckIn(config, "2026-05-20")).toBeNull();
  });
});

describe("streak milestones", () => {
  it("scales the reward with the milestone length", () => {
    expect(awardForStreakMilestone(CONFIG, 7)!.points).toBe(10);
    expect(awardForStreakMilestone(CONFIG, 14)!.points).toBe(20);
    expect(awardForStreakMilestone(CONFIG, 30)!.points).toBe(43);
  });

  it("keys the award on the milestone, so it is paid once per milestone", () => {
    const award = awardForStreakMilestone(CONFIG, 7)!;
    expect(award.sourceType).toBe("streak_milestone");
    expect(award.sourceId).toBe("7");
  });
});

describe("challenge completion", () => {
  it("uses the reward stored on the challenge, not a global rule", () => {
    const award = awardForChallengeCompletion({
      id: "ch-1",
      title: "Plastic-Free Week",
      points: 50,
    });
    expect(award.points).toBe(50);
    expect(award.sourceType).toBe("challenge_completion");
    expect(award.sourceId).toBe("ch-1");
  });
});
