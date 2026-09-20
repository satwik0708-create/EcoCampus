"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PointsRule } from "@prisma/client";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { POINT_REASON_META } from "@/lib/rules/catalog";

/**
 * Editable points rule.
 *
 * Only the value and the enabled flag can change — the set of rule codes is
 * fixed by the engine, so an administrator cannot create a reward the server
 * has no logic to award.
 */
export function PointsRuleRow({ rule }: { rule: PointsRule }) {
  const router = useRouter();
  const [points, setPoints] = React.useState(String(rule.points));
  const [active, setActive] = React.useState(rule.active);
  const [pending, setPending] = React.useState(false);

  const dirty = points !== String(rule.points) || active !== rule.active;

  async function save() {
    const parsed = Number.parseInt(points, 10);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 500) {
      toast.error("Points must be a whole number between 0 and 500.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/admin/points-rules/${rule.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: parsed, active }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not update this rule.");
      }
      toast.success(`${POINT_REASON_META[rule.code].label} updated.`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update this rule.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="space-y-0.5">
          <p className="font-medium">{POINT_REASON_META[rule.code].label}</p>
          <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
            {rule.description}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          max="500"
          step="1"
          value={points}
          onChange={(event) => setPoints(event.target.value)}
          className="w-24"
          aria-label={`Points for ${POINT_REASON_META[rule.code].label}`}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={active}
          onCheckedChange={setActive}
          aria-label={`Enable ${POINT_REASON_META[rule.code].label}`}
        />
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="outline" onClick={save} disabled={!dirty || pending}>
          {pending ? (
            <>
              <Loader2Icon className="animate-spin" />
              Saving
            </>
          ) : (
            <>
              <SaveIcon />
              Save
            </>
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
