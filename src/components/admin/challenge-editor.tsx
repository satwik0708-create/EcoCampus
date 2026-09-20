"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChallengeMetric,
  ChallengeScope,
  DisposalAction,
  FoodCategory,
  WasteCategory,
  type Challenge,
} from "@prisma/client";
import { AlertCircleIcon, Loader2Icon, PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFormSubmit } from "@/hooks/use-form-submit";
import {
  DISPOSAL_ACTION_META,
  FOOD_CATEGORY_META,
  WASTE_CATEGORY_META,
  enumOptions,
} from "@/lib/rules/catalog";
import { challengeInputSchema, type ChallengeInput } from "@/lib/validation/schemas";
import { dateToCampusDay } from "@/lib/time";

const NONE = "__none__";

const METRIC_META: Record<ChallengeMetric, { label: string; description: string; unit: string }> = {
  RECORD_COUNT: {
    label: "Number of records",
    description: "Counts qualifying records logged inside the challenge window.",
    unit: "records",
  },
  ACTIVE_DAYS: {
    label: "Active days",
    description: "Counts distinct campus days with at least one qualifying record.",
    unit: "days",
  },
  MASS_GRAMS: {
    label: "Recorded mass (grams)",
    description:
      "Sums mass-based entries only. Records logged in pieces or plates do not contribute.",
    unit: "g",
  },
};

const SCOPE_META: Record<ChallengeScope, { label: string; description: string }> = {
  WASTE: { label: "Waste records", description: "Only general waste records count." },
  FOOD_WASTE: {
    label: "Food waste records",
    description: "Only food waste records count.",
  },
  ANY: { label: "Any activity", description: "Both trackers count toward the target." },
};

export function ChallengeEditor({
  challenge,
  trigger = "button",
}: {
  challenge?: Challenge;
  trigger?: "button" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const isEdit = !!challenge;

  const [metric, setMetric] = React.useState<ChallengeMetric>(
    challenge?.metric ?? ChallengeMetric.ACTIVE_DAYS,
  );
  const [scope, setScope] = React.useState<ChallengeScope>(
    challenge?.scope ?? ChallengeScope.ANY,
  );
  const [wasteCategory, setWasteCategory] = React.useState<string>(
    challenge?.wasteCategory ?? NONE,
  );
  const [foodCategory, setFoodCategory] = React.useState<string>(
    challenge?.foodCategory ?? NONE,
  );
  const [disposal, setDisposal] = React.useState<string>(challenge?.disposal ?? NONE);
  const [active, setActive] = React.useState(challenge?.active ?? true);

  const { submit, pending, fieldErrors, formError, reset } = useFormSubmit<
    ChallengeInput,
    { ok: true }
  >({
    schema: challengeInputSchema,
    endpoint: isEdit ? `/api/admin/challenges/${challenge.id}` : "/api/admin/challenges",
    method: isEdit ? "PATCH" : "POST",
    onSuccess: () => {
      toast.success(isEdit ? "Challenge updated." : "Challenge created.");
      setOpen(false);
      router.refresh();
    },
  });

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await submit({
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      metric,
      scope,
      wasteCategory:
        wasteCategory === NONE ? null : (wasteCategory as WasteCategory),
      foodCategory: foodCategory === NONE ? null : (foodCategory as FoodCategory),
      disposal: disposal === NONE ? null : (disposal as DisposalAction),
      target: Number(data.get("target") ?? Number.NaN),
      targetUnit: String(data.get("targetUnit") ?? ""),
      points: Number(data.get("points") ?? Number.NaN),
      startDate: String(data.get("startDate") ?? ""),
      endDate: String(data.get("endDate") ?? ""),
      active,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger === "icon" ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          aria-label={`Edit ${challenge?.title ?? "challenge"}`}
        >
          <PencilIcon className="size-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          New challenge
        </Button>
      )}

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit challenge" : "Create a challenge"}</DialogTitle>
          <DialogDescription>
            Progress is always measured from real student records — pick the
            metric and scope that describe the behaviour you want.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <Field label="Title" htmlFor="title" error={fieldErrors.title} required>
            <Input
              {...fieldProps("title", fieldErrors.title)}
              defaultValue={challenge?.title}
              placeholder="Plastic-Free Week"
              maxLength={100}
              required
            />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            error={fieldErrors.description}
            hint="Explain in plain language what a student has to do."
            required
          >
            <Textarea
              {...fieldProps(
                "description",
                fieldErrors.description,
                "Explain in plain language what a student has to do.",
              )}
              defaultValue={challenge?.description}
              rows={3}
              maxLength={600}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Metric" htmlFor="metric" error={fieldErrors.metric} required>
              <Select
                value={metric}
                onValueChange={(value) => setMetric(value as ChallengeMetric)}
              >
                <SelectTrigger id="metric">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(METRIC_META) as ChallengeMetric[]).map((key) => (
                    <SelectItem
                      key={key}
                      value={key}
                      description={METRIC_META[key].description}
                    >
                      {METRIC_META[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Scope" htmlFor="scope" error={fieldErrors.scope} required>
              <Select
                value={scope}
                onValueChange={(value) => setScope(value as ChallengeScope)}
              >
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SCOPE_META) as ChallengeScope[]).map((key) => (
                    <SelectItem
                      key={key}
                      value={key}
                      description={SCOPE_META[key].description}
                    >
                      {SCOPE_META[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {scope !== ChallengeScope.FOOD_WASTE ? (
              <Field
                label="Waste category filter"
                htmlFor="wasteCategory"
                error={fieldErrors.wasteCategory}
              >
                <Select value={wasteCategory} onValueChange={setWasteCategory}>
                  <SelectTrigger id="wasteCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Any category</SelectItem>
                    {enumOptions(WASTE_CATEGORY_META).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            {scope !== ChallengeScope.WASTE ? (
              <Field
                label="Food category filter"
                htmlFor="foodCategory"
                error={fieldErrors.foodCategory}
              >
                <Select value={foodCategory} onValueChange={setFoodCategory}>
                  <SelectTrigger id="foodCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Any category</SelectItem>
                    {enumOptions(FOOD_CATEGORY_META).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

            {scope !== ChallengeScope.FOOD_WASTE ? (
              <Field
                label="Disposal filter"
                htmlFor="disposal"
                error={fieldErrors.disposal}
              >
                <Select value={disposal} onValueChange={setDisposal}>
                  <SelectTrigger id="disposal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Any route</SelectItem>
                    {enumOptions(DISPOSAL_ACTION_META).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Target" htmlFor="target" error={fieldErrors.target} required>
              <Input
                {...fieldProps("target", fieldErrors.target)}
                type="number"
                min="1"
                step="any"
                defaultValue={challenge?.target ?? 7}
                required
              />
            </Field>

            <Field
              label="Target unit"
              htmlFor="targetUnit"
              error={fieldErrors.targetUnit}
              required
            >
              <Input
                {...fieldProps("targetUnit", fieldErrors.targetUnit)}
                defaultValue={challenge?.targetUnit ?? METRIC_META[metric].unit}
                placeholder={METRIC_META[metric].unit}
                maxLength={24}
                required
              />
            </Field>

            <Field label="Points" htmlFor="points" error={fieldErrors.points} required>
              <Input
                {...fieldProps("points", fieldErrors.points)}
                type="number"
                min="1"
                max="1000"
                step="1"
                defaultValue={challenge?.points ?? 50}
                required
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Start date"
              htmlFor="startDate"
              error={fieldErrors.startDate}
              required
            >
              <Input
                {...fieldProps("startDate", fieldErrors.startDate)}
                type="date"
                defaultValue={
                  challenge ? dateToCampusDay(challenge.startDate) : undefined
                }
                required
              />
            </Field>

            <Field
              label="End date"
              htmlFor="endDate"
              error={fieldErrors.endDate}
              required
            >
              <Input
                {...fieldProps("endDate", fieldErrors.endDate)}
                type="date"
                defaultValue={challenge ? dateToCampusDay(challenge.endDate) : undefined}
                required
              />
            </Field>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="active">Active</Label>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Inactive challenges are hidden from students and stop accepting
                new participants.
              </p>
            </div>
            <Switch id="active" checked={active} onCheckedChange={setActive} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Create challenge"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
