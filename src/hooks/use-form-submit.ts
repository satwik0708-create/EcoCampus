"use client";

import * as React from "react";
import type { ZodType } from "zod";

export type FieldErrors = Record<string, string[]>;

/**
 * Shared submit handling for every form in the app.
 *
 * It validates with the same Zod schema the server uses, posts JSON, and maps
 * the server's `fieldErrors` back onto the form. Client validation is purely
 * for fast feedback — the server re-validates everything it receives, so a
 * user who bypasses this hook gains nothing.
 */
export function useFormSubmit<TInput, TResult>({
  schema,
  endpoint,
  method = "POST",
  onSuccess,
}: {
  schema: ZodType<TInput>;
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  onSuccess?: (result: TResult, input: TInput) => void | Promise<void>;
}) {
  const [pending, setPending] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  const reset = React.useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  const submit = React.useCallback(
    async (raw: unknown): Promise<TResult | null> => {
      setFieldErrors({});
      setFormError(null);

      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const errors: FieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path.length ? issue.path.join(".") : "form";
          (errors[key] ??= []).push(issue.message);
        }
        setFieldErrors(errors);
        setFormError("Please correct the highlighted fields.");
        return null;
      }

      setPending(true);
      try {
        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        if (!response.ok) {
          const body = (payload ?? {}) as {
            error?: string;
            fieldErrors?: FieldErrors;
          };
          if (body.fieldErrors) setFieldErrors(body.fieldErrors);
          setFormError(
            body.error ?? "Something went wrong. Please try again in a moment.",
          );
          return null;
        }

        const result = payload as TResult;
        await onSuccess?.(result, parsed.data);
        return result;
      } catch {
        // Network-level failure: fetch rejects rather than returning a status.
        setFormError(
          "We could not reach the server. Check your connection and try again.",
        );
        return null;
      } finally {
        setPending(false);
      }
    },
    [schema, endpoint, method, onSuccess],
  );

  return { submit, pending, fieldErrors, formError, reset, setFormError };
}
