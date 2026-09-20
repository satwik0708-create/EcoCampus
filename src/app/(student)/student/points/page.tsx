import Link from "next/link";
import { Suspense } from "react";
import { CoinsIcon, HistoryIcon, ScrollTextIcon } from "lucide-react";
import { requirePageStudent } from "@/lib/auth/guards";
import { getPointHistory } from "@/lib/services/points";
import { PageHeader } from "@/components/ui/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { POINT_REASON_META } from "@/lib/rules/catalog";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const metadata = { title: "Points History" };

const PAGE_SIZE = 20;

export default async function PointsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requirePageStudent();
  const params = await searchParams;
  const requested = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Points History"
        description="Every point you have earned, with the reason and the moment it was awarded."
      />

      <Alert variant="info">
        <ScrollTextIcon />
        <AlertDescription>
          This is an append-only ledger. Your balance is the sum of these
          entries — it is not a stored counter, and points are only ever
          calculated on the server.
        </AlertDescription>
      </Alert>

      <Suspense fallback={<Skeleton className="h-[500px]" />}>
        <PointsContent userId={user.id} page={page} />
      </Suspense>
    </div>
  );
}

async function PointsContent({ userId, page }: { userId: string; page: number }) {
  const history = await getPointHistory(userId, page, PAGE_SIZE);

  if (history.total === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={CoinsIcon}
            title="No points yet"
            description="Record your first waste or food waste activity and your points ledger will start here."
            action={
              <Button size="sm" asChild>
                <Link href="/student/waste">Log an activity</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total balance" value={history.balance} icon={CoinsIcon} />
        <StatCard
          label="Ledger entries"
          value={history.total}
          icon={HistoryIcon}
          tone="info"
        />
        {history.byReason.slice(0, 2).map((row) => (
          <StatCard
            key={row.reason}
            label={POINT_REASON_META[row.reason].label}
            value={row.points}
            icon={CoinsIcon}
            tone="success"
            hint={`${row.count} ${row.count === 1 ? "award" : "awards"}`}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where your points came from</CardTitle>
          <CardDescription>Grouped by the rule that awarded them.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {history.byReason.map((row) => (
              <li
                key={row.reason}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">
                    {POINT_REASON_META[row.reason].label}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {POINT_REASON_META[row.reason].description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">
                    {formatNumber(row.points)}
                  </p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    ×{row.count}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
          <CardDescription>
            {formatNumber(history.total)} entries · page {history.page} of{" "}
            {history.totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="hidden sm:table-cell">Detail</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {POINT_REASON_META[entry.reason].label}
                    </Badge>
                    <p className="text-muted-foreground mt-1 text-xs sm:hidden">
                      {entry.detail}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {entry.detail}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {entry.points > 0 ? `+${entry.points}` : entry.points}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {history.totalPages > 1 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={history.page <= 1}
                asChild={history.page > 1}
              >
                {history.page > 1 ? (
                  <Link href={`/student/points?page=${history.page - 1}`}>
                    Previous
                  </Link>
                ) : (
                  <span>Previous</span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={history.page >= history.totalPages}
                asChild={history.page < history.totalPages}
              >
                {history.page < history.totalPages ? (
                  <Link href={`/student/points?page=${history.page + 1}`}>Next</Link>
                ) : (
                  <span>Next</span>
                )}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
