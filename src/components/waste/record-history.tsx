"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCampusDay } from "@/lib/time";
import { cn } from "@/lib/utils";

export type HistoryRow = {
  id: string;
  recordedOn: string;
  primary: string;
  secondary: string;
  quantity: string;
  badge?: React.ReactNode;
  notes: string | null;
};

/**
 * Shared history table for both trackers.
 *
 * Deletion goes through the record's own endpoint, which re-checks ownership
 * on the server; the confirmation dialog here is UX, not the safeguard.
 */
export function RecordHistory({
  rows,
  page,
  totalPages,
  total,
  deleteEndpoint,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  columns,
  onPageChange,
}: {
  rows: HistoryRow[];
  page: number;
  totalPages: number;
  total: number;
  deleteEndpoint: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  columns: { primary: string; secondary: string; quantity: string };
  onPageChange: (page: number) => void;
}) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = React.useState<HistoryRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`${deleteEndpoint}/${pendingDelete.id}`, {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not delete this record.");
      }
      toast.success("Record deleted. Your streak and challenges were recalculated.");
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete this record.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        compact
      />
    );
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>{columns.primary}</TableHead>
            <TableHead className="hidden sm:table-cell">{columns.secondary}</TableHead>
            <TableHead className="text-right">{columns.quantity}</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {formatCampusDay(row.recordedOn)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{row.primary}</span>
                  <span className="text-muted-foreground text-xs sm:hidden">
                    {row.secondary}
                  </span>
                  {row.notes ? (
                    <span className="text-muted-foreground text-xs italic">
                      {row.notes}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground text-sm">
                    {row.secondary}
                  </span>
                  {row.badge}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
                {row.quantity}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPendingDelete(row)}
                  aria-label={`Delete record: ${row.primary}`}
                >
                  <Trash2Icon className="text-muted-foreground size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            Page {page} of {totalPages} · {total} records
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{total} records in total</p>
      )}

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className={cn("max-w-md")}>
          <DialogHeader>
            <DialogTitle>Delete this record?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.primary}" from ${formatCampusDay(
                    pendingDelete.recordedOn,
                  )} will be removed.`
                : null}{" "}
              Your streak and challenge progress will be recalculated. Points
              already earned stay on your ledger — it is an audit trail, so
              entries are never removed from it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete record"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
