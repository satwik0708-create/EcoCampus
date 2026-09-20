"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";
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

/**
 * Destructive action with an explicit confirmation step.
 *
 * The dialog spells out the consequence rather than asking a generic "are you
 * sure?", because the consequences differ (deleting a challenge removes
 * participations; deleting an article does not touch student data).
 */
export function DeleteButton({
  endpoint,
  itemLabel,
  consequence,
  onDeleted,
}: {
  endpoint: string;
  itemLabel: string;
  consequence: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function confirm() {
    setPending(true);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not delete this item.");
      }
      toast.success(body?.message ?? "Deleted.");
      setOpen(false);
      onDeleted?.();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete this item.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${itemLabel}`}
      >
        <Trash2Icon className="text-destructive size-4" />
      </Button>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{itemLabel}&rdquo;?</DialogTitle>
          <DialogDescription>{consequence}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete permanently"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
