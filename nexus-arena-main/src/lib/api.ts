import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
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
import {
  assertValidMatchScores,
  assertValidStatusTransition,
  assertValidTournamentConfiguration,
  getBracketReadiness,
  type TournamentValidationInput,
} from "@/lib/tournamentLifecycle";
import { assignSequentialSeeds, compareEntriesBySeed, createBracketSlots } from "@/lib/bracketSeeding";

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
}

export type AuditTargetType = "TOURNAMENT" | "MATCH" | "TEAM" | "ENTRY" | "SYSTEM";
export type AuditAction = 
  | "CREATE" | "UPDATE" | "DELETE" 
  | "UPDATE_STATUS" | "REPORT_RESULT" 
  | "GENERATE_BRACKET" | "CHECK_IN" | "LOCK_ROSTER";

async function auditLog(
  client: typeof supabase,
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

type TournamentMutationInput = Pick<
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
>;

const tournamentStatusMap: Record<ApiTournamentStatus, Tournament["displayStatus"]> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  REGISTRATION_OPEN: "Registration Open",
  REGISTRATION_CLOSED: "Registration Closed",
  CHECK_IN: "Check-In",
  LIVE: "Live",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

function withDisplayStatus(tournament: Tournament): Tournament {
  return {
    ...tournament,
    displayStatus: tournamentStatusMap[tournament.status] ?? "Published",
  };
}

function mapTournament(row: SupabaseTournamentRow, entryCount = 0, matchCount = 0): Tournament {
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
    registeredTeams: entryCount,
    _count: {
      entries: entryCount,
      matches: matchCount,
    },
  });
}

function mapMatch(row: SupabaseMatchRow): MatchReport {
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
  };
}

function mapTournamentEntry(row: SupabaseTournamentEntryRow, teamName: string): TournamentEntry {
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

function buildTournamentValidationInput(data: TournamentMutationInput): TournamentValidationInput {
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
  };
}

function mergeTournamentInput(base: Tournament, patch: Partial<TournamentMutationInput>): TournamentMutationInput {
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
  };
}

function createRoundLabel(roundNumber: number, totalRounds: number) {
  if (totalRounds === 1) return "Grand Final";
  if (roundNumber === totalRounds) return "Final";
  if (roundNumber === totalRounds - 1) return "Semifinal";
  if (roundNumber === totalRounds - 2) return "Quarterfinal";
  return `Round ${roundNumber}`;
}

function nextPowerOfTwo(value: number) {
  return 2 ** Math.ceil(Math.log2(Math.max(2, value)));
}

function mapTournamentPayload(data: Partial<TournamentMutationInput>) {
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
  
  // Explicitly map streamUrl to stream_url
  if (data.streamUrl !== undefined) {
    payload.stream_url = data.streamUrl;
  }
  
  console.log("Saving Tournament Payload:", payload);
  
  return payload;
}

async function ensureUser(client: ReturnType<typeof requireSupabase>, user: AppUserPayload) {
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

async function getTeamsByCaptain(client: ReturnType<typeof requireSupabase>, userId: string): Promise<Team[]> {
  const { data: teams, error: teamsError } = await client
    .from("teams")
    .select("*")
    .eq("captain_id", userId)
    .order("name", { ascending: true });

  if (teamsError) throw teamsError;
  if (!teams || teams.length === 0) return [];

  return hydrateTeams(client, teams);
}

async function hydrateTeams(client: ReturnType<typeof requireSupabase>, rows: SupabaseTeamRow[]): Promise<Team[]> {
  const teamIds = rows.map((row) => row.id);

  const { data: members, error: membersError } = await client.from("team_members").select("*").in("team_id", teamIds);
  if (membersError) throw membersError;

  const memberRows = (members ?? []) as SupabaseTeamMemberRow[];
  const userIds = [...new Set(memberRows.map((member) => member.user_id))];

  const { data: users, error: usersError } = await client.from("users").select("*").in("id", userIds);
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

async function attachTournamentCounts(
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

async function getTournamentById(client: ReturnType<typeof requireSupabase>, tournamentId: string): Promise<SupabaseTournamentRow> {
  const { data, error } = await client.from("tournaments").select("*, stream_url").eq("id", tournamentId).single();
  if (error) throw error;
  return data as SupabaseTournamentRow;
}

async function assertTeamRosterUnlocked(client: ReturnType<typeof requireSupabase>, teamId: string) {
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

export const api = {
  async getTournaments(organizerId?: string): Promise<Tournament[]> {
    const client = requireSupabase();

    let query = client.from("tournaments").select("*, stream_url").order("start_date", { ascending: true });
    if (organizerId) query = query.eq("organizer_id", organizerId);

    const { data, error } = await query;
    if (error) throw error;

    return attachTournamentCounts(client, (data ?? []) as SupabaseTournamentRow[]);
  },

  async getTournament(tournamentId: string): Promise<Tournament> {
    const client = requireSupabase();
    const row = await getTournamentById(client, tournamentId);
    const [mapped] = await attachTournamentCounts(client, [row]);
    return mapped;
  },

  async getLatestActiveTournament(): Promise<Tournament | null> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("tournaments")
      .select("*, stream_url")
      .in("status", ["LIVE", "PUBLISHED", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "CHECK_IN"])
      .order("start_date", { ascending: true })
      .limit(1);
    
    if (error || !data || data.length === 0) return null;
    const [mapped] = await attachTournamentCounts(client, data as SupabaseTournamentRow[]);
    return mapped;
  },

  async getTournamentStandings(tournamentId: string): Promise<{ teamName: string; wins: number; losses: number; points: number }[]> {
    const client = requireSupabase();
    
    // Fetch all entries for this tournament
    const { data: entries, error: entriesError } = await client
      .from("tournament_entries")
      .select("team_id, teams(name)")
      .eq("tournament_id", tournamentId);
      
    if (entriesError || !entries) return [];

    // Fetch all completed matches for this tournament
    const { data: matches, error: matchesError } = await client
      .from("matches")
      .select("winner_team_id, team1_id, team2_id")
      .eq("tournament_id", tournamentId)
      .eq("status", "COMPLETED");

    if (matchesError) return [];

    // Calculate wins/losses
    const standings = entries.map((entry: any) => {
      const teamId = entry.team_id;
      const teamName = entry.teams?.name || "Unknown Team";
      
      const teamMatches = (matches || []).filter(m => m.team1_id === teamId || m.team2_id === teamId);
      const wins = teamMatches.filter(m => m.winner_team_id === teamId).length;
      const losses = teamMatches.length - wins;
      
      return {
        teamName,
        wins,
        losses,
        points: wins * 3, // Standard 3 points for a win
      };
    });

    return standings.sort((a, b) => b.points - a.points || b.wins - a.wins);
  },

  async getTournamentMatches(tournamentId: string): Promise<MatchReport[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("scheduled_at", { ascending: true });

    if (error) throw error;
    return (data || []).map(mapMatch);
  },

  async getChatMessages(tournamentId: string): Promise<any[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("chat_messages")
      .select("*, users(name, role)")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw error;
    return (data || []).map(msg => ({
      id: msg.id,
      user: msg.users?.name || "Guest",
      badge: msg.badge || (msg.users?.role === 'ADMIN' ? 'ADMIN' : null),
      message: msg.message,
      time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: "👤",
    }));
  },

  async sendChatMessage(tournamentId: string, userId: string, message: string) {
    const client = requireSupabase();
    const { error } = await client.from("chat_messages").insert({
      tournament_id: tournamentId,
      user_id: userId,
      message,
    });
    if (error) throw error;
  },

  async getTournamentStreams(tournamentId: string): Promise<any[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("live_streams")
      .select("*")
      .eq("tournament_id", tournamentId);
    if (error) throw error;
    return data || [];
  },

  async updateTournamentStream(tournamentId: string, url: string) {
    const client = requireSupabase();
    
    // 1. Delete old primary stream if it exists
    await client.from("live_streams").delete().eq("tournament_id", tournamentId).eq("is_primary", true);
    
    // 2. Insert new primary stream
    if (url.trim()) {
      const platform = url.includes("twitch") ? "TWITCH" : "YOUTUBE";
      const { error } = await client.from("live_streams").insert({
        tournament_id: tournamentId,
        stream_url: url,
        platform,
        is_primary: true,
        title: "Main Broadcast"
      });
      if (error) throw error;
    }
  },

  subscribeToChat(tournamentId: string, callback: (payload: any) => void) {
    const client = requireSupabase();
    return client
      .channel(`chat:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        async (payload) => {
          // Fetch user info for the new message
          const { data: userData } = await client
            .from("users")
            .select("name, role")
            .eq("id", payload.new.user_id)
            .single();
            
          callback({
            id: payload.new.id,
            user: userData?.name || "Guest",
            badge: payload.new.badge || (userData?.role === 'ADMIN' ? 'ADMIN' : null),
            message: payload.new.message,
            time: new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            avatar: "👤",
          });
        }
      )
      .subscribe();
  },

  async getManagedTournaments(actor: AppUserPayload): Promise<Tournament[]> {
    const client = requireSupabase();
    await ensureUser(client, actor);

    if (actor.role === "ADMIN") {
      return api.getTournaments();
    }

    const [{ data: owned, error: ownedError }, { data: delegated, error: delegatedError }] = await Promise.all([
      client.from("tournaments").select("id").eq("organizer_id", actor.id),
      client.from("tournament_admins").select("tournament_id").eq("user_id", actor.id),
    ]);

    if (ownedError) throw ownedError;
    if (delegatedError) throw delegatedError;

    const managedIds = [
      ...new Set([
        ...((owned ?? []).map((item) => item.id) as string[]),
        ...((delegated ?? []).map((item) => item.tournament_id) as string[]),
      ]),
    ];

    if (managedIds.length === 0) return [];

    const { data: tournaments, error: tournamentsError } = await client
      .from("tournaments")
      .select("*")
      .in("id", managedIds)
      .order("start_date", { ascending: true });

    if (tournamentsError) throw tournamentsError;

    return attachTournamentCounts(client, (tournaments ?? []) as SupabaseTournamentRow[]);
  },

  async createTournament(data: TournamentMutationInput & { creator: AppUserPayload }) {
    const client = requireSupabase();
    await ensureUser(client, data.creator);
    assertValidTournamentConfiguration(buildTournamentValidationInput(data));

    const payload = {
      ...mapTournamentPayload(data),
      status: "DRAFT",
      organizer_id: data.creator.id,
    };

    const { data: created, error } = await client.from("tournaments").insert(payload).select("*").single();
    if (error) throw error;
    return mapTournament(created as SupabaseTournamentRow);
  },

  async updateTournament(
    tournamentId: string,
    data: Partial<TournamentMutationInput> & {
      actor: AppUserPayload;
    },
  ) {
    const client = requireSupabase();
    await ensureUser(client, data.actor);
    const currentRow = await getTournamentById(client, tournamentId);
    const merged = mergeTournamentInput(mapTournament(currentRow), data);
    assertValidTournamentConfiguration(buildTournamentValidationInput(merged));

    const payload = mapTournamentPayload(data);
    console.log("Updating Tournament with payload:", payload);

    const { data: updated, error } = await client
      .from("tournaments")
      .update(payload)
      .eq("id", tournamentId)
      .select("*, stream_url")
      .single();

    if (error) {
      console.error("Supabase Update Error:", error);
      throw error;
    }
    return mapTournament(updated as SupabaseTournamentRow);
  },

  async updateTournamentStatus(tournamentId: string, status: ApiTournamentStatus, actor: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, actor);
    const currentRow = await getTournamentById(client, tournamentId);
    assertValidStatusTransition(currentRow.status as ApiTournamentStatus, status);

    const { data: updated, error } = await client
      .from("tournaments")
      .update({
        status,
        published_at: status === "PUBLISHED" ? new Date().toISOString() : undefined,
      })
      .eq("id", tournamentId)
      .select("*")
      .single();

    if (error) throw error;
    
    await auditLog(client, actor.id, "TOURNAMENT", tournamentId, "UPDATE_STATUS", { old: currentRow.status, new: status });

    if (status === "REGISTRATION_CLOSED" || status === "CHECK_IN") {
      const { error: checkInError } = await client
        .from("tournament_entries")
        .update({ check_in_status: "PENDING" })
        .eq("tournament_id", tournamentId)
        .eq("check_in_status", "NOT_OPEN");
      if (checkInError) throw checkInError;
    }

    return mapTournament(updated as SupabaseTournamentRow);
  },

  async deleteTournament(tournamentId: string, actor: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, actor);

    const { error } = await client.from("tournaments").delete().eq("id", tournamentId);
    if (error) throw error;
  },

  async getTournamentAdmins(tournamentId: string): Promise<TournamentAdminAssignment[]> {
    const client = requireSupabase();
    const [{ data: tournament, error: tournamentError }, { data: admins, error: adminsError }] = await Promise.all([
      client.from("tournaments").select("organizer_id").eq("id", tournamentId).single(),
      client.from("tournament_admins").select("*").eq("tournament_id", tournamentId),
    ]);

    if (tournamentError) throw tournamentError;
    if (adminsError) throw adminsError;

    const delegatedRows = (admins ?? []) as Array<{ id: string; tournament_id: string; user_id: string; role: TournamentAdminRole }>;
    const userIds = [
      ...new Set([
        ...delegatedRows.map((row) => row.user_id),
        tournament.organizer_id as string | null,
      ].filter(Boolean) as string[]),
    ];

    const { data: users, error: usersError } = userIds.length > 0
      ? await client.from("users").select("id, name, email").in("id", userIds)
      : { data: [], error: null };
    if (usersError) throw usersError;

    const userMap = new Map((users ?? []).map((row) => [row.id, row]));
    const assignments = delegatedRows.map((row) => {
      const user = userMap.get(row.user_id);
      return {
        id: row.id,
        tournamentId: row.tournament_id,
        userId: row.user_id,
        role: row.role,
        userName: user?.name ?? row.user_id,
        userEmail: user?.email ?? null,
      };
    });

    if (tournament.organizer_id) {
      const organizer = userMap.get(tournament.organizer_id);
      assignments.unshift({
        id: `organizer-${tournament.organizer_id}`,
        tournamentId,
        userId: tournament.organizer_id,
        role: "OWNER",
        userName: organizer?.name ?? "Organizer",
        userEmail: organizer?.email ?? null,
      });
    }

    return assignments;
  },

  async addTournamentAdmin(
    tournamentId: string,
    userId: string,
    role: Exclude<TournamentAdminRole, "OWNER">,
    actor: AppUserPayload,
  ) {
    const client = requireSupabase();
    await ensureUser(client, actor);
    const tournament = await getTournamentById(client, tournamentId);

    if (actor.role !== "ADMIN" && tournament.organizer_id !== actor.id) {
      throw new Error("Only the organizer or a global admin can manage delegated tournament staff.");
    }

    const { data: targetUser, error: targetUserError } = await client.from("users").select("id").eq("id", userId).single();
    if (targetUserError || !targetUser) {
      throw new Error("Target user was not found. The user must sign up before being assigned.");
    }

    if (tournament.organizer_id === userId) {
      throw new Error("The organizer already owns this tournament.");
    }

    const { error } = await client.from("tournament_admins").upsert(
      {
        tournament_id: tournamentId,
        user_id: userId,
        role,
      },
      { onConflict: "tournament_id,user_id" },
    );

    if (error) throw error;
  },

  async removeTournamentAdmin(tournamentId: string, userId: string, actor: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, actor);
    const tournament = await getTournamentById(client, tournamentId);

    if (actor.role !== "ADMIN" && tournament.organizer_id !== actor.id) {
      throw new Error("Only the organizer or a global admin can manage delegated tournament staff.");
    }

    if (tournament.organizer_id === userId) {
      throw new Error("The tournament organizer cannot be removed.");
    }

    const { error } = await client
      .from("tournament_admins")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("user_id", userId);

    if (error) throw error;
  },

  async getTournamentEntries(tournamentId: string): Promise<TournamentEntry[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("tournament_entries")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const entries = (data ?? []) as SupabaseTournamentEntryRow[];
    if (entries.length === 0) return [];

    const { data: teams, error: teamsError } = await client
      .from("teams")
      .select("id, name")
      .in("id", [...new Set(entries.map((entry) => entry.team_id))]);
    if (teamsError) throw teamsError;

    const teamNameMap = new Map((teams ?? []).map((team) => [team.id, team.name as string]));
    return entries
      .map((entry) => mapTournamentEntry(entry, teamNameMap.get(entry.team_id) ?? "Unknown Team"))
      .sort(compareEntriesBySeed);
  },

  async getMyTournamentEntries(tournamentId: string, captainUserId: string): Promise<TournamentEntry[]> {
    const [entries, teams] = await Promise.all([
      api.getTournamentEntries(tournamentId),
      api.getMyTeams(captainUserId),
    ]);

    const myTeamIds = new Set(teams.map((team) => team.id));
    return entries.filter((entry) => myTeamIds.has(entry.teamId));
  },

  async getMyRegistrations(captainUserId: string): Promise<MyRegistration[]> {
    const client = requireSupabase();
    const teams = await api.getMyTeams(captainUserId);
    const myTeamIds = teams.map((team) => team.id);

    if (myTeamIds.length === 0) return [];

    const { data: entries, error: entriesError } = await client
      .from("tournament_entries")
      .select("*")
      .in("team_id", myTeamIds)
      .order("created_at", { ascending: false });

    if (entriesError) throw entriesError;

    const entryRows = (entries ?? []) as SupabaseTournamentEntryRow[];
    if (entryRows.length === 0) return [];

    const tournamentIds = [...new Set(entryRows.map((entry) => entry.tournament_id))];
    const { data: tournaments, error: tournamentsError } = await client
      .from("tournaments")
      .select("*")
      .in("id", tournamentIds);

    if (tournamentsError) throw tournamentsError;

    const mappedTournaments = await attachTournamentCounts(client, (tournaments ?? []) as SupabaseTournamentRow[]);
    const tournamentMap = new Map(mappedTournaments.map((tournament) => [tournament.id, tournament]));
    const teamMap = new Map(teams.map((team) => [team.id, team]));

    return entryRows
      .map((entry) => {
        const tournament = tournamentMap.get(entry.tournament_id);
        if (!tournament) return null;

        return {
          entry: mapTournamentEntry(entry, teamMap.get(entry.team_id)?.name ?? "Unknown Team"),
          tournament,
        };
      })
      .filter((registration): registration is MyRegistration => Boolean(registration))
      .sort((a, b) => new Date(a.tournament.startDate).getTime() - new Date(b.tournament.startDate).getTime());
  },

  async updateTournamentEntryCheckIn(entryId: string, status: TournamentEntryCheckInStatus): Promise<TournamentEntry> {
    const client = requireSupabase();
    const { data: updated, error } = await client
      .from("tournament_entries")
      .update({
        check_in_status: status,
        checked_in_at: status === "CHECKED_IN" ? new Date().toISOString() : null,
      })
      .eq("id", entryId)
      .select("*")
      .single();
    if (error) throw error;

    const row = updated as SupabaseTournamentEntryRow;
    
    // Notify Organizers if they checked in
    if (status === "CHECKED_IN") {
      const { data: entry } = await client
        .from("tournament_entries")
        .select("team_name, tournament_id")
        .eq("id", entryId)
        .single();
      
      if (entry) {
        void this.notifyTournamentOrganizers(
          entry.tournament_id,
          `✅ <b>Check-In Success!</b>\n\n<b>${entry.team_name}</b> has completed their check-in.`
        );
      }
    }

    const { data: team, error: teamError } = await client.from("teams").select("name").eq("id", row.team_id).single();
    if (teamError) throw teamError;

    return mapTournamentEntry(row, (team?.name as string) ?? "Unknown Team");
  },

  async updateTournamentEntrySeed(entryId: string, seedNumber: number | null): Promise<TournamentEntry> {
    const client = requireSupabase();
    const normalizedSeed = seedNumber == null ? null : Number(seedNumber);

    if (normalizedSeed != null && (!Number.isInteger(normalizedSeed) || normalizedSeed < 1)) {
      throw new Error("Seed number must be a positive whole number.");
    }

    const { data: currentEntry, error: currentEntryError } = await client
      .from("tournament_entries")
      .select("*")
      .eq("id", entryId)
      .single();
    if (currentEntryError) throw currentEntryError;

    const currentRow = currentEntry as SupabaseTournamentEntryRow;

    if (normalizedSeed != null) {
      const { data: conflicting, error: conflictError } = await client
        .from("tournament_entries")
        .select("id")
        .eq("tournament_id", currentRow.tournament_id)
        .eq("seed_number", normalizedSeed)
        .neq("id", entryId)
        .maybeSingle();
      if (conflictError) throw conflictError;
      if (conflicting) {
        throw new Error(`Seed ${normalizedSeed} is already assigned to another team in this tournament.`);
      }
    }

    const { data: updated, error } = await client
      .from("tournament_entries")
      .update({ seed_number: normalizedSeed })
      .eq("id", entryId)
      .select("*")
      .single();
    if (error) throw error;

    const row = updated as SupabaseTournamentEntryRow;
    const { data: team, error: teamError } = await client.from("teams").select("name").eq("id", row.team_id).single();
    if (teamError) throw teamError;

    return mapTournamentEntry(row, (team?.name as string) ?? "Unknown Team");
  },

  async autoAssignTournamentSeeds(
    tournamentId: string,
    actor: AppUserPayload,
    strategy: AutoSeedStrategy = "REGISTRATION_ORDER",
  ): Promise<TournamentEntry[]> {
    const client = requireSupabase();
    await ensureUser(client, actor);

    const tournament = await getTournamentById(client, tournamentId);
    const requireCheckIn = ["REGISTRATION_CLOSED", "CHECK_IN", "LIVE"].includes(tournament.status as string);
    const entries = await api.getTournamentEntries(tournamentId);

    const eligibleEntries = entries.filter((entry) => {
      const registrationEligible = !["REJECTED", "CANCELLED"].includes(entry.registrationStatus);
      const checkInEligible = !requireCheckIn || entry.checkInStatus === "CHECKED_IN";
      return registrationEligible && checkInEligible;
    });

    if (eligibleEntries.length < 2) {
      throw new Error("At least 2 eligible entries are required before automatic bracket assignment can run.");
    }

    const sourceEntries = eligibleEntries.map((entry) => ({
      id: entry.id,
      teamId: entry.teamId,
      teamName: entry.teamName,
      createdAt: entry.createdAt ?? null,
    }));

    const seededEntries = (() => {
      switch (strategy) {
        case "REGISTRATION_ORDER":
          return assignSequentialSeeds(sourceEntries);
        default:
          throw new Error(`Unsupported seeding strategy: ${strategy}`);
      }
    })();

    const seedByEntryId = new Map(seededEntries.map((entry) => [entry.id, entry.seedNumber]));
    const updateResponses = await Promise.all(
      entries.map((entry) =>
        client
          .from("tournament_entries")
          .update({
            seed_number: seedByEntryId.get(entry.id) ?? null,
          })
          .eq("id", entry.id),
      ),
    );
    const failedResponse = updateResponses.find((response) => response.error);
    if (failedResponse?.error) {
      throw failedResponse.error;
    }

    return api.getTournamentEntries(tournamentId);
  },

  async lockTournamentEntryRoster(entryId: string): Promise<TournamentEntry> {
    const client = requireSupabase();
    const { data: entry, error: entryError } = await client.from("tournament_entries").select("*").eq("id", entryId).single();
    if (entryError) throw entryError;

    const row = entry as SupabaseTournamentEntryRow;
    if ((row.check_in_status ?? "NOT_OPEN") !== "CHECKED_IN") {
      throw new Error("Only checked-in teams can have their roster locked.");
    }

    const { data: updated, error } = await client
      .from("tournament_entries")
      .update({ roster_locked_at: row.roster_locked_at ?? new Date().toISOString() })
      .eq("id", entryId)
      .select("*")
      .single();
    if (error) throw error;

    const updatedRow = updated as SupabaseTournamentEntryRow;
    const { data: team, error: teamError } = await client.from("teams").select("name").eq("id", updatedRow.team_id).single();
    if (teamError) throw teamError;

    return mapTournamentEntry(updatedRow, (team?.name as string) ?? "Unknown Team");
  },

  async resetBracket(tournamentId: string, actor: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, actor);

    // 1. Delete all matches for this tournament
    const { error: matchDeleteError } = await client
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId);
    if (matchDeleteError) throw new Error(`Failed to delete matches: ${matchDeleteError.message}`);

    // 2. Delete all tournament stages (this also deletes stage seeds via cascade)
    const { error: stageDeleteError } = await client
      .from("tournament_stages")
      .delete()
      .eq("tournament_id", tournamentId);
    if (stageDeleteError) throw new Error(`Failed to delete stages: ${stageDeleteError.message}`);

    return { success: true };
  },

async generateBracket(tournamentId: string, actor: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, actor);
    const tournament = await getTournamentById(client, tournamentId);

    const { data: existingMatches, error: matchesError } = await client
      .from("matches")
      .select("id")
      .eq("tournament_id", tournamentId)
      .limit(1);
    if (matchesError) throw matchesError;
    if ((existingMatches ?? []).length > 0) {
      throw new Error("Bracket already exists for this tournament");
    }

    const { data: entries, error: entriesError } = await client
      .from("tournament_entries")
      .select("team_id, created_at, check_in_status, roster_locked_at, seed_number")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });
    if (entriesError) throw entriesError;

    const entryRows = (entries ?? []) as Array<
      Pick<SupabaseTournamentEntryRow, "team_id" | "created_at" | "check_in_status" | "roster_locked_at" | "seed_number">
    >;

    const teamIds = entryRows.map((entry) => entry.team_id);
    const { data: teams, error: teamsError } = await client.from("teams").select("*").in("id", teamIds);
    if (teamsError) throw teamsError;
    const teamMap = new Map(((teams ?? []) as SupabaseTeamRow[]).map((team) => [team.id, team]));

    const requireCheckIn = ["REGISTRATION_CLOSED", "CHECK_IN", "LIVE"].includes(tournament.status as string);
    const readiness = getBracketReadiness(
      entryRows.map((entry) => ({
        teamId: entry.team_id,
        teamName: teamMap.get(entry.team_id)?.name ?? "Unknown Team",
        checkInStatus: entry.check_in_status,
        rosterLockedAt: entry.roster_locked_at,
      })),
      requireCheckIn,
    );
    if (!readiness.ready) {
      throw new Error(`Bracket generation blocked: ${readiness.issues.join(" ")}`);
    }

    const isDoubleElim = ((tournament as unknown as Record<string, unknown>).bracketType) === "DOUBLE_ELIMINATION";

    const { data: stage, error: stageError } = await client
      .from("tournament_stages")
      .insert({
        tournament_id: tournamentId,
        name: isDoubleElim ? "Double Elimination" : "Main Bracket",
        stage_order: 1,
        stage_type: "MAIN",
        format: isDoubleElim ? "DOUBLE_ELIMINATION" : "SINGLE_ELIMINATION",
        best_of: 1,
      })
      .select("*")
      .single();
    if (stageError) throw stageError;

    const eligibleEntries = entryRows
      .filter((entry) => !requireCheckIn || entry.check_in_status === "CHECKED_IN")
      .map((entry) => {
        const team = teamMap.get(entry.team_id);
        if (!team) return null;

        return {
          team,
          seedNumber: entry.seed_number ?? null,
          createdAt: entry.created_at ?? null,
        };
      })
      .filter((entry): entry is { team: SupabaseTeamRow; seedNumber: number | null; createdAt: string | null } => Boolean(entry));
    if (eligibleEntries.length < 2) {
      throw new Error("At least 2 eligible teams are required to generate a bracket");
    }

    const highestExplicitSeed = eligibleEntries.reduce((max, entry) => Math.max(max, entry.seedNumber ?? 0), 0);
    const bracketSize = Math.max(nextPowerOfTwo(eligibleEntries.length), nextPowerOfTwo(highestExplicitSeed || eligibleEntries.length));
    const totalRounds = Math.log2(bracketSize);
    const seededSlots = createBracketSlots(
      eligibleEntries.map((entry) => ({
        teamId: entry.team.id,
        teamName: entry.team.name,
        seedNumber: entry.seedNumber,
        createdAt: entry.createdAt,
      })),
      bracketSize,
    );
    const slots: Array<SupabaseTeamRow | null> = seededSlots.map((entry) => (entry ? teamMap.get(entry.teamId) ?? null : null));

    const stageSeedRows = seededSlots
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .map((entry) => ({
        stage_id: (stage as SupabaseTournamentStageRow).id,
        team_id: entry.teamId,
        seed_number: entry.bracketSeed,
      }));
    if (stageSeedRows.length > 0) {
      const { error: stageSeedError } = await client.from("tournament_stage_seeds").insert(stageSeedRows);
      if (stageSeedError) throw stageSeedError;
    }

    const matchesToInsert: Array<Record<string, string | number | null>> = [];
    
    // UPPER BRACKET
    for (let round = 1; round <= totalRounds; round += 1) {
      const matchesInRound = bracketSize / 2 ** round;
      for (let position = 1; position <= matchesInRound; position += 1) {
        const baseMatch = {
          tournament_id: tournamentId,
          stage_id: (stage as SupabaseTournamentStageRow).id,
          round_label: isDoubleElim ? `Upper R${round}` : createRoundLabel(round, totalRounds),
          round_number: round,
          position_in_round: position,
          bracket_side: "UPPER",
          best_of: 1,
          status: "SCHEDULED",
        };

        if (round === 1) {
          const team1 = slots[(position - 1) * 2];
          const team2 = slots[(position - 1) * 2 + 1];
          matchesToInsert.push({
            ...baseMatch,
            team1_id: team1?.id ?? null,
            team2_id: team2?.id ?? null,
            team1_name: team1?.name ?? "BYE",
            team2_name: team2?.name ?? "BYE",
            status: team1 && team2 ? "SCHEDULED" : "COMPLETED",
            winner_team_id: team1 && !team2 ? team1.id : !team1 && team2 ? team2.id : null,
            winner_name: team1 && !team2 ? team1.name : !team1 && team2 ? team2.name : null,
            loser_team_id: null,
            completed_at: team1 && !team2 ? new Date().toISOString() : !team1 && team2 ? new Date().toISOString() : null,
          });
        } else {
          matchesToInsert.push({
            ...baseMatch,
            team1_id: null,
            team2_id: null,
            team1_name: "TBD",
            team2_name: "TBD",
          });
        }
      }
    }

    if (isDoubleElim) {
        // LOWER BRACKET (2 * totalRounds - 2 rounds)
        const totalLowerRounds = Math.max(1, (totalRounds - 1) * 2);
        let currentMatchesInRound = bracketSize / 4; // R1
        
        for (let round = 1; round <= totalLowerRounds; round += 1) {
            for (let position = 1; position <= currentMatchesInRound; position += 1) {
                matchesToInsert.push({
                    tournament_id: tournamentId,
                    stage_id: (stage as SupabaseTournamentStageRow).id,
                    round_label: `Lower R${round}`,
                    round_number: round,
                    position_in_round: position,
                    bracket_side: "LOWER",
                    best_of: 1,
                    status: "SCHEDULED",
                    team1_id: null,
                    team2_id: null,
                    team1_name: "TBD",
                    team2_name: "TBD",
                });
            }
            if (round % 2 === 0) {
                currentMatchesInRound = Math.floor(currentMatchesInRound / 2);
            }
        }
        
        // GRAND FINALS
        matchesToInsert.push({
            tournament_id: tournamentId,
            stage_id: (stage as SupabaseTournamentStageRow).id,
            round_label: `Grand Finals`,
            round_number: 1,
            position_in_round: 1,
            bracket_side: "GRAND_FINAL",
            best_of: 1,
            status: "SCHEDULED",
            team1_id: null,
            team2_id: null,
            team1_name: "TBD",
            team2_name: "TBD"
        });
    }

    const { data: insertedMatches, error: insertError } = await client.from("matches").insert(matchesToInsert).select("*");
    if (insertError) throw insertError;

    const createdMatches = ((insertedMatches ?? []) as SupabaseMatchRow[]);

    const upperMatches = createdMatches.filter(m => m.bracket_side === "UPPER" || m.bracket_side === null || m.bracket_side === undefined);
    for (const match of upperMatches.filter((item) => item.round_number === 1 && item.winner_team_id)) {
      const nextRound = (match.round_number ?? 1) + 1;
      const nextPosition = Math.ceil((match.position_in_round ?? 1) / 2);
      const slot = (match.position_in_round ?? 1) % 2 === 1 ? "team1" : "team2";
      await client
        .from("matches")
        .update({
          [`${slot}_id`]: match.winner_team_id,
          [`${slot}_name`]: match.winner_name,
        })
        .eq("tournament_id", tournamentId)
        .eq("round_number", nextRound)
        .eq("bracket_side", "UPPER")
        .eq("position_in_round", nextPosition);
    }

    const { data: finalMatches } = await client.from("matches").select("*").eq("tournament_id", tournamentId);
    
    await auditLog(client, actor.id, "TOURNAMENT", tournamentId, "GENERATE_BRACKET", { matchCount: (finalMatches ?? []).length });

    return (finalMatches ?? []).map(mapMatch);
  },

  async createMatchReport(
    tournamentId: string,
    data: { roundLabel: string; team1Name: string; team2Name: string; scheduledAt?: string; actor: AppUserPayload },
  ) {
    const client = requireSupabase();
    await ensureUser(client, data.actor);

    const { data: created, error } = await client
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        round_label: data.roundLabel,
        team1_name: data.team1Name,
        team2_name: data.team2Name,
        scheduled_at: data.scheduledAt || null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapMatch(created as SupabaseMatchRow);
  },

  async reportMatchResult(
    tournamentId: string,
    matchId: string,
    data: { team1Score: number; team2Score: number; status?: string; actor: AppUserPayload },
  ) {
    const client = requireSupabase();
    await ensureUser(client, data.actor);
    // Only enforce no-tie rule on completion, not mid-game score updates
    if (data.status !== "IN_PROGRESS") {
      assertValidMatchScores(data.team1Score, data.team2Score);
    } else {
      // Still validate they are non-negative finite numbers
      if (!Number.isFinite(data.team1Score) || !Number.isFinite(data.team2Score)) {
        throw new Error("Match scores must be valid numbers.");
      }
      if (data.team1Score < 0 || data.team2Score < 0) {
        throw new Error("Match scores cannot be negative.");
      }
    }

    const { data: match, error: matchError } = await client
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .eq("tournament_id", tournamentId)
      .single();

    if (matchError) throw matchError;

    const row = match as SupabaseMatchRow;
    const isCompleting = (data.status ?? "COMPLETED") === "COMPLETED";

    const updatePayload: Record<string, any> = {
      team1_score: data.team1Score,
      team2_score: data.team2Score,
      status: data.status ?? "COMPLETED",
    };

    if (isCompleting) {
      updatePayload.winner_name = data.team1Score === data.team2Score ? null : data.team1Score > data.team2Score ? row.team1_name : row.team2_name;
      updatePayload.winner_team_id = data.team1Score === data.team2Score ? null : data.team1Score > data.team2Score ? row.team1_id ?? null : row.team2_id ?? null;
      updatePayload.loser_team_id = data.team1Score === data.team2Score ? null : data.team1Score > data.team2Score ? row.team2_id ?? null : row.team1_id ?? null;
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data: updated, error } = await client
      .from("matches")
      .update(updatePayload)
      .eq("id", matchId)
      .select("*")
      .single();

    if (error) throw error;

    await auditLog(client, data.actor.id, "MATCH", matchId, "REPORT_RESULT", {
      team1Score: data.team1Score,
      team2Score: data.team2Score,
      winner: updatePayload.winner_name ?? null
    });

    const updatedRow = updated as SupabaseMatchRow;

    if ((updatedRow.round_number ?? 0) > 0 && updatedRow.winner_team_id) {
        const isUpper = updatedRow.bracket_side === "UPPER" || updatedRow.bracket_side === null;
        const isLower = updatedRow.bracket_side === "LOWER";
        
        const targetSide = isLower ? "LOWER" : "UPPER";
        const nextRound = (updatedRow.round_number ?? 0) + 1;
        let nextPosition = Math.ceil((updatedRow.position_in_round ?? 1) / 2);
        let slot = (updatedRow.position_in_round ?? 1) % 2 === 1 ? "team1" : "team2";
        
        if (isLower) {
            if ((updatedRow.round_number ?? 1) % 2 === 1) {
                nextPosition = updatedRow.position_in_round ?? 1;
                slot = "team2";
            } else {
                nextPosition = Math.ceil((updatedRow.position_in_round ?? 1) / 2);
                slot = (updatedRow.position_in_round ?? 1) % 2 === 1 ? "team1" : "team2";
            }
        }

        const nextMatchPayload: Record<string, string | null> = {
            [`${slot}_id`]: updatedRow.winner_team_id,
            [`${slot}_name`]: updatedRow.winner_name,
        };

        const { data: nextMatch } = await client
            .from("matches")
            .select("*")
            .eq("tournament_id", tournamentId)
            .eq("bracket_side", targetSide)
            .eq("round_number", nextRound)
            .eq("position_in_round", nextPosition)
            .maybeSingle();

        if (nextMatch) {
            await client.from("matches").update(nextMatchPayload).eq("id", nextMatch.id);
        } else if (isUpper) {
            await client.from("matches").update({ team1_id: updatedRow.winner_team_id, team1_name: updatedRow.winner_name ?? "TBD" })
                .eq("tournament_id", tournamentId).eq("bracket_side", "GRAND_FINAL").eq("round_number", 1);
        } else if (isLower) {
            await client.from("matches").update({ team2_id: updatedRow.winner_team_id, team2_name: updatedRow.winner_name ?? "TBD" })
                .eq("tournament_id", tournamentId).eq("bracket_side", "GRAND_FINAL").eq("round_number", 1);
        }

        if (isUpper && updatedRow.loser_team_id) {
            const loserRound = (updatedRow.round_number ?? 1) === 1 ? 1 : ((updatedRow.round_number ?? 1) - 1) * 2;
            const dropSlot = "team1";
            const dropPos = updatedRow.position_in_round ?? 1;

            const { data: lowerTarget } = await client
                .from("matches")
                .select("*")
                .eq("tournament_id", tournamentId)
                .eq("bracket_side", "LOWER")
                .eq("round_number", loserRound)
                .eq("position_in_round", dropPos)
                .maybeSingle();
                
            if (lowerTarget) {
                await client.from("matches").update({
                    [`${dropSlot}_id`]: updatedRow.loser_team_id,
                    [`${dropSlot}_name`]: updatedRow.team1_id === updatedRow.loser_team_id ? updatedRow.team1_name : updatedRow.team2_name
                }).eq("id", lowerTarget.id);
            }
        }
    }
    return mapMatch(updatedRow);
  },

  async registerTeam(tournamentId: string, teamId: string, initiatorUserId: string) {
    const client = requireSupabase();

    const [{ data: tournament, error: tournamentError }, { data: team, error: teamError }] = await Promise.all([
      client.from("tournaments").select("*").eq("id", tournamentId).single(),
      client.from("teams").select("*").eq("id", teamId).single(),
    ]);

    if (tournamentError) throw tournamentError;
    if (teamError) throw teamError;

    const tournamentRow = tournament as SupabaseTournamentRow;
    const teamRow = team as SupabaseTeamRow;

    if (tournamentRow.status !== "REGISTRATION_OPEN") {
      throw new Error("Tournament is not open for registration");
    }

    if (teamRow.captain_id !== initiatorUserId) {
      throw new Error("Only the team captain can register for tournaments");
    }

    const { count, error: countError } = await client
      .from("tournament_entries")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);

    if (countError) throw countError;
    if ((count ?? 0) >= tournamentRow.max_teams) {
      throw new Error("Tournament is full");
    }

    const { error } = await client.from("tournament_entries").insert({
      team_id: teamId,
      tournament_id: tournamentId,
      registration_status: "APPROVED",
      check_in_status: "NOT_OPEN",
      payment_status: tournamentRow.entry_fee > 0 ? "PENDING" : "PAID",
    });

    if (error) throw error;

    // Notify Organizers
    const { data: teamData } = await client.from("teams").select("name").eq("id", teamId).single();
    void this.notifyTournamentOrganizers(
      tournamentId, 
      `<b>New Registration!</b>\n\nTeam <b>${teamData?.name || "Unknown"}</b> has registered for your tournament.`
    );
  },

  async getMyTeams(userId: string): Promise<Team[]> {
    const client = requireSupabase();
    return getTeamsByCaptain(client, userId);
  },

  async createTeam(data: { name: string; captain: AppUserPayload; logoUrl?: string }): Promise<Team> {
    const client = requireSupabase();
    await ensureUser(client, data.captain);

    const { data: created, error } = await client
      .from("teams")
      .insert({
        name: data.name,
        captain_id: data.captain.id,
        logo_url: data.logoUrl ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;

    const { error: memberError } = await client.from("team_members").insert({
      team_id: (created as SupabaseTeamRow).id,
      user_id: data.captain.id,
      role: "CAPTAIN",
    });

    if (memberError) throw memberError;

    const [team] = await hydrateTeams(client, [created as SupabaseTeamRow]);
    return team;
  },

  async updateTeam(teamId: string, data: { name?: string; logoUrl?: string; requester: AppUserPayload }): Promise<Team> {
    const client = requireSupabase();
    await ensureUser(client, data.requester);

    const payload: Record<string, string | null> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.logoUrl !== undefined) payload.logo_url = data.logoUrl ?? null;

    const { data: updated, error } = await client.from("teams").update(payload).eq("id", teamId).select("*").single();
    if (error) throw error;

    const [team] = await hydrateTeams(client, [updated as SupabaseTeamRow]);
    return team;
  },

  async addTeamMember(
    teamId: string,
    data: { memberName: string; memberRiotId?: string; userId?: string; requester: AppUserPayload },
  ): Promise<Team> {
    const client = requireSupabase();
    await ensureUser(client, data.requester);
    await assertTeamRosterUnlocked(client, teamId);

    const memberId = data.userId || generateUUID();
    
    try {
      await ensureUser(client, {
        id: memberId,
        name: data.memberName,
        role: "PLAYER",
        riotId: data.memberRiotId,
      });
    } catch (err) {
      // If we can't ensure user (e.g. RLS), we only continue if the user already exists
      console.warn("Could not ensure member user:", err);
      if (!data.userId) throw err; 
    }

    const { error } = await client.from("team_members").insert({
      team_id: teamId,
      user_id: memberId,
      role: "MEMBER",
    });

    if (error) throw error;

    const { data: team, error: teamError } = await client.from("teams").select("*").eq("id", teamId).single();
    if (teamError) throw teamError;

    const [hydratedTeam] = await hydrateTeams(client, [team as SupabaseTeamRow]);
    return hydratedTeam;
  },

  async removeTeamMember(teamId: string, userId: string, requester: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, requester);
    await assertTeamRosterUnlocked(client, teamId);

    const { error } = await client.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
    if (error) throw error;
  },

  async updateUserProfile(userId: string, data: any) {
    const client = requireSupabase();
    const { data: updated, error } = await client
      .from("users")
      .update(data)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  async joinTeamByCode(code: string, requester: AppUserPayload): Promise<Team> {
    const client = requireSupabase();
    await ensureUser(client, requester);

    const { data: team, error: teamError } = await client
      .from("teams")
      .select("*")
      .eq("invite_code", code.toUpperCase())
      .single();

    if (teamError) {
      console.error("Join by code error:", teamError);
      if (teamError.code === "PGRST116") throw new Error("Invalid or expired invite code.");
      throw new Error(`Database error: ${teamError.message}`);
    }
    if (!team) throw new Error("Invalid or expired invite code.");

    // Add requester as member
    const { error: memberError } = await client.from("team_members").insert({
      team_id: team.id,
      user_id: requester.id,
      role: "MEMBER",
    });

    const [hydratedTeam] = await hydrateTeams(client, [team as SupabaseTeamRow]);

    // Send Telegram Notifications
    const captain = hydratedTeam.members.find(m => m.user.id === hydratedTeam.captainId);
    if (captain?.user.telegramChatId) {
      void this.sendTelegramNotification(
        captain.user.telegramChatId,
        `<b>New Teammate!</b>\n\n${requester.name} has joined <b>${hydratedTeam.name}</b> using your invite code. 🎮`
      );
    }

    if (requester.telegramChatId) {
      void this.sendTelegramNotification(
        requester.telegramChatId,
        `<b>Squad Joined!</b>\n\nYou have successfully joined <b>${hydratedTeam.name}</b>. Good luck in the arena! 🚀`
      );
    }

    return hydratedTeam;
  },

  async getOrCreateInviteCode(teamId: string): Promise<string> {
    const client = requireSupabase();
    const { data: team } = await client.from("teams").select("invite_code").eq("id", teamId).single();
    
    if (team?.invite_code) return team.invite_code;

    const newCode = `NX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const { error: updateError } = await client.from("teams").update({ invite_code: newCode }).eq("id", teamId);
    if (updateError) {
      console.error("Failed to save invite code:", updateError);
      throw new Error(`Failed to generate invite code: ${updateError.message}`);
    }
    return newCode;
  },

  async sendTelegramNotification(chatId: string, message: string) {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn("Telegram Token missing. Skipping notification.");
      return;
    }

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      });
    } catch (err) {
      console.error("Telegram delivery failed:", err);
    }
  },

  async broadcastTournamentNotification(tournament: Tournament) {
    const client = requireSupabase();
    const { data: users, error } = await client
      .from("users")
      .select("telegram_chat_id")
      .not("telegram_chat_id", "is", null);

    if (error) {
      console.error("Failed to fetch users for broadcast:", error);
      return;
    }

    const baseUrl = window.location.origin;
    const tournamentUrl = `${baseUrl}/tournaments/${tournament.id}`;
    const message = `🏆 <b>New Tournament Alert!</b>\n\n<b>${tournament.title}</b> is now open for registration! Check it out and secure your spot.\n\n<a href="${tournamentUrl}">View Tournament Details</a>`;

    // Send to all users who have linked Telegram
    const notifications = users.map((u) => 
      this.sendTelegramNotification(u.telegram_chat_id, message)
    );

    await Promise.allSettled(notifications);
  },

  async notifyTournamentOrganizers(tournamentId: string, message: string) {
    const client = requireSupabase();
    try {
      // 1. Get all admins/staff for this tournament
      const { data: admins, error } = await client
        .from("tournament_admins")
        .select("user_id, users(telegram_chat_id)")
        .eq("tournament_id", tournamentId);

      if (error) throw error;

      // 2. Filter for those with Telegram linked
      const chatIds = admins
        .map((a: any) => {
          const userData = Array.isArray(a.users) ? a.users[0] : a.users;
          return userData?.telegram_chat_id;
        })
        .filter(Boolean);

      // 3. Also include the main tournament organizer (creator)
      const { data: tournament } = await client
        .from("tournaments")
        .select("organizer_id, users!organizer_id(telegram_chat_id)")
        .eq("id", tournamentId)
        .single();
      
      const organizerUser = Array.isArray(tournament?.users) ? tournament.users[0] : tournament?.users;
      if (organizerUser?.telegram_chat_id) {
        chatIds.push(organizerUser.telegram_chat_id);
      }

      // Remove duplicates
      const uniqueChatIds = [...new Set(chatIds)];

      // 4. Send notifications
      const notifications = uniqueChatIds.map(id => 
        this.sendTelegramNotification(id, `📢 <b>Organizer Alert</b>\n\n${message}`)
      );

      await Promise.allSettled(notifications);
    } catch (err) {
      console.error("Failed to notify organizers:", err);
    }
  },

  async searchUsers(query: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from("users")
      .select("id, name, email, riot_id, username")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,riot_id.ilike.%${query}%`)
      .limit(10);
    if (error) throw error;
    return data;
  },

  async registerSolo(
    tournamentId: string,
    userAuth: AppUserPayload & { email: string; phoneNumber: string }
  ) {
    const client = requireSupabase();

    const { data: tournament, error: tournamentError } = await client
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();
    if (tournamentError) throw tournamentError;

    if (tournament.status !== "REGISTRATION_OPEN") {
      throw new Error("Tournament is not open for registration");
    }

    const { count, error: countError } = await client
      .from("tournament_entries")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);
    if (countError) throw countError;
    if ((count ?? 0) >= tournament.max_teams) {
      throw new Error("Tournament is full");
    }

    // Check if phone number is already used in this tournament
    const { data: phoneCheckData, error: phoneCheckError } = await client
      .from("tournament_entries")
      .select("team_id, tournament_id")
      .eq("tournament_id", tournamentId);

    if (phoneCheckError) throw phoneCheckError;

    if (phoneCheckData && phoneCheckData.length > 0) {
      const teamIds = phoneCheckData.map((en) => en.team_id);
      const { data: membersCheck, error: membersError } = await client
        .from("team_members")
        .select("user_id")
        .in("team_id", teamIds);
      if (membersError) throw membersError;
      
      const userIds = membersCheck.map((m) => m.user_id);
      
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await client
          .from("users")
          .select("id, phone_number")
          .in("id", userIds)
          .eq("phone_number", userAuth.phoneNumber);
        
        if (usersError) throw usersError;
        if (usersData && usersData.length > 0) {
          throw new Error("This phone number has already been registered for this tournament.");
        }
      }
    }

    await ensureUser(client, userAuth);

    const { data: createdTeam, error: teamError } = await client
      .from("teams")
      .insert({
        name: `${userAuth.name} (Solo)`,
        captain_id: userAuth.id,
      })
      .select("*")
      .single();
    if (teamError) throw teamError;

    const { error: memberError } = await client.from("team_members").insert({
      team_id: createdTeam.id,
      user_id: userAuth.id,
      role: "CAPTAIN",
    });
    if (memberError) throw memberError;

    const { error: regError } = await client.from("tournament_entries").insert({
      team_id: createdTeam.id,
      tournament_id: tournamentId,
      registration_status: "APPROVED",
      check_in_status: "NOT_OPEN",
      payment_status: tournament.entry_fee > 0 ? "PENDING" : "PAID",
    });
    if (regError) throw regError;

    // Notify Organizers
    void this.notifyTournamentOrganizers(
      tournamentId, 
      `<b>New Registration!</b>\n\nPlayer <b>${userAuth.name}</b> has registered for your solo tournament.`
    );
  },

  async adminAddUsers(
    tournamentId: string,
    players: Array<{ name: string; email: string; phoneNumber: string }>,
    actor: AppUserPayload
  ) {
    const client = requireSupabase();
    await ensureUser(client, actor);

    const errors: string[] = [];
    const added: string[] = [];

    for (const player of players) {
      if (!player.name?.trim() || !player.email?.trim() || !player.phoneNumber?.trim()) {
        errors.push(`Skipped "${player.name || "unknown"}" — Name, Email, and Phone are all required.`);
        continue;
      }

      try {
        // 1. Look up existing user by email or phone
        const { data: existingUser } = await client
          .from("users")
          .select("id")
          .or(`email.eq.${player.email.trim()},phone_number.eq.${player.phoneNumber.trim()}`)
          .maybeSingle();

        // 2. Check for duplicate registration in this tournament
        if (existingUser) {
          const { data: existingTeams } = await client
            .from("teams")
            .select("id")
            .eq("captain_id", actor.id);

          if (existingTeams && existingTeams.length > 0) {
            const teamIds = existingTeams.map((t) => t.id);
            // Check if any team named after this player already in tournament
            const { data: existingEntry } = await client
              .from("tournament_entries")
              .select("id")
              .eq("tournament_id", tournamentId)
              .in("team_id", teamIds)
              .maybeSingle();

            if (existingEntry) {
              errors.push(`Skipped "${player.name}" — already registered.`);
              continue;
            }
          }
        }

        // 3. Create a valid UUID for the pseudo-user if they don't exist
        const playerUserId = existingUser?.id ?? 
          '00000000-0000-4000-8000-' + Math.floor(Math.random() * 1000000000000).toString(16).padStart(12, '0');

        if (!existingUser) {
          const { error: userErr } = await client.from("users").upsert(
            {
              id: playerUserId,
              name: player.name.trim(),
              email: player.email.trim(),
              phone_number: player.phoneNumber.trim(),
              role: "PLAYER",
            },
            { onConflict: "email" }
          );
          if (userErr) {
            console.warn("Could not upsert manual player user row:", userErr.message);
          }
        }

        // 4. Create the team owned by the ORGANIZER
        const { data: team, error: teamError } = await client
          .from("teams")
          .insert({
            name: `${player.name.trim()} (Manual)`,
            captain_id: actor.id,
          })
          .select("id")
          .single();
        if (teamError) throw new Error(`Team creation failed: ${teamError.message}`);

        // 5. Add the player as a member of this team
        await client.from("team_members").insert({
          team_id: team.id,
          user_id: playerUserId,
          role: "MEMBER",
        });

        // 6. Register the team for the tournament (bypass waitlist/status checks)
        const { error: entryError } = await client.from("tournament_entries").insert({
          team_id: team.id,
          tournament_id: tournamentId,
          registration_status: "APPROVED",
          check_in_status: "NOT_OPEN",
          payment_status: "PAID",
        });
        if (entryError) throw new Error(`Entry creation failed: ${entryError.message}`);

        added.push(player.name.trim());
      } catch (err) {
        errors.push(`Failed to add "${player.name}": ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    if (errors.length > 0 && added.length === 0) {
      throw new Error(errors.join("\n"));
    }
    if (errors.length > 0) {
      // Partial success — throw so UI shows the warnings
      throw new Error(`Added ${added.length} player(s). Issues:\n${errors.join("\n")}`);
    }
  },

  subscribeToMatches(tournamentId: string, onUpdate: () => void) {
    const client = requireSupabase();
    const channel = client
      .channel(`tournament-matches-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => onUpdate()
      )
      .subscribe();
    
    return channel;
  },

  subscribeToEntries(tournamentId: string, onUpdate: (entry: TournamentEntry) => void) {
    const client = requireSupabase();
    return client
      .channel(`tournament-entries-${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_entries",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        async (payload) => {
          if (payload.new) {
            const row = payload.new as SupabaseTournamentEntryRow;
            // Fetch team name for mapping
            const { data: team } = await client.from("teams").select("name").eq("id", row.team_id).single();
            onUpdate(mapTournamentEntry(row, (team?.name as string) ?? "Unknown Team"));
          }
        }
      )
      .subscribe();
  },
};
