"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AppleIcon } from "lucide-react";
import type { FoodCategory, MealType, Unit } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { RecordHistory } from "@/components/waste/record-history";
import {
  FOOD_CATEGORY_META,
  MEAL_TYPE_META,
  formatQuantity,
} from "@/lib/rules/catalog";

export type FoodHistoryRow = {
  id: string;
  recordedOn: string;
  foodCategory: FoodCategory;
  mealType: MealType;
  itemType: string;
  quantity: number;
  unit: Unit;
  avoidable: boolean;
  notes: string | null;
};

export function FoodWasteHistory({
  rows,
  page,
  totalPages,
  total,
}: {
  rows: FoodHistoryRow[];
  page: number;
  totalPages: number;
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`/student/food-waste?${params.toString()}`, { scroll: false });
  }

  return (
    <RecordHistory
      rows={rows.map((row) => ({
        id: row.id,
        recordedOn: row.recordedOn,
        primary: row.itemType,
        secondary: `${FOOD_CATEGORY_META[row.foodCategory].label} · ${
          MEAL_TYPE_META[row.mealType].label
        }`,
        quantity: formatQuantity(row.quantity, row.unit),
        notes: row.notes,
        badge: row.avoidable ? (
          <Badge variant="warning">Avoidable</Badge>
        ) : (
          <Badge variant="secondary">Unavoidable</Badge>
        ),
      }))}
      page={page}
      totalPages={totalPages}
      total={total}
      deleteEndpoint="/api/food-waste-records"
      emptyIcon={AppleIcon}
      emptyTitle="No food waste records yet"
      emptyDescription="Log your first entry to start seeing where your food waste comes from."
      columns={{ primary: "Item", secondary: "Category & meal", quantity: "Quantity" }}
      onPageChange={goToPage}
    />
  );
}
