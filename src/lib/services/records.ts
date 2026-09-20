import "server-only";
import {
  FoodCategory,
  Prisma,
  WasteCategory,
  type Unit,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { campusDayToDate, dateToCampusDay } from "@/lib/time";

/**
 * Paginated record browsing for the admin console.
 *
 * Note what is selected: the student's `displayName` and department, never
 * their email. Administrators get institutional oversight without being
 * handed a mailing list.
 */

export type RecordFilters = {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  category?: string;
  departmentId?: string;
  q?: string;
};

export type AdminWasteRow = {
  id: string;
  student: string;
  department: string | null;
  category: WasteCategory;
  itemType: string;
  quantity: number;
  unit: Unit;
  disposal: string;
  recordedOn: string;
  notes: string | null;
};

export type AdminFoodRow = {
  id: string;
  student: string;
  department: string | null;
  foodCategory: FoodCategory;
  mealType: string;
  itemType: string;
  quantity: number;
  unit: Unit;
  avoidable: boolean;
  recordedOn: string;
  notes: string | null;
};

export type Paged<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function dateRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  const range: Prisma.DateTimeFilter = {};
  if (from) range.gte = campusDayToDate(from);
  if (to) range.lte = campusDayToDate(to);
  return range;
}

export async function listWasteRecords(
  filters: RecordFilters,
): Promise<Paged<AdminWasteRow>> {
  const where: Prisma.WasteRecordWhereInput = {};
  const recordedOn = dateRange(filters.from, filters.to);
  if (recordedOn) where.recordedOn = recordedOn;
  if (filters.category && filters.category in WasteCategory) {
    where.category = filters.category as WasteCategory;
  }
  if (filters.departmentId) where.user = { departmentId: filters.departmentId };
  if (filters.q) {
    where.OR = [
      { itemType: { contains: filters.q, mode: "insensitive" } },
      { user: { displayName: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.wasteRecord.count({ where }),
    prisma.wasteRecord.findMany({
      where,
      orderBy: [{ recordedOn: "desc" }, { createdAt: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        category: true,
        itemType: true,
        quantity: true,
        unit: true,
        disposal: true,
        recordedOn: true,
        notes: true,
        user: {
          select: { displayName: true, department: { select: { name: true } } },
        },
      },
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    rows: rows.map((row) => ({
      id: row.id,
      student: row.user.displayName,
      department: row.user.department?.name ?? null,
      category: row.category,
      itemType: row.itemType,
      quantity: row.quantity,
      unit: row.unit,
      disposal: row.disposal,
      recordedOn: dateToCampusDay(row.recordedOn),
      notes: row.notes,
    })),
  };
}

export async function listFoodWasteRecords(
  filters: RecordFilters,
): Promise<Paged<AdminFoodRow>> {
  const where: Prisma.FoodWasteRecordWhereInput = {};
  const recordedOn = dateRange(filters.from, filters.to);
  if (recordedOn) where.recordedOn = recordedOn;
  if (filters.category && filters.category in FoodCategory) {
    where.foodCategory = filters.category as FoodCategory;
  }
  if (filters.departmentId) where.user = { departmentId: filters.departmentId };
  if (filters.q) {
    where.OR = [
      { itemType: { contains: filters.q, mode: "insensitive" } },
      { user: { displayName: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.foodWasteRecord.count({ where }),
    prisma.foodWasteRecord.findMany({
      where,
      orderBy: [{ recordedOn: "desc" }, { createdAt: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        foodCategory: true,
        mealType: true,
        itemType: true,
        quantity: true,
        unit: true,
        avoidable: true,
        recordedOn: true,
        notes: true,
        user: {
          select: { displayName: true, department: { select: { name: true } } },
        },
      },
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    rows: rows.map((row) => ({
      id: row.id,
      student: row.user.displayName,
      department: row.user.department?.name ?? null,
      foodCategory: row.foodCategory,
      mealType: row.mealType,
      itemType: row.itemType,
      quantity: row.quantity,
      unit: row.unit,
      avoidable: row.avoidable,
      recordedOn: dateToCampusDay(row.recordedOn),
      notes: row.notes,
    })),
  };
}

/** A student's own records, for their tracker history tables. */
export async function listOwnWasteRecords(
  userId: string,
  page = 1,
  pageSize = 10,
) {
  const [total, rows] = await Promise.all([
    prisma.wasteRecord.count({ where: { userId } }),
    prisma.wasteRecord.findMany({
      where: { userId },
      orderBy: [{ recordedOn: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows: rows.map((row) => ({
      ...row,
      recordedOn: dateToCampusDay(row.recordedOn),
    })),
  };
}

export async function listOwnFoodWasteRecords(
  userId: string,
  page = 1,
  pageSize = 10,
) {
  const [total, rows] = await Promise.all([
    prisma.foodWasteRecord.count({ where: { userId } }),
    prisma.foodWasteRecord.findMany({
      where: { userId },
      orderBy: [{ recordedOn: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    rows: rows.map((row) => ({
      ...row,
      recordedOn: dateToCampusDay(row.recordedOn),
    })),
  };
}
