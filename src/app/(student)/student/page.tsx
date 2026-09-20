import Link from "next/link";
import { Suspense } from "react";
import {
  ActivityIcon,
  AppleIcon,
  ArrowRightIcon,
  CoinsIcon,
  FlameIcon,
  ListChecksIcon,
  PlusIcon,
  TargetIcon,
  Trash2Icon,
  TrophyIcon,
} from "lucide-react";
import { requirePageStudent } from "@/lib/auth/guards";
import { getStudentDashboard } from "@/lib/services/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ActivityBarChart } from "@/components/charts/activity-bar-chart";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import { TrendAreaChart } from "@/components/charts/trend-area-chart";
import { RecommendationPanel } from "@/components/dashboard/recommendation-card";
import { TAGLINE } from "@/components/brand";
import { GreetingHeading } from "@/components/dashboard/greeting-heading";
import { formatQuantity, formatMass } from "@/lib/rules/catalog";
import { formatCampusDay } from "@/lib/time";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

/**
 * Student dashboard.
 *
 * Every figure rendered below arrives from `getStudentDashboard`, which is a
 * set of aggregate queries over this student's own rows. There is not one
 * hardcoded number on this page.
 */
export default async function StudentDashboardPage() {
  const user = await requirePageStudent();

  return (
    <div className="space-y-6">
      <GreetingHeading name={user.name.split(" ")[0] ?? user.name} tagline={TAGLINE} />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent userId={user.id} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ userId }: { userId: string }) {
  const dashboard = await getStudentDashboard(userId);
  const { stats } = dashboard;

  const hasAnyActivity = stats.totalActivities > 0;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------- Stat cards */}
      <div className="grid-bento">
        <StatCard
          label="Total points"
          value={stats.totalPoints}
          icon={CoinsIcon}
          hint={
            stats.pointsThisWeek > 0
              ? `${formatNumber(stats.pointsThisWeek)} earned in the last 7 days`
              : "Record an activity to start earning"
          }
        />
        <StatCard
          label="Current streak"
          value={stats.currentStreak}
          unit={stats.currentStreak === 1 ? "day" : "days"}
          icon={FlameIcon}
          tone={stats.currentStreak > 0 ? "warning" : "default"}
          hint={`Longest streak: ${stats.longestStreak} ${
            stats.longestStreak === 1 ? "day" : "days"
          }`}
        />
        <StatCard
          label="Activities logged"
          value={stats.totalActivities}
          icon={ActivityIcon}
          tone="info"
          hint={`${formatNumber(stats.wasteRecords)} waste · ${formatNumber(
            stats.foodWasteRecords,
          )} food waste`}
        />
        <StatCard
          label="Challenges completed"
          value={stats.challengesCompleted}
          icon={TrophyIcon}
          tone="success"
          hint={
            stats.challengesJoined > 0
              ? `${formatNumber(stats.challengesJoined)} joined in total`
              : "You have not joined a challenge yet"
          }
        />
      </div>

      {/* --------------------------------------------- Recommendation + CTA */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <RecommendationPanel recommendations={dashboard.recommendations} />

        <Card>
          <CardHeader>
            <CardTitle>Record an activity</CardTitle>
            <CardDescription>
              Takes about fifteen seconds and updates everything on this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/student/waste">
                <Trash2Icon />
                Log waste
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/student/food-waste">
                <AppleIcon />
                Log food waste
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------ Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityBarChart
          data={dashboard.weeklyActivity}
          title="This week"
          description="Records you logged over the last 7 campus days."
        />
        <CategoryPieChart
          data={dashboard.wasteByCategory}
          title="Your waste by category"
          description="Share of your waste records across predefined categories."
          emptyTitle="No waste records yet"
          emptyDescription="Start tracking your first activity to see your sustainability progress."
        />
      </div>

      <TrendAreaChart
        data={dashboard.foodWasteTrend.map((point) => ({
          label: point.label,
          value: point.food,
        }))}
        title="Food waste trend"
        description="Food waste records over the last 14 campus days."
        seriesName="Food waste records"
        colorIndex={2}
        emptyTitle="No food waste recorded yet"
        emptyDescription="Log a food waste entry and your pattern will build up here."
        footer={
          stats.recordedMassGrams > 0
            ? `Recorded mass across all your entries: ${formatMass(
                stats.recordedMassGrams,
              )} (mass-based entries only — pieces, plates and servings are counted, not weighed).`
            : undefined
        }
      />

      {/* ------------------------------------------------- Active challenges */}
      <Card>
        <CardHeader>
          <CardTitle>Active challenges</CardTitle>
          <CardDescription>
            Progress is measured from the records you actually logged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard.activeChallenges.length === 0 ? (
            <EmptyState
              icon={TargetIcon}
              title="You have not joined a challenge"
              description="Campus challenges turn everyday habits into a shared target. Browse what is open right now."
              action={
                <Button size="sm" asChild>
                  <Link href="/student/challenges">
                    Browse challenges
                    <ArrowRightIcon />
                  </Link>
                </Button>
              }
              compact
            />
          ) : (
            <ul className="space-y-4">
              {dashboard.activeChallenges.map((challenge) => (
                <li key={challenge.id} className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium">{challenge.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {challenge.status === "upcoming"
                          ? `Starts ${formatCampusDay(challenge.startsOn)} · ${
                              challenge.daysLeft === 0
                                ? "starts today"
                                : `in ${challenge.daysLeft} ${
                                    challenge.daysLeft === 1 ? "day" : "days"
                                  }`
                            }`
                          : `Ends ${formatCampusDay(challenge.endsOn)} · ${
                              challenge.daysLeft === 0
                                ? "last day"
                                : `${challenge.daysLeft} ${
                                    challenge.daysLeft === 1 ? "day" : "days"
                                  } left`
                            }`}
                      </p>
                    </div>
                    {challenge.completed ? (
                      <Badge variant="success">Completed</Badge>
                    ) : challenge.status === "upcoming" ? (
                      <Badge variant="info">Upcoming</Badge>
                    ) : (
                      <Badge variant="outline">+{challenge.points} pts</Badge>
                    )}
                  </div>
                  <Progress
                    value={challenge.percent}
                    aria-label={`${challenge.title} progress`}
                    indicatorClassName={challenge.completed ? "bg-success" : undefined}
                  />
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {challenge.progress} / {challenge.target} {challenge.targetUnit} (
                    {challenge.percent}%)
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* --------------------------------------------------- Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Your last few records.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAnyActivity ? (
            <EmptyState
              icon={ListChecksIcon}
              title="Nothing recorded yet"
              description="Start tracking your first activity to see your sustainability progress."
              action={
                <Button size="sm" asChild>
                  <Link href="/student/waste">
                    <PlusIcon />
                    Log your first activity
                  </Link>
                </Button>
              }
              compact
            />
          ) : (
            <ul className="divide-y">
              {dashboard.recentActivity.map((item) => (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span
                    className={
                      item.kind === "waste"
                        ? "bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg"
                        : "bg-info/12 text-info flex size-8 shrink-0 items-center justify-center rounded-lg"
                    }
                  >
                    {item.kind === "waste" ? (
                      <Trash2Icon className="size-4" aria-hidden="true" />
                    ) : (
                      <AppleIcon className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {item.subtitle}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm tabular-nums">
                      {formatQuantity(item.quantity, item.unit)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatCampusDay(item.recordedOn)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid-bento">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
