"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * A labelled form field with accessible error wiring.
 *
 * The error message is linked to the control via aria-describedby and marked
 * role="alert", so a screen reader announces a validation failure instead of
 * the user only seeing red text.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint && !error?.length ? (
        <p id={hintId} className="text-muted-foreground text-xs leading-relaxed">
          {hint}
        </p>
      ) : null}
      {error?.length ? (
        <p id={errorId} role="alert" className="text-destructive text-xs leading-relaxed">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

/** Props to spread onto the control inside a <Field>. */
export function fieldProps(id: string, error?: string[], hint?: string) {
  const described = [
    error?.length ? `${id}-error` : null,
    hint && !error?.length ? `${id}-hint` : null,
  ].filter(Boolean);
  return {
    id,
    name: id,
    "aria-invalid": error?.length ? true : undefined,
    "aria-describedby": described.length ? described.join(" ") : undefined,
  } as const;
}
