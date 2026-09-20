"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DisposalAction, Unit, WasteCategory } from "@prisma/client";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, fieldProps } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  DISPOSAL_ACTION_META,
  UNIT_META,
  WASTE_CATEGORY_META,
  WASTE_UNITS,
  enumOptions,
} from "@/lib/rules/catalog";
import { wasteRecordSchema, type WasteRecordInput } from "@/lib/validation/schemas";
import type { ActivityOutcome } from "@/lib/services/activity";

const CATEGORY_OPTIONS = enumOptions(WASTE_CATEGORY_META);
const DISPOSAL_OPTIONS = enumOptions(DISPOSAL_ACTION_META);

/** Sensible default disposal route per category — the student can override it. */
const DEFAULT_DISPOSAL: Record<WasteCategory, DisposalAction> = {
  PLASTIC: DisposalAction.RECYCLE,
  PAPER: DisposalAction.RECYCLE,
  GLASS: DisposalAction.RECYCLE,
  METAL: DisposalAction.RECYCLE,
  EWASTE: DisposalAction.SPECIAL_DISPOSAL,
  ORGANIC: DisposalAction.COMPOST,
  GENERAL: DisposalAction.GENERAL_WASTE,
  OTHER: DisposalAction.GENERAL_WASTE,
};

export function WasteForm({ today }: { today: string }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);

  const [category, setCategory] = React.useState<WasteCategory>(WasteCategory.PLASTIC);
  const [unit, setUnit] = React.useState<Unit>(Unit.PIECE);
  const [disposal, setDisposal] = React.useState<DisposalAction>(
    DEFAULT_DISPOSAL[WasteCategory.PLASTIC],
  );
  const [outcome, setOutcome] = React.useState<ActivityOutcome | null>(null);

  const { submit, pending, fieldErrors, formError } = useFormSubmit<
    WasteRecordInput,
    ActivityOutcome
  >({
    schema: wasteRecordSchema,
    endpoint: "/api/waste-records",
    onSuccess: (result) => {
      setOutcome(result);
      formRef.current?.reset();
      toast.success(
        result.pointsAwarded > 0
          ? `Record saved · +${result.pointsAwarded} points`
          : "Record saved",
      );
      // Pull the fresh server state so the history table and the analytics
      // beside this form reflect the new record immediately.
      router.refresh();
    },
  });

  function onCategoryChange(value: string) {
    const next = value as WasteCategory;
    setCategory(next);
    setDisposal(DEFAULT_DISPOSAL[next]);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rawQuantity = String(data.get("quantity") ?? "").trim();

    await submit({
      category,
      itemType: String(data.get("itemType") ?? ""),
      quantity: rawQuantity === "" ? Number.NaN : Number(rawQuantity),
      unit,
      disposal,
      recordedOn: String(data.get("recordedOn") ?? ""),
      notes: String(data.get("notes") ?? ""),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record waste</CardTitle>
        <CardDescription>
          Categories and disposal routes are predefined so the campus data
          stays comparable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {outcome ? <OutcomeSummary outcome={outcome} /> : null}

        <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <Field
            label="Category"
            htmlFor="category"
            error={fieldErrors.category}
            required
          >
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger id="category" aria-label="Waste category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
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
            label="What was it?"
            htmlFor="itemType"
            error={fieldErrors.itemType}
            hint="For example: water bottle, notebook, snack wrapper."
            required
          >
            <Input
              {...fieldProps(
                "itemType",
                fieldErrors.itemType,
                "For example: water bottle, notebook, snack wrapper.",
              )}
              placeholder="Plastic water bottle"
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
                placeholder="1"
                required
              />
            </Field>

            <Field label="Unit" htmlFor="unit" error={fieldErrors.unit} required>
              <Select value={unit} onValueChange={(value) => setUnit(value as Unit)}>
                <SelectTrigger id="unit" aria-label="Unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WASTE_UNITS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {UNIT_META[option].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="How did you dispose of it?"
            htmlFor="disposal"
            error={fieldErrors.disposal}
            hint="Recycling, composting, reuse and special disposal earn a segregation bonus."
            required
          >
            <Select
              value={disposal}
              onValueChange={(value) => setDisposal(value as DisposalAction)}
            >
              <SelectTrigger id="disposal" aria-label="Disposal route">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPOSAL_OPTIONS.map((option) => (
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
              placeholder="Optional — anything worth remembering about this entry."
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

/** What the server actually did, reported back honestly. */
function OutcomeSummary({ outcome }: { outcome: ActivityOutcome }) {
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
