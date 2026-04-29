export type TournamentLifecycleStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "CHECK_IN"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED";

export interface TournamentValidationInput {
  title: string;
  gameTitle: string;
  startDate: string;
  registrationOpenAt?: string | null;
  registrationCloseAt?: string | null;
  maxTeams: number;
  minPlayersPerTeam: number;
  maxPlayersPerTeam?: number | null;
  entryFee: number;
  prizePool: number;
}

export interface BracketReadinessEntry {
  teamId: string;
  teamName: string;
  checkInStatus?: string | null;
  rosterLockedAt?: string | null;
}

const statusTransitions: Record<TournamentLifecycleStatus, TournamentLifecycleStatus[]> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["REGISTRATION_OPEN", "CANCELLED"],
  REGISTRATION_OPEN: ["REGISTRATION_CLOSED", "CANCELLED"],
  REGISTRATION_CLOSED: ["REGISTRATION_OPEN", "CHECK_IN", "LIVE", "CANCELLED"],
  CHECK_IN: ["REGISTRATION_OPEN", "LIVE", "CANCELLED"],
  LIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function getAllowedStatusTransitions(status: TournamentLifecycleStatus) {
  return statusTransitions[status];
}

export function assertValidStatusTransition(current: TournamentLifecycleStatus, next: TournamentLifecycleStatus) {
  if (current === next) return;
  if (statusTransitions[current].includes(next)) return;
  throw new Error(`Invalid status transition from ${current} to ${next}.`);
}

export function validateTournamentConfiguration(input: TournamentValidationInput) {
  const errors: string[] = [];
  const startDate = toDate(input.startDate);
  const registrationOpenAt = toDate(input.registrationOpenAt);
  const registrationCloseAt = toDate(input.registrationCloseAt);

  if (!input.title.trim()) errors.push("Tournament title is required.");
  if (!input.gameTitle.trim()) errors.push("Game title is required.");
  if (!startDate) errors.push("Start date is required and must be valid.");
  if (input.registrationOpenAt && !registrationOpenAt) errors.push("Registration open date is invalid.");
  if (input.registrationCloseAt && !registrationCloseAt) errors.push("Registration close date is invalid.");
  if (registrationOpenAt && registrationCloseAt && registrationOpenAt > registrationCloseAt) {
    errors.push("Registration open date cannot be after registration close date.");
  }
  if (startDate && registrationCloseAt && registrationCloseAt > startDate) {
    errors.push("Registration close date must be on or before the start date.");
  }
  if (input.maxTeams < 2) errors.push("Max teams must be at least 2.");
  if (input.minPlayersPerTeam < 1) errors.push("Min players per team must be at least 1.");
  if (input.maxPlayersPerTeam !== null && input.maxPlayersPerTeam !== undefined && input.maxPlayersPerTeam < input.minPlayersPerTeam) {
    errors.push("Max players per team must be greater than or equal to min players per team.");
  }
  if (input.entryFee < 0) errors.push("Entry fee cannot be negative.");
  if (input.prizePool < 0) errors.push("Prize pool cannot be negative.");

  return errors;
}

export function assertValidTournamentConfiguration(input: TournamentValidationInput) {
  const errors = validateTournamentConfiguration(input);
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

export function getBracketReadiness(entries: BracketReadinessEntry[], requireCheckIn: boolean) {
  const issues: string[] = [];
  const missingCheckIn = entries.filter((entry) => entry.checkInStatus !== "CHECKED_IN");
  const unlockedRosters = entries.filter((entry) => !entry.rosterLockedAt);

  if (entries.length < 2) issues.push("At least 2 registered teams are required.");
  if (requireCheckIn && missingCheckIn.length > 0) {
    issues.push(`Missing check-in for: ${missingCheckIn.map((entry) => entry.teamName).join(", ")}.`);
  }
  if (requireCheckIn && unlockedRosters.length > 0) {
    issues.push(`Roster not locked for: ${unlockedRosters.map((entry) => entry.teamName).join(", ")}.`);
  }

  return {
    ready: issues.length === 0,
    issues,
    missingCheckIn,
    unlockedRosters,
  };
}

export function assertValidMatchScores(team1Score: number, team2Score: number) {
  if (!Number.isFinite(team1Score) || !Number.isFinite(team2Score)) {
    throw new Error("Match scores must be valid numbers.");
  }
  if (team1Score < 0 || team2Score < 0) {
    throw new Error("Match scores cannot be negative.");
  }
  if (team1Score === team2Score) {
    throw new Error("Tied match results are not allowed.");
  }
}
