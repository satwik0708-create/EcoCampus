"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { Loader2Icon, ShieldIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

/**
 * Role / access editor.
 *
 * The server enforces the real constraints (no self-demotion, never remove
 * the last administrator); this dialog only disables the control it already
 * knows is forbidden, and surfaces whatever the server says otherwise.
 */
export function UserRowActions({
  user,
  isSelf,
}: {
  user: { id: string; displayName: string; role: Role; active: boolean };
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState<Role>(user.role);
  const [active, setActive] = React.useState(user.active);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setRole(user.role);
      setActive(user.active);
    }
  }, [open, user.role, user.active]);

  async function save() {
    setPending(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, active }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Could not update this account.");
      }
      toast.success(`${user.displayName} updated.`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update this account.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isSelf}
        title={isSelf ? "You cannot change your own role or access" : undefined}
      >
        <ShieldIcon />
        Manage
      </Button>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage {user.displayName}</DialogTitle>
          <DialogDescription>
            Demoting or deactivating an account immediately ends all of its
            sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value={Role.STUDENT}
                  description="Can record activities and take part in challenges."
                >
                  Student
                </SelectItem>
                <SelectItem
                  value={Role.ADMIN}
                  description="Full access to the institutional console and all content management."
                >
                  Administrator
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="active">Account active</Label>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Deactivated accounts cannot sign in and are hidden from the
                leaderboard. Their records are kept.
              </p>
            </div>
            <Switch id="active" checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={save} disabled={pending}>
            {pending ? (
              <>
                <Loader2Icon className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
