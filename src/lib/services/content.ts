import "server-only";
import {
  AdminAction,
  Prisma,
  type ContentCategory,
  type WasteCategory,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Database-driven content: the waste guide and the learning library.
 *
 * Nothing here is hardcoded into a React component — administrators create,
 * edit and unpublish every entry through the admin console, and the student
 * pages simply read what is published.
 */

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Append a numeric suffix until the slug is free. */
export async function uniqueSlug(
  table: "disposalGuide" | "educationalContent" | "challenge",
  base: string,
  ignoreId?: string,
): Promise<string> {
  const root = slugify(base) || "entry";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const existing =
      table === "disposalGuide"
        ? await prisma.disposalGuide.findUnique({ where: { slug: candidate } })
        : table === "educationalContent"
          ? await prisma.educationalContent.findUnique({ where: { slug: candidate } })
          : await prisma.challenge.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === ignoreId) return candidate;
  }
  return `${root}-${Date.now()}`;
}

// --- Waste guide -----------------------------------------------------------

export type GuideFilters = {
  q?: string;
  category?: WasteCategory;
  includeUnpublished?: boolean;
};

export async function listGuides(filters: GuideFilters = {}) {
  const where: Prisma.DisposalGuideWhereInput = {};
  if (!filters.includeUnpublished) where.published = true;
  if (filters.category) where.category = filters.category;
  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { item: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { keywords: { has: q.toLowerCase() } },
    ];
  }
  return prisma.disposalGuide.findMany({
    where,
    orderBy: [{ category: "asc" }, { item: "asc" }],
  });
}

export async function getGuideBySlug(slug: string, includeUnpublished = false) {
  const guide = await prisma.disposalGuide.findUnique({ where: { slug } });
  if (!guide) return null;
  if (!guide.published && !includeUnpublished) return null;
  return guide;
}

// --- Educational content ---------------------------------------------------

export type ContentFilters = {
  q?: string;
  category?: ContentCategory;
  includeUnpublished?: boolean;
};

export async function listArticles(filters: ContentFilters = {}) {
  const where: Prisma.EducationalContentWhereInput = {};
  if (!filters.includeUnpublished) where.published = true;
  if (filters.category) where.category = filters.category;
  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  return prisma.educationalContent.findMany({
    where,
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
}

export async function getArticleBySlug(slug: string, includeUnpublished = false) {
  const article = await prisma.educationalContent.findUnique({ where: { slug } });
  if (!article) return null;
  if (!article.published && !includeUnpublished) return null;
  return article;
}

// --- Audit trail -----------------------------------------------------------

export async function recordAdminActivity(
  adminId: string,
  action: AdminAction,
  entityType: string,
  entityId: string,
  summary: string,
): Promise<void> {
  await prisma.adminActivity.create({
    data: { adminId, action, entityType, entityId, summary: summary.slice(0, 300) },
  });
}

export async function listAdminActivity(limit = 20) {
  return prisma.adminActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { name: true, displayName: true } } },
  });
}

export { AdminAction };
