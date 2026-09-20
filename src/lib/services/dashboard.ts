import "server-only";
import type {
  FoodCategory,
  MealType,
  Unit,
  WasteCategory,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  DISPOSAL_ACTION_META,
  FOOD_CATEGORY_META,
  MEAL_TYPE_META,
  WASTE_CATEGORY_META,
} from "@/lib/rules/catalog";
import { env } from "@/lib/env";
import { getRecommendationsFor } from "@/lib/services/recommendations";
import type { Recommendation } from "@/lib/recommendations/engine";
import { challengeStatus, progressPercent } from "@/lib/challenges/engine";
import {
  addDays,
  campusDayRange,
  campusDayToDate,
  campusToday,
  dateToCampusDay,
  type CampusDay,
} from "@/lib/time";

/**
 * Student dashboard read model.
 *
 * Every figure below is the result of a query against the student's own rows.
 * Nothing on the dashboard is a constant, and no component computes a
 * statistic locally.
 */

export type DashboardStats = {
  totalPoints: number;
  pointsThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  totalActivities: number;
  wasteRecords: number;
  foodWasteRecords: number;
  challengesJoined: number;
  challengesCompleted: number;
  recoveredRecords: number;
  recordedMassGrams: number;
};

export type DailyActivityPoint = {
  day: CampusDay;
  label: string;
  waste: number;
  food: number;
  total: number;
};

export type CategorySlice = {
  key: string;
  label: string;
  records: number;
  massGrams: number;
};

export type ActiveChallengeCard = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  targetUnit: string;
  percent: number;
  points: number;
  completed: boolean;
  startsOn: CampusDay;
  endsOn: CampusDay;
  status: "upcoming" | "active" | "ended";
  /** Days until the challenge starts (upcoming) or ends (active). */
  daysLeft: number;
};

export type RecentActivityItem = {
  id: string;
  kind: "waste" | "food";
  title: string;
  subtitle: string;
  quantity: number;
  unit: Unit;
  recordedOn: CampusDay;
  createdAt: Date;
};

export type StudentDashboard = {
  stats: DashboardStats;
  weeklyActivity: DailyActivityPoint[];
  wasteByCategory: CategorySlice[];
  foodWasteTrend: DailyActivityPoint[];
  activeChallenges: ActiveChallengeCard[];
  recommendations: Recommendation[];
  recentActivity: RecentActivityItem[];
  today: CampusDay;
};

const WEEK_DAYS = 7;
const TREND_DAYS = 14;

function shortLabel(day: CampusDay): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  }).format(campusDayToDate(day));
}

function dateLabel(day: CampusDay): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(campusDayToDate(day));
}

export async function getStudentDashboard(
  userId: string,
): Promise<StudentDashboard> {
  const today = campusToday(env.campusTimeZone);
  const todayDate = campusDayToDate(today);
  const weekStart = addDays(today, -(WEEK_DAYS - 1));
  const trendStart = addDays(today, -(TREND_DAYS - 1));

  const [
    pointsAgg,
    weekPointsAgg,
    streak,
    wasteCount,
    foodCount,
    recoveredCount,
    wasteMass,
    foodMass,
    participationCount,
    completedCount,
    weekWaste,
    weekFood,
    trendFood,
    wasteGroups,
    wasteMassGroups,
    participations,
    recentWaste,
    recentFood,
    recommendations,
  ] = await Promise.all([
    prisma.pointTransaction.aggregate({ where: { userId }, _sum: { points: true } }),
    prisma.pointTransaction.aggregate({
      where: { userId, createdAt: { gte: campusDayToDate(weekStart) } },
      _sum: { points: true },
    }),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.wasteRecord.count({ where: { userId } }),
    prisma.foodWasteRecord.count({ where: { userId } }),
    prisma.wasteRecord.count({
      where: {
        userId,
        disposal: { in: ["RECYCLE", "COMPOST", "REUSE", "SPECIAL_DISPOSAL"] },
      },
    }),
    prisma.wasteRecord.aggregate({ where: { userId }, _sum: { massGrams: true } }),
    prisma.foodWasteRecord.aggregate({ where: { userId }, _sum: { massGrams: true } }),
    prisma.challengeParticipation.count({ where: { userId } }),
    prisma.challengeParticipation.count({ where: { userId, completed: true } }),
    prisma.wasteRecord.groupBy({
      by: ["recordedOn"],
      where: { userId, recordedOn: { gte: campusDayToDate(weekStart), lte: todayDate } },
      _count: { _all: true },
    }),
    prisma.foodWasteRecord.groupBy({
      by: ["recordedOn"],
      where: { userId, recordedOn: { gte: campusDayToDate(weekStart), lte: todayDate } },
      _count: { _all: true },
    }),
    prisma.foodWasteRecord.groupBy({
      by: ["recordedOn"],
      where: { userId, recordedOn: { gte: campusDayToDate(trendStart), lte: todayDate } },
      _count: { _all: true },
      _sum: { massGrams: true },
    }),
    prisma.wasteRecord.groupBy({
      by: ["category"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.wasteRecord.groupBy({
      by: ["category"],
      where: { userId, massGrams: { not: null } },
      _sum: { massGrams: true },
    }),
    prisma.challengeParticipation.findMany({
      where: {
        userId,
        challenge: { active: true, endDate: { gte: todayDate } },
      },
      include: { challenge: true },
      orderBy: { joinedAt: "desc" },
      take: 6,
    }),
    prisma.wasteRecord.findMany({
      where: { userId },
      orderBy: [{ recordedOn: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.foodWasteRecord.findMany({
      where: { userId },
      orderBy: [{ recordedOn: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    getRecommendationsFor(userId, 3),
  ]);

  const wasteByDay = new Map<CampusDay, number>();
  for (const row of weekWaste) {
    wasteByDay.set(dateToCampusDay(row.recordedOn), row._count._all);
  }
  const foodByDay = new Map<CampusDay, number>();
  for (const row of weekFood) {
    foodByDay.set(dateToCampusDay(row.recordedOn), row._count._all);
  }

  const weeklyActivity: DailyActivityPoint[] = campusDayRange(weekStart, today).map(
    (day) => {
      const waste = wasteByDay.get(day) ?? 0;
      const food = foodByDay.get(day) ?? 0;
      return { day, label: shortLabel(day), waste, food, total: waste + food };
    },
  );

  const foodTrendByDay = new Map<CampusDay, number>();
  for (const row of trendFood) {
    foodTrendByDay.set(dateToCampusDay(row.recordedOn), row._count._all);
  }
  const foodWasteTrend: DailyActivityPoint[] = campusDayRange(trendStart, today).map(
    (day) => {
      const food = foodTrendByDay.get(day) ?? 0;
      return { day, label: dateLabel(day), waste: 0, food, total: food };
    },
  );

  const massByCategory = new Map<WasteCategory, number>();
  for (const row of wasteMassGroups) {
    massByCategory.set(row.category, row._sum.massGrams ?? 0);
  }
  const wasteByCategory: CategorySlice[] = wasteGroups
    .map((row) => ({
      key: row.category,
      label: WASTE_CATEGORY_META[row.category].label,
      records: row._count._all,
      massGrams: Math.round(massByCategory.get(row.category) ?? 0),
    }))
    .sort((a, b) => b.records - a.records);

  const activeChallenges: ActiveChallengeCard[] = participations.map((p) => {
    const endsOn = dateToCampusDay(p.challenge.endDate);
    const startsOn = dateToCampusDay(p.challenge.startDate);
    const status = challengeStatus(p.challenge, today);
    const anchor = status === "upcoming" ? startsOn : endsOn;
    const daysLeft = Math.max(
      0,
      Math.round(
        (campusDayToDate(anchor).getTime() - todayDate.getTime()) / 86_400_000,
      ),
    );
    return {
      id: p.challenge.id,
      title: p.challenge.title,
      description: p.challenge.description,
      progress: p.progress,
      target: p.challenge.target,
      targetUnit: p.challenge.targetUnit,
      percent: progressPercent(p.progress, p.challenge.target),
      points: p.challenge.points,
      completed: p.completed,
      startsOn,
      endsOn,
      status,
      daysLeft,
    };
  });

  const recentActivity: RecentActivityItem[] = [
    ...recentWaste.map((r) => ({
      id: r.id,
      kind: "waste" as const,
      title: r.itemType,
      subtitle: WASTE_CATEGORY_META[r.category].label,
      quantity: r.quantity,
      unit: r.unit,
      recordedOn: dateToCampusDay(r.recordedOn),
      createdAt: r.createdAt,
    })),
    ...recentFood.map((r) => ({
      id: r.id,
      kind: "food" as const,
      title: r.itemType,
      subtitle: `${FOOD_CATEGORY_META[r.foodCategory].label} · ${
        MEAL_TYPE_META[r.mealType as MealType].label
      }`,
      quantity: r.quantity,
      unit: r.unit,
      recordedOn: dateToCampusDay(r.recordedOn),
      createdAt: r.createdAt,
    })),
  ]
    .sort(
      (a, b) =>
        b.recordedOn.localeCompare(a.recordedOn) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    )
    .slice(0, 8);

  return {
    today,
    stats: {
      totalPoints: pointsAgg._sum.points ?? 0,
      pointsThisWeek: weekPointsAgg._sum.points ?? 0,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      totalActivities: wasteCount + foodCount,
      wasteRecords: wasteCount,
      foodWasteRecords: foodCount,
      challengesJoined: participationCount,
      challengesCompleted: completedCount,
      recoveredRecords: recoveredCount,
      recordedMassGrams: Math.round(
        (wasteMass._sum.massGrams ?? 0) + (foodMass._sum.massGrams ?? 0),
      ),
    },
    weeklyActivity,
    wasteByCategory,
    foodWasteTrend,
    activeChallenges,
    recommendations,
    recentActivity,
  };
}

// ---------------------------------------------------------------------------
// Food waste analytics (its own page)
// ---------------------------------------------------------------------------

export type FoodWasteAnalytics = {
  totalRecords: number;
  avoidableRecords: number;
  recordedMassGrams: number;
  byCategory: Array<{ key: FoodCategory; label: string; records: number; massGrams: number }>;
  byMeal: Array<{ key: MealType; label: string; records: number }>;
  trend: Array<{ day: CampusDay; label: string; records: number; massGrams: number }>;
};

export async function getFoodWasteAnalytics(
  userId: string,
  days = 30,
): Promise<FoodWasteAnalytics> {
  const today = campusToday(env.campusTimeZone);
  const start = addDays(today, -(days - 1));
  const startDate = campusDayToDate(start);
  const todayDate = campusDayToDate(today);

  const [total, avoidable, mass, byCategory, byMeal, trendRows] = await Promise.all([
    prisma.foodWasteRecord.count({ where: { userId } }),
    prisma.foodWasteRecord.count({ where: { userId, avoidable: true } }),
    prisma.foodWasteRecord.aggregate({ where: { userId }, _sum: { massGrams: true } }),
    prisma.foodWasteRecord.groupBy({
      by: ["foodCategory"],
      where: { userId },
      _count: { _all: true },
      _sum: { massGrams: true },
    }),
    prisma.foodWasteRecord.groupBy({
      by: ["mealType"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.foodWasteRecord.groupBy({
      by: ["recordedOn"],
      where: { userId, recordedOn: { gte: startDate, lte: todayDate } },
      _count: { _all: true },
      _sum: { massGrams: true },
    }),
  ]);

  const trendMap = new Map<CampusDay, { records: number; massGrams: number }>();
  for (const row of trendRows) {
    trendMap.set(dateToCampusDay(row.recordedOn), {
      records: row._count._all,
      massGrams: Math.round(row._sum.massGrams ?? 0),
    });
  }

  return {
    totalRecords: total,
    avoidableRecords: avoidable,
    recordedMassGrams: Math.round(mass._sum.massGrams ?? 0),
    byCategory: byCategory
      .map((row) => ({
        key: row.foodCategory,
        label: FOOD_CATEGORY_META[row.foodCategory].label,
        records: row._count._all,
        massGrams: Math.round(row._sum.massGrams ?? 0),
      }))
      .sort((a, b) => b.records - a.records),
    byMeal: byMeal
      .map((row) => ({
        key: row.mealType,
        label: MEAL_TYPE_META[row.mealType].label,
        records: row._count._all,
      }))
      .sort((a, b) => b.records - a.records),
    trend: campusDayRange(start, today).map((day) => ({
      day,
      label: dateLabel(day),
      records: trendMap.get(day)?.records ?? 0,
      massGrams: trendMap.get(day)?.massGrams ?? 0,
    })),
  };
}

// ---------------------------------------------------------------------------
// Waste analytics (tracker page)
// ---------------------------------------------------------------------------

export type WasteAnalytics = {
  totalRecords: number;
  recoveredRecords: number;
  recordedMassGrams: number;
  byCategory: Array<{ key: WasteCategory; label: string; records: number; massGrams: number }>;
  byDisposal: Array<{ key: string; label: string; records: number }>;
  trend: Array<{ day: CampusDay; label: string; records: number }>;
};

export async function getWasteAnalytics(
  userId: string,
  days = 30,
): Promise<WasteAnalytics> {
  const today = campusToday(env.campusTimeZone);
  const start = addDays(today, -(days - 1));
  const startDate = campusDayToDate(start);
  const todayDate = campusDayToDate(today);

  const [total, recovered, mass, byCategory, byDisposal, trendRows] = await Promise.all([
    prisma.wasteRecord.count({ where: { userId } }),
    prisma.wasteRecord.count({
      where: {
        userId,
        disposal: { in: ["RECYCLE", "COMPOST", "REUSE", "SPECIAL_DISPOSAL"] },
      },
    }),
    prisma.wasteRecord.aggregate({ where: { userId }, _sum: { massGrams: true } }),
    prisma.wasteRecord.groupBy({
      by: ["category"],
      where: { userId },
      _count: { _all: true },
      _sum: { massGrams: true },
    }),
    prisma.wasteRecord.groupBy({
      by: ["disposal"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.wasteRecord.groupBy({
      by: ["recordedOn"],
      where: { userId, recordedOn: { gte: startDate, lte: todayDate } },
      _count: { _all: true },
    }),
  ]);

  const trendMap = new Map<CampusDay, number>();
  for (const row of trendRows) {
    trendMap.set(dateToCampusDay(row.recordedOn), row._count._all);
  }

  return {
    totalRecords: total,
    recoveredRecords: recovered,
    recordedMassGrams: Math.round(mass._sum.massGrams ?? 0),
    byCategory: byCategory
      .map((row) => ({
        key: row.category,
        label: WASTE_CATEGORY_META[row.category].label,
        records: row._count._all,
        massGrams: Math.round(row._sum.massGrams ?? 0),
      }))
      .sort((a, b) => b.records - a.records),
    byDisposal: byDisposal
      .map((row) => ({
        key: row.disposal,
        label: DISPOSAL_ACTION_META[row.disposal].label,
        records: row._count._all,
      }))
      .sort((a, b) => b.records - a.records),
    trend: campusDayRange(start, today).map((day) => ({
      day,
      label: dateLabel(day),
      records: trendMap.get(day) ?? 0,
    })),
  };
}
