import { Suspense } from "react";
import { AppleIcon, ScaleIcon, TriangleAlertIcon } from "lucide-react";
import { requirePageStudent } from "@/lib/auth/guards";
import { getFoodWasteAnalytics } from "@/lib/services/dashboard";
import { listOwnFoodWasteRecords } from "@/lib/services/records";
import { env } from "@/lib/env";
import { campusToday } from "@/lib/time";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { TrendAreaChart } from "@/components/charts/trend-area-chart";
import { FoodWasteForm } from "@/components/waste/food-waste-form";
import { FoodWasteHistory } from "@/components/waste/food-waste-history";
import { formatMass } from "@/lib/rules/catalog";

export const metadata = { title: "Food Waste" };

const PAGE_SIZE = 10;

export default async function FoodWastePage({
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
        title="Food Waste Tracker"
        description="Food waste is tracked separately from general waste because the reasons behind it — the meal, the portion, whether it was avoidable — are what make it reducible."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <FoodWasteForm today={today} />

        <div className="space-y-6">
          <Suspense fallback={<Skeleton className="h-[420px]" />}>
            <FoodWasteInsights userId={user.id} />
          </Suspense>

          <Card>
            <CardHeader>
              <CardTitle>Your records</CardTitle>
              <CardDescription>
                Private to you. Deleting one recalculates your streak and
                challenge progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-64" />}>
                <FoodRecordsTable userId={user.id} page={page} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function FoodWasteInsights({ userId }: { userId: string }) {
  const analytics = await getFoodWasteAnalytics(userId, 30);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Food waste records"
          value={analytics.totalRecords}
          icon={AppleIcon}
        />
        <StatCard
          label="Avoidable"
          value={analytics.avoidableRecords}
          icon={TriangleAlertIcon}
          tone="warning"
          hint={
            analytics.totalRecords > 0
              ? `${Math.round(
                  (analytics.avoidableRecords / analytics.totalRecords) * 100,
                )}% of your records could have been eaten`
              : "Food that could have been eaten"
          }
        />
        <StatCard
          label="Recorded mass"
          value={
            analytics.recordedMassGrams > 0
              ? formatMass(analytics.recordedMassGrams)
              : "—"
          }
          icon={ScaleIcon}
          tone="info"
          hint="From entries logged in grams or kilograms only."
        />
      </div>

      <TrendAreaChart
        data={analytics.trend.map((point) => ({
          label: point.label,
          value: point.records,
        }))}
        title="Last 30 days"
        description="Food waste records per campus day."
        seriesName="Food waste records"
        colorIndex={2}
        emptyTitle="Nothing in the last 30 days"
        emptyDescription="Your trend line builds up as you log entries."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryPieChart
          data={analytics.byCategory.map((row) => ({
            key: row.key,
            label: row.label,
            records: row.records,
          }))}
          title="By food category"
          description="Where your food waste comes from."
          emptyTitle="No food waste records yet"
          emptyDescription="Your category breakdown appears after your first entry."
        />
        <HorizontalBarChart
          data={analytics.byMeal.map((row) => ({
            key: row.key,
            label: row.label,
            value: row.records,
          }))}
          title="By meal"
          description="Which meal produces the most waste for you."
          seriesName="Records"
          emptyTitle="No food waste records yet"
          emptyDescription="Log entries across different meals to spot the pattern."
        />
      </div>
    </div>
  );
}

async function FoodRecordsTable({
  userId,
  page,
}: {
  userId: string;
  page: number;
}) {
  const data = await listOwnFoodWasteRecords(userId, page, PAGE_SIZE);

  return (
    <FoodWasteHistory
      rows={data.rows.map((row) => ({
        id: row.id,
        recordedOn: row.recordedOn,
        foodCategory: row.foodCategory,
        mealType: row.mealType,
        itemType: row.itemType,
        quantity: row.quantity,
        unit: row.unit,
        avoidable: row.avoidable,
        notes: row.notes,
      }))}
      page={data.page}
      totalPages={data.totalPages}
      total={data.total}
    />
  );
}
