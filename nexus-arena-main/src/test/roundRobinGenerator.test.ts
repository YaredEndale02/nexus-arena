import { describe, expect, it } from "vitest";
import { generateRoundRobinRounds, validateRoundRobin } from "@/lib/roundRobinGenerator";

describe("roundRobinGenerator", () => {
  it("generates 3 rounds for 4 teams with 2 matches per round", () => {
    const rounds = generateRoundRobinRounds(4);
    expect(rounds).toHaveLength(3);
    rounds.forEach((round) => {
      expect(round.matches).toHaveLength(2);
      expect(round.byeTeamIndex).toBeNull();
    });
  });

  it("generates correct pairings for 4 teams (6 total matches)", () => {
    const rounds = generateRoundRobinRounds(4);
    const allMatches = rounds.flatMap((r) => r.matches);
    expect(allMatches).toHaveLength(6);

    // Every team plays every other exactly once
    const errors = validateRoundRobin(4, rounds);
    expect(errors).toEqual([]);
  });

  it("handles 5 teams (odd) with 1 bye per round", () => {
    const rounds = generateRoundRobinRounds(5);
    expect(rounds).toHaveLength(5); // N rounds for odd N

    // Each round should have 2 matches and 1 bye
    rounds.forEach((round) => {
      expect(round.matches).toHaveLength(2);
      expect(round.byeTeamIndex).not.toBeNull();
    });

    // Total matches = 10 = 5×4/2
    const allMatches = rounds.flatMap((r) => r.matches);
    expect(allMatches).toHaveLength(10);

    const errors = validateRoundRobin(5, rounds);
    expect(errors).toEqual([]);
  });

  it("generates 7 rounds for 8 teams with 28 total matches", () => {
    const rounds = generateRoundRobinRounds(8);
    expect(rounds).toHaveLength(7);

    const allMatches = rounds.flatMap((r) => r.matches);
    expect(allMatches).toHaveLength(28);

    const errors = validateRoundRobin(8, rounds);
    expect(errors).toEqual([]);
  });

  it("generates correct schedule for 16 teams", () => {
    const rounds = generateRoundRobinRounds(16);
    expect(rounds).toHaveLength(15);

    const allMatches = rounds.flatMap((r) => r.matches);
    expect(allMatches).toHaveLength(120);

    const errors = validateRoundRobin(16, rounds);
    expect(errors).toEqual([]);
  });

  it("no team plays twice in the same round", () => {
    const rounds = generateRoundRobinRounds(8);
    for (const round of rounds) {
      const teamsInRound = new Set<number>();
      for (const match of round.matches) {
        expect(teamsInRound.has(match.team1Index)).toBe(false);
        expect(teamsInRound.has(match.team2Index)).toBe(false);
        teamsInRound.add(match.team1Index);
        teamsInRound.add(match.team2Index);
      }
    }
  });

  it("handles minimum case of 2 teams", () => {
    const rounds = generateRoundRobinRounds(2);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].matches).toHaveLength(1);
    expect(rounds[0].matches[0]).toEqual({ team1Index: 0, team2Index: 1 });
  });

  it("handles 3 teams (odd, minimal)", () => {
    const rounds = generateRoundRobinRounds(3);
    expect(rounds).toHaveLength(3);

    const allMatches = rounds.flatMap((r) => r.matches);
    expect(allMatches).toHaveLength(3);

    // Each round has 1 match and 1 bye
    rounds.forEach((round) => {
      expect(round.matches).toHaveLength(1);
      expect(round.byeTeamIndex).not.toBeNull();
    });

    const errors = validateRoundRobin(3, rounds);
    expect(errors).toEqual([]);
  });

  it("returns empty for fewer than 2 teams", () => {
    expect(generateRoundRobinRounds(1)).toEqual([]);
    expect(generateRoundRobinRounds(0)).toEqual([]);
  });
});
