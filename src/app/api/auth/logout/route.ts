import { destroyCurrentSession } from "@/lib/auth/session";
import { assertSameOrigin, handleApiError, jsonOk, withCookie } from "@/lib/api";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const clearedCookie = await destroyCurrentSession();
    return withCookie(jsonOk({ ok: true }), clearedCookie);
  } catch (error) {
    return handleApiError(error, "auth/logout");
  }
}
