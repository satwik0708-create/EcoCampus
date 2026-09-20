import { Suspense } from "react";
import { Building2Icon, TargetIcon } from "lucide-react";
import { requirePageAdmin } from "@/lib/auth/guards";
import { getAdminAnalytics } from "@/lib/services/analytics";
import { PageHeader } from "@/components/ui/page-header";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActivityBarChart } from "@/components/charts/activity-bar-chart";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { TrendAreaChart } from "@/components/charts/trend-area-chart";
import { formatMass } from "@/lib/rules/catalog";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Trends" };

const ALLOWED_WINDOWS = [14, 30, 90] as const;

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  await requirePageAdmin();
  const params = await searchParams;
  const requested = Number.parseInt(params.window ?? "30", 10);
  const windowDays = (ALLOWED_WINDOWS as readonly number[]).includes(requested)
    ? requested
    : 30;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Trends"
        description="Aggregated movement over time. Every series is a group-by query across the campus dataset."
      />

      <Suspense key={windowDays} fallback={<TrendsSkeleton />}>
        <TrendsContent windowDays={windowDays} />
      </Suspense>
    </div>
  );
}

async function TrendsContent({ windowDays }: { windowDays: number }) {
  const analytics = await getAdminAnalytics(windowDays);

  return (
    <div className="space-y-6">
      <ActivityBarChart
        data={analytics.activityTrend}
        title={`Activity — last ${windowDays} days`}
        description="Waste and food waste records logged each campus day."
        height={300}
      />

      <TrendAreaChart
        data={analytics.participationTrend.map((point) => ({
          label: point.label,
          value: point.students,
        }))}
        title="Daily participation"
        description="Distinct students who recorded at least one activity."
        seriesName="Active students"
        colorIndex={1}
        emptyTitle="No participation yet"
        emptyDescription="This line fills in as students begin recording activities."
        height={260}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryPieChart
          data={analytics.wasteByCategory.map((row) => ({
            key: row.key,
            label: row.label,
            records: row.records,
          }))}
          title="Waste by category"
          description="All waste records, campus-wide."
          emptyTitle="No waste records yet"
          emptyDescription="Category distribution appears once students begin recording."
        />
        <CategoryPieChart
          data={analytics.foodByCategory.map((row) => ({
            key: row.key,
            label: row.label,
            records: row.records,
          }))}
          title="Food waste by category"
          description="All food waste records, campus-wide."
          emptyTitle="No food waste records yet"
          emptyDescription="Food categories appear once students begin recording."
        />
      </div>

      <HorizontalBarChart
        data={analytics.wasteByCategory
          .filter((row) => row.massGrams > 0)
          .map((row) => ({
            key: row.key,
            label: row.label,
            value: Math.round(row.massGrams / 10) / 100,
          }))}
        title="Recorded mass by category"
        description="Kilograms recorded, by material."
        seriesName="kg"
        emptyTitle="No mass-based records yet"
        emptyDescription="This chart only counts entries logged in grams or kilograms. Entries counted in pieces are excluded rather than converted with a guessed weight."
        footer={`Total recorded mass: ${formatMass(
          analytics.overview.recordedMassGrams,
        )}. Entries logged in pieces, plates or servings are deliberately excluded here.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Challenge engagement</CardTitle>
          <CardDescription>
            Participation and completion, measured from real student records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.challengeEngagement.length === 0 ? (
            <EmptyState
              icon={TargetIcon}
              title="No challenges yet"
              description="Create a challenge and engagement figures will appear here."
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Challenge</TableHead>
                  <TableHead className="text-right">Participants</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="w-40">Completion rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.challengeEngagement.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.participants)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.completed)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={row.completionRate}
                          className="h-1.5"
                          aria-label={`${row.title} completion rate`}
                        />
                        <span className="text-muted-foreground w-10 shrink-0 text-right text-xs tabular-nums">
                          {row.completionRate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By department</CardTitle>
          <CardDescription>
            Students, records and points per department.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.departmentBreakdown.length === 0 ? (
            <EmptyState
              icon={Building2Icon}
              title="No departments configured"
              description="Departments are seeded with the database. Once students select one, their activity is grouped here."
              compact
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.departmentBreakdown.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.students)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.records)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.points)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrendsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-96" />
      <Skeleton className="h-80" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
