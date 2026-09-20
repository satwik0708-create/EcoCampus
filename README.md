# EcoCampus

**Small Actions. Sustainable Campus.**

A campus sustainability platform where students record the waste they produce,
learn exactly how to deal with it, and take part in challenges scored from
their real activity — while their institution gets the aggregated picture it
has never had.

Aligned with **UN Sustainable Development Goal 12 — Responsible Consumption
and Production** (targets 12.2, 12.3, 12.5 and 12.8).

---

## Contents

- [What it does](#what-it-does)
- [Design principles](#design-principles)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Demo credentials](#demo-credentials)
- [Commands](#commands)
- [Database](#database)
- [Business rules](#business-rules)
- [Security](#security)
- [Testing](#testing)
- [Production deployment](#production-deployment)
- [Known limitations](#known-limitations)

---

## What it does

### Students

| Feature | What it actually does |
| --- | --- |
| **Dashboard** | Points, streak, activity counts, weekly chart, waste breakdown, food-waste trend, live challenge progress and a rule-based recommendation — every figure queried from that student's own rows. |
| **Waste Tracker** | Records waste against eight predefined categories and five disposal routes, with validated quantities, units and dates. |
| **Food Waste Tracker** | Records food waste by meal and food category, flags whether it was avoidable, and charts a 30-day personal pattern. |
| **Waste Guide** | Searchable, filterable item-level guidance: reduce, reuse, recycle, dispose. Entirely database-driven. |
| **Challenges** | Join campus challenges. Progress is *measured* from real records — there is no "mark as complete" action anywhere in the API. |
| **Points** | An append-only ledger. The balance is `SUM(points)`, and every entry shows its reason and timestamp. |
| **Streaks** | Derived from the distinct campus days on which the student actually recorded something, in the campus timezone. |
| **Leaderboard** | Ranked on real point totals. Display names only — no emails, no real names. |
| **Learn** | Short articles published from the admin console. |
| **Profile** | Update details, change password (which rotates every other session). |

### Administrators

A **completely separate console** — not a student dashboard with extra buttons.

| Feature | What it actually does |
| --- | --- |
| **Institutional overview** | Live counts of students, records, activities, points awarded, challenge participation and recovery rate. |
| **Trends** | Activity and participation over a rolling window; category, disposal-route and department breakdowns. |
| **Waste / Food Waste data** | Paginated, server-filtered tables (date range, category, department, free text). |
| **Users** | Role and access management, with guard rails against removing the last administrator. |
| **Content management** | Full CRUD for challenges, waste-guide entries and learning articles, each with a confirmation dialog on delete. |
| **Settings** | Tune points values and toggle recommendation rules without a redeploy. |

Everything an administrator changes is written to an `AdminActivity` audit trail.

---

## Design principles

These constraints come from the product brief and are enforced throughout.

1. **No AI, no ML, no external APIs.** Recommendations are deterministic rules
   stored in the `RecommendationRule` table. There is no model, no inference,
   no third-party service, and no outbound network call anywhere in the
   application code.
2. **Nothing is faked.** No hardcoded dashboard statistics, no placeholder
   charts, no simulated latency, no buttons that do nothing. If a number
   appears in the UI, a query produced it.
3. **The server decides.** Points, streaks and challenge progress are computed
   server-side inside a transaction. The request schemas have no `points`
   field, so a client cannot award itself anything.
4. **Honest aggregates.** Mass totals sum only entries logged in grams or
   kilograms. Pieces, plates and servings are counted, never converted with a
   guessed weight, and the UI labels this wherever a mass figure appears.
5. **Expected impact is labelled as expected.** The SDG 12 page states plainly
   that its impact list describes intended outcomes, not measured results.

---

## Technology stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19, TypeScript strict) |
| Styling | Tailwind CSS v4 with an oklch token system, light + dark |
| Components | Hand-built shadcn/ui-style primitives on Radix UI |
| Icons | Lucide React |
| Charts | Recharts |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Validation | Zod 4 (the same schemas run on client and server) |
| Auth | Custom database-backed sessions, bcrypt password hashing |
| Testing | Vitest (unit + database integration) |

---

## Architecture

```
prisma/
  schema.prisma            # 16 models, enums, indexes, foreign keys
  migrations/              # committed SQL migrations
  seed.ts                  # development seed (refuses to run in production)
  seed-data.ts             # reference content: guides, articles, rules
  seed-recalculate.ts      # replays the real engines over seeded records

src/
  app/
    (public)/              # landing page, SDG 12
    (auth)/                # login, register, forgot-password, reset-password
    (student)/student/     # dashboard, trackers, guide, challenges, …
    (admin)/admin/         # console, trends, data tables, CRUD, settings
    api/                   # REST route handlers
    error.tsx, global-error.tsx, not-found.tsx

  components/
    ui/                    # design-system primitives
    charts/                # Recharts wrappers with loading/empty/error states
    layout/ dashboard/ forms/ waste/ challenges/ guide/ admin/ marketing/

  lib/
    auth/                  # password, tokens, session, guards, rate limiting
    db/                    # Prisma client singleton
    validation/            # Zod schemas shared by both sides
    rules/                 # predefined categories, units, conversions
    points/                # points engine
    streaks/               # streak engine (pure, fully unit tested)
    challenges/            # progress measurement
    recommendations/       # deterministic rule evaluation
    services/              # activity, dashboard, analytics, records, content
    api.ts                 # error mapping, parsing, CSRF, rate limiting
    time.ts                # campus-day arithmetic

  middleware.ts            # cheap redirect for anonymous visitors (UX only)

tests/                     # 139 tests: unit + PostgreSQL integration
```

**Separation is strict.** UI components never query the database; pages call
services; services call engines; engines hold the rules. No business rule is
duplicated in a component.

### The activity pipeline

Recording an activity is one database transaction:

```
POST /api/waste-records
  → same-origin check            (lib/api.ts)
  → session + role resolved      (lib/auth/guards.ts, from the DB)
  → rate limit                   (lib/auth/rate-limit.ts)
  → Zod validation               (lib/validation/schemas.ts)
  → BEGIN
      create WasteRecord
      award points               (lib/points/engine.ts, config from the DB)
      award daily check-in       (idempotent on the campus day)
      recompute streak           (lib/streaks/engine.ts, from real dates)
      award streak milestones    (idempotent on the milestone)
      recompute every joined challenge   (lib/challenges/engine.ts)
      pay out newly completed challenges (idempotent on the challenge)
    COMMIT
  → generate a rule-based recommendation (a read)
  → return the outcome
```

Idempotency is enforced by a unique index on
`(userId, sourceType, sourceId)` in `PointTransaction`, so re-running the
engine — or two concurrent submissions — cannot pay a student twice.

---

## Getting started

### Prerequisites

- Node.js 20 or newer
- PostgreSQL 14 or newer

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure the environment
cp .env.example .env
#    Edit .env and set DATABASE_URL, CAMPUS_TIMEZONE and SEED_DEMO_PASSWORD.

# 3. Create the database (if it does not exist)
createdb ecocampus

# 4. Apply migrations and generate the Prisma client
npm run db:migrate

# 5. Load development data
npm run db:seed

# 6. Start the development server
npm run dev
```

Open <http://localhost:3000>.

---

## Environment variables

All variables are documented in [`.env.example`](.env.example).

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `SESSION_COOKIE_NAME` | no | Session cookie name. Default `ecocampus_session`. |
| `SESSION_TTL_HOURS` | no | Session lifetime in hours. Default `168` (7 days). |
| `CAMPUS_TIMEZONE` | no | IANA zone used for every campus-day calculation — streaks, daily bonuses, challenge windows. Default `Asia/Kolkata`. |
| `ECOCAMPUS_EXPOSE_RESET_TOKENS` | no | **Development only.** Returns the password reset link in the API response so the flow can be exercised without a mail server. Forced off whenever `NODE_ENV=production`. |
| `SEED_DEMO_PASSWORD` | seed only | Password given to every seeded demo account. The seed refuses to run without it. |

`.env`, `.env.local` and every other `.env.*` file are gitignored;
`.env.example` is the only one committed.

---

## Demo credentials

**For local development only.** These accounts exist because
`npm run db:seed` created them, and the seed script throws if
`NODE_ENV=production`.

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@ecocampus.local` | value of `SEED_DEMO_PASSWORD` |
| Student | `student@ecocampus.local` | value of `SEED_DEMO_PASSWORD` |

Seven further student accounts (`rohanm@ecocampus.local`,
`priyan@ecocampus.local`, …) share the same password and exist to populate the
leaderboard and the institutional charts with varied activity.

> **Never deploy a seeded database to production.** Provision the first real
> administrator directly against the production database with a hash produced
> by `bcrypt` at cost 12, or promote an account through the Users console from
> an existing administrator session.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload. |
| `npm run build` | Generates the Prisma client, then builds for production. |
| `npm start` | Serves the production build. |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript rules). |
| `npm run typecheck` | `tsc --noEmit` against the strict config. |
| `npm test` | Full Vitest suite (needs a reachable `DATABASE_URL`). |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run db:migrate` | Creates and applies a migration in development. |
| `npm run db:deploy` | Applies committed migrations — use this in production. |
| `npm run db:reset` | Drops, re-migrates and re-seeds. Destructive. |
| `npm run db:seed` | Loads development data. |
| `npm run db:studio` | Opens Prisma Studio. |
| `npm run db:generate` | Regenerates the Prisma client. |

---

## Database

Sixteen models with real foreign keys, cascade rules and indexes on every
column the application filters or sorts by.

**Identity** — `User`, `Session`, `PasswordResetToken`, `Department`
**Activity** — `WasteRecord`, `FoodWasteRecord`
**Gamification** — `PointTransaction`, `Streak`, `Challenge`, `ChallengeParticipation`
**Content** — `DisposalGuide`, `EducationalContent`
**Configuration** — `PointsRule`, `RecommendationRule`, `SystemSetting`
**Audit** — `AdminActivity`

Categories are database enums, so an invalid category is rejected by
PostgreSQL itself even if every layer above it were bypassed.

### Migrations

Migrations live in `prisma/migrations/` and are committed. In production run
`npm run db:deploy`, never `db:migrate` (which is interactive and can reset).

---

## Business rules

### Points

Values live in the `PointsRule` table and are editable from the admin console.
Defaults installed by the seed:

| Rule | Points | When |
| --- | --- | --- |
| `WASTE_RECORD` | 5 | Each waste record. |
| `FOOD_WASTE_RECORD` | 5 | Each food waste record. |
| `DAILY_FIRST_ACTIVITY` | 3 | Once per campus day. |
| `SEGREGATION_BONUS` | 2 | Waste recycled, composted, reused or specially disposed of. |
| `STREAK_MILESTONE` | 10 | Reward for a 7-day streak; 14/30/60-day milestones scale proportionally. |
| `CHALLENGE_COMPLETION` | — | Each challenge carries its own reward. |

Changing a value affects future awards only. The ledger is an audit trail and
is never retroactively recalculated.

### Streaks

A streak is the run of consecutive **campus** calendar days on which the
student recorded at least one qualifying activity, ending today or yesterday.
Today counts while it is still in progress; two missed days break it.

The streak is always **derived** from the set of days that actually have
records — never incremented. That keeps it correct when a student backdates an
entry, deletes one, or logs several activities in a day, and it cannot drift.

### Challenges

Each challenge declares a **metric** (`RECORD_COUNT`, `ACTIVE_DAYS`,
`MASS_GRAMS`), a **scope** (`WASTE`, `FOOD_WASTE`, `ANY`) and optional
category/disposal filters. Progress is recomputed from the student's real
records inside the challenge window — on every activity, and again when they
join, so pre-existing activity counts immediately.

### Recommendations

`RecommendationRule` rows are evaluated against a snapshot of the student's
own recent activity. Nine triggers are supported (latest category, frequency
within a window, high food waste, no recent activity, no active challenge,
streak at risk, and an always-matching fallback). The lowest priority number
wins; ties break on the rule code, so the output is completely deterministic.

---

## Security

| Control | Implementation |
| --- | --- |
| Password storage | bcrypt, cost 12. Plaintext is never written to the database, a log or a response. |
| Sessions | Opaque 256-bit tokens in an httpOnly, SameSite=Lax cookie (Secure in production). Only the SHA-256 hash is stored, so a database dump cannot be replayed as a login. |
| Authorization | Resolved from the database on every request. The client never asserts a role. |
| Page protection | Server-side guards in the `(student)` and `(admin)` layouts, so a direct navigation or refresh is checked, not just a client transition. |
| Middleware | UX redirect only — explicitly *not* the security boundary. It sees that a cookie exists, nothing more. |
| Ownership | Per-record endpoints verify the owner and return **404**, not 403, so IDs cannot be probed for existence. Administrators are not exempted from student-facing endpoints. |
| Input validation | Zod on the client and again on the server. The server copy is the boundary. |
| Privilege escalation | `role` is absent from every user-writable schema. Registration always creates a `STUDENT`. |
| Point tampering | No endpoint accepts a point value. No endpoint accepts a challenge completion flag. |
| CSRF | SameSite=Lax cookies plus an explicit Origin/Host check on every mutating request. |
| Rate limiting | Fixed-window limiter on sign-in (per IP **and** per targeted email), registration, password reset and all writes. |
| Account enumeration | Sign-in returns one generic message and burns comparable time on the unknown-account path. Password reset returns an identical response either way. |
| Reset tokens | Single use, one hour, hash-only storage. A successful reset destroys every session for the account. |
| Data minimisation | The leaderboard and the admin console select `displayName` only — emails are never loaded into those queries. |
| SQL injection | All access goes through the Prisma query builder. There is no raw SQL in the codebase. |
| XSS | No `dangerouslySetInnerHTML` anywhere. Administrator-authored articles are parsed as plain text, never as HTML. |
| Headers | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`; `X-Powered-By` removed. |
| Secrets | Server-only modules are marked with `server-only`. No secret is reachable from the client bundle. |

### A note on the Content Security Policy

`script-src` includes `'unsafe-inline'`. This is a deliberate, documented
trade-off rather than an oversight, and the reasoning is in
[`next.config.ts`](next.config.ts):

Next.js hydrates through an inline bootstrap script. The strict alternative is
a per-request nonce, but Next can only inject a nonce into a *dynamically
rendered* page — it cannot stamp one onto HTML prerendered at build time.
Several pages here (the landing page, the auth screens) are deliberately static
for performance, so a nonce policy would silently block their hydration and
leave every form on those pages inert.

What offsets it: this application renders no caller-supplied HTML anywhere, so
there is no injection point for an inline `<script>` in the first place.
`script-src 'self'` still blocks every externally hosted script.

To tighten it, mark the public and auth routes `force-dynamic`, reinstate a
nonce in middleware, and set the CSP on the **request** headers so Next can
read the nonce from it.

---

## Testing

```bash
npm test
```

**139 tests** across 9 files. The integration tests run against a real
PostgreSQL database (the behaviour under test — transactional awards,
unique-constraint idempotency, aggregate queries — cannot be verified against a
mock). They create users under a `vitest-` prefix and clean up afterwards, so
your development data survives a run.

| File | Covers |
| --- | --- |
| `time.test.ts` | Campus-day arithmetic across timezones, month boundaries and leap years. |
| `streaks.test.ts` | Streak derivation, gaps, duplicates, milestones, idempotency. |
| `points.test.ts` | Award computation, configuration fallbacks, idempotency keys. |
| `recommendations.test.ts` | Every trigger, priority ordering, determinism. |
| `challenge-engine.test.ts` | Windows, status transitions, percentage maths. |
| `validation.test.ts` | Password policy, quantities, dates, enums, privilege fields. |
| `rate-limit.test.ts` | Window behaviour, per-key isolation, expiry. |
| `activity.integration.test.ts` | The full pipeline end to end against PostgreSQL. |
| `auth.integration.test.ts` | Hashing, token storage, ownership, CSRF, role storage. |

### Manual verification

Both primary flows have been exercised against a running production build:

- **Student:** register → sign in → record waste → points awarded → streak
  updated → challenge progress measured → recommendation shown → data survives
  a refresh → visible on the leaderboard → sign out.
- **Administrator:** sign in → institutional dashboard → trends → filtered
  data tables → create/update/delete a guide entry → create a challenge → user
  management.
- **Negative paths:** a student cannot read or delete another student's
  record, cannot reach any admin route or API, and cannot award itself points
  by adding fields to a request body.

---

## Production deployment

1. **Provision PostgreSQL** and set `DATABASE_URL`.
2. **Set the environment**: `NODE_ENV=production`, a real `CAMPUS_TIMEZONE`,
   and leave `ECOCAMPUS_EXPOSE_RESET_TOKENS` unset.
3. **Apply migrations**: `npm run db:deploy`.
4. **Do not seed.** `npm run db:seed` throws when `NODE_ENV=production`.
5. **Create the first administrator** directly against the database, using a
   bcrypt hash at cost 12.
6. **Build and start**: `npm run build && npm start`.
7. **Terminate TLS** in front of the app. Session cookies are marked `Secure`
   in production and will not be set over plain HTTP.
8. **Set a trusted proxy.** The rate limiter reads the first hop of
   `X-Forwarded-For`; make sure only your proxy can set that header.

### Delivering password reset emails

EcoCampus integrates no external email provider, by design — the brief rules
out third-party APIs. The reset URL is written to the server log at `info`
level for an operator to deliver. To wire up a mail service, send the message
from `src/app/api/auth/forgot-password/route.ts` where the URL is currently
logged; nothing else needs to change.

---

## Known limitations

Stated plainly rather than hidden.

- **The rate limiter is per process.** It holds its state in memory, which
  covers a single-instance deployment. A horizontally scaled deployment needs
  a shared store (Redis) or an edge rate limit in front of the application.
- **No email delivery.** See above — this follows from the no-external-APIs
  constraint, not from an omission.
- **Mass totals under-report deliberately.** Entries logged in pieces, plates
  or servings contribute to record counts but not to kilogram figures, because
  converting them would mean inventing weights. Every mass figure in the UI
  says so.
- **The leaderboard ranks in application code.** Point totals are aggregated in
  SQL, but the final ranking is computed in Node. That is comfortable for a
  single campus; a multi-campus deployment should move it into a window
  function.
- **`AdminActivity` covers content and configuration changes**, not reads. If
  your institution needs read auditing of student records, that is additional
  work.

---

## Licence

Built as a campus sustainability project aligned with UN SDG 12.
