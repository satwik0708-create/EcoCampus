import { z } from "zod";
import {
  ChallengeMetric,
  ChallengeScope,
  ContentCategory,
  DisposalAction,
  FoodCategory,
  MealType,
  RecommendationTrigger,
  Role,
  Unit,
  WasteCategory,
} from "@prisma/client";
import { FOOD_UNITS, WASTE_UNITS } from "@/lib/rules/catalog";
import { isValidCampusDay } from "@/lib/time";

/**
 * Every schema here is used on BOTH sides: the forms parse with them before
 * submitting, and the route handlers parse the raw request body with the same
 * schema. Client-side validation is a convenience; the server copy is the
 * boundary that actually protects the database.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const campusDaySchema = z
  .string()
  .refine(isValidCampusDay, "Enter a valid date (YYYY-MM-DD).");

/** Rejects a date more than one day in the future (timezone slack) or absurdly old. */
export function boundedCampusDay(maxFutureDays = 1, maxPastDays = 365) {
  return campusDaySchema.superRefine((value, ctx) => {
    const day = new Date(`${value}T00:00:00.000Z`).getTime();
    const now = Date.now();
    if (day > now + maxFutureDays * 86_400_000) {
      ctx.addIssue({ code: "custom", message: "Date cannot be in the future." });
    }
    if (day < now - maxPastDays * 86_400_000) {
      ctx.addIssue({
        code: "custom",
        message: `Date cannot be more than ${maxPastDays} days ago.`,
      });
    }
  });
}

const quantitySchema = z
  .number({ error: "Enter a quantity." })
  .refine(Number.isFinite, "Enter a valid number.")
  .gt(0, "Quantity must be greater than zero.")
  .max(10_000, "Quantity looks too large — check the unit you selected.")
  .refine(
    (n) => Math.round(n * 1000) === n * 1000 || Number.isInteger(n * 1000),
    "Use at most three decimal places.",
  );

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required.")
  .max(254, "Email is too long.")
  .pipe(z.email("Enter a valid email address."));

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Password is too long.")
  .refine((v) => /[a-z]/.test(v), "Include a lowercase letter.")
  .refine((v) => /[A-Z]/.test(v), "Include an uppercase letter.")
  .refine((v) => /[0-9]/.test(v), "Include a number.");

export const registerSchema = z
  .object({
    name: trimmed(80).min(2, "Enter your full name."),
    displayName: trimmed(32)
      .min(2, "Display names need at least 2 characters.")
      .regex(
        /^[\p{L}\p{N} ._-]+$/u,
        "Use letters, numbers, spaces, dots, hyphens or underscores.",
      ),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    course: trimmed(80).optional().or(z.literal("")),
    departmentId: z.string().trim().min(1).max(40).optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(16, "This reset link is not valid.").max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z.object({
  name: trimmed(80).min(2, "Enter your full name."),
  displayName: trimmed(32)
    .min(2, "Display names need at least 2 characters.")
    .regex(/^[\p{L}\p{N} ._-]+$/u, "Use letters, numbers, spaces, dots, hyphens or underscores."),
  course: trimmed(80).optional().or(z.literal("")),
  departmentId: z.string().trim().max(40).optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(128),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// ---------------------------------------------------------------------------
// Activity records
// ---------------------------------------------------------------------------

export const wasteRecordSchema = z.object({
  category: z.enum(WasteCategory),
  itemType: trimmed(60).min(2, "Describe the item in at least 2 characters."),
  quantity: quantitySchema,
  unit: z.enum(Unit).refine((u) => WASTE_UNITS.includes(u), "Choose a valid unit."),
  disposal: z.enum(DisposalAction),
  recordedOn: boundedCampusDay(),
  notes: trimmed(500).optional().or(z.literal("")),
});

export const foodWasteRecordSchema = z.object({
  foodCategory: z.enum(FoodCategory),
  mealType: z.enum(MealType),
  itemType: trimmed(60).min(2, "Describe the item in at least 2 characters."),
  quantity: quantitySchema,
  unit: z.enum(Unit).refine((u) => FOOD_UNITS.includes(u), "Choose a valid unit."),
  avoidable: z.boolean(),
  recordedOn: boundedCampusDay(),
  notes: trimmed(500).optional().or(z.literal("")),
});

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

export const joinChallengeSchema = z.object({
  challengeId: z.string().trim().min(1).max(40),
});

export const challengeInputSchema = z
  .object({
    title: trimmed(100).min(4, "Give the challenge a clear title."),
    description: trimmed(600).min(20, "Explain what students need to do."),
    metric: z.enum(ChallengeMetric),
    scope: z.enum(ChallengeScope),
    wasteCategory: z.enum(WasteCategory).nullable().optional(),
    foodCategory: z.enum(FoodCategory).nullable().optional(),
    disposal: z.enum(DisposalAction).nullable().optional(),
    target: z
      .number()
      .gt(0, "Target must be greater than zero.")
      .max(1_000_000, "Target is unrealistically large."),
    targetUnit: trimmed(24).min(1, "Describe the unit, e.g. 'days' or 'records'."),
    points: z
      .number()
      .int("Points must be a whole number.")
      .min(1, "Award at least 1 point.")
      .max(1000, "Cap challenge rewards at 1000 points."),
    startDate: campusDaySchema,
    endDate: campusDaySchema,
    active: z.boolean(),
  })
  .refine((c) => c.endDate >= c.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  })
  .refine((c) => c.scope !== ChallengeScope.FOOD_WASTE || !c.wasteCategory, {
    message: "A food-waste challenge cannot filter on a waste category.",
    path: ["wasteCategory"],
  })
  .refine((c) => c.scope !== ChallengeScope.WASTE || !c.foodCategory, {
    message: "A waste challenge cannot filter on a food category.",
    path: ["foodCategory"],
  })
  .refine((c) => c.metric !== ChallengeMetric.ACTIVE_DAYS || Number.isInteger(c.target), {
    message: "A day-based target must be a whole number of days.",
    path: ["target"],
  });

// ---------------------------------------------------------------------------
// Admin-managed content
// ---------------------------------------------------------------------------

export const disposalGuideSchema = z.object({
  item: trimmed(80).min(2, "Name the item."),
  category: z.enum(WasteCategory),
  summary: trimmed(280).min(20, "Write a one-line summary."),
  reduceGuidance: trimmed(600).min(10, "Add reduce guidance."),
  reuseGuidance: trimmed(600).min(10, "Add reuse guidance."),
  recycleGuidance: trimmed(600).min(10, "Add recycle guidance."),
  disposeGuidance: trimmed(600).min(10, "Add disposal guidance."),
  recommendedAction: z.enum(DisposalAction),
  keywords: z.array(trimmed(30).min(1)).max(12, "Up to 12 keywords.").default([]),
  published: z.boolean(),
});

export const educationalContentSchema = z.object({
  title: trimmed(120).min(4, "Give the article a title."),
  description: trimmed(300).min(20, "Write a short summary."),
  category: z.enum(ContentCategory),
  content: z.string().trim().min(80, "Articles need at least 80 characters.").max(20_000),
  readMinutes: z.number().int().min(1).max(60),
  published: z.boolean(),
});

export const recommendationRuleSchema = z
  .object({
    code: trimmed(50)
      .min(3)
      .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers and underscores."),
    trigger: z.enum(RecommendationTrigger),
    priority: z.number().int().min(1).max(999),
    matchWasteCategory: z.enum(WasteCategory).nullable().optional(),
    matchFoodCategory: z.enum(FoodCategory).nullable().optional(),
    threshold: z.number().int().min(1).max(1000).nullable().optional(),
    windowDays: z.number().int().min(1).max(365).nullable().optional(),
    title: trimmed(100).min(4),
    message: trimmed(500).min(20),
    actionLabel: trimmed(40).nullable().optional(),
    actionHref: trimmed(120)
      .regex(/^\/[A-Za-z0-9/_-]*$/, "Use an internal path such as /student/guide.")
      .nullable()
      .optional(),
    active: z.boolean(),
  })
  .refine(
    (r) =>
      r.trigger !== RecommendationTrigger.LATEST_WASTE_CATEGORY || !!r.matchWasteCategory,
    { message: "Pick the waste category this rule reacts to.", path: ["matchWasteCategory"] },
  )
  .refine(
    (r) =>
      r.trigger !== RecommendationTrigger.FREQUENT_WASTE_CATEGORY ||
      (!!r.matchWasteCategory && !!r.threshold && !!r.windowDays),
    {
      message: "Frequency rules need a category, threshold and window.",
      path: ["threshold"],
    },
  )
  .refine(
    (r) => r.trigger !== RecommendationTrigger.LATEST_FOOD_CATEGORY || !!r.matchFoodCategory,
    { message: "Pick the food category this rule reacts to.", path: ["matchFoodCategory"] },
  );

export const pointsRuleUpdateSchema = z.object({
  points: z.number().int().min(0, "Points cannot be negative.").max(500),
  active: z.boolean(),
});

export const systemSettingUpdateSchema = z.object({
  value: z.string().trim().min(1).max(200),
});

export const userAdminUpdateSchema = z.object({
  role: z.enum(Role),
  active: z.boolean(),
});

// ---------------------------------------------------------------------------
// Query / listing parameters
// ---------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

export const recordFilterSchema = paginationSchema.extend({
  from: campusDaySchema.optional(),
  to: campusDaySchema.optional(),
  category: z.string().trim().max(30).optional(),
  departmentId: z.string().trim().max(40).optional(),
  q: z.string().trim().max(60).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type WasteRecordInput = z.infer<typeof wasteRecordSchema>;
export type FoodWasteRecordInput = z.infer<typeof foodWasteRecordSchema>;
export type ChallengeInput = z.infer<typeof challengeInputSchema>;
export type DisposalGuideInput = z.infer<typeof disposalGuideSchema>;
export type EducationalContentInput = z.infer<typeof educationalContentSchema>;
export type RecommendationRuleInput = z.infer<typeof recommendationRuleSchema>;
