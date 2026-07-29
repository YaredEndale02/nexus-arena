/**
 * Swiss System Pairing Engine
 *
 * Swiss system pairs teams each round based on similar scores, preventing
 * repeat matchups and distributing byes fairly for odd team counts.
 */

export interface SwissTeamStanding {
  teamId: string;
  teamName: string;
  points: number;           // Wins = 1, Draws = 0.5 (or custom win count)
  matchesPlayed: number;
  buchholz: number;         // Sum of opponents' points (strength of schedule)
  headToHead: Map<string, number>; // opponentTeamId -> net score diff or win count
  hadBye: boolean;
}

export interface SwissPairing {
  team1Id: string;
  team1Name: string;
  team2Id: string;
  team2Name: string;
}

export interface SwissRoundResult {
  roundNumber: number;
  pairings: SwissPairing[];
  byeTeamId: string | null;
  byeTeamName: string | null;
}

/**
 * Computes standings for a Swiss tournament given played matches.
 */
export function getSwissStandings(
  matches: Array<{
    team1Id?: string | null;
    team2Id?: string | null;
    team1Name: string;
    team2Name: string;
    team1Score: number;
    team2Score: number;
    winnerName?: string | null;
    status: string;
  }>,
  allTeams: Array<{ id: string; name: string }>,
): SwissTeamStanding[] {
  const standingsMap = new Map<string, SwissTeamStanding>();

  for (const team of allTeams) {
    standingsMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      points: 0,
      matchesPlayed: 0,
      buchholz: 0,
      headToHead: new Map(),
      hadBye: false,
    });
  }

  // Track opponents for Buchholz computation
  const opponentsMap = new Map<string, string[]>();
  for (const team of allTeams) {
    opponentsMap.set(team.id, []);
  }

  for (const match of matches) {
    if (match.status !== "COMPLETED") continue;

    const t1Id = match.team1Id;
    const t2Id = match.team2Id;

    // Handle Bye
    if (t1Id && (!t2Id || match.team2Name === "BYE")) {
      const s1 = standingsMap.get(t1Id);
      if (s1) {
        s1.points += 1;
        s1.hadBye = true;
        s1.matchesPlayed += 1;
      }
      continue;
    }

    if (!t1Id || !t2Id) continue;

    const s1 = standingsMap.get(t1Id);
    const s2 = standingsMap.get(t2Id);
    if (!s1 || !s2) continue;

    s1.matchesPlayed += 1;
    s2.matchesPlayed += 1;

    opponentsMap.get(t1Id)?.push(t2Id);
    opponentsMap.get(t2Id)?.push(t1Id);

    if (match.team1Score > match.team2Score) {
      s1.points += 1;
      s1.headToHead.set(t2Id, 1);
      s2.headToHead.set(t1Id, -1);
    } else if (match.team2Score > match.team1Score) {
      s2.points += 1;
      s2.headToHead.set(t1Id, 1);
      s1.headToHead.set(t2Id, -1);
    } else {
      s1.points += 0.5;
      s2.points += 0.5;
      s1.headToHead.set(t2Id, 0);
      s2.headToHead.set(t1Id, 0);
    }
  }

  // Compute Buchholz (sum of opponents' points)
  for (const [teamId, standing] of standingsMap.entries()) {
    const oppIds = opponentsMap.get(teamId) ?? [];
    let sumOppPoints = 0;
    for (const oppId of oppIds) {
      sumOppPoints += standingsMap.get(oppId)?.points ?? 0;
    }
    standing.buchholz = sumOppPoints;
  }

  // Sort standings: Points desc -> Buchholz desc -> Name asc
  return [...standingsMap.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    return a.teamName.localeCompare(b.teamName);
  });
}

/**
 * Generates Swiss pairings for the next round.
 * Avoids repeat matchups and distributes byes to lowest-ranked team without prior bye.
 */
export function generateSwissPairings(
  standings: SwissTeamStanding[],
  previousPairings: Set<string>, // Set of "minId-maxId" strings
  roundNumber: number,
): SwissRoundResult {
  const isOdd = standings.length % 2 !== 0;
  let candidates = [...standings];
  let byeTeam: SwissTeamStanding | null = null;

  // Handle Bye for odd team count: find lowest standing team without prior bye
  if (isOdd) {
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (!candidates[i].hadBye) {
        byeTeam = candidates[i];
        candidates.splice(i, 1);
        break;
      }
    }
    // Fallback: if all had byes, take lowest standing
    if (!byeTeam && candidates.length > 0) {
      byeTeam = candidates.pop()!;
    }
  }

  const pairings: SwissPairing[] = [];
  const paired = new Set<string>();

  // Greedy pair within score buckets, sliding down if repeat matchup
  for (let i = 0; i < candidates.length; i++) {
    const teamA = candidates[i];
    if (paired.has(teamA.teamId)) continue;

    let partnerFound = false;
    for (let j = i + 1; j < candidates.length; j++) {
      const teamB = candidates[j];
      if (paired.has(teamB.teamId)) continue;

      const pairKey = `${Math.min(Number(teamA.teamId) || 0, Number(teamB.teamId) || 0)}-${Math.max(Number(teamA.teamId) || 0, Number(teamB.teamId) || 0)}`;
      const stringKey = [teamA.teamId, teamB.teamId].sort().join(" vs ");

      if (!previousPairings.has(pairKey) && !previousPairings.has(stringKey)) {
        pairings.push({
          team1Id: teamA.teamId,
          team1Name: teamA.teamName,
          team2Id: teamB.teamId,
          team2Name: teamB.teamName,
        });
        paired.add(teamA.teamId);
        paired.add(teamB.teamId);
        previousPairings.add(stringKey);
        partnerFound = true;
        break;
      }
    }

    // Fallback: if strict non-repeat fails, pair with first available adjacent team
    if (!partnerFound) {
      for (let j = i + 1; j < candidates.length; j++) {
        const teamB = candidates[j];
        if (paired.has(teamB.teamId)) continue;

        pairings.push({
          team1Id: teamA.teamId,
          team1Name: teamA.teamName,
          team2Id: teamB.teamId,
          team2Name: teamB.teamName,
        });
        paired.add(teamA.teamId);
        paired.add(teamB.teamId);
        break;
      }
    }
  }

  return {
    roundNumber,
    pairings,
    byeTeamId: byeTeam?.teamId ?? null,
    byeTeamName: byeTeam?.teamName ?? null,
  };
}
