import { Suspense } from "react";
import {
  ActivityIcon,
  AppleIcon,
  BookOpenIcon,
  CoinsIcon,
  RecycleIcon,
  TargetIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { requirePageAdmin } from "@/lib/auth/guards";
import { getAdminAnalytics } from "@/lib/services/analytics";
import { listAdminActivity } from "@/lib/services/content";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ActivityBarChart } from "@/components/charts/activity-bar-chart";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { formatMass } from "@/lib/rules/catalog";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const metadata = { title: "Admin Dashboard" };

/**
 * Institutional overview.
 *
 * Every number is an aggregate query across the campus dataset. Nothing here
 * is estimated, extrapolated or hardcoded — when there is no data, the
 * components say so rather than showing a plausible placeholder.
 */
export default async function AdminDashboardPage() {
  const admin = await requirePageAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Overview"
        description={`Signed in as ${admin.name}. Everything below is computed live from the campus database.`}
      />

      <Suspense fallback={<AdminSkeleton />}>
        <AdminOverviewContent />
      </Suspense>
    </div>
  );
}

async function AdminOverviewContent() {
  const [analytics, activity] = await Promise.all([
    getAdminAnalytics(30),
    listAdminActivity(8),
  ]);
  const { overview } = analytics;

  return (
    <div className="space-y-6">
      <div className="grid-bento">
        <StatCard
          label="Registered students"
          value={overview.totalStudents}
          icon={UsersIcon}
          hint={`${formatNumber(overview.activeStudents)} active · ${formatNumber(
            overview.engagedStudents,
          )} recorded something in the last 30 days`}
        />
        <StatCard
          label="Total activities"
          value={overview.totalActivities}
          icon={ActivityIcon}
          tone="info"
          hint={`${formatNumber(overview.totalWasteRecords)} waste · ${formatNumber(
            overview.totalFoodWasteRecords,
          )} food waste`}
        />
        <StatCard
          label="Points awarded"
          value={overview.totalPointsAwarded}
          icon={CoinsIcon}
          tone="success"
          hint="Sum of every entry in the point ledger."
        />
        <StatCard
          label="Recovery rate"
          value={`${overview.recoveryRate}%`}
          icon={RecycleIcon}
          tone={overview.recoveryRate >= 50 ? "success" : "warning"}
          hint="Waste records recycled, composted, reused or specially disposed of."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Waste records"
          value={overview.totalWasteRecords}
          icon={Trash2Icon}
        />
        <StatCard
          label="Food waste records"
          value={overview.totalFoodWasteRecords}
          icon={AppleIcon}
        />
        <StatCard
          label="Challenge participations"
          value={overview.challengeParticipations}
          icon={TargetIcon}
          hint={`${formatNumber(overview.challengesCompleted)} completed · ${formatNumber(
            overview.activeChallenges,
          )} challenges open now`}
        />
        <StatCard
          label="Published content"
          value={overview.publishedGuides + overview.publishedArticles}
          icon={BookOpenIcon}
          hint={`${formatNumber(overview.publishedGuides)} guide entries · ${formatNumber(
            overview.publishedArticles,
          )} articles`}
        />
      </div>

      <ActivityBarChart
        data={analytics.activityTrend}
        title={`Campus activity — last ${analytics.windowDays} days`}
        description="Records logged per campus day across all students."
        height={280}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryPieChart
          data={analytics.wasteByCategory.map((row) => ({
            key: row.key,
            label: row.label,
            records: row.records,
          }))}
          title="Campus waste by category"
          description="Distribution of every waste record."
          emptyTitle="No waste records yet"
          emptyDescription="Category distribution appears once students begin recording."
        />
        <HorizontalBarChart
          data={analytics.disposalSplit.map((row) => ({
            key: row.key,
            label: row.label,
            value: row.records,
          }))}
          title="Disposal routes"
          description="How campus waste is being handled."
          seriesName="Records"
          emptyTitle="No waste records yet"
          emptyDescription="Disposal routes appear once students begin recording."
          footer={
            overview.recordedMassGrams > 0
              ? `Total recorded mass across the campus: ${formatMass(
                  overview.recordedMassGrams,
                )} (from mass-based entries only).`
              : undefined
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent administrative changes</CardTitle>
          <CardDescription>
            An audit trail of content and configuration changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="No changes recorded yet"
              description="Creating, editing or deleting content will be logged here."
              compact
            />
          ) : (
            <ul className="divide-y">
              {activity.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 py-2.5">
                  <Badge
                    variant={
                      entry.action === "DELETE"
                        ? "destructive"
                        : entry.action === "CREATE"
                          ? "success"
                          : "secondary"
                    }
                    className="mt-0.5 shrink-0"
                  >
                    {entry.action}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{entry.summary}</p>
                    <p className="text-muted-foreground text-xs">
                      {entry.admin.name} · {formatDateTime(entry.createdAt)}
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

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid-bento">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px]" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px]" />
        ))}
      </div>
      <Skeleton className="h-80" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
