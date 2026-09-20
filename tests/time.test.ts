import { describe, expect, it } from "vitest";
import {
  addDays,
  campusDayRange,
  campusDayToDate,
  daysBetween,
  dateToCampusDay,
  isValidCampusDay,
  toCampusDay,
} from "@/lib/time";

describe("campus day arithmetic", () => {
  it("resolves an instant to the campus-local day, not the UTC day", () => {
    // 20:00 UTC is already the next day in Asia/Kolkata (UTC+05:30).
    const instant = new Date("2026-05-11T20:00:00.000Z");
    expect(toCampusDay(instant, "UTC")).toBe("2026-05-11");
    expect(toCampusDay(instant, "Asia/Kolkata")).toBe("2026-05-12");
  });

  it("resolves an instant west of UTC to the previous day", () => {
    // 02:00 UTC is still the previous evening in New York.
    const instant = new Date("2026-05-12T02:00:00.000Z");
    expect(toCampusDay(instant, "America/New_York")).toBe("2026-05-11");
  });

  it("round-trips a campus day through a Date", () => {
    expect(dateToCampusDay(campusDayToDate("2028-02-29"))).toBe("2028-02-29");
    expect(dateToCampusDay(campusDayToDate("2026-01-01"))).toBe("2026-01-01");
  });

  it("reads a @db.Date value by its UTC components", () => {
    // Prisma hands back UTC midnight for Date columns.
    expect(dateToCampusDay(new Date("2026-03-01T00:00:00.000Z"))).toBe("2026-03-01");
  });

  it("counts days across a month boundary", () => {
    expect(daysBetween("2026-01-30", "2026-02-02")).toBe(3);
    expect(daysBetween("2026-02-02", "2026-01-30")).toBe(-3);
    expect(daysBetween("2026-05-11", "2026-05-11")).toBe(0);
  });

  it("counts days across a leap day", () => {
    // 2028 is a leap year, so 29 February sits between these dates.
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    // 2026 is not, so the same span is one day shorter.
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
  });

  it("shifts days in both directions", () => {
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("builds an inclusive range", () => {
    expect(campusDayRange("2026-05-10", "2026-05-12")).toEqual([
      "2026-05-10",
      "2026-05-11",
      "2026-05-12",
    ]);
    expect(campusDayRange("2026-05-12", "2026-05-10")).toEqual([]);
  });

  it("rejects malformed and impossible dates", () => {
    expect(isValidCampusDay("2026-05-11")).toBe(true);
    expect(isValidCampusDay("2026-5-11")).toBe(false);
    expect(isValidCampusDay("2026-13-01")).toBe(false);
    expect(isValidCampusDay("2028-02-29")).toBe(true); // 2028 is a leap year
    expect(isValidCampusDay("2026-02-29")).toBe(false); // 2026 is not
    expect(isValidCampusDay("not-a-date")).toBe(false);
    expect(() => campusDayToDate("2026-5-1")).toThrow();
  });
});
