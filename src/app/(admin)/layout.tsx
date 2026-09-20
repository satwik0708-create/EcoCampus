import { requirePageAdmin } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Administrator console layout.
 *
 * The role check runs server-side on every request into /admin/*. A student
 * who types an admin URL is redirected to their own dashboard before any
 * institutional data is queried, let alone rendered.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageAdmin();

  return (
    <AppShell
      user={{
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        role: "ADMIN",
      }}
    >
      {children}
    </AppShell>
  );
}
