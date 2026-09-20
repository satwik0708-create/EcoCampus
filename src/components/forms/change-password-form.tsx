"use client";

import * as React from "react";
import { AlertCircleIcon, KeyRoundIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldProps } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { changePasswordSchema } from "@/lib/validation/schemas";

export function ChangePasswordForm() {
  const formRef = React.useRef<HTMLFormElement>(null);

  const { submit, pending, fieldErrors, formError } = useFormSubmit<
    { currentPassword: string; password: string; confirmPassword: string },
    { ok: true; message: string }
  >({
    schema: changePasswordSchema,
    endpoint: "/api/auth/change-password",
    onSuccess: (result) => {
      toast.success(result.message);
      formRef.current?.reset();
    },
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await submit({
      currentPassword: String(data.get("currentPassword") ?? ""),
      password: String(data.get("password") ?? ""),
      confirmPassword: String(data.get("confirmPassword") ?? ""),
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <Field
        label="Current password"
        htmlFor="currentPassword"
        error={fieldErrors.currentPassword}
        required
      >
        <Input
          {...fieldProps("currentPassword", fieldErrors.currentPassword)}
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        label="New password"
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
        label="Confirm new password"
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

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Updating…
          </>
        ) : (
          <>
            <KeyRoundIcon />
            Update password
          </>
        )}
      </Button>
    </form>
  );
}
