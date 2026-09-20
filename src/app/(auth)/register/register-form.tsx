"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
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
import { registerSchema, type RegisterInput } from "@/lib/validation/schemas";

const NO_DEPARTMENT = "__none__";

export function RegisterForm({
  departments,
}: {
  departments: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [departmentId, setDepartmentId] = React.useState(NO_DEPARTMENT);

  const { submit, pending, fieldErrors, formError } = useFormSubmit<
    RegisterInput,
    { ok: true; redirectTo: string }
  >({
    schema: registerSchema,
    endpoint: "/api/auth/register",
    onSuccess: (result) => {
      router.replace(result.redirectTo);
      router.refresh();
    },
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await submit({
      name: String(data.get("name") ?? ""),
      displayName: String(data.get("displayName") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      confirmPassword: String(data.get("confirmPassword") ?? ""),
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
          autoComplete="name"
          placeholder="Ananya Sharma"
          required
        />
      </Field>

      <Field
        label="Display name"
        htmlFor="displayName"
        error={fieldErrors.displayName}
        hint="Shown on the campus leaderboard. Your real name and email are never displayed there."
        required
      >
        <Input
          {...fieldProps(
            "displayName",
            fieldErrors.displayName,
            "Shown on the campus leaderboard.",
          )}
          autoComplete="nickname"
          placeholder="ananya_s"
          required
        />
      </Field>

      <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
        <Input
          {...fieldProps("email", fieldErrors.email)}
          type="email"
          autoComplete="email"
          placeholder="you@campus.edu"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course" htmlFor="course" error={fieldErrors.course}>
          <Input
            {...fieldProps("course", fieldErrors.course)}
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

      <Field
        label="Password"
        htmlFor="password"
        error={fieldErrors.password}
        hint="At least 10 characters, with an uppercase letter, a lowercase letter and a number."
        required
      >
        <Input
          {...fieldProps(
            "password",
            fieldErrors.password,
            "At least 10 characters, with an uppercase letter, a lowercase letter and a number.",
          )}
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="confirmPassword"
        error={fieldErrors.confirmPassword}
        required
      >
        <Input
          {...fieldProps("confirmPassword", fieldErrors.confirmPassword)}
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Creating your account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
