import { requirePageStudent } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Every page under /student renders inside this layout, so the student role
 * check runs server-side on every request — including direct navigations and
 * refreshes, not just client transitions.
 */
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageStudent();

  return (
    <AppShell
      user={{
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        role: "STUDENT",
      }}
    >
      {children}
    </AppShell>
  );
}
