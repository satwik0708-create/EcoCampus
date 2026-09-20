"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FoodCategory, MealType, Unit } from "@prisma/client";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FlameIcon,
  Loader2Icon,
  PlusIcon,
  TrophyIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, fieldProps } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFormSubmit } from "@/hooks/use-form-submit";
import {
  FOOD_CATEGORY_META,
  FOOD_UNITS,
  MEAL_TYPE_META,
  UNIT_META,
  enumOptions,
} from "@/lib/rules/catalog";
import {
  foodWasteRecordSchema,
  type FoodWasteRecordInput,
} from "@/lib/validation/schemas";
import type { ActivityOutcome } from "@/lib/services/activity";

const FOOD_OPTIONS = enumOptions(FOOD_CATEGORY_META);
const MEAL_OPTIONS = enumOptions(MEAL_TYPE_META);

/** Pick the meal that best matches the current local hour. */
function defaultMeal(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return MealType.BREAKFAST;
  if (hour < 16) return MealType.LUNCH;
  if (hour < 22) return MealType.DINNER;
  return MealType.SNACK;
}

export function FoodWasteForm({ today }: { today: string }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);

  const [foodCategory, setFoodCategory] = React.useState<FoodCategory>(
    FoodCategory.COOKED_FOOD,
  );
  const [mealType, setMealType] = React.useState<MealType>(MealType.LUNCH);
  const [unit, setUnit] = React.useState<Unit>(Unit.PLATE);
  const [avoidable, setAvoidable] = React.useState(true);
  const [outcome, setOutcome] = React.useState<ActivityOutcome | null>(null);

  // The meal depends on the viewer's clock, so it is chosen after hydration.
  React.useEffect(() => setMealType(defaultMeal()), []);

  const { submit, pending, fieldErrors, formError } = useFormSubmit<
    FoodWasteRecordInput,
    ActivityOutcome
  >({
    schema: foodWasteRecordSchema,
    endpoint: "/api/food-waste-records",
    onSuccess: (result) => {
      setOutcome(result);
      formRef.current?.reset();
      setAvoidable(true);
      toast.success(
        result.pointsAwarded > 0
          ? `Record saved · +${result.pointsAwarded} points`
          : "Record saved",
      );
      router.refresh();
    },
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rawQuantity = String(data.get("quantity") ?? "").trim();

    await submit({
      foodCategory,
      mealType,
      itemType: String(data.get("itemType") ?? ""),
      quantity: rawQuantity === "" ? Number.NaN : Number(rawQuantity),
      unit,
      avoidable,
      recordedOn: String(data.get("recordedOn") ?? ""),
      notes: String(data.get("notes") ?? ""),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record food waste</CardTitle>
        <CardDescription>
          Logging the meal and whether the waste was avoidable is what makes
          the pattern useful later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {outcome ? <FoodOutcomeSummary outcome={outcome} /> : null}

        <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Food category"
              htmlFor="foodCategory"
              error={fieldErrors.foodCategory}
              required
            >
              <Select
                value={foodCategory}
                onValueChange={(value) => setFoodCategory(value as FoodCategory)}
              >
                <SelectTrigger id="foodCategory" aria-label="Food category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOOD_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      description={option.description}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Meal"
              htmlFor="mealType"
              error={fieldErrors.mealType}
              required
            >
              <Select
                value={mealType}
                onValueChange={(value) => setMealType(value as MealType)}
              >
                <SelectTrigger id="mealType" aria-label="Meal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="What was wasted?"
            htmlFor="itemType"
            error={fieldErrors.itemType}
            hint="For example: rice, dal, half a sandwich, banana peel."
            required
          >
            <Input
              {...fieldProps(
                "itemType",
                fieldErrors.itemType,
                "For example: rice, dal, half a sandwich, banana peel.",
              )}
              placeholder="Leftover rice"
              maxLength={60}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Quantity"
              htmlFor="quantity"
              error={fieldErrors.quantity}
              required
            >
              <Input
                {...fieldProps("quantity", fieldErrors.quantity)}
                type="number"
                inputMode="decimal"
                min="0.001"
                max="10000"
                step="any"
                placeholder="0.5"
                required
              />
            </Field>

            <Field label="Unit" htmlFor="unit" error={fieldErrors.unit} required>
              <Select value={unit} onValueChange={(value) => setUnit(value as Unit)}>
                <SelectTrigger id="unit" aria-label="Unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOOD_UNITS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {UNIT_META[option].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="avoidable"
              checked={avoidable}
              onCheckedChange={(checked) => setAvoidable(checked === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="avoidable">This waste was avoidable</Label>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Leave ticked for food that could have been eaten. Untick for
                peels, bones, shells and other unavoidable parts.
              </p>
            </div>
          </div>

          <Field
            label="Date"
            htmlFor="recordedOn"
            error={fieldErrors.recordedOn}
            required
          >
            <Input
              {...fieldProps("recordedOn", fieldErrors.recordedOn)}
              type="date"
              defaultValue={today}
              max={today}
              required
            />
          </Field>

          <Field label="Notes" htmlFor="notes" error={fieldErrors.notes}>
            <Textarea
              {...fieldProps("notes", fieldErrors.notes)}
              placeholder="Optional — what led to this being wasted?"
              maxLength={500}
              rows={3}
            />
          </Field>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Saving record…
              </>
            ) : (
              <>
                <PlusIcon />
                Save record
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FoodOutcomeSummary({ outcome }: { outcome: ActivityOutcome }) {
  return (
    <Alert variant="success">
      <CheckCircle2Icon />
      <AlertTitle>Record saved</AlertTitle>
      <AlertDescription className="space-y-2">
        {outcome.awards.length > 0 ? (
          <ul className="space-y-1">
            {outcome.awards.map((award, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Badge variant="success">+{award.points}</Badge>
                <span>{award.detail}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">
            Saved. No new points this time — you had already earned everything
            available for this entry.
          </p>
        )}

        {outcome.streak.increased ? (
          <p className="flex items-center gap-1.5 text-sm">
            <FlameIcon className="text-warning size-4" />
            Streak now {outcome.streak.current}{" "}
            {outcome.streak.current === 1 ? "day" : "days"}.
          </p>
        ) : null}

        {outcome.completedChallenges.map((challenge) => (
          <p key={challenge.id} className="flex items-center gap-1.5 text-sm">
            <TrophyIcon className="text-success size-4" />
            Challenge completed: {challenge.title} (+{challenge.points} points).
          </p>
        ))}

        {outcome.recommendation ? (
          <p className="text-sm leading-relaxed">
            <span className="font-medium">{outcome.recommendation.title}. </span>
            {outcome.recommendation.message}
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
