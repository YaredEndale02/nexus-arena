import { describe, expect, it } from "vitest";
import { generateSwissPairings, getSwissStandings } from "@/lib/swissPairing";

describe("swissPairing", () => {
  const teams = [
    { id: "1", name: "Team 1" },
    { id: "2", name: "Team 2" },
    { id: "3", name: "Team 3" },
    { id: "4", name: "Team 4" },
  ];

  it("computes standings correctly after round 1", () => {
    const matches = [
      { team1Id: "1", team2Id: "2", team1Name: "Team 1", team2Name: "Team 2", team1Score: 2, team2Score: 0, status: "COMPLETED" },
      { team1Id: "3", team2Id: "4", team1Name: "Team 3", team2Name: "Team 4", team1Score: 1, team2Score: 2, status: "COMPLETED" },
    ];

    const standings = getSwissStandings(matches, teams);

    expect(standings[0].teamId).toBe("1"); // 1 win (1 point)
    expect(standings[1].teamId).toBe("4"); // 1 win (1 point)
    expect(standings[0].points).toBe(1);
    expect(standings[1].points).toBe(1);
    expect(standings[2].points).toBe(0);
    expect(standings[3].points).toBe(0);
  });

  it("pairs winners vs winners and losers vs losers in round 2", () => {
    const matches = [
      { team1Id: "1", team2Id: "2", team1Name: "Team 1", team2Name: "Team 2", team1Score: 2, team2Score: 0, status: "COMPLETED" },
      { team1Id: "3", team2Id: "4", team1Name: "Team 3", team2Name: "Team 4", team1Score: 1, team2Score: 2, status: "COMPLETED" },
    ];

    const standings = getSwissStandings(matches, teams);
    const prevPairings = new Set(["1 vs 2", "3 vs 4"]);

    const round2 = generateSwissPairings(standings, prevPairings, 2);

    expect(round2.pairings).toHaveLength(2);
    // Team 1 (winner) vs Team 4 (winner)
    expect([round2.pairings[0].team1Id, round2.pairings[0].team2Id].sort()).toEqual(["1", "4"]);
    // Team 2 (loser) vs Team 3 (loser)
    expect([round2.pairings[1].team1Id, round2.pairings[1].team2Id].sort()).toEqual(["2", "3"]);
  });

  it("handles odd team count with bye assignment to lowest standing without prior bye", () => {
    const oddTeams = [
      { id: "1", name: "Team 1" },
      { id: "2", name: "Team 2" },
      { id: "3", name: "Team 3" },
    ];

    const standings = getSwissStandings([], oddTeams);
    const prevPairings = new Set<string>();

    const round1 = generateSwissPairings(standings, prevPairings, 1);

    expect(round1.pairings).toHaveLength(1);
    expect(round1.byeTeamId).not.toBeNull();
    // Lowest ranked alphabetically (Team 3) gets bye
    expect(round1.byeTeamId).toBe("3");
  });

  it("calculates Buchholz score correctly", () => {
    // Round 1: 1 beats 2, 3 beats 4
    // Round 2: 1 beats 3, 2 beats 4
    const matches = [
      { team1Id: "1", team2Id: "2", team1Name: "Team 1", team2Name: "Team 2", team1Score: 2, team2Score: 0, status: "COMPLETED" },
      { team1Id: "3", team2Id: "4", team1Name: "Team 3", team2Name: "Team 4", team1Score: 2, team2Score: 0, status: "COMPLETED" },
      { team1Id: "1", team2Id: "3", team1Name: "Team 1", team2Name: "Team 3", team1Score: 2, team2Score: 1, status: "COMPLETED" },
      { team1Id: "2", team2Id: "4", team1Name: "Team 2", team2Name: "Team 4", team1Score: 2, team0Score: 0, team2Score: 0, status: "COMPLETED" },
    ];

    const standings = getSwissStandings(matches, teams);

    // Team 1: 2 wins. Opponents: Team 2 (1 win) + Team 3 (1 win) -> Buchholz = 2
    const t1 = standings.find((s) => s.teamId === "1")!;
    expect(t1.points).toBe(2);
    expect(t1.buchholz).toBe(2);

    // Team 4: 0 wins. Opponents: Team 3 (1 win) + Team 2 (1 win) -> Buchholz = 2
    const t4 = standings.find((s) => s.teamId === "4")!;
    expect(t4.points).toBe(0);
    expect(t4.buchholz).toBe(2);
  });
});
