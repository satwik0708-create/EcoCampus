"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldProps } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { resetPasswordSchema } from "@/lib/validation/schemas";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = React.useState(false);

  const { submit, pending, fieldErrors, formError } = useFormSubmit<
    { token: string; password: string; confirmPassword: string },
    { ok: true; message: string }
  >({
    schema: resetPasswordSchema,
    endpoint: "/api/auth/reset-password",
    onSuccess: () => setDone(true),
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await submit({
      token,
      password: String(data.get("password") ?? ""),
      confirmPassword: String(data.get("confirmPassword") ?? ""),
    });
  }

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>This link is incomplete</AlertTitle>
        <AlertDescription>
          The reset link is missing its token. Request a new one from the{" "}
          <Link href="/forgot-password" className="text-primary font-medium hover:underline">
            forgot password
          </Link>{" "}
          page.
        </AlertDescription>
      </Alert>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <CheckCircle2Icon />
          <AlertTitle>Password updated</AlertTitle>
          <AlertDescription>
            Sign in with your new password. Any other devices were signed out.
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

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

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Updating password…
          </>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}
