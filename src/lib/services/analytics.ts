import "server-only";
import { Role, type FoodCategory, type WasteCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import {
  DISPOSAL_ACTION_META,
  FOOD_CATEGORY_META,
  WASTE_CATEGORY_META,
} from "@/lib/rules/catalog";
import {
  addDays,
  campusDayRange,
  campusDayToDate,
  campusToday,
  dateToCampusDay,
  type CampusDay,
} from "@/lib/time";

/**
 * Institutional analytics.
 *
 * Every figure is an aggregate query over the whole campus dataset. The admin
 * console reads counts and sums — it never pages through individual students'
 * private records to compute a statistic client-side.
 */

export type AdminOverview = {
  totalStudents: number;
  activeStudents: number;
  /** Students with at least one record in the last 30 campus days. */
  engagedStudents: number;
  totalWasteRecords: number;
  totalFoodWasteRecords: number;
  totalActivities: number;
  totalPointsAwarded: number;
  challengeParticipations: number;
  challengesCompleted: number;
  activeChallenges: number;
  recoveryRate: number;
  recordedMassGrams: number;
  publishedGuides: number;
  publishedArticles: number;
};

export type TrendPoint = {
  day: CampusDay;
  label: string;
  waste: number;
  food: number;
  total: number;
};

export type AdminAnalytics = {
  overview: AdminOverview;
  wasteByCategory: Array<{ key: WasteCategory; label: string; records: number; massGrams: number }>;
  foodByCategory: Array<{ key: FoodCategory; label: string; records: number; massGrams: number }>;
  disposalSplit: Array<{ key: string; label: string; records: number }>;
  activityTrend: TrendPoint[];
  participationTrend: Array<{ day: CampusDay; label: string; students: number }>;
  challengeEngagement: Array<{
    id: string;
    title: string;
    participants: number;
    completed: number;
    completionRate: number;
    points: number;
  }>;
  departmentBreakdown: Array<{
    id: string;
    name: string;
    students: number;
    records: number;
    points: number;
  }>;
  today: CampusDay;
  windowDays: number;
};

function dateLabel(day: CampusDay): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(campusDayToDate(day));
}

export async function getAdminAnalytics(windowDays = 30): Promise<AdminAnalytics> {
  const today = campusToday(env.campusTimeZone);
  const todayDate = campusDayToDate(today);
  const start = addDays(today, -(windowDays - 1));
  const startDate = campusDayToDate(start);
  const engagementStart = campusDayToDate(addDays(today, -29));

  const [
    totalStudents,
    activeStudents,
    totalWasteRecords,
    totalFoodWasteRecords,
    pointsAgg,
    participations,
    completed,
    activeChallenges,
    recoveredRecords,
    wasteMass,
    foodMass,
    publishedGuides,
    publishedArticles,
    wasteByCategory,
    foodByCategory,
    disposalSplit,
    wasteTrend,
    foodTrend,
    challenges,
    departments,
  ] = await Promise.all([
    prisma.user.count({ where: { role: Role.STUDENT } }),
    prisma.user.count({ where: { role: Role.STUDENT, active: true } }),
    prisma.wasteRecord.count(),
    prisma.foodWasteRecord.count(),
    prisma.pointTransaction.aggregate({ _sum: { points: true } }),
    prisma.challengeParticipation.count(),
    prisma.challengeParticipation.count({ where: { completed: true } }),
    prisma.challenge.count({
      where: { active: true, startDate: { lte: todayDate }, endDate: { gte: todayDate } },
    }),
    prisma.wasteRecord.count({
      where: { disposal: { in: ["RECYCLE", "COMPOST", "REUSE", "SPECIAL_DISPOSAL"] } },
    }),
    prisma.wasteRecord.aggregate({ _sum: { massGrams: true } }),
    prisma.foodWasteRecord.aggregate({ _sum: { massGrams: true } }),
    prisma.disposalGuide.count({ where: { published: true } }),
    prisma.educationalContent.count({ where: { published: true } }),
    prisma.wasteRecord.groupBy({
      by: ["category"],
      _count: { _all: true },
      _sum: { massGrams: true },
    }),
    prisma.foodWasteRecord.groupBy({
      by: ["foodCategory"],
      _count: { _all: true },
      _sum: { massGrams: true },
    }),
    prisma.wasteRecord.groupBy({ by: ["disposal"], _count: { _all: true } }),
    prisma.wasteRecord.groupBy({
      by: ["recordedOn"],
      where: { recordedOn: { gte: startDate, lte: todayDate } },
      _count: { _all: true },
    }),
    prisma.foodWasteRecord.groupBy({
      by: ["recordedOn"],
      where: { recordedOn: { gte: startDate, lte: todayDate } },
      _count: { _all: true },
    }),
    prisma.challenge.findMany({
      orderBy: { startDate: "desc" },
      take: 12,
      include: {
        _count: { select: { participations: true } },
        participations: { where: { completed: true }, select: { id: true } },
      },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  // --- engagement (students with any record in the last 30 days) -----------
  const [engagedWaste, engagedFood] = await Promise.all([
    prisma.wasteRecord.findMany({
      where: { recordedOn: { gte: engagementStart, lte: todayDate } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.foodWasteRecord.findMany({
      where: { recordedOn: { gte: engagementStart, lte: todayDate } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);
  const engagedSet = new Set([
    ...engagedWaste.map((r) => r.userId),
    ...engagedFood.map((r) => r.userId),
  ]);

  // --- daily participation (distinct students recording per day) -----------
  const [dailyWasteUsers, dailyFoodUsers] = await Promise.all([
    prisma.wasteRecord.findMany({
      where: { recordedOn: { gte: startDate, lte: todayDate } },
      select: { userId: true, recordedOn: true },
      distinct: ["userId", "recordedOn"],
    }),
    prisma.foodWasteRecord.findMany({
      where: { recordedOn: { gte: startDate, lte: todayDate } },
      select: { userId: true, recordedOn: true },
      distinct: ["userId", "recordedOn"],
    }),
  ]);

  const participantsByDay = new Map<CampusDay, Set<string>>();
  for (const row of [...dailyWasteUsers, ...dailyFoodUsers]) {
    const day = dateToCampusDay(row.recordedOn);
    const set = participantsByDay.get(day) ?? new Set<string>();
    set.add(row.userId);
    participantsByDay.set(day, set);
  }

  const wasteByDay = new Map<CampusDay, number>();
  for (const row of wasteTrend) {
    wasteByDay.set(dateToCampusDay(row.recordedOn), row._count._all);
  }
  const foodByDay = new Map<CampusDay, number>();
  for (const row of foodTrend) {
    foodByDay.set(dateToCampusDay(row.recordedOn), row._count._all);
  }

  const days = campusDayRange(start, today);

  const departmentStats = await Promise.all(
    departments.map(async (department) => {
      const [students, waste, food, points] = await Promise.all([
        prisma.user.count({
          where: { departmentId: department.id, role: Role.STUDENT },
        }),
        prisma.wasteRecord.count({
          where: { user: { departmentId: department.id } },
        }),
        prisma.foodWasteRecord.count({
          where: { user: { departmentId: department.id } },
        }),
        prisma.pointTransaction.aggregate({
          where: { user: { departmentId: department.id } },
          _sum: { points: true },
        }),
      ]);
      return {
        id: department.id,
        name: department.name,
        students,
        records: waste + food,
        points: points._sum.points ?? 0,
      };
    }),
  );

  const totalWasteForRate = totalWasteRecords;

  return {
    today,
    windowDays,
    overview: {
      totalStudents,
      activeStudents,
      engagedStudents: engagedSet.size,
      totalWasteRecords,
      totalFoodWasteRecords,
      totalActivities: totalWasteRecords + totalFoodWasteRecords,
      totalPointsAwarded: pointsAgg._sum.points ?? 0,
      challengeParticipations: participations,
      challengesCompleted: completed,
      activeChallenges,
      recoveryRate:
        totalWasteForRate > 0
          ? Math.round((recoveredRecords / totalWasteForRate) * 100)
          : 0,
      recordedMassGrams: Math.round(
        (wasteMass._sum.massGrams ?? 0) + (foodMass._sum.massGrams ?? 0),
      ),
      publishedGuides,
      publishedArticles,
    },
    wasteByCategory: wasteByCategory
      .map((row) => ({
        key: row.category,
        label: WASTE_CATEGORY_META[row.category].label,
        records: row._count._all,
        massGrams: Math.round(row._sum.massGrams ?? 0),
      }))
      .sort((a, b) => b.records - a.records),
    foodByCategory: foodByCategory
      .map((row) => ({
        key: row.foodCategory,
        label: FOOD_CATEGORY_META[row.foodCategory].label,
        records: row._count._all,
        massGrams: Math.round(row._sum.massGrams ?? 0),
      }))
      .sort((a, b) => b.records - a.records),
    disposalSplit: disposalSplit
      .map((row) => ({
        key: row.disposal,
        label: DISPOSAL_ACTION_META[row.disposal].label,
        records: row._count._all,
      }))
      .sort((a, b) => b.records - a.records),
    activityTrend: days.map((day) => {
      const waste = wasteByDay.get(day) ?? 0;
      const food = foodByDay.get(day) ?? 0;
      return { day, label: dateLabel(day), waste, food, total: waste + food };
    }),
    participationTrend: days.map((day) => ({
      day,
      label: dateLabel(day),
      students: participantsByDay.get(day)?.size ?? 0,
    })),
    challengeEngagement: challenges.map((challenge) => {
      const participants = challenge._count.participations;
      const completedCount = challenge.participations.length;
      return {
        id: challenge.id,
        title: challenge.title,
        participants,
        completed: completedCount,
        completionRate:
          participants > 0 ? Math.round((completedCount / participants) * 100) : 0,
        points: challenge.points,
      };
    }),
    departmentBreakdown: departmentStats.sort((a, b) => b.records - a.records),
  };
}
