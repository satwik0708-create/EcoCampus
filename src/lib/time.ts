/**
 * Campus-day arithmetic.
 *
 * Streaks, "first activity today" bonuses and challenge windows are all
 * defined in terms of the *campus* calendar day, not the server's UTC day.
 * A student logging waste at 00:30 IST should get credit for that IST day even
 * though it is still the previous day in UTC.
 *
 * A "campus day" is represented two ways:
 *  - `CampusDay`: an ISO `YYYY-MM-DD` string, used for comparisons and keys.
 *  - a `Date` at exactly UTC midnight of that day, which is what Postgres
 *    `@db.Date` columns round-trip losslessly.
 *
 * These helpers are pure and dependency-free so they can be unit tested.
 */

export type CampusDay = string; // "YYYY-MM-DD"

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The campus-local calendar day that `instant` falls on. */
export function toCampusDay(instant: Date, timeZone: string): CampusDay {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  // en-CA formats as YYYY-MM-DD.
  return parts;
}

/** Today, in campus-local terms. */
export function campusToday(timeZone: string, now: Date = new Date()): CampusDay {
  return toCampusDay(now, timeZone);
}

/** Parse a `YYYY-MM-DD` string into a Date at UTC midnight (for @db.Date). */
export function campusDayToDate(day: CampusDay): Date {
  if (!ISO_DAY.test(day)) {
    throw new Error(`Invalid campus day "${day}", expected YYYY-MM-DD.`);
  }
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid campus day "${day}".`);
  }
  return date;
}

/**
 * Read a `@db.Date` column back as a campus day string.
 *
 * Prisma hands back a Date at UTC midnight for Date columns, so the UTC
 * components are the stored calendar day — reading local components here would
 * shift the day for servers west of UTC.
 */
export function dateToCampusDay(date: Date): CampusDay {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Whole days from `from` to `to`. Negative when `to` precedes `from`. */
export function daysBetween(from: CampusDay, to: CampusDay): number {
  const ms = campusDayToDate(to).getTime() - campusDayToDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Shift a campus day by `delta` days. */
export function addDays(day: CampusDay, delta: number): CampusDay {
  const shifted = new Date(campusDayToDate(day).getTime() + delta * 86_400_000);
  return dateToCampusDay(shifted);
}

/** Inclusive list of campus days from `start` to `end`. */
export function campusDayRange(start: CampusDay, end: CampusDay): CampusDay[] {
  const total = daysBetween(start, end);
  if (total < 0) return [];
  const out: CampusDay[] = [];
  for (let i = 0; i <= total; i += 1) out.push(addDays(start, i));
  return out;
}

export function isValidCampusDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && dateToCampusDay(date) === value;
}

/** Human label such as "Mon, 12 May". */
export function formatCampusDay(
  day: CampusDay,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" },
): string {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(
    campusDayToDate(day),
  );
}
