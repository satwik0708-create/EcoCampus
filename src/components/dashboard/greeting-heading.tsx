"use client";

import * as React from "react";
import { greeting } from "@/lib/utils";

/**
 * Time-of-day greeting.
 *
 * Rendered on the client because the *viewer's* local hour is what matters
 * here — a server-rendered greeting would say "good morning" to a student
 * whose evening it actually is. The server markup uses the neutral form and
 * is replaced after hydration.
 */
export function GreetingHeading({
  name,
  tagline,
}: {
  name: string;
  tagline: string;
}) {
  const [label, setLabel] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLabel(greeting());
  }, []);

  return (
    <div className="space-y-1.5">
      <h1 className="text-2xl font-semibold tracking-tight">
        {label ? `${label}, ${name}` : `Welcome back, ${name}`}
      </h1>
      <p className="text-muted-foreground text-sm">{tagline}</p>
    </div>
  );
}
