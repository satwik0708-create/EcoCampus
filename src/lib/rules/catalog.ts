import {
  ContentCategory,
  DisposalAction,
  FoodCategory,
  MealType,
  PointReason,
  Unit,
  WasteCategory,
} from "@prisma/client";

/**
 * The single source of truth for how the predefined enums are presented.
 *
 * Labels live here rather than in components so that the tracker form, the
 * charts, the admin tables and the CSV-ish exports can never disagree about
 * what "EWASTE" is called.
 */

export type OptionMeta = {
  label: string;
  description: string;
};

export const WASTE_CATEGORY_META: Record<WasteCategory, OptionMeta> = {
  PLASTIC: {
    label: "Plastic",
    description: "Bottles, wrappers, packaging film, containers.",
  },
  PAPER: {
    label: "Paper & Card",
    description: "Notebooks, printouts, cartons, cardboard.",
  },
  GLASS: { label: "Glass", description: "Bottles, jars, broken glassware." },
  METAL: { label: "Metal", description: "Cans, foil, small metal parts." },
  EWASTE: {
    label: "E-waste",
    description: "Batteries, cables, chargers, electronics.",
  },
  ORGANIC: {
    label: "Organic",
    description: "Garden trimmings and other compostable non-food matter.",
  },
  GENERAL: {
    label: "General Waste",
    description: "Mixed, non-recoverable waste destined for landfill.",
  },
  OTHER: { label: "Other", description: "Anything the categories above miss." },
};

export const FOOD_CATEGORY_META: Record<FoodCategory, OptionMeta> = {
  COOKED_FOOD: { label: "Cooked Food", description: "Prepared meals and curries." },
  FRUITS: { label: "Fruits", description: "Whole fruit, peels, cores." },
  VEGETABLES: { label: "Vegetables", description: "Salads, sides, peelings." },
  GRAINS: { label: "Grains", description: "Rice, roti, bread, pasta." },
  DAIRY: { label: "Dairy", description: "Milk, curd, paneer, cheese." },
  BEVERAGES: { label: "Beverages", description: "Tea, coffee, juice, milk drinks." },
  OTHER: { label: "Other", description: "Anything the categories above miss." },
};

export const MEAL_TYPE_META: Record<MealType, OptionMeta> = {
  BREAKFAST: { label: "Breakfast", description: "Morning meal." },
  LUNCH: { label: "Lunch", description: "Midday meal." },
  DINNER: { label: "Dinner", description: "Evening meal." },
  SNACK: { label: "Snack", description: "Between-meal food." },
};

export const DISPOSAL_ACTION_META: Record<DisposalAction, OptionMeta> = {
  RECYCLE: {
    label: "Recycled",
    description: "Placed clean and dry in the campus recycling stream.",
  },
  COMPOST: {
    label: "Composted",
    description: "Placed in the organic / compost collection.",
  },
  REUSE: {
    label: "Reused",
    description: "Kept in use instead of being thrown away.",
  },
  SPECIAL_DISPOSAL: {
    label: "Special Disposal",
    description: "Handed to the designated e-waste or hazardous collection point.",
  },
  GENERAL_WASTE: {
    label: "General Waste",
    description: "Sent to the mixed / landfill bin.",
  },
};

export const CONTENT_CATEGORY_META: Record<ContentCategory, OptionMeta> = {
  SEGREGATION: { label: "Segregation", description: "Sorting waste at source." },
  REDUCE: { label: "Reduce", description: "Consuming less in the first place." },
  REUSE: { label: "Reuse", description: "Keeping things in use for longer." },
  RECYCLING: { label: "Recycling", description: "Recovering materials correctly." },
  FOOD_WASTE: { label: "Food Waste", description: "Cutting avoidable food loss." },
  RESPONSIBLE_CONSUMPTION: {
    label: "Responsible Consumption",
    description: "Buying and using resources thoughtfully.",
  },
  CAMPUS_HABITS: {
    label: "Campus Habits",
    description: "Everyday routines that add up across a campus.",
  },
  SDG: { label: "SDG 12", description: "How this connects to the global goal." },
};

export const UNIT_META: Record<Unit, { label: string; short: string }> = {
  GRAM: { label: "Grams", short: "g" },
  KILOGRAM: { label: "Kilograms", short: "kg" },
  PIECE: { label: "Pieces", short: "pcs" },
  LITRE: { label: "Litres", short: "L" },
  MILLILITRE: { label: "Millilitres", short: "ml" },
  PLATE: { label: "Plates", short: "plates" },
  SERVING: { label: "Servings", short: "servings" },
};

/** Units offered on the waste tracker form. */
export const WASTE_UNITS: Unit[] = [
  Unit.PIECE,
  Unit.GRAM,
  Unit.KILOGRAM,
  Unit.LITRE,
  Unit.MILLILITRE,
];

/** Units offered on the food waste tracker form. */
export const FOOD_UNITS: Unit[] = [
  Unit.GRAM,
  Unit.KILOGRAM,
  Unit.PLATE,
  Unit.SERVING,
  Unit.MILLILITRE,
  Unit.LITRE,
];

/**
 * Mass-based units only.
 *
 * Deliberately narrow: pieces, plates and servings are NOT converted into a
 * guessed weight. Aggregate mass figures therefore under-report rather than
 * invent numbers, and the UI always labels them "from mass-based entries".
 */
const MASS_UNIT_TO_GRAMS: Partial<Record<Unit, number>> = {
  [Unit.GRAM]: 1,
  [Unit.KILOGRAM]: 1000,
};

/** Canonical mass in grams, or null when the unit does not express mass. */
export function toMassGrams(quantity: number, unit: Unit): number | null {
  const factor = MASS_UNIT_TO_GRAMS[unit];
  if (factor === undefined) return null;
  return Math.round(quantity * factor * 1000) / 1000;
}

/** Disposal actions that count as correct recovery rather than landfill. */
export const RECOVERY_ACTIONS: DisposalAction[] = [
  DisposalAction.RECYCLE,
  DisposalAction.COMPOST,
  DisposalAction.REUSE,
  DisposalAction.SPECIAL_DISPOSAL,
];

export function isRecoveryAction(action: DisposalAction): boolean {
  return RECOVERY_ACTIONS.includes(action);
}

export const POINT_REASON_META: Record<PointReason, OptionMeta> = {
  WASTE_RECORD: {
    label: "Waste logged",
    description: "Awarded for each waste record you add.",
  },
  FOOD_WASTE_RECORD: {
    label: "Food waste logged",
    description: "Awarded for each food waste record you add.",
  },
  DAILY_FIRST_ACTIVITY: {
    label: "Daily check-in",
    description: "Awarded once for your first activity of a campus day.",
  },
  SEGREGATION_BONUS: {
    label: "Correct segregation",
    description:
      "Awarded when waste is recycled, composted, reused or sent for special disposal.",
  },
  STREAK_MILESTONE: {
    label: "Streak milestone",
    description: "Awarded when your streak reaches 7, 14, 30 or 60 days.",
  },
  CHALLENGE_COMPLETION: {
    label: "Challenge completed",
    description: "Awarded once when a challenge target is reached.",
  },
  ADMIN_ADJUSTMENT: {
    label: "Administrative adjustment",
    description: "A manual correction recorded by an administrator.",
  },
};

/** Streak lengths that pay a milestone bonus. */
export const STREAK_MILESTONES = [7, 14, 30, 60] as const;

export function enumOptions<T extends string>(
  meta: Record<T, OptionMeta>,
): Array<{ value: T; label: string; description: string }> {
  return (Object.keys(meta) as T[]).map((value) => ({
    value,
    label: meta[value].label,
    description: meta[value].description,
  }));
}

export function unitOptions(units: Unit[]) {
  return units.map((unit) => ({
    value: unit,
    label: UNIT_META[unit].label,
    short: UNIT_META[unit].short,
  }));
}

export function formatQuantity(quantity: number, unit: Unit): string {
  const rounded = Number.isInteger(quantity)
    ? String(quantity)
    : quantity.toFixed(2).replace(/\.?0+$/, "");
  return `${rounded} ${UNIT_META[unit].short}`;
}

export function formatMass(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${Math.round(grams)} g`;
}
