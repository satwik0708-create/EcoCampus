#!/usr/bin/env bash
#
# Build command for Vercel deployments.
#
# Migrations are applied ONLY for production deployments. This matters: every
# push to a branch with an open PR triggers a Vercel preview build, and if
# migrations ran there too, a preview of an unreviewed branch would mutate
# whatever database its environment points at — in the common setup where
# preview and production share a connection string, that is the production
# database, migrated from unmerged code. Skipping them on preview makes that
# impossible rather than merely unlikely.
#
# `prisma migrate deploy` applies committed migrations only. It never
# generates one, never prompts, and never resets — it is the command intended
# for non-interactive environments.

set -euo pipefail

echo "→ Generating the Prisma client"
npx prisma generate

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "→ VERCEL_ENV=production: applying database migrations"
  npx prisma migrate deploy
else
  echo "→ VERCEL_ENV=${VERCEL_ENV:-unset}: skipping migrations (production only)"
fi

echo "→ Building the application"
next build
