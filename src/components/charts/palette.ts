/**
 * Chart series colours.
 *
 * These resolve to the CSS custom properties defined in globals.css, so the
 * same series keeps its identity in light and dark mode without any
 * JavaScript theme detection.
 */
export const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

export function seriesColor(index: number): string {
  return SERIES[index % SERIES.length]!;
}

export const AXIS_STYLE = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
} as const;

export const GRID_COLOR = "var(--border)";
