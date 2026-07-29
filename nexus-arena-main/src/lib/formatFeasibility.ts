import type { Tournament } from "@/services/types";

// ─── Format Cost Formulas ────────────────────────────────────────────

export type BracketType = Tournament["bracketType"];

export interface SwissOptions {
  rounds?: number; // defaults to ⌈log₂N⌉
}

export interface GroupStageOptions {
  groupCount: number;
  groupSize: number;
  advancingPerGroup: number;
}

export type FormatOptions = SwissOptions | GroupStageOptions;

/**
 * Total number of matches for a given format and team count.
 */
export function getMatchCount(
  format: BracketType,
  teamCount: number,
  options?: FormatOptions,
): number {
  if (teamCount < 2) return 0;

  switch (format) {
    case "SINGLE_ELIMINATION":
      return teamCount - 1;

    case "DOUBLE_ELIMINATION":
      // 2N − 2 (not counting a possible grand final reset)
      return 2 * teamCount - 2;

    case "ROUND_ROBIN":
      return (teamCount * (teamCount - 1)) / 2;

    case "SWISS": {
      const R = (options as SwissOptions)?.rounds ?? Math.ceil(Math.log2(teamCount));
      return R * Math.floor(teamCount / 2);
    }

    case "GROUP_STAGE": {
      const gs = options as GroupStageOptions | undefined;
      if (!gs) {
        // Default: 4 groups, ceil(N/4) per group, top 2 advance → 8-team knockout
        const groupCount = Math.min(4, Math.floor(teamCount / 2));
        const groupSize = Math.ceil(teamCount / groupCount);
        const advancingPerGroup = 2;
        const qualifying = groupCount * advancingPerGroup;
        const groupMatches = groupCount * (groupSize * (groupSize - 1)) / 2;
        const knockoutMatches = qualifying - 1;
        return groupMatches + knockoutMatches;
      }
      const groupMatches = gs.groupCount * (gs.groupSize * (gs.groupSize - 1)) / 2;
      const qualifying = gs.groupCount * gs.advancingPerGroup;
      const knockoutMatches = qualifying - 1;
      return groupMatches + knockoutMatches;
    }

    default:
      return teamCount - 1; // fallback to single elim
  }
}

/**
 * Minimum number of sequential rounds (the critical path).
 * Infinite courts don't help — this is the floor.
 */
export function getRoundCount(
  format: BracketType,
  teamCount: number,
  options?: FormatOptions,
): number {
  if (teamCount < 2) return 0;

  switch (format) {
    case "SINGLE_ELIMINATION":
      return Math.ceil(Math.log2(teamCount));

    case "DOUBLE_ELIMINATION":
      // Approximately 2 × ⌈log₂N⌉ − 1 (upper + lower bracket rounds + grand final)
      return 2 * Math.ceil(Math.log2(teamCount)) - 1;

    case "ROUND_ROBIN":
      // N−1 rounds (or N rounds if odd, since one team byes each round)
      return teamCount % 2 === 0 ? teamCount - 1 : teamCount;

    case "SWISS": {
      const R = (options as SwissOptions)?.rounds ?? Math.ceil(Math.log2(teamCount));
      return R;
    }

    case "GROUP_STAGE": {
      const gs = options as GroupStageOptions | undefined;
      const groupSize = gs?.groupSize ?? Math.ceil(teamCount / Math.min(4, Math.floor(teamCount / 2)));
      const advancingPerGroup = gs?.advancingPerGroup ?? 2;
      const groupCount = gs?.groupCount ?? Math.min(4, Math.floor(teamCount / 2));
      const qualifying = groupCount * advancingPerGroup;
      // Group rounds + knockout rounds
      const groupRounds = groupSize % 2 === 0 ? groupSize - 1 : groupSize;
      const knockoutRounds = Math.ceil(Math.log2(qualifying));
      return groupRounds + knockoutRounds;
    }

    default:
      return Math.ceil(Math.log2(teamCount));
  }
}

/**
 * Minimum number of games any single participant plays.
 */
export function getMinGamesPerTeam(
  format: BracketType,
  teamCount: number,
  options?: FormatOptions,
): number {
  if (teamCount < 2) return 0;

  switch (format) {
    case "SINGLE_ELIMINATION":
      return 1; // lose first round, go home
    case "DOUBLE_ELIMINATION":
      return 2; // guaranteed 2 games minimum
    case "ROUND_ROBIN":
      return teamCount - 1; // play every other team
    case "SWISS": {
      const R = (options as SwissOptions)?.rounds ?? Math.ceil(Math.log2(teamCount));
      return R; // every team plays every round (minus potential bye for odd count)
    }
    case "GROUP_STAGE": {
      const gs = options as GroupStageOptions | undefined;
      const groupSize = gs?.groupSize ?? Math.ceil(teamCount / Math.min(4, Math.floor(teamCount / 2)));
      return groupSize - 1; // minimum = group stage only (eliminated)
    }
    default:
      return 1;
  }
}

// ─── LAN Feasibility ─────────────────────────────────────────────────

export interface LanFeasibilityConfig {
  format: BracketType;
  teamCount: number;
  stationCount: number;
  matchDurationMinutes: number;
  restGapMinutes: number;
  venueHours: number; // total available hours
  formatOptions?: FormatOptions;
}

export interface LanFeasibilityResult {
  feasible: boolean;
  totalMatches: number;
  totalRounds: number;
  estimatedMinutes: number;
  venueMinutes: number;
  issues: string[];
  warnings: string[];
}

/**
 * Checks whether a LAN tournament can physically complete within venue constraints.
 *
 * Two independent constraints:
 *   Throughput:  total_matches ≤ slots × stations
 *   Makespan:    rounds are sequential; parallelism capped at min(stations, ⌊N/2⌋)
 */
export function checkLanFeasibility(config: LanFeasibilityConfig): LanFeasibilityResult {
  const {
    format,
    teamCount,
    stationCount,
    matchDurationMinutes,
    restGapMinutes,
    venueHours,
    formatOptions,
  } = config;

  const issues: string[] = [];
  const warnings: string[] = [];

  const totalMatches = getMatchCount(format, teamCount, formatOptions);
  const totalRounds = getRoundCount(format, teamCount, formatOptions);
  const venueMinutes = venueHours * 60;

  // Effective parallelism per round: min(stations, max concurrent matches)
  const maxConcurrent = Math.min(stationCount, Math.floor(teamCount / 2));

  // Estimate time per round: ceil(matches_in_round / maxConcurrent) × (matchDuration + restGap)
  // For elimination: matches halve each round. For RR/Swiss: roughly constant.
  let estimatedMinutes = 0;

  if (format === "SINGLE_ELIMINATION" || format === "DOUBLE_ELIMINATION") {
    // Each round halves; calculate per-round time
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
    for (let r = 1; r <= totalRounds; r++) {
      const matchesInRound = format === "SINGLE_ELIMINATION"
        ? bracketSize / Math.pow(2, r)
        : Math.max(1, Math.ceil(totalMatches / totalRounds)); // approximation for DE
      const slotsNeeded = Math.ceil(matchesInRound / maxConcurrent);
      estimatedMinutes += slotsNeeded * (matchDurationMinutes + restGapMinutes);
    }
  } else {
    // RR, Swiss, Group: roughly equal matches per round
    const matchesPerRound = Math.ceil(totalMatches / totalRounds);
    for (let r = 0; r < totalRounds; r++) {
      const slotsNeeded = Math.ceil(matchesPerRound / maxConcurrent);
      estimatedMinutes += slotsNeeded * (matchDurationMinutes + restGapMinutes);
    }
  }

  // Subtract trailing rest gap from last slot
  if (estimatedMinutes > 0) {
    estimatedMinutes -= restGapMinutes;
  }

  // Check throughput
  if (estimatedMinutes > venueMinutes) {
    issues.push(
      `Estimated ${Math.ceil(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m exceeds venue availability of ${venueHours}h. ` +
      `Consider adding stations, shortening matches, or switching to Single Elimination.`,
    );
  }

  // Soft warnings
  if (estimatedMinutes > venueMinutes * 0.85 && estimatedMinutes <= venueMinutes) {
    warnings.push(
      `Schedule uses ${Math.round((estimatedMinutes / venueMinutes) * 100)}% of available venue time. ` +
      `Any match overruns will push past the venue window.`,
    );
  }

  if (stationCount < 2 && totalMatches > 10) {
    warnings.push(
      `Only 1 station for ${totalMatches} matches means fully sequential play (~${Math.ceil(totalMatches * matchDurationMinutes / 60)}h).`,
    );
  }

  return {
    feasible: issues.length === 0,
    totalMatches,
    totalRounds,
    estimatedMinutes: Math.ceil(estimatedMinutes),
    venueMinutes,
    issues,
    warnings,
  };
}

// ─── Human-Readable Summary ──────────────────────────────────────────

export interface FormatSummary {
  matches: number;
  rounds: number;
  minGamesPerTeam: number;
  description: string;
}

/**
 * Returns a human-readable summary of a format's cost.
 * Intended for the admin UI when organizers are choosing a format.
 */
export function getFormatSummary(
  format: BracketType,
  teamCount: number,
  options?: FormatOptions,
): FormatSummary {
  const matches = getMatchCount(format, teamCount, options);
  const rounds = getRoundCount(format, teamCount, options);
  const minGames = getMinGamesPerTeam(format, teamCount, options);

  const descriptions: Record<BracketType, string> = {
    SINGLE_ELIMINATION: `${matches} matches across ${rounds} rounds. Fast but teams are eliminated after 1 loss.`,
    DOUBLE_ELIMINATION: `${matches} matches across ~${rounds} rounds. Every team gets at least 2 games.`,
    ROUND_ROBIN: `${matches} matches across ${rounds} rounds. Every team plays every other team.`,
    SWISS: `${matches} matches across ${rounds} rounds. Teams paired by current standing each round.`,
    GROUP_STAGE: `${matches} total matches (group phase + knockout). Top teams from each group advance.`,
  };

  return {
    matches,
    rounds,
    minGamesPerTeam: minGames,
    description: descriptions[format] ?? `${matches} matches across ${rounds} rounds.`,
  };
}
