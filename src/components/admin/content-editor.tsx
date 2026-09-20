"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ContentCategory, type EducationalContent } from "@prisma/client";
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
import { CONTENT_CATEGORY_META, enumOptions } from "@/lib/rules/catalog";
import {
  educationalContentSchema,
  type EducationalContentInput,
} from "@/lib/validation/schemas";

export function ContentEditor({
  article,
  trigger = "button",
}: {
  article?: EducationalContent;
  trigger?: "button" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const isEdit = !!article;

  const [category, setCategory] = React.useState<ContentCategory>(
    article?.category ?? ContentCategory.SEGREGATION,
  );
  const [published, setPublished] = React.useState(article?.published ?? true);

  const { submit, pending, fieldErrors, formError, reset } = useFormSubmit<
    EducationalContentInput,
    { ok: true }
  >({
    schema: educationalContentSchema,
    endpoint: isEdit ? `/api/admin/content/${article.id}` : "/api/admin/content",
    method: isEdit ? "PATCH" : "POST",
    onSuccess: () => {
      toast.success(isEdit ? "Article updated." : "Article created.");
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
      category,
      content: String(data.get("content") ?? ""),
      readMinutes: Number(data.get("readMinutes") ?? Number.NaN),
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
          aria-label={`Edit ${article?.title ?? "article"}`}
        >
          <PencilIcon className="size-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          New article
        </Button>
      )}

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit article" : "New article"}</DialogTitle>
          <DialogDescription>
            Articles are rendered as plain text with simple structure. Use
            &ldquo;## &rdquo; for a heading and &ldquo;- &rdquo; for a bullet;
            HTML is never rendered.
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
              defaultValue={article?.title}
              maxLength={120}
              placeholder="How to segregate waste on campus"
              required
            />
          </Field>

          <Field
            label="Summary"
            htmlFor="description"
            error={fieldErrors.description}
            required
          >
            <Textarea
              {...fieldProps("description", fieldErrors.description)}
              defaultValue={article?.description}
              rows={2}
              maxLength={300}
              placeholder="Shown on the article card."
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Topic"
              htmlFor="category"
              error={fieldErrors.category}
              required
            >
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as ContentCategory)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enumOptions(CONTENT_CATEGORY_META).map((option) => (
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
              label="Reading time (minutes)"
              htmlFor="readMinutes"
              error={fieldErrors.readMinutes}
              required
            >
              <Input
                {...fieldProps("readMinutes", fieldErrors.readMinutes)}
                type="number"
                min="1"
                max="60"
                step="1"
                defaultValue={article?.readMinutes ?? 3}
                required
              />
            </Field>
          </div>

          <Field label="Body" htmlFor="content" error={fieldErrors.content} required>
            <Textarea
              {...fieldProps("content", fieldErrors.content)}
              defaultValue={article?.content}
              rows={12}
              maxLength={20000}
              className="font-mono text-xs"
              placeholder={"## Why it matters\n\nParagraph text…\n\n- A bullet\n- Another bullet"}
              required
            />
          </Field>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="published">Published</Label>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Unpublished articles are hidden from the student Learn page.
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
                "Create article"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
