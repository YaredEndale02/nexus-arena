/**
 * Round Robin Generator — Circle Method
 *
 * Generates N−1 rounds of pairings for N teams (adds a ghost/bye for odd N).
 * Algorithm: Fix team at index 0, rotate the remaining teams through positions.
 * Each round produces ⌊N/2⌋ match pairings.
 */

export interface RoundRobinMatch {
  team1Index: number;
  team2Index: number;
}

export interface RoundRobinRound {
  round: number; // 1-indexed
  matches: RoundRobinMatch[];
  byeTeamIndex: number | null; // index of team with a bye this round (odd N only)
}

/**
 * Generates all rounds for a Round Robin tournament using the circle method.
 *
 * For N teams:
 *   - Even N: N−1 rounds, N/2 matches per round
 *   - Odd N:  N rounds, (N−1)/2 matches per round, 1 bye per round
 *
 * Guarantees:
 *   - Every team plays every other team exactly once
 *   - No team plays more than once per round
 *   - Bye distribution is fair (each team gets exactly 1 bye for odd N)
 */
export function generateRoundRobinRounds(teamCount: number): RoundRobinRound[] {
  if (teamCount < 2) return [];

  const isOdd = teamCount % 2 !== 0;
  // For odd N, add a ghost participant at the end
  const n = isOdd ? teamCount + 1 : teamCount;
  const ghostIndex = isOdd ? teamCount : -1; // ghost = index N (doesn't correspond to a real team)

  const rounds: RoundRobinRound[] = [];
  const totalRounds = n - 1;

  // Circle method: fix index 0, rotate indices 1..n-1
  // Positions array holds indices 1..n-1 in their current rotation
  const positions: number[] = [];
  for (let i = 1; i < n; i++) {
    positions.push(i);
  }

  for (let r = 0; r < totalRounds; r++) {
    const matches: RoundRobinMatch[] = [];
    let byeTeamIndex: number | null = null;

    // Pair: index 0 vs positions[0]
    const opponent0 = positions[0];
    if (opponent0 === ghostIndex) {
      byeTeamIndex = 0;
    } else if (0 === ghostIndex) {
      // Can't happen since ghost is always at index `teamCount` for odd
      byeTeamIndex = opponent0;
    } else {
      matches.push({ team1Index: 0, team2Index: opponent0 });
    }

    // Pair remaining: positions[k] vs positions[n-1-k]
    for (let k = 1; k <= (n - 2) / 2; k++) {
      const a = positions[k];
      const b = positions[n - 1 - k];

      if (a === ghostIndex) {
        byeTeamIndex = b;
      } else if (b === ghostIndex) {
        byeTeamIndex = a;
      } else {
        matches.push({ team1Index: Math.min(a, b), team2Index: Math.max(a, b) });
      }
    }

    rounds.push({
      round: r + 1,
      matches,
      byeTeamIndex,
    });

    // Rotate: move last element to front
    const last = positions.pop()!;
    positions.unshift(last);
  }

  return rounds;
}

/**
 * Validates that a Round Robin schedule is correct.
 * Used internally for assertions and testing.
 */
export function validateRoundRobin(teamCount: number, rounds: RoundRobinRound[]): string[] {
  const errors: string[] = [];
  const pairings = new Set<string>();

  const expectedRounds = teamCount % 2 === 0 ? teamCount - 1 : teamCount;
  if (rounds.length !== expectedRounds) {
    errors.push(`Expected ${expectedRounds} rounds, got ${rounds.length}`);
  }

  const teamMatchCount = new Map<number, number>();

  for (const round of rounds) {
    const teamsInRound = new Set<number>();

    for (const match of round.matches) {
      // Check for duplicate team in same round
      if (teamsInRound.has(match.team1Index)) {
        errors.push(`Team ${match.team1Index} plays twice in round ${round.round}`);
      }
      if (teamsInRound.has(match.team2Index)) {
        errors.push(`Team ${match.team2Index} plays twice in round ${round.round}`);
      }
      teamsInRound.add(match.team1Index);
      teamsInRound.add(match.team2Index);

      // Check for duplicate pairing across rounds
      const key = `${Math.min(match.team1Index, match.team2Index)}-${Math.max(match.team1Index, match.team2Index)}`;
      if (pairings.has(key)) {
        errors.push(`Duplicate pairing: ${key} in round ${round.round}`);
      }
      pairings.add(key);

      // Count matches per team
      teamMatchCount.set(match.team1Index, (teamMatchCount.get(match.team1Index) ?? 0) + 1);
      teamMatchCount.set(match.team2Index, (teamMatchCount.get(match.team2Index) ?? 0) + 1);
    }
  }

  // Every team should play every other team exactly once
  const expectedMatches = teamCount - 1;
  for (let i = 0; i < teamCount; i++) {
    const count = teamMatchCount.get(i) ?? 0;
    if (count !== expectedMatches) {
      errors.push(`Team ${i} played ${count} matches, expected ${expectedMatches}`);
    }
  }

  // Total unique pairings should be N(N-1)/2
  const expectedPairings = (teamCount * (teamCount - 1)) / 2;
  if (pairings.size !== expectedPairings) {
    errors.push(`Expected ${expectedPairings} unique pairings, got ${pairings.size}`);
  }

  return errors;
}
