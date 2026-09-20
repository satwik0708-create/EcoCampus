import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ChallengeMetric,
  ChallengeScope,
  DisposalAction,
  FoodCategory,
  MealType,
  Unit,
  WasteCategory,
} from "@prisma/client";
import {
  cleanupTestData,
  createTestStudent,
  ensurePointsRules,
  prisma,
  TEST_PREFIX,
  totalPoints,
} from "./helpers/db";
import {
  recomputeDerivedState,
  recordFoodWasteActivity,
  recordWasteActivity,
} from "@/lib/services/activity";
import { joinChallenge } from "@/lib/services/challenges";
import { getStudentDashboard } from "@/lib/services/dashboard";
import { getLeaderboard } from "@/lib/services/leaderboard";
import { addDays, campusDayToDate, campusToday } from "@/lib/time";

const TZ = process.env.CAMPUS_TIMEZONE ?? "Asia/Kolkata";
const today = campusToday(TZ);

function wasteInput(overrides: Partial<Parameters<typeof recordWasteActivity>[1]> = {}) {
  return {
    category: WasteCategory.PLASTIC,
    itemType: "Plastic bottle",
    quantity: 1,
    unit: Unit.PIECE,
    disposal: DisposalAction.RECYCLE,
    recordedOn: today,
    notes: "",
    ...overrides,
  };
}

beforeAll(async () => {
  await ensurePointsRules();
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("recording a waste activity", () => {
  it("persists the record, awards points and updates the streak in one go", async () => {
    const student = await createTestStudent("waste");

    const outcome = await recordWasteActivity(student.id, wasteInput());

    // 5 (base) + 2 (segregation) + 3 (first activity today) = 10
    expect(outcome.pointsAwarded).toBe(10);
    expect(await totalPoints(student.id)).toBe(10);

    const record = await prisma.wasteRecord.findUnique({
      where: { id: outcome.recordId },
    });
    expect(record).not.toBeNull();
    expect(record!.userId).toBe(student.id);
    expect(record!.category).toBe(WasteCategory.PLASTIC);

    const streak = await prisma.streak.findUnique({ where: { userId: student.id } });
    expect(streak!.currentStreak).toBe(1);
    expect(streak!.longestStreak).toBe(1);
  });

  it("does not pay the daily bonus twice on the same campus day", async () => {
    const student = await createTestStudent("daily");

    await recordWasteActivity(student.id, wasteInput());
    await recordWasteActivity(
      student.id,
      wasteInput({ itemType: "Second bottle" }),
    );

    // 10 for the first, then only 7 (base + segregation) for the second.
    expect(await totalPoints(student.id)).toBe(17);

    const checkIns = await prisma.pointTransaction.count({
      where: { userId: student.id, reason: "DAILY_FIRST_ACTIVITY" },
    });
    expect(checkIns).toBe(1);
  });

  it("pays no segregation bonus when waste goes to landfill", async () => {
    const student = await createTestStudent("landfill");

    const outcome = await recordWasteActivity(
      student.id,
      wasteInput({ disposal: DisposalAction.GENERAL_WASTE }),
    );

    // 5 (base) + 3 (first activity) — no segregation bonus.
    expect(outcome.pointsAwarded).toBe(8);
  });

  it("stores mass only for mass-based units", async () => {
    const student = await createTestStudent("mass");

    const grams = await recordWasteActivity(
      student.id,
      wasteInput({ quantity: 250, unit: Unit.GRAM }),
    );
    const pieces = await recordWasteActivity(
      student.id,
      wasteInput({ quantity: 3, unit: Unit.PIECE, itemType: "Cans" }),
    );

    const gramRecord = await prisma.wasteRecord.findUnique({
      where: { id: grams.recordId },
    });
    const pieceRecord = await prisma.wasteRecord.findUnique({
      where: { id: pieces.recordId },
    });

    expect(gramRecord!.massGrams).toBe(250);
    // No guessed conversion: pieces contribute nothing to mass totals.
    expect(pieceRecord!.massGrams).toBeNull();
  });
});

describe("streaks over real records", () => {
  it("builds a multi-day streak and pays the 7-day milestone once", async () => {
    const student = await createTestStudent("streak");

    for (let offset = 6; offset >= 0; offset -= 1) {
      await recordWasteActivity(
        student.id,
        wasteInput({ recordedOn: addDays(today, -offset) }),
      );
    }

    const streak = await prisma.streak.findUnique({ where: { userId: student.id } });
    expect(streak!.currentStreak).toBe(7);
    expect(streak!.longestStreak).toBe(7);

    const milestones = await prisma.pointTransaction.findMany({
      where: { userId: student.id, reason: "STREAK_MILESTONE" },
    });
    expect(milestones).toHaveLength(1);
    expect(milestones[0]!.points).toBe(10);
  });

  it("recomputes the streak downward after a record is deleted", async () => {
    const student = await createTestStudent("delete");

    const first = await recordWasteActivity(
      student.id,
      wasteInput({ recordedOn: addDays(today, -1) }),
    );
    await recordWasteActivity(student.id, wasteInput({ recordedOn: today }));

    expect(
      (await prisma.streak.findUnique({ where: { userId: student.id } }))!
        .currentStreak,
    ).toBe(2);

    await prisma.wasteRecord.delete({ where: { id: first.recordId } });
    await recomputeDerivedState(student.id);

    const after = await prisma.streak.findUnique({ where: { userId: student.id } });
    expect(after!.currentStreak).toBe(1);
    // The longest streak earned is kept — it was genuinely achieved.
    expect(after!.longestStreak).toBe(2);
  });

  it("keeps the point ledger intact after a deletion, as an audit trail", async () => {
    const student = await createTestStudent("ledger");
    const outcome = await recordWasteActivity(student.id, wasteInput());
    const before = await totalPoints(student.id);

    await prisma.wasteRecord.delete({ where: { id: outcome.recordId } });
    await recomputeDerivedState(student.id);

    expect(await totalPoints(student.id)).toBe(before);
  });
});

describe("challenges driven by real activity", () => {
  it("measures progress from records and pays out exactly once on completion", async () => {
    const student = await createTestStudent("challenge");

    const challenge = await prisma.challenge.create({
      data: {
        title: "Test: three plastic records",
        slug: `${TEST_PREFIX}three-plastic-${Date.now()}`,
        description: "Log three plastic waste records.",
        metric: ChallengeMetric.RECORD_COUNT,
        scope: ChallengeScope.WASTE,
        wasteCategory: WasteCategory.PLASTIC,
        target: 3,
        targetUnit: "records",
        points: 40,
        startDate: campusDayToDate(addDays(today, -10)),
        endDate: campusDayToDate(addDays(today, 10)),
        active: true,
      },
    });

    await joinChallenge(student.id, challenge.id);

    await recordWasteActivity(student.id, wasteInput());
    let participation = await prisma.challengeParticipation.findUniqueOrThrow({
      where: { challengeId_userId: { challengeId: challenge.id, userId: student.id } },
    });
    expect(participation.progress).toBe(1);
    expect(participation.completed).toBe(false);

    await recordWasteActivity(student.id, wasteInput({ itemType: "Bottle 2" }));
    await recordWasteActivity(student.id, wasteInput({ itemType: "Bottle 3" }));

    participation = await prisma.challengeParticipation.findUniqueOrThrow({
      where: { challengeId_userId: { challengeId: challenge.id, userId: student.id } },
    });
    expect(participation.progress).toBe(3);
    expect(participation.completed).toBe(true);
    expect(participation.completedAt).not.toBeNull();

    // A fourth record must not pay the reward again.
    await recordWasteActivity(student.id, wasteInput({ itemType: "Bottle 4" }));
    const completionAwards = await prisma.pointTransaction.findMany({
      where: { userId: student.id, reason: "CHALLENGE_COMPLETION" },
    });
    expect(completionAwards).toHaveLength(1);
    expect(completionAwards[0]!.points).toBe(40);
  });

  it("does not count records outside the challenge's own filters", async () => {
    const student = await createTestStudent("filter");

    const challenge = await prisma.challenge.create({
      data: {
        title: "Test: e-waste only",
        slug: `${TEST_PREFIX}ewaste-${Date.now()}`,
        description: "Log two e-waste records.",
        metric: ChallengeMetric.RECORD_COUNT,
        scope: ChallengeScope.WASTE,
        wasteCategory: WasteCategory.EWASTE,
        target: 2,
        targetUnit: "records",
        points: 25,
        startDate: campusDayToDate(addDays(today, -5)),
        endDate: campusDayToDate(addDays(today, 5)),
        active: true,
      },
    });
    await joinChallenge(student.id, challenge.id);

    // Plastic must not count toward an e-waste challenge.
    await recordWasteActivity(student.id, wasteInput());
    await recordWasteActivity(
      student.id,
      wasteInput({ category: WasteCategory.PAPER, itemType: "Printout" }),
    );

    const participation = await prisma.challengeParticipation.findUniqueOrThrow({
      where: { challengeId_userId: { challengeId: challenge.id, userId: student.id } },
    });
    expect(participation.progress).toBe(0);
    expect(participation.completed).toBe(false);
  });

  it("counts pre-existing activity the moment a student joins", async () => {
    const student = await createTestStudent("backfill");

    await recordWasteActivity(student.id, wasteInput());
    await recordWasteActivity(student.id, wasteInput({ itemType: "Bottle 2" }));

    const challenge = await prisma.challenge.create({
      data: {
        title: "Test: joined late",
        slug: `${TEST_PREFIX}late-${Date.now()}`,
        description: "Log two plastic records.",
        metric: ChallengeMetric.RECORD_COUNT,
        scope: ChallengeScope.WASTE,
        wasteCategory: WasteCategory.PLASTIC,
        target: 2,
        targetUnit: "records",
        points: 20,
        startDate: campusDayToDate(addDays(today, -5)),
        endDate: campusDayToDate(addDays(today, 5)),
        active: true,
      },
    });

    const result = await joinChallenge(student.id, challenge.id);
    expect(result.progress).toBe(2);
    expect(result.completed).toBe(true);
  });

  it("ignores records dated outside the challenge window", async () => {
    const student = await createTestStudent("window");

    // Logged before the challenge started.
    await recordWasteActivity(
      student.id,
      wasteInput({ recordedOn: addDays(today, -20) }),
    );

    const challenge = await prisma.challenge.create({
      data: {
        title: "Test: recent window",
        slug: `${TEST_PREFIX}window-${Date.now()}`,
        description: "Log one plastic record this week.",
        metric: ChallengeMetric.RECORD_COUNT,
        scope: ChallengeScope.WASTE,
        wasteCategory: WasteCategory.PLASTIC,
        target: 1,
        targetUnit: "records",
        points: 10,
        startDate: campusDayToDate(addDays(today, -3)),
        endDate: campusDayToDate(addDays(today, 3)),
        active: true,
      },
    });

    const result = await joinChallenge(student.id, challenge.id);
    expect(result.progress).toBe(0);
  });

  it("counts distinct days for an ACTIVE_DAYS challenge, not records", async () => {
    const student = await createTestStudent("days");

    const challenge = await prisma.challenge.create({
      data: {
        title: "Test: three active days",
        slug: `${TEST_PREFIX}days-${Date.now()}`,
        description: "Record something on three separate days.",
        metric: ChallengeMetric.ACTIVE_DAYS,
        scope: ChallengeScope.ANY,
        target: 3,
        targetUnit: "days",
        points: 30,
        startDate: campusDayToDate(addDays(today, -10)),
        endDate: campusDayToDate(addDays(today, 3)),
        active: true,
      },
    });
    await joinChallenge(student.id, challenge.id);

    // Three records, all on the same day → one active day.
    await recordWasteActivity(student.id, wasteInput());
    await recordWasteActivity(student.id, wasteInput({ itemType: "B" }));
    await recordWasteActivity(student.id, wasteInput({ itemType: "C" }));

    let participation = await prisma.challengeParticipation.findUniqueOrThrow({
      where: { challengeId_userId: { challengeId: challenge.id, userId: student.id } },
    });
    expect(participation.progress).toBe(1);

    await recordWasteActivity(
      student.id,
      wasteInput({ recordedOn: addDays(today, -1) }),
    );
    await recordWasteActivity(
      student.id,
      wasteInput({ recordedOn: addDays(today, -2) }),
    );

    participation = await prisma.challengeParticipation.findUniqueOrThrow({
      where: { challengeId_userId: { challengeId: challenge.id, userId: student.id } },
    });
    expect(participation.progress).toBe(3);
    expect(participation.completed).toBe(true);
  });
});

describe("food waste recording", () => {
  it("persists a food waste record and awards its own points", async () => {
    const student = await createTestStudent("food");

    const outcome = await recordFoodWasteActivity(student.id, {
      foodCategory: FoodCategory.COOKED_FOOD,
      mealType: MealType.LUNCH,
      itemType: "Leftover rice",
      quantity: 200,
      unit: Unit.GRAM,
      avoidable: true,
      recordedOn: today,
      notes: "",
    });

    // 5 (base) + 3 (first activity of the day). No segregation bonus applies.
    expect(outcome.pointsAwarded).toBe(8);

    const record = await prisma.foodWasteRecord.findUnique({
      where: { id: outcome.recordId },
    });
    expect(record!.massGrams).toBe(200);
    expect(record!.avoidable).toBe(true);
  });
});

describe("dashboard and leaderboard read models", () => {
  it("derives every dashboard figure from the student's own records", async () => {
    const student = await createTestStudent("dashboard");

    await recordWasteActivity(student.id, wasteInput());
    await recordFoodWasteActivity(student.id, {
      foodCategory: FoodCategory.FRUITS,
      mealType: MealType.SNACK,
      itemType: "Banana peel",
      quantity: 1,
      unit: Unit.SERVING,
      avoidable: false,
      recordedOn: today,
      notes: "",
    });

    const dashboard = await getStudentDashboard(student.id);

    expect(dashboard.stats.wasteRecords).toBe(1);
    expect(dashboard.stats.foodWasteRecords).toBe(1);
    expect(dashboard.stats.totalActivities).toBe(2);
    expect(dashboard.stats.totalPoints).toBe(await totalPoints(student.id));
    expect(dashboard.stats.currentStreak).toBe(1);
    expect(dashboard.recentActivity).toHaveLength(2);
    expect(dashboard.wasteByCategory[0]!.key).toBe(WasteCategory.PLASTIC);
  });

  it("shows genuine zeroes for a student with no activity", async () => {
    const student = await createTestStudent("empty");
    const dashboard = await getStudentDashboard(student.id);

    expect(dashboard.stats.totalPoints).toBe(0);
    expect(dashboard.stats.totalActivities).toBe(0);
    expect(dashboard.stats.currentStreak).toBe(0);
    expect(dashboard.wasteByCategory).toEqual([]);
    expect(dashboard.recentActivity).toEqual([]);
    // The weekly chart still has a bucket per day, all empty.
    expect(dashboard.weeklyActivity).toHaveLength(7);
    expect(dashboard.weeklyActivity.every((point) => point.total === 0)).toBe(true);
  });

  it("ranks the leaderboard on real point totals and hides email addresses", async () => {
    const high = await createTestStudent("high");
    const low = await createTestStudent("low");

    for (let i = 0; i < 4; i += 1) {
      await recordWasteActivity(high.id, wasteInput({ itemType: `Item ${i}` }));
    }
    await recordWasteActivity(low.id, wasteInput());

    const board = await getLeaderboard(high.id, 200);
    const highRow = board.rows.find((row) => row.userId === high.id)!;
    const lowRow = board.rows.find((row) => row.userId === low.id)!;

    expect(highRow.points).toBe(await totalPoints(high.id));
    expect(highRow.rank).toBeLessThan(lowRow.rank);
    expect(highRow.isCurrentUser).toBe(true);
    expect(board.currentUserRow!.userId).toBe(high.id);

    // The row shape must not carry personal data.
    expect(Object.keys(highRow).sort()).toEqual(
      [
        "challengesCompleted",
        "currentStreak",
        "displayName",
        "isCurrentUser",
        "points",
        "rank",
        "userId",
      ].sort(),
    );
    expect(JSON.stringify(board)).not.toContain("@test.local");
  });
});
