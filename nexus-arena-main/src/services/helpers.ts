import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type {
  SupabaseMatchRow,
  SupabaseTeamMemberRow,
  SupabaseTeamRow,
  SupabaseTournamentEntryRow,
  SupabaseTournamentRow,
  SupabaseUserRow,
  TournamentFormat,
  TournamentType,
} from "@/integrations/supabase/types";
import type {
  ApiTournamentStatus,
  AppUserPayload,
  AuditAction,
  AuditTargetType,
  MatchReport,
  Team,
  Tournament,
  TournamentEntry,
  TournamentEntryCheckInStatus,
  TournamentMutationInput,
} from "./types";
import type { TournamentValidationInput } from "@/lib/tournamentLifecycle";

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const tournamentStatusMap: Record<ApiTournamentStatus, Tournament["displayStatus"]> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  REGISTRATION_OPEN: "Registration Open",
  REGISTRATION_CLOSED: "Registration Closed",
  CHECK_IN: "Check-In",
  LIVE: "Live",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

export function withDisplayStatus(tournament: Tournament): Tournament {
  return {
    ...tournament,
    displayStatus: tournamentStatusMap[tournament.status] ?? "Published",
  };
}

export function mapTournament(row: SupabaseTournamentRow, entryCount = 0, matchCount = 0): Tournament {
  return withDisplayStatus({
    id: row.id,
    title: row.title,
    gameTitle: row.game_title,
    format: (row.format as TournamentFormat) ?? "TEAM",
    bracketType: (row.bracket_type as Tournament["bracketType"]) ?? "SINGLE_ELIMINATION",
    tournamentType: (row.tournament_type as TournamentType) ?? "ONLINE",
    rules: row.rules ?? null,
    startDate: row.start_date,
    registrationOpenAt: row.registration_open_at ?? null,
    registrationCloseAt: row.registration_close_at ?? null,
    maxTeams: row.max_teams,
    minPlayersPerTeam: row.min_players_per_team ?? 1,
    maxPlayersPerTeam: row.max_players_per_team ?? null,
    entryFee: row.entry_fee,
    prizePool: row.prize_pool,
    waitlistEnabled: row.waitlist_enabled ?? false,
    visibility: (row.visibility as Tournament["visibility"]) ?? "PUBLIC",
    status: row.status as ApiTournamentStatus,
    organizerId: row.organizer_id,
    streamUrl: row.stream_url,
    stationCount: row.station_count ?? null,
    matchDurationMinutes: row.match_duration_minutes ?? null,
    restGapMinutes: row.rest_gap_minutes ?? null,
    registeredTeams: entryCount,
    _count: {
      entries: entryCount,
      matches: matchCount,
    },
  });
}

export function mapMatch(row: SupabaseMatchRow): MatchReport {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    stageId: row.stage_id ?? null,
    roundLabel: row.round_label,
    roundNumber: row.round_number ?? null,
    positionInRound: row.position_in_round ?? null,
    team1Name: row.team1_name,
    team2Name: row.team2_name,
    team1Score: row.team1_score,
    team2Score: row.team2_score,
    scheduledAt: row.scheduled_at,
    status: row.status,
    winnerName: row.winner_name,
    team1Id: row.team1_id ?? null,
    team2Id: row.team2_id ?? null,
  };
}

export function mapTournamentEntry(row: SupabaseTournamentEntryRow, teamName: string): TournamentEntry {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    teamId: row.team_id,
    teamName,
    seedNumber: row.seed_number ?? null,
    registrationStatus: row.registration_status ?? "PENDING",
    paymentStatus: row.payment_status,
    checkInStatus: (row.check_in_status as TournamentEntryCheckInStatus) ?? "NOT_OPEN",
    checkedInAt: row.checked_in_at ?? null,
    rosterLockedAt: row.roster_locked_at ?? null,
    createdAt: row.created_at ?? null,
  };
}

export function buildTournamentValidationInput(data: TournamentMutationInput): TournamentValidationInput {
  return {
    title: data.title,
    gameTitle: data.gameTitle,
    startDate: data.startDate,
    registrationOpenAt: data.registrationOpenAt ?? null,
    registrationCloseAt: data.registrationCloseAt ?? null,
    maxTeams: data.maxTeams,
    minPlayersPerTeam: data.minPlayersPerTeam,
    maxPlayersPerTeam: data.maxPlayersPerTeam ?? null,
    entryFee: data.entryFee,
    prizePool: data.prizePool,
    stationCount: data.stationCount ?? null,
    matchDurationMinutes: data.matchDurationMinutes ?? null,
    restGapMinutes: data.restGapMinutes ?? null,
    tournamentType: data.tournamentType ?? null,
    bracketType: data.bracketType ?? null,
  };
}

export function mergeTournamentInput(base: Tournament, patch: Partial<TournamentMutationInput>): TournamentMutationInput {
  return {
    title: patch.title ?? base.title,
    gameTitle: patch.gameTitle ?? base.gameTitle,
    format: patch.format ?? base.format,
    bracketType: patch.bracketType ?? base.bracketType,
    tournamentType: patch.tournamentType ?? base.tournamentType,
    rules: patch.rules !== undefined ? patch.rules : base.rules ?? null,
    startDate: patch.startDate ?? base.startDate,
    registrationOpenAt: patch.registrationOpenAt !== undefined ? patch.registrationOpenAt : base.registrationOpenAt ?? null,
    registrationCloseAt: patch.registrationCloseAt !== undefined ? patch.registrationCloseAt : base.registrationCloseAt ?? null,
    maxTeams: patch.maxTeams ?? base.maxTeams,
    minPlayersPerTeam: patch.minPlayersPerTeam ?? base.minPlayersPerTeam,
    maxPlayersPerTeam: patch.maxPlayersPerTeam !== undefined ? patch.maxPlayersPerTeam : base.maxPlayersPerTeam ?? null,
    entryFee: patch.entryFee ?? base.entryFee,
    prizePool: patch.prizePool ?? base.prizePool,
    waitlistEnabled: patch.waitlistEnabled ?? base.waitlistEnabled,
    visibility: patch.visibility ?? base.visibility,
    streamUrl: patch.streamUrl !== undefined ? patch.streamUrl : base.streamUrl ?? null,
    stationCount: patch.stationCount !== undefined ? patch.stationCount : base.stationCount ?? null,
    matchDurationMinutes: patch.matchDurationMinutes !== undefined ? patch.matchDurationMinutes : base.matchDurationMinutes ?? null,
    restGapMinutes: patch.restGapMinutes !== undefined ? patch.restGapMinutes : base.restGapMinutes ?? null,
  };
}

export function createRoundLabel(roundNumber: number, totalRounds: number) {
  if (totalRounds === 1) return "Grand Final";
  if (roundNumber === totalRounds) return "Final";
  if (roundNumber === totalRounds - 1) return "Semifinal";
  if (roundNumber === totalRounds - 2) return "Quarterfinal";
  return `Round ${roundNumber}`;
}

export function nextPowerOfTwo(value: number) {
  return 2 ** Math.ceil(Math.log2(Math.max(2, value)));
}

export function cleanName(name: string): string {
  if (!name) return "";
  return name.replace(/\s*\(Manual\)\s*/gi, "").trim();
}

export function mapTournamentPayload(data: Partial<TournamentMutationInput>) {
  const payload: Record<string, string | number | boolean | null> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.gameTitle !== undefined) payload.game_title = data.gameTitle;
  if (data.format !== undefined) payload.format = data.format;
  if (data.bracketType !== undefined) payload.bracket_type = data.bracketType;
  if (data.tournamentType !== undefined) payload.tournament_type = data.tournamentType;
  if (data.rules !== undefined) payload.rules = data.rules ?? null;
  if (data.startDate !== undefined) payload.start_date = data.startDate;
  if (data.registrationOpenAt !== undefined) payload.registration_open_at = data.registrationOpenAt ?? null;
  if (data.registrationCloseAt !== undefined) payload.registration_close_at = data.registrationCloseAt ?? null;
  if (data.maxTeams !== undefined) payload.max_teams = data.maxTeams;
  if (data.minPlayersPerTeam !== undefined) payload.min_players_per_team = data.minPlayersPerTeam;
  if (data.maxPlayersPerTeam !== undefined) payload.max_players_per_team = data.maxPlayersPerTeam ?? null;
  if (data.entryFee !== undefined) payload.entry_fee = data.entryFee;
  if (data.prizePool !== undefined) payload.prize_pool = data.prizePool;
  if (data.waitlistEnabled !== undefined) payload.waitlist_enabled = data.waitlistEnabled;
  if (data.visibility !== undefined) payload.visibility = data.visibility;

  if (data.streamUrl !== undefined) {
    payload.stream_url = data.streamUrl;
  }
  if (data.stationCount !== undefined) payload.station_count = data.stationCount ?? null;
  if (data.matchDurationMinutes !== undefined) payload.match_duration_minutes = data.matchDurationMinutes ?? null;
  if (data.restGapMinutes !== undefined) payload.rest_gap_minutes = data.restGapMinutes ?? null;

  return payload;
}

export async function auditLog(
  client: ReturnType<typeof requireSupabase>,
  actorId: string,
  targetType: AuditTargetType,
  targetId: string,
  action: AuditAction,
  metadata: Record<string, unknown> = {}
) {
  try {
    const { error } = await client.from("audit_logs").insert({
      actor_id: actorId,
      target_type: targetType,
      target_id: targetId,
      action,
      metadata,
    });
    if (error) console.error("Audit log failed:", error);
  } catch (err) {
    console.error("Audit log exception:", err);
  }
}

export async function ensureUser(client: ReturnType<typeof requireSupabase>, user: AppUserPayload) {
  const payload: SupabaseUserRow = {
    id: user.id,
    name: user.name,
    role: user.role,
    riot_id: user.riotId ?? null,
    ...(user.email ? { email: user.email } : {}),
    ...(user.phoneNumber ? { phone_number: user.phoneNumber } : {}),
    ...(user.telegramChatId ? { telegram_chat_id: user.telegramChatId } : {}),
  };

  const { error } = await client.from("users").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

export async function hydrateTeams(client: ReturnType<typeof requireSupabase>, rows: SupabaseTeamRow[]): Promise<Team[]> {
  const teamIds = rows.map((row) => row.id);
  if (teamIds.length === 0) return [];

  const { data: members, error: membersError } = await client.from("team_members").select("*").in("team_id", teamIds);
  if (membersError) throw membersError;

  const memberRows = (members ?? []) as SupabaseTeamMemberRow[];
  const userIds = [...new Set(memberRows.map((member) => member.user_id))];

  const { data: users, error: usersError } = userIds.length > 0
    ? await client.from("users").select("*").in("id", userIds)
    : { data: [], error: null };
  if (usersError) throw usersError;

  const userMap = new Map((users ?? []).map((user) => [user.id, user as SupabaseUserRow]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    captainId: row.captain_id,
    logoUrl: row.logo_url,
    members: memberRows
      .filter((member) => member.team_id === row.id)
      .map((member) => {
        const user = userMap.get(member.user_id);
        return {
          user: {
            id: member.user_id,
            name: user?.name ?? "Unnamed Player",
            riotId: user?.riot_id ?? undefined,
            telegramChatId: user?.telegram_chat_id ?? undefined,
          },
        };
      }),
  }));
}

export async function getTeamsByCaptain(client: ReturnType<typeof requireSupabase>, userId: string): Promise<Team[]> {
  const { data: teams, error: teamsError } = await client
    .from("teams")
    .select("*")
    .eq("captain_id", userId)
    .order("name", { ascending: true });

  if (teamsError) throw teamsError;
  if (!teams || teams.length === 0) return [];

  return hydrateTeams(client, teams);
}

export async function attachTournamentCounts(
  client: ReturnType<typeof requireSupabase>,
  tournaments: SupabaseTournamentRow[],
): Promise<Tournament[]> {
  if (tournaments.length === 0) return [];

  const tournamentIds = tournaments.map((tournament) => tournament.id);
  const [{ data: entries, error: entriesError }, { data: matches, error: matchesError }] = await Promise.all([
    client.from("tournament_entries").select("tournament_id").in("tournament_id", tournamentIds),
    client.from("matches").select("tournament_id").in("tournament_id", tournamentIds),
  ]);

  if (entriesError) throw entriesError;
  if (matchesError) throw matchesError;

  const entryCounts = new Map<string, number>();
  ((entries ?? []) as Array<Pick<SupabaseTournamentEntryRow, "tournament_id">>).forEach((entry) => {
    entryCounts.set(entry.tournament_id, (entryCounts.get(entry.tournament_id) ?? 0) + 1);
  });

  const matchCounts = new Map<string, number>();
  ((matches ?? []) as Array<Pick<SupabaseMatchRow, "tournament_id">>).forEach((match) => {
    matchCounts.set(match.tournament_id, (matchCounts.get(match.tournament_id) ?? 0) + 1);
  });

  return tournaments.map((tournament) =>
    mapTournament(tournament, entryCounts.get(tournament.id) ?? 0, matchCounts.get(tournament.id) ?? 0),
  );
}

export async function getTournamentById(client: ReturnType<typeof requireSupabase>, tournamentId: string): Promise<SupabaseTournamentRow> {
  const { data, error } = await client.from("tournaments").select("*, stream_url").eq("id", tournamentId).single();
  if (error) throw error;
  return data as SupabaseTournamentRow;
}

export async function assertTeamRosterUnlocked(client: ReturnType<typeof requireSupabase>, teamId: string) {
  const { data: lockedEntries, error: lockedEntriesError } = await client
    .from("tournament_entries")
    .select("tournament_id")
    .eq("team_id", teamId)
    .not("roster_locked_at", "is", null);

  if (lockedEntriesError) throw lockedEntriesError;

  const lockedTournamentIds = [...new Set((lockedEntries ?? []).map((entry) => entry.tournament_id))];
  if (lockedTournamentIds.length === 0) return;

  const { data: tournaments, error: tournamentsError } = await client
    .from("tournaments")
    .select("title, status")
    .in("id", lockedTournamentIds);

  if (tournamentsError) throw tournamentsError;

  const activeLocks = (tournaments ?? []).filter((tournament) => !["COMPLETED", "CANCELLED"].includes(tournament.status as string));
  if (activeLocks.length > 0) {
    throw new Error(`Roster is locked for active tournaments: ${activeLocks.map((item) => item.title).join(", ")}.`);
  }
}
