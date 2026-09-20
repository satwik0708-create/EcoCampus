import Link from "next/link";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-password-form";

export const metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>
          Setting a new password signs you out everywhere else.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Suspense fallback={<Skeleton className="h-52 w-full" />}>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-muted-foreground text-center text-sm">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
