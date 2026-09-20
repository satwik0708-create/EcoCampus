/**
 * Development seed.
 *
 * ---------------------------------------------------------------------------
 * THIS SCRIPT IS FOR DEVELOPMENT AND DEMONSTRATION ONLY.
 * It refuses to run when NODE_ENV=production.
 * ---------------------------------------------------------------------------
 *
 * Two kinds of data are inserted, and the distinction matters:
 *
 *  1. REFERENCE DATA (departments, points rules, recommendation rules, waste
 *     guide entries, learning articles). A real deployment genuinely wants
 *     this — it is configuration and editorial content, not fake usage.
 *
 *  2. DEMO ACTIVITY (demo accounts and their waste / food waste records).
 *     This exists so the dashboards have something to display. Critically,
 *     the records are inserted as ordinary records and then the *real*
 *     engines are run over them — the seed never writes a points total, a
 *     streak value or a challenge progress figure directly. Every number the
 *     UI shows is therefore computed by the same code path a live student
 *     would exercise.
 */

import {
  DisposalAction,
  FoodCategory,
  MealType,
  PrismaClient,
  Role,
  Unit,
  WasteCategory,
  ChallengeMetric,
  ChallengeScope,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ARTICLES,
  DEPARTMENTS,
  DISPOSAL_GUIDES,
  POINTS_RULES,
  RECOMMENDATION_RULES,
} from "./seed-data";

const prisma = new PrismaClient();

// --- deterministic pseudo-randomness so reseeding is reproducible ----------
let seedState = 20260920;
function random(): number {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}
function chance(probability: number): boolean {
  return random() < probability;
}
function between(min: number, max: number, decimals = 0): number {
  const value = min + random() * (max - min);
  return Number(value.toFixed(decimals));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** UTC-midnight Date for a day `offset` days before today. */
function dayOffset(offset: number): Date {
  const now = new Date();
  const utc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  utc.setUTCDate(utc.getUTCDate() - offset);
  return utc;
}

const DEMO_STUDENTS = [
  { name: "Ananya Sharma", displayName: "ananya_s", course: "B.Tech Computer Science", dept: "CSE", activity: 0.9 },
  { name: "Rohan Mehta", displayName: "rohan.m", course: "B.Tech Mechanical", dept: "MECH", activity: 0.7 },
  { name: "Priya Nair", displayName: "priya_n", course: "B.Sc Life Sciences", dept: "LIFE", activity: 0.85 },
  { name: "Arjun Patel", displayName: "arjun_p", course: "BBA", dept: "BBA", activity: 0.5 },
  { name: "Sneha Iyer", displayName: "sneha.i", course: "B.Tech Electronics", dept: "ECE", activity: 0.75 },
  { name: "Vikram Singh", displayName: "vikram_s", course: "B.Tech Civil", dept: "CIVIL", activity: 0.4 },
  { name: "Meera Krishnan", displayName: "meera_k", course: "B.Tech Computer Science", dept: "CSE", activity: 0.6 },
  { name: "Kabir Ahmed", displayName: "kabir.a", course: "B.Sc Life Sciences", dept: "LIFE", activity: 0.3 },
];

const WASTE_ITEMS: Array<{
  category: WasteCategory;
  items: string[];
  units: Array<{ unit: Unit; min: number; max: number }>;
  disposals: DisposalAction[];
}> = [
  {
    category: WasteCategory.PLASTIC,
    items: ["Plastic water bottle", "Snack wrapper", "Takeaway container", "Plastic straw", "Carry bag"],
    units: [
      { unit: Unit.PIECE, min: 1, max: 4 },
      { unit: Unit.GRAM, min: 10, max: 120 },
    ],
    disposals: [DisposalAction.RECYCLE, DisposalAction.RECYCLE, DisposalAction.GENERAL_WASTE, DisposalAction.REUSE],
  },
  {
    category: WasteCategory.PAPER,
    items: ["Lecture printouts", "Cardboard box", "Notebook pages", "Paper cup sleeve"],
    units: [
      { unit: Unit.PIECE, min: 1, max: 10 },
      { unit: Unit.GRAM, min: 20, max: 400 },
    ],
    disposals: [DisposalAction.RECYCLE, DisposalAction.RECYCLE, DisposalAction.REUSE],
  },
  {
    category: WasteCategory.GLASS,
    items: ["Glass bottle", "Jam jar", "Broken beaker"],
    units: [
      { unit: Unit.PIECE, min: 1, max: 3 },
      { unit: Unit.GRAM, min: 150, max: 600 },
    ],
    disposals: [DisposalAction.RECYCLE, DisposalAction.REUSE],
  },
  {
    category: WasteCategory.METAL,
    items: ["Aluminium can", "Foil wrap", "Metal bottle cap"],
    units: [
      { unit: Unit.PIECE, min: 1, max: 4 },
      { unit: Unit.GRAM, min: 10, max: 90 },
    ],
    disposals: [DisposalAction.RECYCLE],
  },
  {
    category: WasteCategory.EWASTE,
    items: ["Used AA battery", "Broken earphones", "Old charging cable"],
    units: [{ unit: Unit.PIECE, min: 1, max: 2 }],
    disposals: [DisposalAction.SPECIAL_DISPOSAL],
  },
  {
    category: WasteCategory.GENERAL,
    items: ["Disposable cup", "Tissue paper", "Mixed canteen waste"],
    units: [
      { unit: Unit.PIECE, min: 1, max: 5 },
      { unit: Unit.GRAM, min: 20, max: 250 },
    ],
    disposals: [DisposalAction.GENERAL_WASTE],
  },
  {
    category: WasteCategory.ORGANIC,
    items: ["Garden trimmings", "Plant clippings"],
    units: [{ unit: Unit.GRAM, min: 100, max: 900 }],
    disposals: [DisposalAction.COMPOST],
  },
];

const FOOD_ITEMS: Array<{ category: FoodCategory; items: string[]; avoidable: number }> = [
  { category: FoodCategory.COOKED_FOOD, items: ["Leftover rice", "Uneaten curry", "Half a plate of noodles"], avoidable: 0.9 },
  { category: FoodCategory.GRAINS, items: ["Leftover roti", "Bread crusts", "Uneaten pasta"], avoidable: 0.85 },
  { category: FoodCategory.VEGETABLES, items: ["Salad leftovers", "Vegetable peel", "Untouched side dish"], avoidable: 0.5 },
  { category: FoodCategory.FRUITS, items: ["Banana peel", "Apple core", "Overripe fruit"], avoidable: 0.25 },
  { category: FoodCategory.DAIRY, items: ["Spoilt milk", "Leftover curd"], avoidable: 0.8 },
  { category: FoodCategory.BEVERAGES, items: ["Unfinished tea", "Half a juice carton"], avoidable: 0.9 },
];

const MEALS: MealType[] = [
  MealType.BREAKFAST,
  MealType.LUNCH,
  MealType.LUNCH,
  MealType.DINNER,
  MealType.DINNER,
  MealType.SNACK,
];

const FOOD_UNITS: Array<{ unit: Unit; min: number; max: number; decimals: number }> = [
  { unit: Unit.PLATE, min: 0.25, max: 1, decimals: 2 },
  { unit: Unit.GRAM, min: 30, max: 400, decimals: 0 },
  { unit: Unit.SERVING, min: 0.5, max: 2, decimals: 1 },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed: NODE_ENV is production. This script creates demo accounts with a known password.",
    );
  }

  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 8) {
    throw new Error(
      "SEED_DEMO_PASSWORD must be set to at least 8 characters. See .env.example.",
    );
  }

  console.info("→ Clearing existing data…");
  // Order matters: children before parents.
  await prisma.pointTransaction.deleteMany();
  await prisma.challengeParticipation.deleteMany();
  await prisma.streak.deleteMany();
  await prisma.wasteRecord.deleteMany();
  await prisma.foodWasteRecord.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.adminActivity.deleteMany();
  await prisma.user.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.disposalGuide.deleteMany();
  await prisma.educationalContent.deleteMany();
  await prisma.recommendationRule.deleteMany();
  await prisma.pointsRule.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.department.deleteMany();

  // --- Reference data ------------------------------------------------------
  console.info("→ Seeding reference data…");

  await prisma.department.createMany({ data: DEPARTMENTS });
  const departments = await prisma.department.findMany();
  const departmentByCode = new Map(departments.map((d) => [d.code, d.id]));

  await prisma.pointsRule.createMany({ data: POINTS_RULES });

  await prisma.recommendationRule.createMany({
    data: RECOMMENDATION_RULES.map((rule) => ({
      code: rule.code,
      trigger: rule.trigger,
      priority: rule.priority,
      matchWasteCategory: rule.matchWasteCategory ?? null,
      matchFoodCategory: (rule.matchFoodCategory as FoodCategory | null) ?? null,
      threshold: rule.threshold ?? null,
      windowDays: rule.windowDays ?? null,
      title: rule.title,
      message: rule.message,
      actionLabel: rule.actionLabel ?? null,
      actionHref: rule.actionHref ?? null,
      active: true,
    })),
  });

  await prisma.disposalGuide.createMany({
    data: DISPOSAL_GUIDES.map((guide) => ({
      ...guide,
      slug: slugify(guide.item),
      keywords: guide.keywords.map((k) => k.toLowerCase()),
      published: true,
    })),
  });

  await prisma.educationalContent.createMany({
    data: ARTICLES.map((article) => ({
      ...article,
      slug: slugify(article.title),
      published: true,
    })),
  });

  await prisma.systemSetting.createMany({
    data: [
      {
        key: "campus_name",
        value: "EcoCampus Demo Institute",
        description: "Institution name shown in administrative reporting.",
      },
      {
        key: "leaderboard_size",
        value: "25",
        description: "How many students the campus leaderboard displays.",
      },
      {
        key: "streak_milestones",
        value: "7, 14, 30, 60",
        description:
          "Streak lengths that pay a milestone bonus. Defined in code; shown here for reference.",
      },
    ],
  });

  // --- Accounts ------------------------------------------------------------
  console.info("→ Creating demo accounts…");
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const admin = await prisma.user.create({
    data: {
      name: "Dr. Kavita Rao",
      displayName: "sustainability_office",
      email: "admin@ecocampus.local",
      passwordHash,
      role: Role.ADMIN,
      course: null,
      departmentId: null,
    },
  });

  const students = [];
  for (const [index, spec] of DEMO_STUDENTS.entries()) {
    const student = await prisma.user.create({
      data: {
        name: spec.name,
        displayName: spec.displayName,
        // The first demo student uses the documented address from the README.
        email: index === 0 ? "student@ecocampus.local" : `${spec.displayName.replace(/[^a-z0-9]/g, "")}@ecocampus.local`,
        passwordHash,
        role: Role.STUDENT,
        course: spec.course,
        departmentId: departmentByCode.get(spec.dept) ?? null,
        streak: { create: {} },
      },
    });
    students.push({ ...student, activity: spec.activity });
  }

  // --- Challenges ----------------------------------------------------------
  console.info("→ Creating challenges…");

  const challengeSpecs = [
    {
      title: "Plastic-Free Week",
      description:
        "Record your plastic waste every day for seven days. Seeing it is the first step to cutting it — the target is awareness, not zero.",
      metric: ChallengeMetric.ACTIVE_DAYS,
      scope: ChallengeScope.WASTE,
      wasteCategory: WasteCategory.PLASTIC,
      foodCategory: null,
      disposal: null,
      target: 7,
      targetUnit: "days",
      points: 50,
      startDate: dayOffset(10),
      endDate: dayOffset(-4),
      active: true,
    },
    {
      title: "Segregation Streak",
      description:
        "Log 15 waste records that were recycled, composted, reused or sent for special disposal. Correct handling only — landfill entries do not count.",
      metric: ChallengeMetric.RECORD_COUNT,
      scope: ChallengeScope.WASTE,
      wasteCategory: null,
      foodCategory: null,
      disposal: DisposalAction.RECYCLE,
      target: 15,
      targetUnit: "recycled records",
      points: 75,
      startDate: dayOffset(21),
      endDate: dayOffset(-9),
      active: true,
    },
    {
      title: "Clean Plate Fortnight",
      description:
        "Track your food waste on at least 10 days over two weeks. You cannot reduce a pattern you have never looked at.",
      metric: ChallengeMetric.ACTIVE_DAYS,
      scope: ChallengeScope.FOOD_WASTE,
      wasteCategory: null,
      foodCategory: null,
      disposal: null,
      target: 10,
      targetUnit: "days",
      points: 60,
      startDate: dayOffset(14),
      endDate: dayOffset(-1),
      active: true,
    },
    {
      title: "E-Waste Round-Up",
      description:
        "Take three items of e-waste — batteries, cables, dead electronics — to the campus collection point and record each one.",
      metric: ChallengeMetric.RECORD_COUNT,
      scope: ChallengeScope.WASTE,
      wasteCategory: WasteCategory.EWASTE,
      foodCategory: null,
      disposal: DisposalAction.SPECIAL_DISPOSAL,
      target: 3,
      targetUnit: "items",
      points: 40,
      startDate: dayOffset(30),
      endDate: dayOffset(-14),
      active: true,
    },
    {
      title: "Thirty-Day Tracker",
      description:
        "Record any sustainability activity on 20 separate days this month. Consistency beats intensity.",
      metric: ChallengeMetric.ACTIVE_DAYS,
      scope: ChallengeScope.ANY,
      wasteCategory: null,
      foodCategory: null,
      disposal: null,
      target: 20,
      targetUnit: "days",
      points: 100,
      startDate: dayOffset(29),
      endDate: dayOffset(-1),
      active: true,
    },
    {
      title: "Paper Reduction Sprint",
      description:
        "An upcoming challenge: log ten paper waste records and switch your default printer setting to double-sided.",
      metric: ChallengeMetric.RECORD_COUNT,
      scope: ChallengeScope.WASTE,
      wasteCategory: WasteCategory.PAPER,
      foodCategory: null,
      disposal: null,
      target: 10,
      targetUnit: "records",
      points: 45,
      startDate: dayOffset(-7),
      endDate: dayOffset(-28),
      active: true,
    },
    {
      title: "Monsoon Clean-Up (concluded)",
      description:
        "A past campus drive: five general waste records logged during the campus clean-up fortnight.",
      metric: ChallengeMetric.RECORD_COUNT,
      scope: ChallengeScope.WASTE,
      wasteCategory: WasteCategory.GENERAL,
      foodCategory: null,
      disposal: null,
      target: 5,
      targetUnit: "records",
      points: 30,
      startDate: dayOffset(75),
      endDate: dayOffset(45),
      active: true,
    },
  ];

  for (const spec of challengeSpecs) {
    await prisma.challenge.create({
      data: { ...spec, slug: slugify(spec.title) },
    });
  }

  // --- Demo activity -------------------------------------------------------
  console.info("→ Generating demo activity records…");

  const HISTORY_DAYS = 45;
  let wasteCount = 0;
  let foodCount = 0;

  for (const student of students) {
    for (let offset = HISTORY_DAYS; offset >= 0; offset -= 1) {
      // Engagement tapers for less active students, and weekends are quieter.
      const day = dayOffset(offset);
      const isWeekend = [0, 6].includes(day.getUTCDay());
      const dailyChance = student.activity * (isWeekend ? 0.45 : 1);
      // The two headline demo accounts always have activity over the last
      // few days, so the streak and "this week" features have something real
      // to display when someone first opens the demo. Everyone else is
      // sampled, which is what produces the varied leaderboard.
      const guaranteed = student.activity >= 0.85 && offset <= 4;
      if (!guaranteed && !chance(dailyChance)) continue;

      const wasteEntries = chance(0.35) ? 2 : 1;
      for (let i = 0; i < wasteEntries; i += 1) {
        const group = pick(WASTE_ITEMS);
        const unitSpec = pick(group.units);
        const quantity = between(
          unitSpec.min,
          unitSpec.max,
          unitSpec.unit === Unit.PIECE ? 0 : 0,
        );
        if (quantity <= 0) continue;
        const disposal = pick(group.disposals);
        const massGrams =
          unitSpec.unit === Unit.GRAM
            ? quantity
            : unitSpec.unit === Unit.KILOGRAM
              ? quantity * 1000
              : null;

        await prisma.wasteRecord.create({
          data: {
            userId: student.id,
            category: group.category,
            itemType: pick(group.items),
            quantity,
            unit: unitSpec.unit,
            massGrams,
            disposal,
            recordedOn: day,
            notes: chance(0.15) ? "Logged after the afternoon lab session." : null,
          },
        });
        wasteCount += 1;
      }

      if (chance(0.55)) {
        const group = pick(FOOD_ITEMS);
        const unitSpec = pick(FOOD_UNITS);
        const quantity = between(unitSpec.min, unitSpec.max, unitSpec.decimals);
        if (quantity <= 0) continue;
        const massGrams = unitSpec.unit === Unit.GRAM ? quantity : null;

        await prisma.foodWasteRecord.create({
          data: {
            userId: student.id,
            foodCategory: group.category,
            mealType: pick(MEALS),
            itemType: pick(group.items),
            quantity,
            unit: unitSpec.unit,
            massGrams,
            avoidable: chance(group.avoidable),
            recordedOn: day,
            notes: chance(0.12) ? "Portion was larger than expected." : null,
          },
        });
        foodCount += 1;
      }
    }
  }

  console.info(`   ${wasteCount} waste records, ${foodCount} food waste records.`);

  // --- Challenge participation --------------------------------------------
  console.info("→ Enrolling students in challenges…");
  const challenges = await prisma.challenge.findMany();
  for (const student of students) {
    for (const challenge of challenges) {
      // More engaged students join more challenges.
      if (!chance(student.activity * 0.7)) continue;
      await prisma.challengeParticipation.create({
        data: { challengeId: challenge.id, userId: student.id, progress: 0 },
      });
    }
  }

  // --- Derive points, streaks and challenge progress -----------------------
  //
  // This is the important part: rather than writing totals, the seed replays
  // the real engines over the records it just created. If the engines change,
  // the seeded numbers change with them, and they are always internally
  // consistent with the records.
  console.info("→ Running the real points / streak / challenge engines…");

  const { recalculateStudentFromRecords } = await import("./seed-recalculate");
  for (const student of students) {
    await recalculateStudentFromRecords(prisma, student.id);
  }

  // --- Audit trail ---------------------------------------------------------
  await prisma.adminActivity.create({
    data: {
      adminId: admin.id,
      action: "CREATE",
      entityType: "Seed",
      entityId: "development-seed",
      summary: `Seeded ${DISPOSAL_GUIDES.length} guide entries, ${ARTICLES.length} articles and ${challengeSpecs.length} challenges.`,
    },
  });

  const totals = await prisma.pointTransaction.aggregate({ _sum: { points: true } });

  console.info("\n✓ Seed complete.\n");
  console.info("  Demo accounts (DEVELOPMENT ONLY):");
  console.info(`    Admin    admin@ecocampus.local     / ${demoPassword}`);
  console.info(`    Student  student@ecocampus.local   / ${demoPassword}`);
  console.info(
    `    ${students.length - 1} further student accounts share the same password.`,
  );
  console.info(
    `\n  ${wasteCount} waste + ${foodCount} food waste records → ${
      totals._sum.points ?? 0
    } points awarded by the engine.\n`,
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
