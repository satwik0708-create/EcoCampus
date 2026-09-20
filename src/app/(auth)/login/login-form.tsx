"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, fieldProps } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { loginSchema } from "@/lib/validation/schemas";

type LoginResponse = { ok: true; redirectTo: string };

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const { submit, pending, fieldErrors, formError } = useFormSubmit<
    { email: string; password: string },
    LoginResponse
  >({
    schema: loginSchema,
    endpoint: "/api/auth/login",
    onSuccess: (result) => {
      // Only follow `next` when it is a same-site absolute path, so the
      // parameter cannot be used as an open redirect.
      const safeNext =
        nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : null;
      router.replace(safeNext ?? result.redirectTo);
      router.refresh();
    },
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await submit({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
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

      <Field label="Email" htmlFor="email" error={fieldErrors.email} required>
        <Input
          {...fieldProps("email", fieldErrors.email)}
          type="email"
          autoComplete="email"
          placeholder="you@campus.edu"
          required
        />
      </Field>

      <Field label="Password" htmlFor="password" error={fieldErrors.password} required>
        <Input
          {...fieldProps("password", fieldErrors.password)}
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
