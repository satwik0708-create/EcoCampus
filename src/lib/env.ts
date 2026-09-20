import "server-only";

/**
 * Centralised, validated access to server-side environment variables.
 *
 * Nothing in this module may be imported from a client component — every
 * value here is a server secret or server-only configuration.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer.`);
  }
  return parsed;
}

function validTimeZone(value: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    throw new Error(`CAMPUS_TIMEZONE "${value}" is not a valid IANA timezone.`);
  }
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "ecocampus_session",
  sessionTtlHours: optionalInt("SESSION_TTL_HOURS", 168),
  campusTimeZone: validTimeZone(process.env.CAMPUS_TIMEZONE ?? "Asia/Kolkata"),
  isProduction: process.env.NODE_ENV === "production",
  /**
   * Development affordance only. Never true in production, regardless of how
   * the variable is set.
   */
  exposeResetTokens:
    process.env.NODE_ENV !== "production" &&
    process.env.ECOCAMPUS_EXPOSE_RESET_TOKENS === "true",
} as const;
