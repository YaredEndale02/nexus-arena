import { describe, expect, it } from "vitest";
import {
  assertValidMatchScores,
  assertValidStatusTransition,
  getAllowedStatusTransitions,
  getBracketReadiness,
  validateTournamentConfiguration,
} from "@/lib/tournamentLifecycle";

describe("tournamentLifecycle", () => {
  it("validates allowed status transitions", () => {
    expect(getAllowedStatusTransitions("DRAFT")).toEqual(["PUBLISHED", "CANCELLED"]);
    expect(() => assertValidStatusTransition("DRAFT", "PUBLISHED")).not.toThrow();
    expect(() => assertValidStatusTransition("REGISTRATION_OPEN", "LIVE")).toThrow();
  });

  it("validates tournament configuration", () => {
    const errors = validateTournamentConfiguration({
      title: "Arena Cup",
      gameTitle: "Valorant",
      startDate: "2026-04-20T10:00:00.000Z",
      registrationOpenAt: "2026-04-10T10:00:00.000Z",
      registrationCloseAt: "2026-04-18T10:00:00.000Z",
      maxTeams: 16,
      minPlayersPerTeam: 5,
      maxPlayersPerTeam: 5,
      entryFee: 10,
      prizePool: 1000,
    });

    expect(errors).toHaveLength(0);

    const invalidErrors = validateTournamentConfiguration({
      title: "",
      gameTitle: "",
      startDate: "invalid",
      registrationOpenAt: "2026-04-20T10:00:00.000Z",
      registrationCloseAt: "2026-04-18T10:00:00.000Z",
      maxTeams: 1,
      minPlayersPerTeam: 5,
      maxPlayersPerTeam: 4,
      entryFee: -1,
      prizePool: -10,
    });

    expect(invalidErrors.length).toBeGreaterThan(0);
  });

  it("checks bracket readiness for check-in and roster lock", () => {
    const ready = getBracketReadiness(
      [
        { teamId: "1", teamName: "Alpha", checkInStatus: "CHECKED_IN", rosterLockedAt: "2026-04-10T10:00:00.000Z" },
        { teamId: "2", teamName: "Beta", checkInStatus: "CHECKED_IN", rosterLockedAt: "2026-04-10T10:00:00.000Z" },
      ],
      true,
    );

    expect(ready.ready).toBe(true);

    const blocked = getBracketReadiness(
      [
        { teamId: "1", teamName: "Alpha", checkInStatus: "CHECKED_IN", rosterLockedAt: "2026-04-10T10:00:00.000Z" },
        { teamId: "2", teamName: "Beta", checkInStatus: "PENDING", rosterLockedAt: null },
      ],
      true,
    );

    expect(blocked.ready).toBe(false);
    expect(blocked.issues.join(" ")).toContain("Missing check-in");
    expect(blocked.issues.join(" ")).toContain("Roster not locked");

    const partialReady = getBracketReadiness(
      [
        { teamId: "1", teamName: "Alpha", checkInStatus: "CHECKED_IN", rosterLockedAt: "2026-04-10T10:00:00.000Z" },
        { teamId: "2", teamName: "Beta", checkInStatus: "CHECKED_IN", rosterLockedAt: "2026-04-10T10:00:00.000Z" },
        { teamId: "3", teamName: "Gamma", checkInStatus: "PENDING", rosterLockedAt: null },
      ],
      true,
    );
    expect(partialReady.ready).toBe(true);
    expect(partialReady.canGenerateCheckedIn).toBe(true);
    expect(partialReady.fullyCheckedIn).toBe(false);
    expect(partialReady.warnings.join(" ")).toContain("Gamma");
  });

  it("rejects tied or negative scores", () => {
    expect(() => assertValidMatchScores(2, 1)).not.toThrow();
    expect(() => assertValidMatchScores(1, 1)).toThrow();
    expect(() => assertValidMatchScores(-1, 0)).toThrow();
  });
});
