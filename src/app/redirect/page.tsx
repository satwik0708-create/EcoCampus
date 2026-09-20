import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Role-aware landing point.
 *
 * Used after sign-in and from the "Open EcoCampus" button, so the correct
 * destination is decided on the server from the session's real role rather
 * than guessed in the browser.
 */
export default async function RedirectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(user.role === Role.ADMIN ? "/admin" : "/student");
}
