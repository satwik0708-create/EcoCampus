import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Opaque, high-entropy token handed to the client. */
export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Only the hash is ever persisted, so a DB dump cannot be replayed. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
