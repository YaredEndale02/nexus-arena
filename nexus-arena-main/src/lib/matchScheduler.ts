/**
 * LAN Match Scheduler — Greedy Round-by-Round
 *
 * Assigns `scheduled_at` timestamps to matches respecting:
 *   - Station/court parallelism limits
 *   - Bracket precedence (round N must complete before round N+1)
 *   - Rest gaps between consecutive matches for the same team
 *   - No team plays in overlapping time slots
 */

export interface SchedulableMatch {
  id: string;
  roundNumber: number;
  team1Id: string | null;
  team2Id: string | null;
}

export interface SchedulerConfig {
  stationCount: number;
  matchDurationMinutes: number;
  restGapMinutes: number;
  startTime: Date; // venue open time
  endTime?: Date;  // venue close time (optional, for warnings)
}

export interface ScheduledMatch {
  id: string;
  scheduledAt: Date;
  stationNumber: number; // 1-indexed
  endTime: Date;
}

export interface ScheduleResult {
  scheduledMatches: ScheduledMatch[];
  estimatedEndTime: Date;
  warnings: string[];
}

/**
 * Greedy round-by-round scheduler.
 *
 * Algorithm:
 *   1. Group matches by round_number
 *   2. For each round (in order):
 *     a. Available matches = all matches in this round
 *     b. For each time slot within the round:
 *       - Assign up to `stationCount` matches that don't violate rest constraints
 *       - Track when each team last finished
 *     c. Advance to the next time slot after `matchDurationMinutes`
 *   3. Next round starts after all matches in previous round complete + rest gap
 */
export function scheduleMatches(
  matches: SchedulableMatch[],
  config: SchedulerConfig,
): ScheduleResult {
  const { stationCount, matchDurationMinutes, restGapMinutes, startTime, endTime } = config;
  const warnings: string[] = [];
  const scheduledMatches: ScheduledMatch[] = [];

  // Group matches by round
  const roundMap = new Map<number, SchedulableMatch[]>();
  for (const match of matches) {
    const round = match.roundNumber ?? 1;
    const list = roundMap.get(round) ?? [];
    list.push(match);
    roundMap.set(round, list);
  }

  const sortedRounds = [...roundMap.keys()].sort((a, b) => a - b);

  // Track when each team last finished a match (for rest gap enforcement)
  const teamLastEnd = new Map<string, Date>();

  let cursor = new Date(startTime.getTime()); // current scheduling cursor

  for (const roundNum of sortedRounds) {
    const roundMatches = [...(roundMap.get(roundNum) ?? [])];
    const unscheduled = [...roundMatches];

    while (unscheduled.length > 0) {
      // Try to fill up to `stationCount` matches in this time slot
      let stationsUsed = 0;
      const scheduledThisSlot: number[] = []; // indices into unscheduled to remove after

      for (let i = 0; i < unscheduled.length && stationsUsed < stationCount; i++) {
        const match = unscheduled[i];

        // Check if both teams satisfy rest gap
        const canSchedule = canTeamsPlay(match, cursor, teamLastEnd, restGapMinutes);

        if (canSchedule) {
          stationsUsed++;
          const matchEnd = new Date(cursor.getTime() + matchDurationMinutes * 60_000);

          scheduledMatches.push({
            id: match.id,
            scheduledAt: new Date(cursor.getTime()),
            stationNumber: stationsUsed,
            endTime: matchEnd,
          });

          // Update team last-end times
          if (match.team1Id) teamLastEnd.set(match.team1Id, matchEnd);
          if (match.team2Id) teamLastEnd.set(match.team2Id, matchEnd);

          scheduledThisSlot.push(i);
        }
      }

      // Remove scheduled matches from unscheduled (reverse order to preserve indices)
      for (const idx of scheduledThisSlot.sort((a, b) => b - a)) {
        unscheduled.splice(idx, 1);
      }

      // If we couldn't schedule anything this slot (all blocked by rest gaps),
      // advance cursor by rest gap to avoid infinite loop
      if (scheduledThisSlot.length === 0 && unscheduled.length > 0) {
        cursor = new Date(cursor.getTime() + restGapMinutes * 60_000);
        continue;
      }

      // Advance cursor to next slot if there are remaining matches in this round
      if (unscheduled.length > 0) {
        cursor = new Date(cursor.getTime() + matchDurationMinutes * 60_000);
      }
    }

    // After round completes, advance cursor by match duration + rest gap for the next round
    cursor = new Date(cursor.getTime() + matchDurationMinutes * 60_000 + restGapMinutes * 60_000);
  }

  // Estimated end time = last scheduled match end time
  const estimatedEndTime = scheduledMatches.length > 0
    ? new Date(Math.max(...scheduledMatches.map((m) => m.endTime.getTime())))
    : new Date(startTime.getTime());

  // Check venue close time
  if (endTime && estimatedEndTime > endTime) {
    const overMinutes = Math.ceil((estimatedEndTime.getTime() - endTime.getTime()) / 60_000);
    warnings.push(
      `Schedule extends ${overMinutes} minutes past venue close time. ` +
      `Consider adding stations or shortening match duration.`,
    );
  }

  return {
    scheduledMatches,
    estimatedEndTime,
    warnings,
  };
}

/**
 * Checks whether both teams in a match can play at the given time
 * based on rest gap requirements.
 */
function canTeamsPlay(
  match: SchedulableMatch,
  slotStart: Date,
  teamLastEnd: Map<string, Date>,
  restGapMinutes: number,
): boolean {
  const requiredGapMs = restGapMinutes * 60_000;

  for (const teamId of [match.team1Id, match.team2Id]) {
    if (!teamId) continue;
    const lastEnd = teamLastEnd.get(teamId);
    if (lastEnd && slotStart.getTime() - lastEnd.getTime() < requiredGapMs) {
      return false;
    }
  }

  return true;
}
