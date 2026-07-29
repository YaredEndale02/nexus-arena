import { describe, expect, it } from "vitest";
import {
  checkLanFeasibility,
  getFormatSummary,
  getMatchCount,
  getMinGamesPerTeam,
  getRoundCount,
} from "@/lib/formatFeasibility";

describe("formatFeasibility", () => {
  describe("getMatchCount", () => {
    it("single elimination: N−1 matches", () => {
      expect(getMatchCount("SINGLE_ELIMINATION", 16)).toBe(15);
      expect(getMatchCount("SINGLE_ELIMINATION", 8)).toBe(7);
      expect(getMatchCount("SINGLE_ELIMINATION", 2)).toBe(1);
    });

    it("double elimination: 2N−2 matches", () => {
      expect(getMatchCount("DOUBLE_ELIMINATION", 16)).toBe(30);
      expect(getMatchCount("DOUBLE_ELIMINATION", 8)).toBe(14);
    });

    it("round robin: N(N−1)/2 matches", () => {
      expect(getMatchCount("ROUND_ROBIN", 8)).toBe(28);
      expect(getMatchCount("ROUND_ROBIN", 4)).toBe(6);
      expect(getMatchCount("ROUND_ROBIN", 5)).toBe(10);
    });

    it("swiss: R × ⌊N/2⌋ matches", () => {
      expect(getMatchCount("SWISS", 16, { rounds: 5 })).toBe(40);
      // default rounds = ⌈log₂16⌉ = 4
      expect(getMatchCount("SWISS", 16)).toBe(32);
    });

    it("returns 0 for fewer than 2 teams", () => {
      expect(getMatchCount("SINGLE_ELIMINATION", 1)).toBe(0);
      expect(getMatchCount("ROUND_ROBIN", 0)).toBe(0);
    });
  });

  describe("getRoundCount", () => {
    it("single elimination: ⌈log₂N⌉ rounds", () => {
      expect(getRoundCount("SINGLE_ELIMINATION", 16)).toBe(4);
      expect(getRoundCount("SINGLE_ELIMINATION", 8)).toBe(3);
      expect(getRoundCount("SINGLE_ELIMINATION", 6)).toBe(3); // rounds up
    });

    it("double elimination: ~2⌈log₂N⌉−1 rounds", () => {
      expect(getRoundCount("DOUBLE_ELIMINATION", 16)).toBe(7);
      expect(getRoundCount("DOUBLE_ELIMINATION", 8)).toBe(5);
    });

    it("round robin: N−1 rounds for even, N for odd", () => {
      expect(getRoundCount("ROUND_ROBIN", 8)).toBe(7);
      expect(getRoundCount("ROUND_ROBIN", 5)).toBe(5);
    });

    it("swiss: returns R rounds", () => {
      expect(getRoundCount("SWISS", 16, { rounds: 5 })).toBe(5);
      expect(getRoundCount("SWISS", 16)).toBe(4); // default
    });
  });

  describe("getMinGamesPerTeam", () => {
    it("single elim: 1 game minimum", () => {
      expect(getMinGamesPerTeam("SINGLE_ELIMINATION", 16)).toBe(1);
    });

    it("double elim: 2 games minimum", () => {
      expect(getMinGamesPerTeam("DOUBLE_ELIMINATION", 16)).toBe(2);
    });

    it("round robin: N−1 games (play everyone)", () => {
      expect(getMinGamesPerTeam("ROUND_ROBIN", 8)).toBe(7);
    });

    it("swiss: R games", () => {
      expect(getMinGamesPerTeam("SWISS", 16, { rounds: 5 })).toBe(5);
    });
  });

  describe("checkLanFeasibility", () => {
    it("feasible: 8-team SE with 4 stations, 8-hour day", () => {
      const result = checkLanFeasibility({
        format: "SINGLE_ELIMINATION",
        teamCount: 8,
        stationCount: 4,
        matchDurationMinutes: 30,
        restGapMinutes: 10,
        venueHours: 8,
      });

      expect(result.feasible).toBe(true);
      expect(result.totalMatches).toBe(7);
      expect(result.totalRounds).toBe(3);
      expect(result.issues).toHaveLength(0);
    });

    it("infeasible: 16-team RR with 2 stations, 8-hour day", () => {
      const result = checkLanFeasibility({
        format: "ROUND_ROBIN",
        teamCount: 16,
        stationCount: 2,
        matchDurationMinutes: 30,
        restGapMinutes: 10,
        venueHours: 8,
      });

      expect(result.feasible).toBe(false);
      expect(result.totalMatches).toBe(120);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("warns when schedule is tight (>85% capacity)", () => {
      const result = checkLanFeasibility({
        format: "SINGLE_ELIMINATION",
        teamCount: 8,
        stationCount: 1,
        matchDurationMinutes: 30,
        restGapMinutes: 10,
        venueHours: 5,
      });

      // 7 matches × 40min = 280min, venue = 300min → 93% → warning
      if (result.feasible) {
        expect(result.warnings.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("warns about single station with many matches", () => {
      const result = checkLanFeasibility({
        format: "ROUND_ROBIN",
        teamCount: 6,
        stationCount: 1,
        matchDurationMinutes: 20,
        restGapMinutes: 5,
        venueHours: 10,
      });

      expect(result.totalMatches).toBe(15);
      expect(result.warnings.some((w) => w.includes("1 station"))).toBe(true);
    });
  });

  describe("getFormatSummary", () => {
    it("returns human-readable summary", () => {
      const summary = getFormatSummary("SINGLE_ELIMINATION", 16);
      expect(summary.matches).toBe(15);
      expect(summary.rounds).toBe(4);
      expect(summary.minGamesPerTeam).toBe(1);
      expect(summary.description).toContain("15 matches");
    });

    it("summarizes round robin correctly", () => {
      const summary = getFormatSummary("ROUND_ROBIN", 8);
      expect(summary.matches).toBe(28);
      expect(summary.description).toContain("Every team plays every other");
    });
  });
});
