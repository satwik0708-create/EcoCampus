import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

/**
 * A single headline figure.
 *
 * `value` is always passed in from a server query — this component never
 * computes or defaults a statistic.
 */
export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: number | string;
  unit?: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "info";
  className?: string;
}) {
  const toneClass = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/12 text-info",
  }[tone];

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {typeof value === "number" ? formatNumber(value) : value}
            {unit ? (
              <span className="text-muted-foreground ml-1 text-sm font-normal">
                {unit}
              </span>
            ) : null}
          </p>
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            toneClass,
          )}
        >
          <Icon className="size-[18px]" aria-hidden="true" />
        </div>
      </div>
      {hint ? (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{hint}</p>
      ) : null}
    </Card>
  );
}
