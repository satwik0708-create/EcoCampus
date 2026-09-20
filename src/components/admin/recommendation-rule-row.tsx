"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { RecommendationRule } from "@prisma/client";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { FOOD_CATEGORY_META, WASTE_CATEGORY_META } from "@/lib/rules/catalog";

const TRIGGER_LABEL: Record<RecommendationRule["trigger"], string> = {
  LATEST_WASTE_CATEGORY: "Latest waste category",
  LATEST_FOOD_CATEGORY: "Latest food category",
  FREQUENT_WASTE_CATEGORY: "Frequent waste category",
  FREQUENT_FOOD_CATEGORY: "Frequent food category",
  HIGH_FOOD_WASTE: "High food waste",
  NO_RECENT_ACTIVITY: "No recent activity",
  NO_ACTIVE_CHALLENGE: "No active challenge",
  STREAK_AT_RISK: "Streak at risk",
  GENERAL: "Always (fallback)",
};

export function RecommendationRuleRow({ rule }: { rule: RecommendationRule }) {
  const router = useRouter();
  const [active, setActive] = React.useState(rule.active);
  const [pending, setPending] = React.useState(false);

  async function toggle(next: boolean) {
    setActive(next);
    setPending(true);
    try {
      const response = await fetch(`/api/admin/recommendation-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: rule.code,
          trigger: rule.trigger,
          priority: rule.priority,
          matchWasteCategory: rule.matchWasteCategory,
          matchFoodCategory: rule.matchFoodCategory,
          threshold: rule.threshold,
          windowDays: rule.windowDays,
          title: rule.title,
          message: rule.message,
          actionLabel: rule.actionLabel,
          actionHref: rule.actionHref,
          active: next,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not update this rule.");
      }
      toast.success(`${rule.code} ${next ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch (error) {
      setActive(!next);
      toast.error(
        error instanceof Error ? error.message : "Could not update this rule.",
      );
    } finally {
      setPending(false);
    }
  }

  const condition = [
    rule.matchWasteCategory
      ? WASTE_CATEGORY_META[rule.matchWasteCategory].label
      : null,
    rule.matchFoodCategory ? FOOD_CATEGORY_META[rule.matchFoodCategory].label : null,
    rule.threshold ? `≥ ${rule.threshold}` : null,
    rule.windowDays ? `in ${rule.windowDays}d` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <TableRow>
      <TableCell className="tabular-nums">{rule.priority}</TableCell>
      <TableCell>
        <div className="space-y-0.5">
          <p className="font-medium">{rule.title}</p>
          <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
            {rule.message}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{TRIGGER_LABEL[rule.trigger]}</Badge>
        {condition ? (
          <p className="text-muted-foreground mt-1 text-xs">{condition}</p>
        ) : null}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {pending ? (
            <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
          ) : null}
          <Switch
            checked={active}
            onCheckedChange={toggle}
            disabled={pending}
            aria-label={`Enable rule ${rule.code}`}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
