import "server-only";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodType } from "zod";
import { HttpError, badRequest } from "@/lib/auth/guards";
import { rateLimit, type RateLimitResult } from "@/lib/auth/rate-limit";

/**
 * Shared plumbing for every route handler: consistent JSON shapes, safe error
 * translation (raw Prisma errors never reach the browser), and request-level
 * guards.
 */

export type ApiError = {
  error: string;
  /** Field-level messages keyed by form field, when validation failed. */
  fieldErrors?: Record<string, string[]>;
};

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(
  status: number,
  error: string,
  fieldErrors?: Record<string, string[]>,
): NextResponse<ApiError> {
  return NextResponse.json<ApiError>(
    fieldErrors ? { error, fieldErrors } : { error },
    { status },
  );
}

function flattenZod(issues: ZodError["issues"]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.length ? issue.path.join(".") : "form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * Translate anything thrown inside a handler into a safe response.
 *
 * Unexpected errors are logged server-side with full detail and reported to
 * the client as a generic message — database constraint text, table names and
 * stack traces are never leaked.
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof HttpError) {
    const fieldErrors =
      error.details && typeof error.details === "object"
        ? (error.details as Record<string, string[]>)
        : undefined;
    return jsonError(error.status, error.message, fieldErrors);
  }

  if (error instanceof ZodError) {
    return jsonError(422, "Please correct the highlighted fields.", flattenZod(error.issues));
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return jsonError(409, "That value is already in use.");
    }
    if (error.code === "P2025") {
      return jsonError(404, "That resource could not be found.");
    }
  }

  console.error(`[api:${context}]`, error);
  return jsonError(500, "Something went wrong on our side. Please try again.");
}

/** Parse a JSON body against a schema, rejecting malformed payloads. */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(
      422,
      "Please correct the highlighted fields.",
      flattenZod(result.error.issues),
    );
  }
  return result.data;
}

export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  const url = new URL(request.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (value !== "") raw[key] = value;
  });
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(
      422,
      "Invalid query parameters.",
      flattenZod(result.error.issues),
    );
  }
  return result.data;
}

/**
 * Client key for rate limiting.
 *
 * Behind a proxy the socket address is the proxy, so the first hop of
 * `x-forwarded-for` is used when present. Document the trusted-proxy
 * assumption before exposing this to the internet.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function enforceRateLimit(
  request: Request,
  scope: string,
  config: { limit: number; windowMs: number },
  extraKey = "",
): Promise<RateLimitResult> {
  const result = await rateLimit(
    `${scope}:${clientKey(request)}${extraKey ? `:${extraKey}` : ""}`,
    config.limit,
    config.windowMs,
  );
  if (!result.allowed) {
    throw new HttpError(
      429,
      `Too many attempts. Try again in ${result.retryAfterSeconds} seconds.`,
    );
  }
  return result;
}

/**
 * CSRF defence for state-changing requests.
 *
 * The session cookie is SameSite=Lax, which already blocks cross-site POSTs
 * from a form or fetch. This adds a second, explicit check: the Origin header
 * (sent by browsers on every cross-origin request, and on all same-origin
 * non-GET fetches) must match the Host the request arrived on.
 */
export function assertSameOrigin(request: Request): void {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const origin = request.headers.get("origin");

  // Behind a proxy the public hostname arrives in `x-forwarded-host`, while
  // `host` may be the internal or deployment host. On Vercel with a custom
  // domain the two differ, and comparing the Origin against `host` alone
  // rejects every legitimate form submission with a 403 — pages load, but
  // sign-in and sign-up fail.
  //
  // Both candidates are accepted. A genuine cross-site POST still fails,
  // because the attacker's Origin matches neither. As with the
  // `x-forwarded-for` handling in `clientKey`, this assumes only a trusted
  // proxy can set the forwarded headers; see the deployment notes in
  // README.md.
  const candidates = [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
  ]
    .filter((value): value is string => !!value)
    // A forwarded header may carry a comma-separated chain; the first entry
    // is the host the client actually asked for.
    .map((value) => value.split(",")[0]!.trim())
    .filter(Boolean);

  if (!origin || candidates.length === 0) {
    throw new HttpError(403, "Request rejected: missing origin information.");
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Request rejected: malformed origin.");
  }

  if (!candidates.includes(originHost)) {
    throw new HttpError(403, "Request rejected: cross-site request blocked.");
  }
}
