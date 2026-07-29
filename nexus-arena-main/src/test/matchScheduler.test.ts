import { describe, expect, it } from "vitest";
import { scheduleMatches } from "@/lib/matchScheduler";
import type { SchedulableMatch, SchedulerConfig } from "@/lib/matchScheduler";

function makeMatch(id: string, round: number, team1: string, team2: string): SchedulableMatch {
  return { id, roundNumber: round, team1Id: team1, team2Id: team2 };
}

function makeConfig(overrides?: Partial<SchedulerConfig>): SchedulerConfig {
  return {
    stationCount: 4,
    matchDurationMinutes: 30,
    restGapMinutes: 10,
    startTime: new Date("2026-06-15T10:00:00Z"),
    ...overrides,
  };
}

describe("matchScheduler", () => {
  it("schedules 4 round-1 matches concurrently on 4 stations", () => {
    const matches = [
      makeMatch("m1", 1, "A", "B"),
      makeMatch("m2", 1, "C", "D"),
      makeMatch("m3", 1, "E", "F"),
      makeMatch("m4", 1, "G", "H"),
    ];

    const result = scheduleMatches(matches, makeConfig({ stationCount: 4 }));

    // All 4 should start at the same time
    const startTimes = result.scheduledMatches.map((m) => m.scheduledAt.getTime());
    expect(new Set(startTimes).size).toBe(1);

    // Each on a different station
    const stations = result.scheduledMatches.map((m) => m.stationNumber);
    expect(new Set(stations).size).toBe(4);
  });

  it("respects station limit — 4 matches on 2 stations take 2 time slots", () => {
    const matches = [
      makeMatch("m1", 1, "A", "B"),
      makeMatch("m2", 1, "C", "D"),
      makeMatch("m3", 1, "E", "F"),
      makeMatch("m4", 1, "G", "H"),
    ];

    const result = scheduleMatches(matches, makeConfig({ stationCount: 2 }));

    const uniqueTimes = new Set(result.scheduledMatches.map((m) => m.scheduledAt.getTime()));
    expect(uniqueTimes.size).toBe(2); // 2 batches
  });

  it("single station means fully sequential", () => {
    const matches = [
      makeMatch("m1", 1, "A", "B"),
      makeMatch("m2", 1, "C", "D"),
      makeMatch("m3", 1, "E", "F"),
    ];

    const result = scheduleMatches(matches, makeConfig({ stationCount: 1 }));

    const times = result.scheduledMatches.map((m) => m.scheduledAt.getTime()).sort();
    // Each match should start 30 minutes after the previous
    expect(times[1] - times[0]).toBe(30 * 60_000);
    expect(times[2] - times[1]).toBe(30 * 60_000);
  });

  it("enforces rest gap — same team can't play back-to-back without gap", () => {
    // Team A plays in both matches of round 1
    // This shouldn't normally happen in brackets, but the scheduler must handle it
    const matches = [
      makeMatch("m1", 1, "A", "B"),
      makeMatch("m2", 1, "A", "C"), // Team A plays again
    ];

    const config = makeConfig({ stationCount: 2, restGapMinutes: 10 });
    const result = scheduleMatches(matches, config);

    const m1 = result.scheduledMatches.find((m) => m.id === "m1")!;
    const m2 = result.scheduledMatches.find((m) => m.id === "m2")!;

    // m2 must start after m1 ends + rest gap
    const gapMs = m2.scheduledAt.getTime() - m1.endTime.getTime();
    expect(gapMs).toBeGreaterThanOrEqual(10 * 60_000);
  });

  it("round 2 starts after round 1 completes", () => {
    const matches = [
      makeMatch("m1", 1, "A", "B"),
      makeMatch("m2", 1, "C", "D"),
      makeMatch("m3", 2, "winner1", "winner2"),
    ];

    const result = scheduleMatches(matches, makeConfig({ stationCount: 4 }));

    const r1Times = result.scheduledMatches
      .filter((m) => m.id === "m1" || m.id === "m2")
      .map((m) => m.endTime.getTime());
    const r2Start = result.scheduledMatches.find((m) => m.id === "m3")!.scheduledAt.getTime();

    // Round 2 must start after all round 1 matches end
    expect(r2Start).toBeGreaterThan(Math.max(...r1Times));
  });

  it("warns when schedule exceeds venue close time", () => {
    const matches = [
      makeMatch("m1", 1, "A", "B"),
      makeMatch("m2", 1, "C", "D"),
      makeMatch("m3", 2, "A", "C"),
    ];

    const result = scheduleMatches(matches, makeConfig({
      stationCount: 1,
      matchDurationMinutes: 60,
      endTime: new Date("2026-06-15T11:00:00Z"), // only 1 hour
    }));

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("venue close time");
  });

  it("handles empty match list", () => {
    const result = scheduleMatches([], makeConfig());
    expect(result.scheduledMatches).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("schedules 8-team single elimination correctly", () => {
    // Quarterfinals (round 1): 4 matches
    // Semifinals (round 2): 2 matches
    // Final (round 3): 1 match
    const matches = [
      makeMatch("qf1", 1, "T1", "T2"),
      makeMatch("qf2", 1, "T3", "T4"),
      makeMatch("qf3", 1, "T5", "T6"),
      makeMatch("qf4", 1, "T7", "T8"),
      makeMatch("sf1", 2, "W1", "W2"),
      makeMatch("sf2", 2, "W3", "W4"),
      makeMatch("f1", 3, "WS1", "WS2"),
    ];

    const result = scheduleMatches(matches, makeConfig({ stationCount: 4 }));

    expect(result.scheduledMatches).toHaveLength(7);

    // All QFs should be concurrent
    const qfTimes = result.scheduledMatches
      .filter((m) => m.id.startsWith("qf"))
      .map((m) => m.scheduledAt.getTime());
    expect(new Set(qfTimes).size).toBe(1);

    // Both SFs should be concurrent
    const sfTimes = result.scheduledMatches
      .filter((m) => m.id.startsWith("sf"))
      .map((m) => m.scheduledAt.getTime());
    expect(new Set(sfTimes).size).toBe(1);

    // SFs after QFs, Final after SFs
    expect(sfTimes[0]).toBeGreaterThan(qfTimes[0]);
    const finalTime = result.scheduledMatches.find((m) => m.id === "f1")!.scheduledAt.getTime();
    expect(finalTime).toBeGreaterThan(sfTimes[0]);
  });
});
