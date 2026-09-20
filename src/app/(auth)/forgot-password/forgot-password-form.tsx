"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldProps } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { forgotPasswordSchema } from "@/lib/validation/schemas";

type ForgotResponse = { ok: true; message: string; devResetUrl?: string };

export function ForgotPasswordForm() {
  const [result, setResult] = React.useState<ForgotResponse | null>(null);

  const { submit, pending, fieldErrors, formError } = useFormSubmit<
    { email: string },
    ForgotResponse
  >({
    schema: forgotPasswordSchema,
    endpoint: "/api/auth/forgot-password",
    onSuccess: (response) => setResult(response),
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await submit({ email: String(data.get("email") ?? "") });
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <CheckCircle2Icon />
          <AlertTitle>Request received</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>

        {result.devResetUrl ? (
          <Alert variant="warning">
            <AlertCircleIcon />
            <AlertTitle>Development mode</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                EcoCampus integrates no external email provider, so in
                development the link is shown here. In production it is only
                written to the server log.
              </p>
              <Link
                href={result.devResetUrl.replace(/^https?:\/\/[^/]+/, "")}
                className="text-primary font-medium break-all hover:underline"
              >
                Open the reset link
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}

        <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
          Send another request
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

      <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
        <Input
          {...fieldProps("email", fieldErrors.email)}
          type="email"
          autoComplete="email"
          placeholder="you@campus.edu"
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Generating link…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>
    </form>
  );
}
