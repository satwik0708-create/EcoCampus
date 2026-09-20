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
