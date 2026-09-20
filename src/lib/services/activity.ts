import "server-only";
import {
  Prisma,
  type FoodWasteRecord,
  type WasteRecord,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import {
  awardForChallengeCompletion,
  awardForDailyCheckIn,
  awardForStreakMilestone,
  awardsForFoodWasteRecord,
  awardsForWasteRecord,
  persistAwards,
  toPointsConfig,
  type PendingAward,
} from "@/lib/points/engine";
import { computeStreakState, newlyReachedMilestones } from "@/lib/streaks/engine";
import { isChallengeOpen, measureProgress } from "@/lib/challenges/engine";
import { toMassGrams } from "@/lib/rules/catalog";
import {
  campusDayToDate,
  campusToday,
  dateToCampusDay,
  type CampusDay,
} from "@/lib/time";
import type {
  FoodWasteRecordInput,
  WasteRecordInput,
} from "@/lib/validation/schemas";
import { buildActivitySnapshot, getRecommendationsFor } from "@/lib/services/recommendations";
import type { Recommendation } from "@/lib/recommendations/engine";

/**
 * The activity service.
 *
 * Recording an activity is a single database transaction that:
 *   1. writes the record,
 *   2. awards points from the server-side rules,
 *   3. recomputes the streak from real activity dates,
 *   4. recomputes progress on every challenge the student has joined,
 *   5. pays out any challenge that just reached its target.
 *
 * Either all of that happens or none of it does. The rule-based
 * recommendation is generated afterwards (it is a read, not a write).
 */

export type ActivityOutcome = {
  recordId: string;
  pointsAwarded: number;
  awards: Array<{ points: number; detail: string }>;
  streak: { current: number; longest: number; increased: boolean };
  completedChallenges: Array<{ id: string; title: string; points: number }>;
  updatedChallenges: Array<{
    id: string;
    title: string;
    progress: number;
    target: number;
    completed: boolean;
  }>;
  recommendation: Recommendation | null;
};

/** How far back the streak recomputation looks. Far beyond any real streak. */
const STREAK_LOOKBACK_DAYS = 400;

async function collectActivityDays(
  tx: Prisma.TransactionClient,
  userId: string,
  today: CampusDay,
): Promise<CampusDay[]> {
  const since = campusDayToDate(today);
  since.setUTCDate(since.getUTCDate() - STREAK_LOOKBACK_DAYS);

  const [waste, food] = await Promise.all([
    tx.wasteRecord.findMany({
      where: { userId, recordedOn: { gte: since } },
      select: { recordedOn: true },
      distinct: ["recordedOn"],
    }),
    tx.foodWasteRecord.findMany({
      where: { userId, recordedOn: { gte: since } },
      select: { recordedOn: true },
      distinct: ["recordedOn"],
    }),
  ]);

  const days = new Set<CampusDay>();
  for (const row of waste) days.add(dateToCampusDay(row.recordedOn));
  for (const row of food) days.add(dateToCampusDay(row.recordedOn));
  // A future-dated record must never inflate today's streak.
  return [...days].filter((day) => day <= today);
}

type SharedResult = {
  pointsAwarded: number;
  awards: Array<{ points: number; detail: string }>;
  streak: { current: number; longest: number; increased: boolean };
  completedChallenges: Array<{ id: string; title: string; points: number }>;
  updatedChallenges: ActivityOutcome["updatedChallenges"];
};

/**
 * Everything that must happen after a record lands, inside the same
 * transaction as the insert.
 */
async function applyActivityEffects(
  tx: Prisma.TransactionClient,
  userId: string,
  recordedOn: CampusDay,
  recordAwards: PendingAward[],
): Promise<SharedResult> {
  const today = campusToday(env.campusTimeZone);

  const pointsRules = await tx.pointsRule.findMany();
  const config = toPointsConfig(pointsRules);

  const awards: PendingAward[] = [...recordAwards];

  // --- daily check-in (idempotent on the campus day) -----------------------
  const checkIn = awardForDailyCheckIn(config, recordedOn);
  if (checkIn) awards.push(checkIn);

  // --- streak --------------------------------------------------------------
  const existingStreak = await tx.streak.findUnique({ where: { userId } });
  const activityDays = await collectActivityDays(tx, userId, today);
  const nextStreak = computeStreakState(
    activityDays,
    today,
    existingStreak?.longestStreak ?? 0,
  );
  const previousCurrent = existingStreak?.currentStreak ?? 0;

  await tx.streak.upsert({
    where: { userId },
    create: {
      userId,
      currentStreak: nextStreak.currentStreak,
      longestStreak: nextStreak.longestStreak,
      lastActivityDate: nextStreak.lastActivityDate
        ? campusDayToDate(nextStreak.lastActivityDate)
        : null,
    },
    update: {
      currentStreak: nextStreak.currentStreak,
      longestStreak: nextStreak.longestStreak,
      lastActivityDate: nextStreak.lastActivityDate
        ? campusDayToDate(nextStreak.lastActivityDate)
        : null,
    },
  });

  for (const milestone of newlyReachedMilestones(
    previousCurrent,
    nextStreak.currentStreak,
  )) {
    const award = awardForStreakMilestone(config, milestone);
    if (award) awards.push(award);
  }

  // --- challenges ----------------------------------------------------------
  const participations = await tx.challengeParticipation.findMany({
    where: { userId },
    include: { challenge: true },
  });

  const completedChallenges: Array<{ id: string; title: string; points: number }> = [];
  const updatedChallenges: ActivityOutcome["updatedChallenges"] = [];

  for (const participation of participations) {
    const challenge = participation.challenge;
    // Ended or deactivated challenges keep whatever progress they had.
    if (!isChallengeOpen(challenge, today) && !participation.completed) {
      if (dateToCampusDay(challenge.endDate) < today) continue;
      if (!challenge.active) continue;
    }

    const progress = await measureProgress(tx, challenge, userId);
    const reachedTarget = progress >= challenge.target;
    const newlyCompleted = reachedTarget && !participation.completed;

    if (
      progress !== participation.progress ||
      reachedTarget !== participation.completed
    ) {
      await tx.challengeParticipation.update({
        where: { id: participation.id },
        data: {
          progress,
          completed: participation.completed || reachedTarget,
          completedAt:
            participation.completedAt ?? (newlyCompleted ? new Date() : null),
        },
      });
    }

    updatedChallenges.push({
      id: challenge.id,
      title: challenge.title,
      progress,
      target: challenge.target,
      completed: participation.completed || reachedTarget,
    });

    if (newlyCompleted) {
      awards.push(awardForChallengeCompletion(challenge));
      completedChallenges.push({
        id: challenge.id,
        title: challenge.title,
        points: challenge.points,
      });
    }
  }

  // --- pay out -------------------------------------------------------------
  const { awarded, total } = await persistAwards(tx, userId, awards);

  return {
    pointsAwarded: total,
    awards: awarded.map((a) => ({ points: a.points, detail: a.detail })),
    streak: {
      current: nextStreak.currentStreak,
      longest: nextStreak.longestStreak,
      increased: nextStreak.currentStreak > previousCurrent,
    },
    completedChallenges,
    updatedChallenges,
  };
}

export async function recordWasteActivity(
  userId: string,
  input: WasteRecordInput,
): Promise<ActivityOutcome> {
  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.wasteRecord.create({
      data: {
        userId,
        category: input.category,
        itemType: input.itemType,
        quantity: input.quantity,
        unit: input.unit,
        massGrams: toMassGrams(input.quantity, input.unit),
        disposal: input.disposal,
        recordedOn: campusDayToDate(input.recordedOn),
        notes: input.notes?.trim() ? input.notes.trim() : null,
      },
    });

    const config = toPointsConfig(await tx.pointsRule.findMany());
    const recordAwards = awardsForWasteRecord(config, {
      recordId: record.id,
      itemType: record.itemType,
      disposal: record.disposal,
    });

    const shared = await applyActivityEffects(
      tx,
      userId,
      input.recordedOn,
      recordAwards,
    );
    return { record, shared };
  });

  return {
    recordId: result.record.id,
    ...result.shared,
    recommendation: await getRecommendationsFor(userId).then((r) => r[0] ?? null),
  };
}

export async function recordFoodWasteActivity(
  userId: string,
  input: FoodWasteRecordInput,
): Promise<ActivityOutcome> {
  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.foodWasteRecord.create({
      data: {
        userId,
        foodCategory: input.foodCategory,
        mealType: input.mealType,
        itemType: input.itemType,
        quantity: input.quantity,
        unit: input.unit,
        massGrams: toMassGrams(input.quantity, input.unit),
        avoidable: input.avoidable,
        recordedOn: campusDayToDate(input.recordedOn),
        notes: input.notes?.trim() ? input.notes.trim() : null,
      },
    });

    const config = toPointsConfig(await tx.pointsRule.findMany());
    const recordAwards = awardsForFoodWasteRecord(config, {
      recordId: record.id,
      itemType: record.itemType,
    });

    const shared = await applyActivityEffects(
      tx,
      userId,
      input.recordedOn,
      recordAwards,
    );
    return { record, shared };
  });

  return {
    recordId: result.record.id,
    ...result.shared,
    recommendation: await getRecommendationsFor(userId).then((r) => r[0] ?? null),
  };
}

/**
 * Re-run the derived state after a record is deleted.
 *
 * Points already earned are deliberately NOT clawed back — the ledger is
 * append-only and auditable — but the streak and challenge progress are
 * recomputed so they continue to reflect reality.
 */
export async function recomputeDerivedState(userId: string): Promise<void> {
  const today = campusToday(env.campusTimeZone);

  await prisma.$transaction(async (tx) => {
    const existingStreak = await tx.streak.findUnique({ where: { userId } });
    const activityDays = await collectActivityDays(tx, userId, today);
    const next = computeStreakState(
      activityDays,
      today,
      existingStreak?.longestStreak ?? 0,
    );

    await tx.streak.upsert({
      where: { userId },
      create: {
        userId,
        currentStreak: next.currentStreak,
        longestStreak: next.longestStreak,
        lastActivityDate: next.lastActivityDate
          ? campusDayToDate(next.lastActivityDate)
          : null,
      },
      update: {
        currentStreak: next.currentStreak,
        longestStreak: next.longestStreak,
        lastActivityDate: next.lastActivityDate
          ? campusDayToDate(next.lastActivityDate)
          : null,
      },
    });

    const participations = await tx.challengeParticipation.findMany({
      where: { userId },
      include: { challenge: true },
    });

    for (const participation of participations) {
      const progress = await measureProgress(tx, participation.challenge, userId);
      if (progress === participation.progress) continue;
      await tx.challengeParticipation.update({
        where: { id: participation.id },
        // A completed challenge stays completed: the student did reach the
        // target, and the points for it were already paid.
        data: { progress },
      });
    }
  });
}

export type { WasteRecord, FoodWasteRecord };

/** Re-exported so callers do not need to reach into the engine module. */
export { buildActivitySnapshot };
