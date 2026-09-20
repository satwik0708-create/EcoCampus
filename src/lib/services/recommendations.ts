import "server-only";
import type { FoodCategory, WasteCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import {
  evaluateRecommendations,
  requiredWindows,
  type ActivitySnapshot,
  type Recommendation,
} from "@/lib/recommendations/engine";
import { campusDayToDate, campusToday, dateToCampusDay } from "@/lib/time";

/**
 * Builds the deterministic input the recommendation engine reads.
 *
 * Only the look-back windows that active rules actually reference are
 * queried, so adding a rule with a 14-day window does not silently make every
 * dashboard load run extra queries for windows nobody uses.
 */
export async function buildActivitySnapshot(
  userId: string,
  windows: number[],
): Promise<ActivitySnapshot> {
  const today = campusToday(env.campusTimeZone);
  const todayDate = campusDayToDate(today);

  const [latestWaste, latestFood, openParticipation, streak, todayWaste, todayFood] =
    await Promise.all([
      prisma.wasteRecord.findFirst({
        where: { userId },
        orderBy: [{ recordedOn: "desc" }, { createdAt: "desc" }],
        select: { category: true, recordedOn: true },
      }),
      prisma.foodWasteRecord.findFirst({
        where: { userId },
        orderBy: [{ recordedOn: "desc" }, { createdAt: "desc" }],
        select: { foodCategory: true, recordedOn: true },
      }),
      prisma.challengeParticipation.count({
        where: {
          userId,
          completed: false,
          challenge: {
            active: true,
            startDate: { lte: todayDate },
            endDate: { gte: todayDate },
          },
        },
      }),
      prisma.streak.findUnique({ where: { userId } }),
      prisma.wasteRecord.count({ where: { userId, recordedOn: todayDate } }),
      prisma.foodWasteRecord.count({ where: { userId, recordedOn: todayDate } }),
    ]);

  const wasteCountsByWindow = new Map<number, Map<WasteCategory, number>>();
  const foodCountsByWindow = new Map<number, Map<FoodCategory, number>>();
  const foodTotalsByWindow = new Map<number, number>();

  for (const windowDays of windows) {
    const since = new Date(todayDate);
    since.setUTCDate(since.getUTCDate() - (windowDays - 1));

    const [wasteGroups, foodGroups] = await Promise.all([
      prisma.wasteRecord.groupBy({
        by: ["category"],
        where: { userId, recordedOn: { gte: since, lte: todayDate } },
        _count: { _all: true },
      }),
      prisma.foodWasteRecord.groupBy({
        by: ["foodCategory"],
        where: { userId, recordedOn: { gte: since, lte: todayDate } },
        _count: { _all: true },
      }),
    ]);

    const wasteMap = new Map<WasteCategory, number>();
    for (const row of wasteGroups) wasteMap.set(row.category, row._count._all);
    wasteCountsByWindow.set(windowDays, wasteMap);

    const foodMap = new Map<FoodCategory, number>();
    let foodTotal = 0;
    for (const row of foodGroups) {
      foodMap.set(row.foodCategory, row._count._all);
      foodTotal += row._count._all;
    }
    foodCountsByWindow.set(windowDays, foodMap);
    foodTotalsByWindow.set(windowDays, foodTotal);
  }

  const lastDays = [
    latestWaste ? dateToCampusDay(latestWaste.recordedOn) : null,
    latestFood ? dateToCampusDay(latestFood.recordedOn) : null,
  ].filter((d): d is string => d !== null);

  return {
    today,
    latestWasteCategory: latestWaste?.category ?? null,
    latestFoodCategory: latestFood?.foodCategory ?? null,
    lastActivityDay: lastDays.length ? lastDays.sort().at(-1)! : null,
    wasteCountsByWindow,
    foodCountsByWindow,
    foodTotalsByWindow,
    hasActiveChallenge: openParticipation > 0,
    currentStreak: streak?.currentStreak ?? 0,
    recordedToday: todayWaste + todayFood > 0,
  };
}

/** The student's current recommendations, highest priority first. */
export async function getRecommendationsFor(
  userId: string,
  limit = 3,
): Promise<Recommendation[]> {
  const rules = await prisma.recommendationRule.findMany({
    where: { active: true },
    orderBy: [{ priority: "asc" }, { code: "asc" }],
  });
  if (rules.length === 0) return [];

  const snapshot = await buildActivitySnapshot(userId, requiredWindows(rules));
  return evaluateRecommendations(rules, snapshot, limit);
}
