import { describe, expect, it } from "vitest";
import { assignBracketSeeds, assignSequentialSeeds, buildSeedPlacementOrder, createBracketSlots } from "@/lib/bracketSeeding";

describe("bracket seeding", () => {
  it("builds standard seed placement order for an eight team bracket", () => {
    expect(buildSeedPlacementOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("preserves explicit seeds and fills missing seeds automatically", () => {
    const seeded = assignBracketSeeds(
      [
        { teamId: "team-a", teamName: "Alpha", seedNumber: 1 },
        { teamId: "team-b", teamName: "Bravo", seedNumber: 4 },
        { teamId: "team-c", teamName: "Charlie", createdAt: "2026-04-01T10:00:00.000Z" },
        { teamId: "team-d", teamName: "Delta", createdAt: "2026-04-01T11:00:00.000Z" },
      ],
      4,
    );

    expect(seeded.map((entry) => [entry.teamName, entry.bracketSeed])).toEqual([
      ["Alpha", 1],
      ["Bravo", 4],
      ["Charlie", 2],
      ["Delta", 3],
    ]);
  });

  it("places teams into bracket slots based on seeding", () => {
    const slots = createBracketSlots(
      [
        { teamId: "team-1", teamName: "One", seedNumber: 1 },
        { teamId: "team-2", teamName: "Two", seedNumber: 2 },
        { teamId: "team-3", teamName: "Three", seedNumber: 3 },
        { teamId: "team-4", teamName: "Four", seedNumber: 4 },
      ],
      4,
    );

    expect(slots.map((entry) => entry?.teamName ?? null)).toEqual(["One", "Four", "Two", "Three"]);
  });

  it("auto assigns sequential seeds from registration order", () => {
    const seeded = assignSequentialSeeds([
      { teamId: "team-b", teamName: "Bravo", createdAt: "2026-04-01T11:00:00.000Z" },
      { teamId: "team-a", teamName: "Alpha", createdAt: "2026-04-01T10:00:00.000Z" },
      { teamId: "team-c", teamName: "Charlie", createdAt: "2026-04-01T12:00:00.000Z" },
    ]);

    expect(seeded.map((entry) => [entry.teamName, entry.seedNumber])).toEqual([
      ["Alpha", 1],
      ["Bravo", 2],
      ["Charlie", 3],
    ]);
  });

  it("uses team name as fallback when registration timestamps match", () => {
    const seeded = assignSequentialSeeds([
      { teamId: "team-z", teamName: "Zulu", createdAt: "2026-04-01T10:00:00.000Z" },
      { teamId: "team-a", teamName: "Alpha", createdAt: "2026-04-01T10:00:00.000Z" },
    ]);

    expect(seeded.map((entry) => [entry.teamName, entry.seedNumber])).toEqual([
      ["Alpha", 1],
      ["Zulu", 2],
    ]);
  });
});
