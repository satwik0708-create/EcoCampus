import { describe, expect, it } from "vitest";
import { DisposalAction, MealType, Unit, WasteCategory, FoodCategory } from "@prisma/client";
import {
  challengeInputSchema,
  foodWasteRecordSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  wasteRecordSchema,
} from "@/lib/validation/schemas";
import { toMassGrams } from "@/lib/rules/catalog";

const today = new Date().toISOString().slice(0, 10);

function validWaste(overrides: Record<string, unknown> = {}) {
  return {
    category: WasteCategory.PLASTIC,
    itemType: "Plastic bottle",
    quantity: 1,
    unit: Unit.PIECE,
    disposal: DisposalAction.RECYCLE,
    recordedOn: today,
    notes: "",
    ...overrides,
  };
}

describe("password policy", () => {
  it("accepts a compliant password", () => {
    expect(passwordSchema.safeParse("EcoCampus2026").success).toBe(true);
  });

  it.each([
    ["too short", "Eco2026"],
    ["no uppercase", "ecocampus2026"],
    ["no lowercase", "ECOCAMPUS2026"],
    ["no digit", "EcoCampusPass"],
  ])("rejects a password with %s", (_label, value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });
});

describe("registration", () => {
  const base = {
    name: "Ananya Sharma",
    displayName: "ananya_s",
    email: "Ananya@Campus.EDU",
    password: "EcoCampus2026",
    confirmPassword: "EcoCampus2026",
    course: "B.Tech",
    departmentId: "",
  };

  it("normalises the email to lowercase", () => {
    const result = registerSchema.parse(base);
    expect(result.email).toBe("ananya@campus.edu");
  });

  it("rejects mismatched passwords against the confirm field", () => {
    const result = registerSchema.safeParse({
      ...base,
      confirmPassword: "Different2026",
    });
    expect(result.success).toBe(false);
    expect(
      result.success ? [] : result.error.issues.map((i) => i.path.join(".")),
    ).toContain("confirmPassword");
  });

  it("rejects a display name with characters that could break rendering", () => {
    expect(
      registerSchema.safeParse({ ...base, displayName: "<script>x</script>" }).success,
    ).toBe(false);
  });

  it("has no role field, so a client cannot ask to be an admin", () => {
    const parsed = registerSchema.parse({ ...base, role: "ADMIN" } as never);
    expect("role" in parsed).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(
      false,
    );
  });
});

describe("login", () => {
  it("does not apply the password policy to sign-in", () => {
    // An existing account may predate a policy change; sign-in must still work.
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "short" }).success,
    ).toBe(true);
  });

  it("still requires a password to be present", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(
      false,
    );
  });
});

describe("waste record validation", () => {
  it("accepts a well-formed record", () => {
    expect(wasteRecordSchema.safeParse(validWaste()).success).toBe(true);
  });

  it.each([
    ["zero", 0],
    ["negative", -5],
    ["absurdly large", 99_999],
    ["not a number", Number.NaN],
    ["infinite", Number.POSITIVE_INFINITY],
  ])("rejects a %s quantity", (_label, quantity) => {
    expect(wasteRecordSchema.safeParse(validWaste({ quantity })).success).toBe(false);
  });

  it("rejects a category outside the predefined set", () => {
    expect(
      wasteRecordSchema.safeParse(validWaste({ category: "RADIOACTIVE" })).success,
    ).toBe(false);
  });

  it("rejects a unit that is valid elsewhere but not for waste", () => {
    // PLATE is a food-waste unit; it must not be accepted here.
    expect(wasteRecordSchema.safeParse(validWaste({ unit: Unit.PLATE })).success).toBe(
      false,
    );
  });

  it("rejects a future date", () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
    expect(wasteRecordSchema.safeParse(validWaste({ recordedOn: future })).success).toBe(
      false,
    );
  });

  it("rejects a date far in the past", () => {
    const old = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
    expect(wasteRecordSchema.safeParse(validWaste({ recordedOn: old })).success).toBe(
      false,
    );
  });

  it("rejects a malformed date", () => {
    expect(
      wasteRecordSchema.safeParse(validWaste({ recordedOn: "20-05-2026" })).success,
    ).toBe(false);
  });

  it("rejects an over-long note", () => {
    expect(
      wasteRecordSchema.safeParse(validWaste({ notes: "x".repeat(501) })).success,
    ).toBe(false);
  });

  it("has no points field, so a client cannot award itself points", () => {
    const parsed = wasteRecordSchema.parse(validWaste({ points: 9999 } as never));
    expect("points" in parsed).toBe(false);
  });
});

describe("food waste record validation", () => {
  const validFood = {
    foodCategory: FoodCategory.COOKED_FOOD,
    mealType: MealType.LUNCH,
    itemType: "Leftover rice",
    quantity: 0.5,
    unit: Unit.PLATE,
    avoidable: true,
    recordedOn: today,
    notes: "",
  };

  it("accepts a well-formed record", () => {
    expect(foodWasteRecordSchema.safeParse(validFood).success).toBe(true);
  });

  it("rejects a meal type outside the predefined set", () => {
    expect(
      foodWasteRecordSchema.safeParse({ ...validFood, mealType: "BRUNCH" }).success,
    ).toBe(false);
  });

  it("rejects a unit that is not offered for food waste", () => {
    expect(
      foodWasteRecordSchema.safeParse({ ...validFood, unit: Unit.PIECE }).success,
    ).toBe(false);
  });
});

describe("challenge validation", () => {
  const validChallenge = {
    title: "Plastic-Free Week",
    description: "Record your plastic waste every day for seven days running.",
    metric: "ACTIVE_DAYS" as const,
    scope: "WASTE" as const,
    wasteCategory: WasteCategory.PLASTIC,
    foodCategory: null,
    disposal: null,
    target: 7,
    targetUnit: "days",
    points: 50,
    startDate: "2026-05-01",
    endDate: "2026-05-08",
    active: true,
  };

  it("accepts a well-formed challenge", () => {
    expect(challengeInputSchema.safeParse(validChallenge).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    expect(
      challengeInputSchema.safeParse({
        ...validChallenge,
        endDate: "2026-04-01",
      }).success,
    ).toBe(false);
  });

  it("rejects a food category on a waste-scoped challenge", () => {
    expect(
      challengeInputSchema.safeParse({
        ...validChallenge,
        foodCategory: FoodCategory.FRUITS,
      }).success,
    ).toBe(false);
  });

  it("rejects a fractional day target", () => {
    expect(
      challengeInputSchema.safeParse({ ...validChallenge, target: 7.5 }).success,
    ).toBe(false);
  });
});

describe("mass conversion", () => {
  it("converts mass units exactly", () => {
    expect(toMassGrams(250, Unit.GRAM)).toBe(250);
    expect(toMassGrams(1.5, Unit.KILOGRAM)).toBe(1500);
  });

  it("returns null rather than guessing a weight for count-based units", () => {
    // This is what keeps aggregate mass figures honest.
    expect(toMassGrams(3, Unit.PIECE)).toBeNull();
    expect(toMassGrams(1, Unit.PLATE)).toBeNull();
    expect(toMassGrams(2, Unit.SERVING)).toBeNull();
    expect(toMassGrams(500, Unit.MILLILITRE)).toBeNull();
  });
});
