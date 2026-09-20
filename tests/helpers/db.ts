import { PrismaClient, PointReason, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Integration-test support.
 *
 * These tests run against a real PostgreSQL database — the same engine the
 * application uses — because the behaviour under test (transactional point
 * awards, unique-constraint idempotency, aggregate queries) cannot be
 * meaningfully verified against a mock.
 *
 * Every test creates users with a unique prefix and removes them afterwards,
 * so a run leaves the development data intact.
 */
export const prisma = new PrismaClient();

export const TEST_PREFIX = "vitest-";

export async function ensurePointsRules(): Promise<void> {
  const defaults: Array<{ code: PointReason; points: number }> = [
    { code: PointReason.WASTE_RECORD, points: 5 },
    { code: PointReason.FOOD_WASTE_RECORD, points: 5 },
    { code: PointReason.DAILY_FIRST_ACTIVITY, points: 3 },
    { code: PointReason.SEGREGATION_BONUS, points: 2 },
    { code: PointReason.STREAK_MILESTONE, points: 10 },
  ];
  for (const rule of defaults) {
    await prisma.pointsRule.upsert({
      where: { code: rule.code },
      create: {
        code: rule.code,
        label: rule.code,
        description: "Installed by the integration test suite.",
        points: rule.points,
        active: true,
      },
      update: { points: rule.points, active: true },
    });
  }
}

let counter = 0;

export async function createTestStudent(label = "student") {
  counter += 1;
  const email = `${TEST_PREFIX}${label}-${Date.now()}-${counter}@test.local`;
  return prisma.user.create({
    data: {
      name: `Test ${label}`,
      displayName: `${TEST_PREFIX}${label}-${counter}`,
      email,
      // Cost 4 keeps the suite fast; production uses 12.
      passwordHash: await bcrypt.hash("IntegrationTest2026", 4),
      role: Role.STUDENT,
      streak: { create: {} },
    },
  });
}

export async function createTestAdmin() {
  counter += 1;
  return prisma.user.create({
    data: {
      name: "Test admin",
      displayName: `${TEST_PREFIX}admin-${counter}`,
      email: `${TEST_PREFIX}admin-${Date.now()}-${counter}@test.local`,
      passwordHash: await bcrypt.hash("IntegrationTest2026", 4),
      role: Role.ADMIN,
    },
  });
}

export async function cleanupTestData(): Promise<void> {
  // Cascades remove the records, points, streaks and participations.
  await prisma.user.deleteMany({
    where: { email: { startsWith: TEST_PREFIX } },
  });
  await prisma.challenge.deleteMany({
    where: { slug: { startsWith: TEST_PREFIX } },
  });
}

export async function totalPoints(userId: string): Promise<number> {
  const result = await prisma.pointTransaction.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}
