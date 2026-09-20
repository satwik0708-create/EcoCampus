import { Suspense } from "react";
import { RecycleIcon, Trash2Icon } from "lucide-react";
import { requirePageStudent } from "@/lib/auth/guards";
import { getWasteAnalytics } from "@/lib/services/dashboard";
import { listOwnWasteRecords } from "@/lib/services/records";
import { env } from "@/lib/env";
import { campusToday } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import { TrendAreaChart } from "@/components/charts/trend-area-chart";
import { WasteForm } from "@/components/waste/waste-form";
import { WasteHistory } from "@/components/waste/waste-history";
import { formatMass } from "@/lib/rules/catalog";

export const metadata = { title: "Waste Tracker" };

const PAGE_SIZE = 10;

export default async function WasteTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requirePageStudent();
  const params = await searchParams;
  const requested = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const today = campusToday(env.campusTimeZone);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waste Tracker"
        description="Record what you threw away, how much of it there was and where it went. Every entry updates your points, streak and challenge progress."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <WasteForm today={today} />

        <div className="space-y-6">
          <Suspense fallback={<Skeleton className="h-[420px]" />}>
            <WasteInsights userId={user.id} />
          </Suspense>

          <Card>
            <CardHeader>
              <CardTitle>Your records</CardTitle>
              <CardDescription>
                Only you can see these. Deleting one recalculates your streak
                and challenge progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-64" />}>
                <WasteRecordsTable userId={user.id} page={page} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function WasteInsights({ userId }: { userId: string }) {
  const analytics = await getWasteAnalytics(userId, 30);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Waste records"
          value={analytics.totalRecords}
          icon={Trash2Icon}
        />
        <StatCard
          label="Diverted from landfill"
          value={analytics.recoveredRecords}
          icon={RecycleIcon}
          tone="success"
          hint={
            analytics.totalRecords > 0
              ? `${Math.round(
                  (analytics.recoveredRecords / analytics.totalRecords) * 100,
                )}% of your records`
              : "Recycle, compost, reuse or special disposal"
          }
        />
        <StatCard
          label="Recorded mass"
          value={
            analytics.recordedMassGrams > 0
              ? formatMass(analytics.recordedMassGrams)
              : "—"
          }
          icon={Trash2Icon}
          tone="info"
          hint="From entries logged in grams or kilograms only."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryPieChart
          data={analytics.byCategory}
          title="By category"
          description="All of your waste records."
          emptyTitle="No waste records yet"
          emptyDescription="Your category breakdown appears after your first entry."
        />
        <TrendAreaChart
          data={analytics.trend.map((point) => ({
            label: point.label,
            value: point.records,
          }))}
          title="Last 30 days"
          description="Waste records per campus day."
          seriesName="Waste records"
          emptyTitle="Nothing in the last 30 days"
          emptyDescription="Log an entry and your daily pattern builds from there."
        />
      </div>
    </div>
  );
}

async function WasteRecordsTable({
  userId,
  page,
}: {
  userId: string;
  page: number;
}) {
  const data = await listOwnWasteRecords(userId, page, PAGE_SIZE);

  return (
    <WasteHistory
      rows={data.rows.map((row) => ({
        id: row.id,
        recordedOn: row.recordedOn,
        category: row.category,
        itemType: row.itemType,
        quantity: row.quantity,
        unit: row.unit,
        disposal: row.disposal,
        notes: row.notes,
      }))}
      page={data.page}
      totalPages={data.totalPages}
      total={data.total}
    />
  );
}
