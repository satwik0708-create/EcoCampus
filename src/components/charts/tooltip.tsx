"use client";

/**
 * Themed chart tooltip.
 *
 * Recharts' default tooltip renders dark-on-white regardless of theme; this
 * one uses the popover tokens so it stays readable in both.
 *
 * The props are declared structurally rather than by importing Recharts'
 * internal tooltip prop type: `content` is invoked by the library with a
 * partial set of props, so a strict import would force every call site to
 * supply fields it has no way to know.
 */
export type ChartTooltipEntry = {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
};

export type ChartTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<ChartTooltipEntry>;
  label?: string | number;
  valueSuffix?: string;
  formatter?: (value: number, name: string) => string;
};

export function ChartTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
  formatter,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      {label !== undefined && label !== "" ? (
        <p className="mb-1.5 font-medium">{String(label)}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry, index) => {
          const value = Number(entry.value ?? 0);
          const name = String(entry.name ?? "");
          return (
            <li key={`${name}-${index}`} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: entry.color ?? "var(--chart-1)" }}
              />
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto font-medium tabular-nums">
                {formatter
                  ? formatter(value, name)
                  : `${value.toLocaleString("en-GB")}${valueSuffix}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
