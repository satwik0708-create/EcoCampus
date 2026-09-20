import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Conditional class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 1234 -> "1,234" */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "2 hours ago" / "in 3 days" — relative to now. */
export function formatRelative(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  const divisions: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60_000, "second"],
    [3_600_000, "minute"],
    [86_400_000, "hour"],
    [604_800_000, "day"],
    [2_629_800_000, "week"],
    [31_557_600_000, "month"],
  ];
  let unitMs = 1000;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (const [limit, candidate] of divisions) {
    if (Math.abs(diffMs) < limit) {
      unit = candidate;
      break;
    }
    unitMs = limit;
    unit = candidate;
  }
  const perUnit: Record<string, number> = {
    second: 1000,
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
    month: 2_629_800_000,
    year: 31_557_600_000,
  };
  const divisor = perUnit[unit] ?? unitMs;
  return rtf.format(Math.round(diffMs / divisor), unit);
}

/** Greeting keyed to the viewer's local hour. */
export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Initials for avatar fallbacks. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
