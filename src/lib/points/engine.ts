import {
  DisposalAction,
  PointReason,
  Prisma,
  type PointsRule,
} from "@prisma/client";
import { isRecoveryAction } from "@/lib/rules/catalog";

/**
 * Points engine.
 *
 * Every award is computed here, on the server, from configuration stored in
 * the `PointsRule` table. The client never sends a point value; the API routes
 * never accept one. Awards are written as immutable `PointTransaction` rows,
 * so a student's balance is always a SUM over an auditable ledger.
 */

/** Used when a rule row is missing (e.g. before the first seed run). */
export const DEFAULT_POINT_VALUES: Record<PointReason, number> = {
  WASTE_RECORD: 5,
  FOOD_WASTE_RECORD: 5,
  DAILY_FIRST_ACTIVITY: 3,
  SEGREGATION_BONUS: 2,
  STREAK_MILESTONE: 10,
  CHALLENGE_COMPLETION: 0, // the challenge row carries its own reward
  ADMIN_ADJUSTMENT: 0,
};

export type PointsConfig = Map<PointReason, { points: number; active: boolean }>;

export function toPointsConfig(rules: PointsRule[]): PointsConfig {
  const map: PointsConfig = new Map();
  for (const rule of rules) {
    map.set(rule.code, { points: rule.points, active: rule.active });
  }
  return map;
}

export function pointsFor(config: PointsConfig, reason: PointReason): number {
  const rule = config.get(reason);
  if (!rule) return DEFAULT_POINT_VALUES[reason];
  if (!rule.active) return 0;
  return rule.points;
}

export type PendingAward = {
  points: number;
  reason: PointReason;
  detail: string;
  /** Together these make the award idempotent. */
  sourceType: string | null;
  sourceId: string | null;
};

export type WasteAwardInput = {
  recordId: string;
  itemType: string;
  disposal: DisposalAction;
};

/** Awards earned by logging one waste record. */
export function awardsForWasteRecord(
  config: PointsConfig,
  input: WasteAwardInput,
): PendingAward[] {
  const awards: PendingAward[] = [];

  const base = pointsFor(config, PointReason.WASTE_RECORD);
  if (base > 0) {
    awards.push({
      points: base,
      reason: PointReason.WASTE_RECORD,
      detail: `Logged ${input.itemType}`,
      sourceType: "waste_record",
      sourceId: input.recordId,
    });
  }

  if (isRecoveryAction(input.disposal)) {
    const bonus = pointsFor(config, PointReason.SEGREGATION_BONUS);
    if (bonus > 0) {
      awards.push({
        points: bonus,
        reason: PointReason.SEGREGATION_BONUS,
        detail: `Diverted ${input.itemType} from landfill`,
        sourceType: "waste_record_segregation",
        sourceId: input.recordId,
      });
    }
  }

  return awards;
}

/** Awards earned by logging one food waste record. */
export function awardsForFoodWasteRecord(
  config: PointsConfig,
  input: { recordId: string; itemType: string },
): PendingAward[] {
  const base = pointsFor(config, PointReason.FOOD_WASTE_RECORD);
  if (base <= 0) return [];
  return [
    {
      points: base,
      reason: PointReason.FOOD_WASTE_RECORD,
      detail: `Logged food waste: ${input.itemType}`,
      sourceType: "food_waste_record",
      sourceId: input.recordId,
    },
  ];
}

/**
 * The once-per-campus-day check-in bonus.
 *
 * `sourceId` is the campus day, so the unique index on
 * (userId, sourceType, sourceId) makes a second award for the same day
 * physically impossible even under concurrent submissions.
 */
export function awardForDailyCheckIn(
  config: PointsConfig,
  campusDay: string,
): PendingAward | null {
  const points = pointsFor(config, PointReason.DAILY_FIRST_ACTIVITY);
  if (points <= 0) return null;
  return {
    points,
    reason: PointReason.DAILY_FIRST_ACTIVITY,
    detail: "First sustainability activity of the day",
    sourceType: "daily_check_in",
    sourceId: campusDay,
  };
}

export function awardForStreakMilestone(
  config: PointsConfig,
  milestone: number,
): PendingAward | null {
  const unit = pointsFor(config, PointReason.STREAK_MILESTONE);
  if (unit <= 0) return null;
  // Longer streaks are worth proportionally more: the configured value is the
  // reward for a 7-day streak and scales linearly with the milestone.
  const points = Math.round((unit * milestone) / 7);
  return {
    points,
    reason: PointReason.STREAK_MILESTONE,
    detail: `Reached a ${milestone}-day activity streak`,
    sourceType: "streak_milestone",
    sourceId: String(milestone),
  };
}

export function awardForChallengeCompletion(
  challenge: { id: string; title: string; points: number },
): PendingAward {
  return {
    points: challenge.points,
    reason: PointReason.CHALLENGE_COMPLETION,
    detail: `Completed challenge: ${challenge.title}`,
    sourceType: "challenge_completion",
    sourceId: challenge.id,
  };
}

/**
 * Persist awards, skipping any that were already granted.
 *
 * Existing awards are looked up first so the returned total reflects exactly
 * what was written — the caller uses it to tell the student "+13 points".
 * The unique (userId, sourceType, sourceId) index remains the real guarantee:
 * even if two concurrent requests both pass the lookup, only one insert wins.
 */
export async function persistAwards(
  tx: Prisma.TransactionClient,
  userId: string,
  awards: PendingAward[],
): Promise<{ awarded: PendingAward[]; total: number }> {
  const payable = awards.filter((a) => a.points !== 0);
  if (payable.length === 0) return { awarded: [], total: 0 };

  const existing = await tx.pointTransaction.findMany({
    where: {
      userId,
      OR: payable.map((a) => ({
        sourceType: a.sourceType,
        sourceId: a.sourceId,
      })),
    },
    select: { sourceType: true, sourceId: true },
  });
  const seen = new Set(existing.map((e) => `${e.sourceType}::${e.sourceId}`));
  const fresh = payable.filter(
    (a) => !seen.has(`${a.sourceType}::${a.sourceId}`),
  );
  if (fresh.length === 0) return { awarded: [], total: 0 };

  await tx.pointTransaction.createMany({
    data: fresh.map((a) => ({
      userId,
      points: a.points,
      reason: a.reason,
      detail: a.detail,
      sourceType: a.sourceType,
      sourceId: a.sourceId,
    })),
    skipDuplicates: true,
  });

  return {
    awarded: fresh,
    total: fresh.reduce((sum, a) => sum + a.points, 0),
  };
}
