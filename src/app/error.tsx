"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * `error.message` from a server component is replaced with a generic string
 * by Next.js in production, so nothing internal leaks. The digest is shown so
 * a user can quote it when reporting the problem.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[ecocampus] route error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md space-y-4">
        <span className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-full">
          <AlertTriangleIcon className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          We could not load this page. Your data is safe — nothing was changed.
          Try again, and if the problem continues, let your campus
          administrator know.
        </p>
        {error.digest ? (
          <p className="text-muted-foreground font-mono text-xs">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/redirect">Back to my dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
