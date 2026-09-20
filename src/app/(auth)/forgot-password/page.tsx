import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/forgot-password-form";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter the email you registered with and we will generate a reset
          link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ForgotPasswordForm />
        <p className="text-muted-foreground text-center text-sm">
          Remembered it?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
