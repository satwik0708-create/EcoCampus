import { requirePageStudent } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/forms/profile-form";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await requirePageStudent();

  const [user, departments, streak, sessionCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session.id },
      select: {
        name: true,
        displayName: true,
        email: true,
        course: true,
        departmentId: true,
        createdAt: true,
        department: { select: { name: true } },
      },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.streak.findUnique({ where: { userId: session.id } }),
    prisma.session.count({ where: { userId: session.id } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your details, and how you appear to the rest of the campus."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your details</CardTitle>
              <CardDescription>
                Your email cannot be changed here — contact your campus
                administrator if it needs updating.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                initial={{
                  name: user.name,
                  displayName: user.displayName,
                  course: user.course,
                  departmentId: user.departmentId,
                }}
                departments={departments}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                Changing your password signs out every other device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="space-y-0.5">
                <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                  Email
                </dt>
                <dd className="break-all">{user.email}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                  Role
                </dt>
                <dd>
                  <Badge variant="success">Student</Badge>
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                  Department
                </dt>
                <dd>{user.department?.name ?? "Not specified"}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                  Member since
                </dt>
                <dd>{formatDateTime(user.createdAt)}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                  Longest streak
                </dt>
                <dd>
                  {streak?.longestStreak ?? 0}{" "}
                  {(streak?.longestStreak ?? 0) === 1 ? "day" : "days"}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-muted-foreground text-xs tracking-wide uppercase">
                  Active sessions
                </dt>
                <dd>
                  {sessionCount} {sessionCount === 1 ? "device" : "devices"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
