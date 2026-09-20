import "server-only";
import bcrypt from "bcryptjs";

/**
 * Password hashing.
 *
 * bcrypt with cost 12 — deliberately slow, salted per password, and never
 * reversible. Plaintext passwords are never written anywhere: not to the
 * database, not to logs, not to API responses.
 */
const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Burn roughly the same time as a real verification when the account does not
 * exist, so response timing cannot be used to enumerate registered emails.
 */
const DUMMY_HASH = bcrypt.hashSync("ecocampus-timing-equaliser", BCRYPT_COST);

export async function fakeVerifyPassword(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
