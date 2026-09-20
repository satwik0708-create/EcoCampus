import "server-only";
import type { Challenge } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import {
  challengeStatus,
  measureProgress,
  progressPercent,
  type ChallengeStatus,
} from "@/lib/challenges/engine";
import { campusDayToDate, campusToday, dateToCampusDay } from "@/lib/time";

export type ChallengeCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  metric: Challenge["metric"];
  scope: Challenge["scope"];
  target: number;
  targetUnit: string;
  points: number;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  joined: boolean;
  progress: number;
  percent: number;
  completed: boolean;
  completedAt: Date | null;
  participantCount: number;
};

/**
 * Every challenge, with this student's live progress.
 *
 * Progress is measured from the student's records on read as well as on
 * write, so a challenge created after a student had already logged qualifying
 * activity shows the right number the moment they join.
 */
export async function getChallengesForStudent(
  userId: string,
): Promise<ChallengeCard[]> {
  const today = campusToday(env.campusTimeZone);

  const [challenges, participations, counts] = await Promise.all([
    prisma.challenge.findMany({ orderBy: [{ startDate: "desc" }, { title: "asc" }] }),
    prisma.challengeParticipation.findMany({ where: { userId } }),
    prisma.challengeParticipation.groupBy({
      by: ["challengeId"],
      _count: { _all: true },
    }),
  ]);

  const participationMap = new Map(participations.map((p) => [p.challengeId, p]));
  const countMap = new Map(counts.map((c) => [c.challengeId, c._count._all]));

  const cards: ChallengeCard[] = [];
  for (const challenge of challenges) {
    const participation = participationMap.get(challenge.id);
    const status = challengeStatus(challenge, today);

    // Only joined challenges need a live measurement.
    const progress = participation
      ? await measureProgress(prisma, challenge, userId)
      : 0;

    cards.push({
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      description: challenge.description,
      metric: challenge.metric,
      scope: challenge.scope,
      target: challenge.target,
      targetUnit: challenge.targetUnit,
      points: challenge.points,
      startDate: dateToCampusDay(challenge.startDate),
      endDate: dateToCampusDay(challenge.endDate),
      status,
      joined: !!participation,
      progress,
      percent: progressPercent(progress, challenge.target),
      completed: participation?.completed ?? false,
      completedAt: participation?.completedAt ?? null,
      participantCount: countMap.get(challenge.id) ?? 0,
    });
  }

  const order: Record<ChallengeStatus, number> = { active: 0, upcoming: 1, ended: 2 };
  return cards.sort(
    (a, b) => order[a.status] - order[b.status] || a.endDate.localeCompare(b.endDate),
  );
}

/**
 * Join a challenge, then immediately measure the student's existing
 * qualifying activity so the progress bar is honest from the first render.
 */
export async function joinChallenge(
  userId: string,
  challengeId: string,
): Promise<{ joined: boolean; progress: number; completed: boolean }> {
  const today = campusToday(env.campusTimeZone);
  const todayDate = campusDayToDate(today);

  return prisma.$transaction(async (tx) => {
    const challenge = await tx.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) {
      throw new Error("CHALLENGE_NOT_FOUND");
    }
    if (!challenge.active || challenge.endDate < todayDate) {
      throw new Error("CHALLENGE_CLOSED");
    }

    const existing = await tx.challengeParticipation.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });
    if (existing) {
      return {
        joined: false,
        progress: existing.progress,
        completed: existing.completed,
      };
    }

    const progress = await measureProgress(tx, challenge, userId);
    const completed = progress >= challenge.target;

    await tx.challengeParticipation.create({
      data: {
        challengeId,
        userId,
        progress,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    if (completed) {
      await tx.pointTransaction.createMany({
        data: [
          {
            userId,
            points: challenge.points,
            reason: "CHALLENGE_COMPLETION",
            detail: `Completed challenge: ${challenge.title}`,
            sourceType: "challenge_completion",
            sourceId: challenge.id,
          },
        ],
        skipDuplicates: true,
      });
    }

    return { joined: true, progress, completed };
  });
}

/** Leave a challenge that has not been completed. */
export async function leaveChallenge(
  userId: string,
  challengeId: string,
): Promise<void> {
  const participation = await prisma.challengeParticipation.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
  });
  if (!participation) throw new Error("NOT_JOINED");
  if (participation.completed) throw new Error("ALREADY_COMPLETED");
  await prisma.challengeParticipation.delete({ where: { id: participation.id } });
}
