"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  CheckCircle2Icon,
  Loader2Icon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCampusDay } from "@/lib/time";
import type { ChallengeCard as ChallengeCardData } from "@/lib/services/challenges";

/**
 * A single challenge.
 *
 * Note the absence of any "mark complete" control. The only action a student
 * can take is to join or leave; progress and completion are computed by the
 * server from their real records.
 */
export function ChallengeCard({ challenge }: { challenge: ChallengeCardData }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function toggleParticipation(action: "join" | "leave") {
    setPending(true);
    try {
      const response = await fetch(`/api/challenges/${challenge.id}/join`, {
        method: action === "join" ? "POST" : "DELETE",
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Something went wrong. Please try again.");
      }
      toast.success(body?.message ?? "Done.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setPending(false);
    }
  }

  const statusBadge = {
    active: <Badge variant="success">Active</Badge>,
    upcoming: <Badge variant="info">Upcoming</Badge>,
    ended: <Badge variant="secondary">Ended</Badge>,
  }[challenge.status];

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge}
            {challenge.completed ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2Icon className="size-3" />
                Completed
              </Badge>
            ) : null}
            <Badge variant="outline" className="gap-1">
              <TrophyIcon className="size-3" />
              {challenge.points} pts
            </Badge>
          </div>

          <h3 className="font-medium">{challenge.title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {challenge.description}
          </p>
        </div>

        <dl className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Runs</dt>
            <dd>
              {formatCampusDay(challenge.startDate, { day: "numeric", month: "short" })}
              {" – "}
              {formatCampusDay(challenge.endDate, { day: "numeric", month: "short" })}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <UsersIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <dt className="sr-only">Participants</dt>
            <dd>
              {challenge.participantCount}{" "}
              {challenge.participantCount === 1 ? "participant" : "participants"}
            </dd>
          </div>
        </dl>

        <div className="mt-auto space-y-3">
          {challenge.joined ? (
            <div className="space-y-1.5">
              <Progress
                value={challenge.percent}
                aria-label={`${challenge.title} progress`}
                indicatorClassName={challenge.completed ? "bg-success" : undefined}
              />
              <p className="text-muted-foreground text-xs tabular-nums">
                {challenge.progress} / {challenge.target} {challenge.targetUnit} (
                {challenge.percent}%)
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              Target: {challenge.target} {challenge.targetUnit}
            </p>
          )}

          {challenge.completed ? (
            <Button variant="outline" className="w-full" disabled>
              <CheckCircle2Icon />
              Completed
            </Button>
          ) : challenge.joined ? (
            <Button
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => toggleParticipation("leave")}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              Leave challenge
            </Button>
          ) : challenge.status === "ended" ? (
            <Button variant="outline" className="w-full" disabled>
              Closed
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={pending}
              onClick={() => toggleParticipation("join")}
            >
              {pending ? <Loader2Icon className="animate-spin" /> : null}
              {challenge.status === "upcoming" ? "Join early" : "Join challenge"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
