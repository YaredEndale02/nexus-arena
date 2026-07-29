import { describe, expect, it } from "vitest";
import { getGroupStandings, resolveStageAdvancement } from "@/lib/stageAdvancement";

describe("stageAdvancement", () => {
  const teams = [
    { id: "a1", name: "Alpha 1", groupLabel: "Group A" },
    { id: "a2", name: "Alpha 2", groupLabel: "Group A" },
    { id: "b1", name: "Beta 1", groupLabel: "Group B" },
    { id: "b2", name: "Beta 2", groupLabel: "Group B" },
  ];

  it("calculates group standings with 3 points per win", () => {
    const matches = [
      { team1Id: "a1", team2Id: "a2", team1Name: "Alpha 1", team2Name: "Alpha 2", team1Score: 3, team2Score: 1, status: "COMPLETED", bracketSide: "Group A" },
      { team1Id: "b1", team2Id: "b2", team1Name: "Beta 1", team2Name: "Beta 2", team1Score: 0, team2Score: 2, status: "COMPLETED", bracketSide: "Group B" },
    ];

    const standingsMap = getGroupStandings(matches, teams);

    const groupA = standingsMap.get("Group A")!;
    expect(groupA[0].teamId).toBe("a1"); // 3 pts
    expect(groupA[0].points).toBe(3);
    expect(groupA[0].scoreDiff).toBe(2);

    const groupB = standingsMap.get("Group B")!;
    expect(groupB[0].teamId).toBe("b2"); // 3 pts
    expect(groupB[0].points).toBe(3);
    expect(groupB[0].scoreDiff).toBe(2);
  });

  it("resolves stage advancement with cross seeding (A1 vs B2, B1 vs A2)", () => {
    const matches = [
      { team1Id: "a1", team2Id: "a2", team1Name: "Alpha 1", team2Name: "Alpha 2", team1Score: 2, team2Score: 0, status: "COMPLETED" },
      { team1Id: "b1", team2Id: "b2", team1Name: "Beta 1", team2Name: "Beta 2", team1Score: 3, team2Score: 0, status: "COMPLETED" },
    ];

    const standingsMap = getGroupStandings(matches, teams);

    // Top 2 from each group advance
    const knockoutEntries = resolveStageAdvancement(standingsMap, { advancingPerGroup: 2 });

    expect(knockoutEntries).toHaveLength(4);
    // 1st place teams first (Alpha 1, Beta 1), then reversed 2nd place (Beta 2, Alpha 2)
    expect(knockoutEntries[0].teamId).toBe("a1"); // seed 1
    expect(knockoutEntries[1].teamId).toBe("b1"); // seed 2
    expect(knockoutEntries[2].teamId).toBe("b2"); // seed 3
    expect(knockoutEntries[3].teamId).toBe("a2"); // seed 4
  });
});
