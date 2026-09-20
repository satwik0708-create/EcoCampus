import { Suspense } from "react";
import { TargetIcon } from "lucide-react";
import { requirePageAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { campusToday, dateToCampusDay, formatCampusDay } from "@/lib/time";
import { challengeStatus } from "@/lib/challenges/engine";
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
import { ChallengeEditor } from "@/components/admin/challenge-editor";
import { DeleteButton } from "@/components/admin/delete-button";

export const metadata = { title: "Manage Challenges" };

export default async function AdminChallengesPage() {
  await requirePageAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Challenges"
        description="Create campus challenges. Progress is measured from student records — there is no manual completion, by design."
        actions={<ChallengeEditor />}
      />

      <Suspense fallback={<Skeleton className="h-96" />}>
        <ChallengesTable />
      </Suspense>
    </div>
  );
}

async function ChallengesTable() {
  const today = campusToday(env.campusTimeZone);
  const challenges = await prisma.challenge.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { participations: true } },
      participations: { where: { completed: true }, select: { id: true } },
    },
  });

  if (challenges.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={TargetIcon}
            title="No challenges yet"
            description="Create your first challenge to give students a shared target to work toward."
            action={<ChallengeEditor />}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Challenge</TableHead>
              <TableHead className="hidden lg:table-cell">Window</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="text-right">Joined</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges.map((challenge) => {
              const status = challengeStatus(challenge, today);
              return (
                <TableRow key={challenge.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-medium">{challenge.title}</p>
                      <p className="text-muted-foreground line-clamp-1 max-w-sm text-xs">
                        {challenge.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs whitespace-nowrap lg:table-cell">
                    {formatCampusDay(dateToCampusDay(challenge.startDate), {
                      day: "numeric",
                      month: "short",
                    })}
                    {" – "}
                    {formatCampusDay(dateToCampusDay(challenge.endDate), {
                      day: "numeric",
                      month: "short",
                    })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {challenge.target} {challenge.targetUnit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {challenge.points}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {challenge._count.participations}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {challenge.participations.length}
                  </TableCell>
                  <TableCell>
                    {status === "active" ? (
                      <Badge variant="success">Active</Badge>
                    ) : status === "upcoming" ? (
                      <Badge variant="info">Upcoming</Badge>
                    ) : (
                      <Badge variant="secondary">Ended</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <ChallengeEditor challenge={challenge} trigger="icon" />
                      <DeleteButton
                        endpoint={`/api/admin/challenges/${challenge.id}`}
                        itemLabel={challenge.title}
                        consequence={`This removes the challenge and all ${challenge._count.participations} participation records. Points students already earned from it stay on their ledger — it is an audit trail.`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
