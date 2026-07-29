import type { SeedableTournamentEntry } from "./bracketSeeding";

export interface GroupTeamStanding {
  teamId: string;
  teamName: string;
  groupLabel: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;       // 3 for win, 1 for draw, 0 for loss (configurable)
  scoreFor: number;
  scoreAgainst: number;
  scoreDiff: number;
  headToHead: Map<string, number>; // opponentTeamId -> net score diff or +1/-1
}

export interface GroupAdvancementRules {
  advancingPerGroup: number;
  seedingMethod?: "CROSS" | "SNAKE"; // CROSS = A1 vs B2, B1 vs A2. SNAKE = seed 1..K overall
}

/**
 * Computes standings for a single group or multi-group stage.
 */
export function getGroupStandings(
  matches: Array<{
    team1Id?: string | null;
    team2Id?: string | null;
    team1Name: string;
    team2Name: string;
    team1Score: number;
    team2Score: number;
    bracketSide?: string | null;
    status: string;
  }>,
  allTeams: Array<{ id: string; name: string; groupLabel?: string }>,
): Map<string, GroupTeamStanding[]> {
  const standingsMap = new Map<string, Map<string, GroupTeamStanding>>();

  for (const team of allTeams) {
    const group = team.groupLabel || "Group A";
    if (!standingsMap.has(group)) {
      standingsMap.set(group, new Map());
    }

    standingsMap.get(group)!.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      groupLabel: group,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      scoreDiff: 0,
      headToHead: new Map(),
    });
  }

  for (const match of matches) {
    if (match.status !== "COMPLETED") continue;
    if (!match.team1Id || !match.team2Id) continue;

    // Find group for this match
    let group = match.bracketSide || "Group A";
    let s1: GroupTeamStanding | undefined;
    let s2: GroupTeamStanding | undefined;

    for (const groupMap of standingsMap.values()) {
      if (groupMap.has(match.team1Id)) s1 = groupMap.get(match.team1Id);
      if (groupMap.has(match.team2Id)) s2 = groupMap.get(match.team2Id);
    }

    if (!s1 || !s2) continue;

    s1.matchesPlayed += 1;
    s2.matchesPlayed += 1;

    s1.scoreFor += match.team1Score;
    s1.scoreAgainst += match.team2Score;
    s1.scoreDiff = s1.scoreFor - s1.scoreAgainst;

    s2.scoreFor += match.team2Score;
    s2.scoreAgainst += match.team1Score;
    s2.scoreDiff = s2.scoreFor - s2.scoreAgainst;

    if (match.team1Score > match.team2Score) {
      s1.wins += 1;
      s1.points += 3;
      s2.losses += 1;
      s1.headToHead.set(s2.teamId, (s1.headToHead.get(s2.teamId) ?? 0) + 1);
      s2.headToHead.set(s1.teamId, (s2.headToHead.get(s1.teamId) ?? 0) - 1);
    } else if (match.team2Score > match.team1Score) {
      s2.wins += 1;
      s2.points += 3;
      s1.losses += 1;
      s2.headToHead.set(s1.teamId, (s2.headToHead.get(s1.teamId) ?? 0) + 1);
      s1.headToHead.set(s2.teamId, (s1.headToHead.get(s2.teamId) ?? 0) - 1);
    } else {
      s1.draws += 1;
      s2.draws += 1;
      s1.points += 1;
      s2.points += 1;
    }
  }

  // Sort standings per group
  const result = new Map<string, GroupTeamStanding[]>();
  for (const [groupName, groupMap] of standingsMap.entries()) {
    const sorted = [...groupMap.values()].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
      if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor;
      // Head to Head
      const h2h = a.headToHead.get(b.teamId) ?? 0;
      if (h2h !== 0) return -h2h;
      return a.teamName.localeCompare(b.teamName);
    });
    result.set(groupName, sorted);
  }

  return result;
}

/**
 * Resolves advancing teams from a completed Group stage to form the knockout stage entries.
 * CROSS method: Group A1, Group B1, Group A2, Group B2 with cross-pairings.
 */
export function resolveStageAdvancement(
  groupStandings: Map<string, GroupTeamStanding[]>,
  rules: GroupAdvancementRules,
): SeedableTournamentEntry[] {
  const { advancingPerGroup } = rules;
  const groups = [...groupStandings.keys()].sort();
  const qualified: Array<{ teamId: string; teamName: string; rank: number; group: string }> = [];

  for (const group of groups) {
    const standings = groupStandings.get(group) ?? [];
    const topN = standings.slice(0, advancingPerGroup);
    topN.forEach((s, idx) => {
      qualified.push({
        teamId: s.teamId,
        teamName: s.teamName,
        rank: idx + 1, // 1st, 2nd, etc.
        group,
      });
    });
  }

  // Cross seeding order: 1st place teams first (A1, B1, C1, ...), then 2nd place teams reversed (D2, C2, B2, A2)
  // This pairs A1 vs B2, B1 vs A2, etc. when fed into `createBracketSlots()`
  const firsts = qualified.filter((q) => q.rank === 1);
  const seconds = qualified.filter((q) => q.rank === 2).reverse(); // reverse for cross match
  const others = qualified.filter((q) => q.rank > 2);

  const orderedQualified = [...firsts, ...seconds, ...others];

  return orderedQualified.map((q, idx) => ({
    teamId: q.teamId,
    teamName: q.teamName,
    seedNumber: idx + 1,
  }));
}
