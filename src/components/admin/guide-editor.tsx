"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DisposalAction,
  WasteCategory,
  type DisposalGuide,
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
  WASTE_CATEGORY_META,
  enumOptions,
} from "@/lib/rules/catalog";
import {
  disposalGuideSchema,
  type DisposalGuideInput,
} from "@/lib/validation/schemas";

export function GuideEditor({
  guide,
  trigger = "button",
}: {
  guide?: DisposalGuide;
  trigger?: "button" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const isEdit = !!guide;

  const [category, setCategory] = React.useState<WasteCategory>(
    guide?.category ?? WasteCategory.PLASTIC,
  );
  const [recommendedAction, setRecommendedAction] = React.useState<DisposalAction>(
    guide?.recommendedAction ?? DisposalAction.RECYCLE,
  );
  const [published, setPublished] = React.useState(guide?.published ?? true);

  const { submit, pending, fieldErrors, formError, reset } = useFormSubmit<
    DisposalGuideInput,
    { ok: true }
  >({
    schema: disposalGuideSchema,
    endpoint: isEdit ? `/api/admin/guides/${guide.id}` : "/api/admin/guides",
    method: isEdit ? "PATCH" : "POST",
    onSuccess: () => {
      toast.success(isEdit ? "Guide entry updated." : "Guide entry created.");
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
      item: String(data.get("item") ?? ""),
      category,
      summary: String(data.get("summary") ?? ""),
      reduceGuidance: String(data.get("reduceGuidance") ?? ""),
      reuseGuidance: String(data.get("reuseGuidance") ?? ""),
      recycleGuidance: String(data.get("recycleGuidance") ?? ""),
      disposeGuidance: String(data.get("disposeGuidance") ?? ""),
      recommendedAction,
      keywords: String(data.get("keywords") ?? "")
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .slice(0, 12),
      published,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger === "icon" ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          aria-label={`Edit ${guide?.item ?? "guide entry"}`}
        >
          <PencilIcon className="size-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          New guide entry
        </Button>
      )}

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit guide entry" : "New guide entry"}</DialogTitle>
          <DialogDescription>
            Every entry answers four questions, so a student always knows what
            to do regardless of which facilities are available.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Item" htmlFor="item" error={fieldErrors.item} required>
              <Input
                {...fieldProps("item", fieldErrors.item)}
                defaultValue={guide?.item}
                placeholder="Plastic water bottle"
                maxLength={80}
                required
              />
            </Field>

            <Field
              label="Category"
              htmlFor="category"
              error={fieldErrors.category}
              required
            >
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as WasteCategory)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enumOptions(WASTE_CATEGORY_META).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Summary" htmlFor="summary" error={fieldErrors.summary} required>
            <Textarea
              {...fieldProps("summary", fieldErrors.summary)}
              defaultValue={guide?.summary}
              rows={2}
              maxLength={280}
              placeholder="One line shown on the guide card."
              required
            />
          </Field>

          <Field
            label="Reduce"
            htmlFor="reduceGuidance"
            error={fieldErrors.reduceGuidance}
            required
          >
            <Textarea
              {...fieldProps("reduceGuidance", fieldErrors.reduceGuidance)}
              defaultValue={guide?.reduceGuidance}
              rows={2}
              maxLength={600}
              required
            />
          </Field>

          <Field
            label="Reuse"
            htmlFor="reuseGuidance"
            error={fieldErrors.reuseGuidance}
            required
          >
            <Textarea
              {...fieldProps("reuseGuidance", fieldErrors.reuseGuidance)}
              defaultValue={guide?.reuseGuidance}
              rows={2}
              maxLength={600}
              required
            />
          </Field>

          <Field
            label="Recycle"
            htmlFor="recycleGuidance"
            error={fieldErrors.recycleGuidance}
            required
          >
            <Textarea
              {...fieldProps("recycleGuidance", fieldErrors.recycleGuidance)}
              defaultValue={guide?.recycleGuidance}
              rows={2}
              maxLength={600}
              required
            />
          </Field>

          <Field
            label="Dispose"
            htmlFor="disposeGuidance"
            error={fieldErrors.disposeGuidance}
            required
          >
            <Textarea
              {...fieldProps("disposeGuidance", fieldErrors.disposeGuidance)}
              defaultValue={guide?.disposeGuidance}
              rows={2}
              maxLength={600}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Recommended route"
              htmlFor="recommendedAction"
              error={fieldErrors.recommendedAction}
              required
            >
              <Select
                value={recommendedAction}
                onValueChange={(value) =>
                  setRecommendedAction(value as DisposalAction)
                }
              >
                <SelectTrigger id="recommendedAction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enumOptions(DISPOSAL_ACTION_META).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Search keywords"
              htmlFor="keywords"
              error={fieldErrors.keywords}
              hint="Comma separated. Helps students find this entry."
            >
              <Input
                {...fieldProps(
                  "keywords",
                  fieldErrors.keywords,
                  "Comma separated. Helps students find this entry.",
                )}
                defaultValue={guide?.keywords.join(", ")}
                placeholder="bottle, pet, water"
              />
            </Field>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="published">Published</Label>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Unpublished entries are hidden from students but kept here.
              </p>
            </div>
            <Switch
              id="published"
              checked={published}
              onCheckedChange={setPublished}
            />
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
                "Create entry"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
