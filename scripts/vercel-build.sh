#!/usr/bin/env bash
#
# Build command for Vercel deployments.
#
# Migrations are the delicate part. There are two failure modes, in opposite
# directions, and the logic below exists to avoid both:
#
#   1. Migrating from a preview. Every push to a branch with an open PR
#      triggers a preview build. If preview and production share a
#      connection string — the default when you set DATABASE_URL once, for
#      all environments — migrating during a preview alters the PRODUCTION
#      schema from unreviewed code.
#
#   2. Not migrating a preview that has its own database. A dedicated
#      preview database starts empty, so skipping migrations leaves it with
#      no schema and the application returns P2021 ("table does not exist")
#      on every page that touches the database.
#
# So preview migrations are opt-in, and the opt-in is the operator's
# assertion that Preview points somewhere that is not production. Default
# off means a repository that has not been configured stays in case 1's safe
# position.

set -euo pipefail

# Print the database being targeted, without its credentials, so a build log
# makes it obvious if an environment is pointed at the wrong place.
describe_database() {
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "     (DATABASE_URL is not set)"
    return
  fi
  node -e '
    try {
      const u = new URL(process.env.DATABASE_URL);
      console.log(`     target: ${u.host}${u.pathname}`);
    } catch {
      console.log("     target: <unparseable DATABASE_URL>");
    }
  '
}

run_migrations() {
  describe_database
  npx prisma migrate deploy
}

echo "→ Generating the Prisma client"
npx prisma generate

case "${VERCEL_ENV:-}" in
  production)
    echo "→ VERCEL_ENV=production: applying database migrations"
    run_migrations
    ;;
  preview)
    if [ "${ALLOW_PREVIEW_MIGRATIONS:-}" = "true" ]; then
      echo "→ VERCEL_ENV=preview with ALLOW_PREVIEW_MIGRATIONS=true: applying migrations"
      run_migrations

      if [ "${SEED_PREVIEW_DATABASE:-}" = "true" ]; then
        # Seeds only when the database has no users, so a reviewer's data
        # survives subsequent pushes to the same preview.
        echo "→ SEED_PREVIEW_DATABASE=true: seeding if the database is empty"
        npx tsx prisma/seed.ts
      fi
    else
      echo "→ VERCEL_ENV=preview: skipping migrations"
      echo "     Set ALLOW_PREVIEW_MIGRATIONS=true on the Preview environment"
      echo "     ONLY once Preview has its own DATABASE_URL, separate from production."
    fi
    ;;
  *)
    echo "→ VERCEL_ENV=${VERCEL_ENV:-unset}: skipping migrations"
    ;;
esac

echo "→ Building the application"
next build
