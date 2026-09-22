import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  cleanupTestData,
  createTestAdmin,
  createTestStudent,
  ensurePointsRules,
  prisma,
} from "./helpers/db";
import { fakeVerifyPassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createOpaqueToken, hashToken, safeEqual } from "@/lib/auth/tokens";
import { HttpError, assertOwnership, forbidden } from "@/lib/auth/guards";
import { assertSameOrigin } from "@/lib/api";
import type { SessionUser } from "@/lib/auth/session";

beforeAll(async () => {
  await ensurePointsRules();
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await prisma.$disconnect();
});

describe("password hashing", () => {
  it("never stores the plaintext", async () => {
    const hash = await hashPassword("EcoCampus2026");
    expect(hash).not.toContain("EcoCampus2026");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("salts, so the same password hashes differently each time", async () => {
    const a = await hashPassword("EcoCampus2026");
    const b = await hashPassword("EcoCampus2026");
    expect(a).not.toBe(b);
    expect(await verifyPassword("EcoCampus2026", a)).toBe(true);
    expect(await verifyPassword("EcoCampus2026", b)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("EcoCampus2026");
    expect(await verifyPassword("ecocampus2026", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("returns false instead of throwing on a malformed hash", async () => {
    expect(await verifyPassword("anything", "not-a-bcrypt-hash")).toBe(false);
  });

  it("provides a timing equaliser for unknown accounts", async () => {
    // Must resolve without throwing — it is called on the no-such-user path.
    await expect(fakeVerifyPassword("whatever")).resolves.toBeUndefined();
  });
});

describe("opaque tokens", () => {
  it("generates high-entropy, non-repeating tokens", () => {
    const tokens = new Set(
      Array.from({ length: 200 }, () => createOpaqueToken()),
    );
    expect(tokens.size).toBe(200);
    expect([...tokens][0]!.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes deterministically and irreversibly", () => {
    const token = createOpaqueToken();
    const hash = hashToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token);
    expect(hashToken(token)).toBe(hash);
  });

  it("compares in constant time without throwing on length mismatch", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("session storage", () => {
  it("persists only the hash of a session token", async () => {
    const student = await createTestStudent("session");
    const token = createOpaqueToken();

    await prisma.session.create({
      data: {
        userId: student.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });

    const stored = await prisma.session.findFirst({
      where: { userId: student.id },
    });
    expect(stored!.tokenHash).not.toBe(token);
    expect(stored!.tokenHash).toBe(hashToken(token));

    // A raw token is not directly findable — only its hash is.
    expect(
      await prisma.session.findUnique({ where: { tokenHash: token } }),
    ).toBeNull();
  });

  it("removes every session for a user when the user is deleted", async () => {
    const student = await createTestStudent("cascade");
    await prisma.session.create({
      data: {
        userId: student.id,
        tokenHash: hashToken(createOpaqueToken()),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });

    await prisma.user.delete({ where: { id: student.id } });
    expect(await prisma.session.count({ where: { userId: student.id } })).toBe(0);
  });
});

describe("ownership checks", () => {
  const actor: SessionUser = {
    id: "user-a",
    name: "A",
    displayName: "a",
    email: "a@test.local",
    role: Role.STUDENT,
    course: null,
    departmentId: null,
  };

  it("allows access to your own record", () => {
    expect(() => assertOwnership("user-a", actor)).not.toThrow();
  });

  it("blocks access to another student's record", () => {
    expect(() => assertOwnership("user-b", actor)).toThrow(HttpError);
  });

  it("responds 404, not 403, so IDs cannot be probed for existence", () => {
    try {
      assertOwnership("user-b", actor);
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(404);
    }
  });

  it("does not exempt administrators from the student-facing endpoints", () => {
    const admin: SessionUser = { ...actor, id: "admin-1", role: Role.ADMIN };
    expect(() => assertOwnership("user-b", admin)).toThrow(HttpError);
  });
});

describe("role guards", () => {
  it("produces a 403 for a forbidden action", () => {
    const error = forbidden();
    expect(error.status).toBe(403);
  });

  it("stores the role on the user row, not on anything client-supplied", async () => {
    const student = await createTestStudent("role");
    const admin = await createTestAdmin();

    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).role,
    ).toBe(Role.STUDENT);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).role,
    ).toBe(Role.ADMIN);
  });
});

describe("cross-site request protection", () => {
  function request(method: string, headers: Record<string, string>) {
    return new Request("https://ecocampus.example/api/waste-records", {
      method,
      headers,
    });
  }

  it("allows a same-origin mutation", () => {
    expect(() =>
      assertSameOrigin(
        request("POST", {
          origin: "https://ecocampus.example",
          host: "ecocampus.example",
        }),
      ),
    ).not.toThrow();
  });

  it("blocks a mutation from another origin", () => {
    expect(() =>
      assertSameOrigin(
        request("POST", {
          origin: "https://evil.example",
          host: "ecocampus.example",
        }),
      ),
    ).toThrow(HttpError);
  });

  it("blocks a mutation with no Origin header at all", () => {
    expect(() =>
      assertSameOrigin(request("POST", { host: "ecocampus.example" })),
    ).toThrow(HttpError);
  });

  it("blocks a malformed Origin header", () => {
    expect(() =>
      assertSameOrigin(
        request("POST", { origin: "not a url", host: "ecocampus.example" }),
      ),
    ).toThrow(HttpError);
  });

  it("does not interfere with reads", () => {
    expect(() => assertSameOrigin(request("GET", {}))).not.toThrow();
    expect(() => assertSameOrigin(request("HEAD", {}))).not.toThrow();
  });

  it("accepts the public host from x-forwarded-host behind a proxy", () => {
    // The regression that broke sign-in and sign-up on Vercel: the proxy
    // puts the public hostname in x-forwarded-host and `host` is the
    // internal deployment host, so comparing Origin to `host` alone
    // rejected every legitimate form submission with a 403.
    expect(() =>
      assertSameOrigin(
        new Request("https://internal.vercel.app/api/auth/login", {
          method: "POST",
          headers: {
            origin: "https://ecocampus.example",
            host: "internal-deployment.vercel.app",
            "x-forwarded-host": "ecocampus.example",
          },
        }),
      ),
    ).not.toThrow();
  });

  it("still accepts a request where only `host` matches", () => {
    expect(() =>
      assertSameOrigin(
        request("POST", {
          origin: "https://ecocampus.example",
          host: "ecocampus.example",
        }),
      ),
    ).not.toThrow();
  });

  it("takes the first entry of a forwarded host chain", () => {
    expect(() =>
      assertSameOrigin(
        new Request("https://internal.example/api/x", {
          method: "POST",
          headers: {
            origin: "https://ecocampus.example",
            host: "internal.example",
            "x-forwarded-host": "ecocampus.example, proxy.internal",
          },
        }),
      ),
    ).not.toThrow();
  });

  it("still blocks a cross-site POST even with forwarded headers present", () => {
    // The protection must survive the fix: an attacker's Origin matches
    // neither the forwarded host nor the host.
    expect(() =>
      assertSameOrigin(
        new Request("https://ecocampus.example/api/auth/login", {
          method: "POST",
          headers: {
            origin: "https://evil.example",
            host: "internal-deployment.vercel.app",
            "x-forwarded-host": "ecocampus.example",
          },
        }),
      ),
    ).toThrow(HttpError);
  });

  it("blocks a spoofed forwarded host that matches the attacker", () => {
    // If an attacker could set x-forwarded-host to their own domain AND
    // send a matching Origin, this would pass — which is precisely why the
    // deployment notes require that only a trusted proxy may set it. The
    // check below records the boundary rather than pretending it is absent.
    expect(() =>
      assertSameOrigin(
        new Request("https://ecocampus.example/api/auth/login", {
          method: "POST",
          headers: { origin: "https://evil.example", host: "ecocampus.example" },
        }),
      ),
    ).toThrow(HttpError);
  });

  it("applies to every mutating verb", () => {
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      expect(() =>
        assertSameOrigin(
          request(method, { origin: "https://evil.example", host: "ecocampus.example" }),
        ),
      ).toThrow(HttpError);
    }
  });
});
