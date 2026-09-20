import { Suspense } from "react";
import { TargetIcon } from "lucide-react";
import { requirePageStudent } from "@/lib/auth/guards";
import { getChallengesForStudent } from "@/lib/services/challenges";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChallengeCard } from "@/components/challenges/challenge-card";

export const metadata = { title: "Challenges" };

export default async function ChallengesPage() {
  const user = await requirePageStudent();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Challenges"
        description="Progress is calculated from the records you actually log. There is no button to mark a challenge complete — reach the target and the system awards it."
      />

      <Suspense fallback={<ChallengesSkeleton />}>
        <ChallengeLists userId={user.id} />
      </Suspense>
    </div>
  );
}

async function ChallengeLists({ userId }: { userId: string }) {
  const challenges = await getChallengesForStudent(userId);

  const active = challenges.filter((c) => c.status === "active");
  const upcoming = challenges.filter((c) => c.status === "upcoming");
  const completed = challenges.filter((c) => c.completed);
  const ended = challenges.filter((c) => c.status === "ended" && !c.completed);

  if (challenges.length === 0) {
    return (
      <EmptyState
        icon={TargetIcon}
        title="No challenges right now"
        description="No active challenges right now. Check back soon — your campus team publishes new ones regularly."
      />
    );
  }

  return (
    <Tabs defaultValue="active">
      <TabsList>
        <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
        <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
        <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        <TabsTrigger value="ended">Past ({ended.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="active">
        <ChallengeGrid
          challenges={active}
          emptyTitle="No active challenges"
          emptyDescription="No active challenges right now. Check back soon."
        />
      </TabsContent>
      <TabsContent value="upcoming">
        <ChallengeGrid
          challenges={upcoming}
          emptyTitle="Nothing scheduled"
          emptyDescription="There are no upcoming challenges on the calendar yet."
        />
      </TabsContent>
      <TabsContent value="completed">
        <ChallengeGrid
          challenges={completed}
          emptyTitle="Nothing completed yet"
          emptyDescription="Join an active challenge and keep logging — completed challenges will collect here."
        />
      </TabsContent>
      <TabsContent value="ended">
        <ChallengeGrid
          challenges={ended}
          emptyTitle="No past challenges"
          emptyDescription="Challenges that have finished without being completed appear here."
        />
      </TabsContent>
    </Tabs>
  );
}

function ChallengeGrid({
  challenges,
  emptyTitle,
  emptyDescription,
}: {
  challenges: Awaited<ReturnType<typeof getChallengesForStudent>>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (challenges.length === 0) {
    return (
      <EmptyState
        icon={TargetIcon}
        title={emptyTitle}
        description={emptyDescription}
        compact
      />
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {challenges.map((challenge) => (
        <li key={challenge.id}>
          <ChallengeCard challenge={challenge} />
        </li>
      ))}
    </ul>
  );
}

function ChallengesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-80" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-64" />
        ))}
      </div>
    </div>
  );
}
