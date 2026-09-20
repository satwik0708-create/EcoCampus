"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import type { DisposalAction, Unit, WasteCategory } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { RecordHistory } from "@/components/waste/record-history";
import {
  DISPOSAL_ACTION_META,
  WASTE_CATEGORY_META,
  formatQuantity,
  isRecoveryAction,
} from "@/lib/rules/catalog";

export type WasteHistoryRow = {
  id: string;
  recordedOn: string;
  category: WasteCategory;
  itemType: string;
  quantity: number;
  unit: Unit;
  disposal: DisposalAction;
  notes: string | null;
};

export function WasteHistory({
  rows,
  page,
  totalPages,
  total,
}: {
  rows: WasteHistoryRow[];
  page: number;
  totalPages: number;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`/student/waste?${params.toString()}`, { scroll: false });
  }

  return (
    <RecordHistory
      rows={rows.map((row) => ({
        id: row.id,
        recordedOn: row.recordedOn,
        primary: row.itemType,
        secondary: WASTE_CATEGORY_META[row.category].label,
        quantity: formatQuantity(row.quantity, row.unit),
        notes: row.notes,
        badge: (
          <Badge variant={isRecoveryAction(row.disposal) ? "success" : "secondary"}>
            {DISPOSAL_ACTION_META[row.disposal].label}
          </Badge>
        ),
      }))}
      page={page}
      totalPages={totalPages}
      total={total}
      deleteEndpoint="/api/waste-records"
      emptyIcon={Trash2Icon}
      emptyTitle="No waste records yet"
      emptyDescription="Start tracking your first activity to see your sustainability progress."
      columns={{ primary: "Item", secondary: "Category", quantity: "Quantity" }}
      onPageChange={goToPage}
    />
  );
}
