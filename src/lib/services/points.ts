import "server-only";
import type { PointReason } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** Paginated, auditable view of a student's own point ledger. */

export type PointHistoryEntry = {
  id: string;
  points: number;
  reason: PointReason;
  detail: string;
  createdAt: Date;
};

export type PointHistory = {
  entries: PointHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  balance: number;
  byReason: Array<{ reason: PointReason; points: number; count: number }>;
};

export async function getPointHistory(
  userId: string,
  page = 1,
  pageSize = 20,
): Promise<PointHistory> {
  const [total, entries, balance, grouped] = await Promise.all([
    prisma.pointTransaction.count({ where: { userId } }),
    prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        points: true,
        reason: true,
        detail: true,
        createdAt: true,
      },
    }),
    prisma.pointTransaction.aggregate({ where: { userId }, _sum: { points: true } }),
    prisma.pointTransaction.groupBy({
      by: ["reason"],
      where: { userId },
      _sum: { points: true },
      _count: { _all: true },
    }),
  ]);

  return {
    entries,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    balance: balance._sum.points ?? 0,
    byReason: grouped
      .map((row) => ({
        reason: row.reason,
        points: row._sum.points ?? 0,
        count: row._count._all,
      }))
      .sort((a, b) => b.points - a.points),
  };
}
