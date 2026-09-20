import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/app/(auth)/login/login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to record activities, track your streak and see where the
          campus stands.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <LoginForm />
        </Suspense>

        <p className="text-muted-foreground text-center text-sm">
          New to EcoCampus?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
