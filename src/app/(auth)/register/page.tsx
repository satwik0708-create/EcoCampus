import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/app/(auth)/register/register-form";

export const metadata = { title: "Create an account" };

/**
 * Rendered per request rather than prerendered.
 *
 * The department list is read from the database, so prerendering this page
 * would (a) require a reachable database during `next build`, which is a
 * poor deployment constraint, and (b) freeze the list into the build — a
 * department added afterwards would not appear until the next deploy.
 */
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  // Departments come from the database so the dropdown always matches what
  // the institution has actually configured.
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Create your student account</CardTitle>
        <CardDescription>
          Start tracking your waste, earning points and taking part in campus
          challenges.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <RegisterForm departments={departments} />

        <p className="text-muted-foreground text-center text-sm">
          Already registered?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
