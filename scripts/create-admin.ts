/**
 * Create (or promote) an administrator account.
 *
 * The seed script deliberately refuses to run in production, so this is the
 * supported way to provision the first administrator on a live deployment.
 * It is also how you promote an existing student without opening a SQL
 * client.
 *
 * Usage:
 *
 *   ADMIN_EMAIL=you@campus.edu \
 *   ADMIN_NAME="Your Name" \
 *   ADMIN_PASSWORD='a-long-unique-password' \
 *   npx tsx scripts/create-admin.ts
 *
 * The password is read from the environment rather than argv so it does not
 * land in your shell history or in the process list. Prefix the command with
 * a space if your shell records environment assignments.
 *
 * Re-running with an email that already exists promotes that account to
 * ADMIN and resets its password, which makes this safe to use for recovery.
 */

// Loaded before PrismaClient is constructed so a local .env is picked up.
// In a hosted environment there is no .env file and this is a no-op — the
// platform's own environment variables are used instead.
import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Point it at the database you want to create the administrator in.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required. See the usage comment in this file.`);
  }
  return value.trim();
}

/** Mirrors the password policy enforced by the registration endpoint. */
function assertStrongPassword(password: string): void {
  const problems: string[] = [];
  if (password.length < 10) problems.push("at least 10 characters");
  if (!/[a-z]/.test(password)) problems.push("a lowercase letter");
  if (!/[A-Z]/.test(password)) problems.push("an uppercase letter");
  if (!/[0-9]/.test(password)) problems.push("a number");
  if (problems.length) {
    throw new Error(`ADMIN_PASSWORD needs ${problems.join(", ")}.`);
  }
}

function assertEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`ADMIN_EMAIL "${email}" does not look like an email address.`);
  }
}

async function main() {
  const email = requireEnv("ADMIN_EMAIL").toLowerCase();
  const name = requireEnv("ADMIN_NAME");
  const password = requireEnv("ADMIN_PASSWORD");
  const displayName = (process.env.ADMIN_DISPLAY_NAME ?? "campus_admin").trim();

  assertEmail(email);
  assertStrongPassword(password);

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: Role.ADMIN, active: true, passwordHash, name },
    });
    // Any session opened before the password changed must not survive it.
    const { count } = await prisma.session.deleteMany({
      where: { userId: existing.id },
    });
    console.info(
      `Promoted existing account ${email} to ADMIN and reset its password.`,
    );
    if (count > 0) {
      console.info(`Revoked ${count} existing session(s) for that account.`);
    }
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      displayName,
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
  });
  console.info(`Created administrator ${email}.`);
}

main()
  .catch((error: unknown) => {
    console.error(
      `Failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
