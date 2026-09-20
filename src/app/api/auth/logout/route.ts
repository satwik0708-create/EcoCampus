import { destroyCurrentSession } from "@/lib/auth/session";
import { assertSameOrigin, handleApiError, jsonOk } from "@/lib/api";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await destroyCurrentSession();
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error, "auth/logout");
  }
}
