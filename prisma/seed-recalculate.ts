import type { PrismaClient } from "@prisma/client";
import {
  awardForChallengeCompletion,
  awardForDailyCheckIn,
  awardForStreakMilestone,
  awardsForFoodWasteRecord,
  awardsForWasteRecord,
  persistAwards,
  toPointsConfig,
  type PendingAward,
} from "../src/lib/points/engine";
import { measureProgress } from "../src/lib/challenges/engine";
import {
  computeCurrentStreak,
  computeStreakState,
  newlyReachedMilestones,
} from "../src/lib/streaks/engine";
import {
  campusDayToDate,
  campusToday,
  dateToCampusDay,
  type CampusDay,
} from "../src/lib/time";

/**
 * Replay the production engines over a seeded student's records.
 *
 * The seed deliberately does NOT write point totals, streak values or
 * challenge progress directly. It inserts records, then calls this, which
 * uses exactly the same engine functions the live application uses. The
 * result is that seeded dashboards show numbers that are genuinely derived
 * from the seeded records — and that a bug in the engine shows up in the
 * demo data instead of being papered over by hand-written totals.
 */
export async function recalculateStudentFromRecords(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  const timeZone = process.env.CAMPUS_TIMEZONE ?? "Asia/Kolkata";
  const today = campusToday(timeZone);

  const config = toPointsConfig(await prisma.pointsRule.findMany());

  const [wasteRecords, foodRecords] = await Promise.all([
    prisma.wasteRecord.findMany({
      where: { userId },
      orderBy: [{ recordedOn: "asc" }, { createdAt: "asc" }],
    }),
    prisma.foodWasteRecord.findMany({
      where: { userId },
      orderBy: [{ recordedOn: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const awards: PendingAward[] = [];

  for (const record of wasteRecords) {
    awards.push(
      ...awardsForWasteRecord(config, {
        recordId: record.id,
        itemType: record.itemType,
        disposal: record.disposal,
      }),
    );
  }

  for (const record of foodRecords) {
    awards.push(
      ...awardsForFoodWasteRecord(config, {
        recordId: record.id,
        itemType: record.itemType,
      }),
    );
  }

  // --- one daily check-in per campus day with activity ---------------------
  const activityDays = [
    ...new Set([
      ...wasteRecords.map((r) => dateToCampusDay(r.recordedOn)),
      ...foodRecords.map((r) => dateToCampusDay(r.recordedOn)),
    ]),
  ]
    .filter((day) => day <= today)
    .sort();

  for (const day of activityDays) {
    const award = awardForDailyCheckIn(config, day);
    if (award) awards.push(award);
  }

  // --- streak milestones, awarded as they were historically reached --------
  const seenDays: CampusDay[] = [];
  let previousStreak = 0;
  for (const day of activityDays) {
    seenDays.push(day);
    // The streak "as at" that day, using only the history up to it.
    const streakThatDay = computeCurrentStreak(seenDays, day);
    for (const milestone of newlyReachedMilestones(previousStreak, streakThatDay)) {
      const award = awardForStreakMilestone(config, milestone);
      if (award) awards.push(award);
    }
    previousStreak = streakThatDay;
  }

  const streakState = computeStreakState(activityDays, today, 0);
  await prisma.streak.upsert({
    where: { userId },
    create: {
      userId,
      currentStreak: streakState.currentStreak,
      longestStreak: streakState.longestStreak,
      lastActivityDate: streakState.lastActivityDate
        ? campusDayToDate(streakState.lastActivityDate)
        : null,
    },
    update: {
      currentStreak: streakState.currentStreak,
      longestStreak: streakState.longestStreak,
      lastActivityDate: streakState.lastActivityDate
        ? campusDayToDate(streakState.lastActivityDate)
        : null,
    },
  });

  // --- challenge progress, measured from the records -----------------------
  const participations = await prisma.challengeParticipation.findMany({
    where: { userId },
    include: { challenge: true },
  });

  for (const participation of participations) {
    const progress = await measureProgress(prisma, participation.challenge, userId);
    const completed = progress >= participation.challenge.target;

    await prisma.challengeParticipation.update({
      where: { id: participation.id },
      data: {
        progress,
        completed,
        completedAt: completed
          ? (participation.completedAt ?? new Date())
          : null,
      },
    });

    if (completed) {
      awards.push(awardForChallengeCompletion(participation.challenge));
    }
  }

  await persistAwards(prisma, userId, awards);

  // Backdate each ledger entry to the activity it was awarded for.
  //
  // Without this every seeded transaction carries the seed run's timestamp,
  // which makes "points earned in the last 7 days" report a student's entire
  // history. Aligning the ledger timestamp with the record's campus day is
  // exactly what would have happened had the student logged the activity on
  // the day itself, so the demo data reads correctly without any figure
  // being invented.
  const recordDay = new Map<string, Date>();
  for (const record of wasteRecords) {
    recordDay.set(record.id, record.recordedOn);
  }
  for (const record of foodRecords) {
    recordDay.set(record.id, record.recordedOn);
  }

  const ledger = await prisma.pointTransaction.findMany({
    where: { userId },
    select: { id: true, sourceType: true, sourceId: true },
  });

  for (const entry of ledger) {
    if (!entry.sourceId) continue;

    let when: Date | undefined;
    if (entry.sourceType === "daily_check_in") {
      // The source id is the campus day itself.
      when = campusDayToDate(entry.sourceId);
    } else {
      when = recordDay.get(entry.sourceId);
    }
    if (!when) continue;

    // Mid-afternoon on the activity's own day.
    const stamped = new Date(when.getTime() + 14 * 3_600_000);
    await prisma.pointTransaction.update({
      where: { id: entry.id },
      data: { createdAt: stamped },
    });
  }
}
