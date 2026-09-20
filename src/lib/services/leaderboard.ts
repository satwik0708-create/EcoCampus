import "server-only";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Campus leaderboard.
 *
 * Privacy: the query deliberately selects only `displayName` and the
 * aggregate figures. Email addresses, real names, password hashes and
 * department detail are never loaded, so they cannot leak through the API
 * response even by accident.
 */

export type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  points: number;
  currentStreak: number;
  challengesCompleted: number;
  isCurrentUser: boolean;
};

export type LeaderboardResult = {
  rows: LeaderboardRow[];
  currentUserRow: LeaderboardRow | null;
  totalParticipants: number;
};

type PointsAggregate = { userId: string; points: number };

async function pointsByUser(): Promise<PointsAggregate[]> {
  const grouped = await prisma.pointTransaction.groupBy({
    by: ["userId"],
    _sum: { points: true },
  });
  return grouped.map((row) => ({ userId: row.userId, points: row._sum.points ?? 0 }));
}

export async function getLeaderboard(
  currentUserId: string | null,
  limit = 25,
): Promise<LeaderboardResult> {
  const [students, aggregates, streaks, completions] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.STUDENT, active: true },
      select: { id: true, displayName: true },
    }),
    pointsByUser(),
    prisma.streak.findMany({ select: { userId: true, currentStreak: true } }),
    prisma.challengeParticipation.groupBy({
      by: ["userId"],
      where: { completed: true },
      _count: { _all: true },
    }),
  ]);

  const pointsMap = new Map(aggregates.map((a) => [a.userId, a.points]));
  const streakMap = new Map(streaks.map((s) => [s.userId, s.currentStreak]));
  const completionMap = new Map(completions.map((c) => [c.userId, c._count._all]));

  // Deterministic ordering: points desc, then streak desc, then display name.
  const ranked = students
    .map((student) => ({
      userId: student.id,
      displayName: student.displayName,
      points: pointsMap.get(student.id) ?? 0,
      currentStreak: streakMap.get(student.id) ?? 0,
      challengesCompleted: completionMap.get(student.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.currentStreak - a.currentStreak ||
        a.displayName.localeCompare(b.displayName),
    )
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      isCurrentUser: row.userId === currentUserId,
    }));

  const currentUserRow = currentUserId
    ? (ranked.find((row) => row.userId === currentUserId) ?? null)
    : null;

  return {
    rows: ranked.slice(0, limit),
    currentUserRow,
    totalParticipants: ranked.length,
  };
}
