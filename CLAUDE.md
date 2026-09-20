# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # development server
npm run build          # prisma generate && next build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm test               # full Vitest suite — needs a reachable PostgreSQL
npm run db:migrate     # create + apply a migration (development)
npm run db:deploy      # apply committed migrations (production)
npm run db:seed        # load development data
npm run db:reset       # drop, re-migrate, re-seed — destructive
npm run create-admin   # provision an administrator (see scripts/create-admin.ts)
```

Run a single test file or a single test:

```bash
npx vitest run tests/streaks.test.ts
npx vitest run tests/streaks.test.ts -t "counts consecutive days"
```

The suite needs a real PostgreSQL: `tests/activity.integration.test.ts` and
`tests/auth.integration.test.ts` run against the database in `DATABASE_URL`.
They create rows under a `vitest-` prefix and clean up afterwards, so running
them does not destroy development data. `tests/helpers/setup.ts` loads `.env`
before any test imports PrismaClient.

Both `DATABASE_URL` and `DIRECT_DATABASE_URL` must be set, even locally and
even to the same value. `prisma/schema.prisma` declares `directUrl`, and the
Prisma CLI refuses to resolve the schema without it — `migrate deploy` then
fails with a bare `Validation Error Count: 1` before it ever connects.

## The product constraint

This application deliberately contains **no AI, no ML, and no external data
APIs**. Recommendations are rows in the `RecommendationRule` table evaluated
by a deterministic engine. Do not introduce a model, an inference call, or a
third-party data service to solve a problem here — the constraint is a
product requirement, not an accident.

PostgreSQL and Upstash Redis are infrastructure and do not conflict with
this; a weather, maps, or classification API would.

## Architecture

### Layering

```
src/app/**/route.ts, page.tsx   thin: auth guard → validate → call a service
src/lib/services/*              orchestration; own the Prisma transactions
src/lib/{points,streaks,challenges,recommendations}/engine.ts
                                pure business rules; no database access
src/lib/rules/catalog.ts        predefined categories, units, labels
```

Engines are pure and heavily unit tested. Services compose them and talk to
Prisma. Route handlers should stay a dozen lines. A business rule belongs in
an engine, never in a component or a route.

`src/lib/*/engine.ts`, `src/lib/time.ts` and `src/lib/rules/catalog.ts` deliberately omit
`import "server-only"` so the test suite and `prisma/seed.ts` can import them.
Everything touching Prisma, cookies or secrets carries it.

### The one transaction that matters

`recordWasteActivity` / `recordFoodWasteActivity` in `src/lib/services/activity.ts`
wrap all of this in a single `prisma.$transaction`:

1. insert the record
2. award points from the `PointsRule` table
3. award the once-per-day check-in
4. recompute the streak from real activity dates
5. recompute progress on every joined challenge
6. pay out newly completed challenges

If you add an effect of recording an activity, it goes inside that
transaction. Adding it afterwards reintroduces the partial-write states the
transaction exists to prevent.

### Invariants that are easy to break

**Derived, never stored.** A student's balance is `SUM(PointTransaction.points)`
— there is no counter column, and adding one would be a regression. The
streak is recomputed from the set of distinct campus days that have records
(`computeStreakState`), never incremented; that is what keeps it correct when
a student backdates or deletes an entry.

**Awards are idempotent through a unique index.** `PointTransaction` has a
unique `(userId, sourceType, sourceId)`. Every award sets those. A new award
type without them can be paid twice.

**A student never supplies points or completion.** `wasteRecordSchema` and
`foodWasteRecordSchema` have no `points` field, and no route anywhere accepts
a challenge completion flag — progress is *measured* from records, on write
and on join.

Admin schemas do carry `points` (`challengeInputSchema` sets a challenge's
reward, `pointsRuleUpdateSchema` tunes the engine's configuration); that is
configuration, written by an authenticated administrator, not a value a
student can submit for their own activity. Keep that distinction when adding
fields.

### Campus days, not UTC

Every date in the domain is a *campus* calendar day in `CAMPUS_TIMEZONE`, not
a UTC day. Streaks, the daily bonus and challenge windows all depend on this.
Go through `src/lib/time.ts`; do not call `new Date()` and slice it.

`@db.Date` columns round-trip as UTC midnight, so read them with
`dateToCampusDay` (UTC components) — reading local components shifts the day
for servers west of UTC. This is a real source of bugs: a test harness using
`date -u +%F` silently disagreed with the app for 5.5 hours a day.

### Auth

`src/middleware.ts` is **not** the security boundary. It only sees that a
cookie exists — not whose it is, or what role it carries. The real checks are
`requirePageStudent` / `requirePageAdmin` in the `(student)` and `(admin)`
layouts, and `requireApi*` in every route handler. Both run per request, so a
direct navigation or refresh is checked too.

Sessions are opaque random tokens; only their SHA-256 hash is stored.
Ownership failures return **404, not 403**, so record IDs cannot be probed —
and administrators are deliberately *not* exempt from student-facing
endpoints.

### Server/client boundary

Do not pass functions across it. Passing Lucide icon components from a server
layout into a client component once 500'd every authenticated page with
"Functions cannot be passed directly to Client Components". `AppShell` takes a
role and imports its own nav for exactly this reason.

### Rate limiting is async

`rateLimit()` and `enforceRateLimit()` return promises. They use Upstash Redis
when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are both set, and
an in-process counter otherwise (local, CI, single-instance). Redis failure
falls back to memory rather than failing the request, and the call is bounded
at one second.

## Seeding

`prisma/seed.ts` inserts records and then replays the **real engines** over
them via `prisma/seed-recalculate.ts`. It never writes a points total, streak
value or challenge progress directly. Keep it that way: it means seeded
dashboards are internally consistent, and an engine bug shows up in the demo
instead of being masked by hand-written numbers.

The seed refuses to run when `VERCEL_ENV=production`, and when `NODE_ENV` is
production unless it is an explicitly enabled preview seed. Vercel sets
`NODE_ENV=production` for preview builds too, which is why `VERCEL_ENV` is
checked first.

## Deployment

`scripts/vercel-build.sh` decides whether to migrate:

| `VERCEL_ENV` | `ALLOW_PREVIEW_MIGRATIONS` | Result |
| --- | --- | --- |
| `production` | anything | migrates |
| `preview` | `true` | migrates |
| `preview` | unset | skips |

The skip is the safe default: previews normally share production's connection
string, and migrating there would alter the production schema from unreviewed
code. The flag asserts that Preview has its own database — and a dedicated
preview database *needs* it, because an unmigrated one returns `P2021` on
every page that touches data.

Runtime uses a **pooled** connection; `prisma migrate` uses the direct one,
because it cannot run through a transaction pooler.

See README.md for the full deployment runbook, environment variables and
demo credentials.
