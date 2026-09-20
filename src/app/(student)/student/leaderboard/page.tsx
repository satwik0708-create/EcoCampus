import { Suspense } from "react";
import { FlameIcon, ShieldCheckIcon, TrophyIcon } from "lucide-react";
import { requirePageStudent } from "@/lib/auth/guards";
import { getLeaderboard } from "@/lib/services/leaderboard";
import { PageHeader } from "@/components/ui/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { cn, formatNumber } from "@/lib/utils";

export const metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const user = await requirePageStudent();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Leaderboard"
        description="Ranked by total points earned, then by current streak. Only display names are shown."
      />

      <Alert variant="info">
        <ShieldCheckIcon />
        <AlertDescription>
          The leaderboard shows display names, points, streaks and completed
          challenges only. Email addresses, real names and individual records
          are never exposed here.
        </AlertDescription>
      </Alert>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <LeaderboardTable userId={user.id} />
      </Suspense>
    </div>
  );
}

async function LeaderboardTable({ userId }: { userId: string }) {
  const { rows, currentUserRow, totalParticipants } = await getLeaderboard(userId, 25);

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={TrophyIcon}
            title="The leaderboard is empty"
            description="Leaderboard data will appear as students begin participating."
          />
        </CardContent>
      </Card>
    );
  }

  // Show the signed-in student's row separately when they are outside the top 25.
  const outsideTop = currentUserRow && !rows.some((row) => row.isCurrentUser);

  return (
    <div className="space-y-4">
      {currentUserRow ? (
        <Card className="border-primary/30 bg-primary/[0.04]">
          <CardContent className="flex flex-wrap items-center gap-4">
            <div className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-lg text-lg font-semibold tabular-nums">
              {currentUserRow.rank}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Your position · {currentUserRow.displayName}
              </p>
              <p className="text-muted-foreground text-sm">
                {formatNumber(currentUserRow.points)} points ·{" "}
                {currentUserRow.currentStreak}-day streak ·{" "}
                {currentUserRow.challengesCompleted} challenges completed
              </p>
            </div>
            <Badge variant="outline">
              Rank {currentUserRow.rank} of {totalParticipants}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Streak</TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Challenges
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.userId}
                  className={cn(row.isCurrentUser && "bg-primary/[0.06]")}
                >
                  <TableCell className="tabular-nums">
                    {row.rank <= 3 ? (
                      <span
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                          row.rank === 1 && "bg-warning/20 text-warning-foreground dark:text-warning",
                          row.rank === 2 && "bg-muted text-muted-foreground",
                          row.rank === 3 && "bg-accent text-accent-foreground",
                        )}
                      >
                        {row.rank}
                      </span>
                    ) : (
                      <span className="text-muted-foreground pl-2">{row.rank}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{row.displayName}</span>
                    {row.isCurrentUser ? (
                      <Badge variant="default" className="ml-2">
                        You
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatNumber(row.points)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    <span className="inline-flex items-center gap-1">
                      {row.currentStreak > 0 ? (
                        <FlameIcon className="text-warning size-3.5" aria-hidden="true" />
                      ) : null}
                      {row.currentStreak}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {row.challengesCompleted}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        {outsideTop
          ? `Showing the top ${rows.length} of ${totalParticipants} students. Your position is shown above.`
          : `Showing the top ${rows.length} of ${totalParticipants} students.`}
      </p>
    </div>
  );
}
