import {
  ChallengeMetric,
  ChallengeScope,
  type Challenge,
  type Prisma,
} from "@prisma/client";
import { dateToCampusDay, type CampusDay } from "@/lib/time";

/**
 * Challenge progress engine.
 *
 * Progress is always RECOMPUTED from the student's real waste / food-waste
 * records inside the challenge window. There is no "mark complete" action
 * anywhere in the product — the API surface simply does not expose one.
 */

export type ProgressResult = {
  progress: number;
  completed: boolean;
};

function wasteWhere(challenge: Challenge, userId: string): Prisma.WasteRecordWhereInput {
  return {
    userId,
    recordedOn: { gte: challenge.startDate, lte: challenge.endDate },
    ...(challenge.wasteCategory ? { category: challenge.wasteCategory } : {}),
    ...(challenge.disposal ? { disposal: challenge.disposal } : {}),
  };
}

function foodWhere(
  challenge: Challenge,
  userId: string,
): Prisma.FoodWasteRecordWhereInput {
  return {
    userId,
    recordedOn: { gte: challenge.startDate, lte: challenge.endDate },
    ...(challenge.foodCategory ? { foodCategory: challenge.foodCategory } : {}),
  };
}

const countsWaste = (scope: ChallengeScope) =>
  scope === ChallengeScope.WASTE || scope === ChallengeScope.ANY;
const countsFood = (scope: ChallengeScope) =>
  scope === ChallengeScope.FOOD_WASTE || scope === ChallengeScope.ANY;

/** Raw measured value of a challenge metric for one student. */
export async function measureProgress(
  tx: Prisma.TransactionClient,
  challenge: Challenge,
  userId: string,
): Promise<number> {
  switch (challenge.metric) {
    case ChallengeMetric.RECORD_COUNT: {
      let total = 0;
      if (countsWaste(challenge.scope)) {
        total += await tx.wasteRecord.count({ where: wasteWhere(challenge, userId) });
      }
      if (countsFood(challenge.scope)) {
        total += await tx.foodWasteRecord.count({ where: foodWhere(challenge, userId) });
      }
      return total;
    }

    case ChallengeMetric.ACTIVE_DAYS: {
      const days = new Set<CampusDay>();
      if (countsWaste(challenge.scope)) {
        const rows = await tx.wasteRecord.findMany({
          where: wasteWhere(challenge, userId),
          select: { recordedOn: true },
          distinct: ["recordedOn"],
        });
        for (const row of rows) days.add(dateToCampusDay(row.recordedOn));
      }
      if (countsFood(challenge.scope)) {
        const rows = await tx.foodWasteRecord.findMany({
          where: foodWhere(challenge, userId),
          select: { recordedOn: true },
          distinct: ["recordedOn"],
        });
        for (const row of rows) days.add(dateToCampusDay(row.recordedOn));
      }
      return days.size;
    }

    case ChallengeMetric.MASS_GRAMS: {
      let total = 0;
      if (countsWaste(challenge.scope)) {
        const agg = await tx.wasteRecord.aggregate({
          where: { ...wasteWhere(challenge, userId), massGrams: { not: null } },
          _sum: { massGrams: true },
        });
        total += agg._sum.massGrams ?? 0;
      }
      if (countsFood(challenge.scope)) {
        const agg = await tx.foodWasteRecord.aggregate({
          where: { ...foodWhere(challenge, userId), massGrams: { not: null } },
          _sum: { massGrams: true },
        });
        total += agg._sum.massGrams ?? 0;
      }
      return Math.round(total * 100) / 100;
    }

    default:
      return 0;
  }
}

/** A challenge is in-flight on `today` when it is active and inside its window. */
export function isChallengeOpen(challenge: Challenge, today: CampusDay): boolean {
  return (
    challenge.active &&
    dateToCampusDay(challenge.startDate) <= today &&
    dateToCampusDay(challenge.endDate) >= today
  );
}

export function progressPercent(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100));
}

export type ChallengeStatus = "upcoming" | "active" | "ended";

export function challengeStatus(
  challenge: Pick<Challenge, "startDate" | "endDate" | "active">,
  today: CampusDay,
): ChallengeStatus {
  if (dateToCampusDay(challenge.startDate) > today) return "upcoming";
  if (dateToCampusDay(challenge.endDate) < today) return "ended";
  return challenge.active ? "active" : "ended";
}
