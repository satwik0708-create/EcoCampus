"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldProps } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { updateProfileSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

const NO_DEPARTMENT = "__none__";

type ProfileInput = z.infer<typeof updateProfileSchema>;

export function ProfileForm({
  initial,
  departments,
}: {
  initial: {
    name: string;
    displayName: string;
    course: string | null;
    departmentId: string | null;
  };
  departments: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [departmentId, setDepartmentId] = React.useState(
    initial.departmentId ?? NO_DEPARTMENT,
  );

  const { submit, pending, fieldErrors, formError } = useFormSubmit<
    ProfileInput,
    { ok: true; message: string }
  >({
    schema: updateProfileSchema,
    endpoint: "/api/auth/profile",
    method: "PATCH",
    onSuccess: (result) => {
      toast.success(result.message);
      router.refresh();
    },
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await submit({
      name: String(data.get("name") ?? ""),
      displayName: String(data.get("displayName") ?? ""),
      course: String(data.get("course") ?? ""),
      departmentId: departmentId === NO_DEPARTMENT ? "" : departmentId,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <Field label="Full name" htmlFor="name" error={fieldErrors.name} required>
        <Input
          {...fieldProps("name", fieldErrors.name)}
          defaultValue={initial.name}
          autoComplete="name"
          required
        />
      </Field>

      <Field
        label="Display name"
        htmlFor="displayName"
        error={fieldErrors.displayName}
        hint="This is the only name shown on the campus leaderboard."
        required
      >
        <Input
          {...fieldProps(
            "displayName",
            fieldErrors.displayName,
            "This is the only name shown on the campus leaderboard.",
          )}
          defaultValue={initial.displayName}
          autoComplete="nickname"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course" htmlFor="course" error={fieldErrors.course}>
          <Input
            {...fieldProps("course", fieldErrors.course)}
            defaultValue={initial.course ?? ""}
            placeholder="B.Tech Computer Science"
          />
        </Field>

        <Field
          label="Department"
          htmlFor="departmentId"
          error={fieldErrors.departmentId}
        >
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger id="departmentId" aria-label="Department">
              <SelectValue placeholder="Select a department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DEPARTMENT}>Not specified</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <SaveIcon />
            Save changes
          </>
        )}
      </Button>
    </form>
  );
}
