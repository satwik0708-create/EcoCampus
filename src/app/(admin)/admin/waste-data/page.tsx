import { Suspense } from "react";
import { Trash2Icon } from "lucide-react";
import { requirePageAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { listWasteRecords } from "@/lib/services/records";
import { recordFilterSchema } from "@/lib/validation/schemas";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RecordFilters } from "@/components/admin/record-filters";
import { TablePagination } from "@/components/admin/table-pagination";
import {
  DISPOSAL_ACTION_META,
  WASTE_CATEGORY_META,
  enumOptions,
  formatQuantity,
  isRecoveryAction,
} from "@/lib/rules/catalog";
import { formatCampusDay } from "@/lib/time";

export const metadata = { title: "Waste Data" };

const CATEGORY_OPTIONS = enumOptions(WASTE_CATEGORY_META).map((option) => ({
  value: option.value,
  label: option.label,
}));

export default async function WasteDataPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageAdmin();
  const raw = await searchParams;
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waste Data"
        description="Every waste record on campus. Students are identified by their display name only — the console never surfaces email addresses."
      />

      <Card>
        <CardContent className="space-y-5">
          <RecordFilters
            categories={CATEGORY_OPTIONS}
            departments={departments}
            searchLabel="Search"
          />

          <Suspense key={JSON.stringify(raw)} fallback={<Skeleton className="h-96" />}>
            <WasteTable raw={raw} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function WasteTable({
  raw,
}: {
  raw: Record<string, string | string[] | undefined>;
}) {
  // Filters arrive from the URL, so they are parsed with the same schema the
  // API uses; anything unexpected falls back to the defaults.
  const parsed = recordFilterSchema.safeParse(raw);
  const filters = parsed.success
    ? parsed.data
    : { page: 1, pageSize: 20 as const };

  const data = await listWasteRecords({
    page: filters.page,
    pageSize: filters.pageSize,
    from: "from" in filters ? filters.from : undefined,
    to: "to" in filters ? filters.to : undefined,
    category: "category" in filters ? filters.category : undefined,
    departmentId: "departmentId" in filters ? filters.departmentId : undefined,
    q: "q" in filters ? filters.q : undefined,
  });

  if (data.rows.length === 0) {
    return (
      <EmptyState
        icon={Trash2Icon}
        title="No records match"
        description="No waste records match these filters. Widen the date range or clear the filters to see everything."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="hidden lg:table-cell">Department</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead>Disposal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {formatCampusDay(row.recordedOn)}
              </TableCell>
              <TableCell className="font-medium">{row.student}</TableCell>
              <TableCell className="text-muted-foreground hidden lg:table-cell">
                {row.department ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {WASTE_CATEGORY_META[row.category].label}
                </Badge>
              </TableCell>
              <TableCell>
                <span>{row.itemType}</span>
                {row.notes ? (
                  <p className="text-muted-foreground text-xs italic">{row.notes}</p>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                {formatQuantity(row.quantity, row.unit)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    isRecoveryAction(
                      row.disposal as keyof typeof DISPOSAL_ACTION_META,
                    )
                      ? "success"
                      : "secondary"
                  }
                >
                  {
                    DISPOSAL_ACTION_META[
                      row.disposal as keyof typeof DISPOSAL_ACTION_META
                    ].label
                  }
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TablePagination
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
      />
    </div>
  );
}
