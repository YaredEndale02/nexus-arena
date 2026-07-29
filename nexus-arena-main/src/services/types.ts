import type {
  SupabaseMatchRow,
  SupabaseTeamMemberRow,
  SupabaseTeamRow,
  SupabaseTournamentStageRow,
  SupabaseTournamentEntryRow,
  SupabaseTournamentRow,
  SupabaseUserRow,
  TournamentFormat,
  TournamentType,
} from "@/integrations/supabase/types";

export type ApiTournamentStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "CHECK_IN"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED";

export interface AppUserPayload {
  id: string;
  name: string;
  role: "ADMIN" | "ORGANIZER" | "PLAYER";
  riotId?: string;
  email?: string;
  phoneNumber?: string;
  telegramChatId?: string;
}

export interface Tournament {
  id: string;
  title: string;
  gameTitle: string;
  format: TournamentFormat;
  tournamentType: TournamentType;
  bracketType: "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN" | "SWISS" | "GROUP_STAGE";
  rules?: string | null;
  startDate: string;
  registrationOpenAt?: string | null;
  registrationCloseAt?: string | null;
  maxTeams: number;
  minPlayersPerTeam: number;
  maxPlayersPerTeam?: number | null;
  entryFee: number;
  prizePool: number;
  waitlistEnabled: boolean;
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  status: ApiTournamentStatus;
  organizerId?: string | null;
  streamUrl?: string | null;
  stationCount?: number | null;
  matchDurationMinutes?: number | null;
  restGapMinutes?: number | null;
  gradient?: string;
  _count?: {
    entries: number;
    matches?: number;
  };
  registeredTeams?: number;
  displayStatus?:
    | "Draft"
    | "Published"
    | "Registration Open"
    | "Registration Closed"
    | "Check-In"
    | "Live"
    | "Completed"
    | "Cancelled";
}

export interface TeamMember {
  user: {
    id: string;
    name: string;
    riotId?: string;
    telegramChatId?: string;
  };
}

export interface Team {
  id: string;
  name: string;
  captainId: string;
  logoUrl?: string | null;
  members: TeamMember[];
}

export interface MatchReport {
  id: string;
  tournamentId: string;
  stageId?: string | null;
  roundLabel: string;
  roundNumber?: number | null;
  positionInRound?: number | null;
  bracketSide?: string | null;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  scheduledAt?: string | null;
  status: string;
  winnerName?: string | null;
  team1Id?: string | null;
  team2Id?: string | null;
}

export type AuditTargetType = "TOURNAMENT" | "MATCH" | "TEAM" | "ENTRY" | "SYSTEM";
export type AuditAction = 
  | "CREATE" | "UPDATE" | "DELETE" 
  | "UPDATE_STATUS" | "REPORT_RESULT" 
  | "GENERATE_BRACKET" | "CHECK_IN" | "LOCK_ROSTER";

export type TournamentAdminRole = "OWNER" | "ADMIN" | "REFEREE" | "STAFF";

export interface TournamentAdminAssignment {
  id: string;
  tournamentId: string;
  userId: string;
  role: TournamentAdminRole;
  userName: string;
  userEmail?: string | null;
}

export type TournamentEntryCheckInStatus = "NOT_OPEN" | "PENDING" | "CHECKED_IN" | "MISSED";
export type AutoSeedStrategy = "REGISTRATION_ORDER";

export interface TournamentEntry {
  id: string;
  tournamentId: string;
  teamId: string;
  teamName: string;
  seedNumber?: number | null;
  registrationStatus: string;
  paymentStatus: string;
  checkInStatus: TournamentEntryCheckInStatus;
  checkedInAt?: string | null;
  rosterLockedAt?: string | null;
  telegram_chat_id?: string | null;
  createdAt?: string | null;
}

export interface MyRegistration {
  entry: TournamentEntry;
  tournament: Tournament;
}

export type TournamentMutationInput = Pick<
  Tournament,
  | "title"
  | "gameTitle"
  | "format"
  | "tournamentType"
  | "bracketType"
  | "rules"
  | "startDate"
  | "registrationOpenAt"
  | "registrationCloseAt"
  | "maxTeams"
  | "minPlayersPerTeam"
  | "maxPlayersPerTeam"
  | "entryFee"
  | "prizePool"
  | "waitlistEnabled"
  | "visibility"
  | "streamUrl"
  | "stationCount"
  | "matchDurationMinutes"
  | "restGapMinutes"
>;
