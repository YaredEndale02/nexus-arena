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
}

export interface Tournament {
  id: string;
  title: string;
  gameTitle: string;
  format: TournamentFormat;
  tournamentType: TournamentType;
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
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  scheduledAt?: string | null;
  status: string;
  winnerName?: string | null;
}

type TournamentMutationInput = Pick<
  Tournament,
  | "title"
  | "gameTitle"
  | "format"
  | "tournamentType"
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
  return payload;
}

async function ensureUser(client: ReturnType<typeof requireSupabase>, user: AppUserPayload) {
  const payload: SupabaseUserRow = {
    id: user.id,
    name: user.name,
    role: user.role,
    riot_id: user.riotId ?? null,
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
          },
        };
      }),
  }));
}

export const api = {
  async getTournaments(organizerId?: string): Promise<Tournament[]> {
    const client = requireSupabase();

    let query = client.from("tournaments").select("*").order("start_date", { ascending: true });
    if (organizerId) query = query.eq("organizer_id", organizerId);

    const { data, error } = await query;
    if (error) throw error;

    const tournaments = (data ?? []) as SupabaseTournamentRow[];
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
  },

  async createTournament(data: TournamentMutationInput & { creator: AppUserPayload }) {
    const client = requireSupabase();
    await ensureUser(client, data.creator);

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

    const { data: updated, error } = await client
      .from("tournaments")
      .update(mapTournamentPayload(data))
      .eq("id", tournamentId)
      .select("*")
      .single();

    if (error) throw error;
    return mapTournament(updated as SupabaseTournamentRow);
  },

  async updateTournamentStatus(tournamentId: string, status: ApiTournamentStatus, actor: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, actor);

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
    return mapTournament(updated as SupabaseTournamentRow);
  },

  async deleteTournament(tournamentId: string, actor: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, actor);

    const { error } = await client.from("tournaments").delete().eq("id", tournamentId);
    if (error) throw error;
  },

  async getTournamentMatches(tournamentId: string): Promise<MatchReport[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("scheduled_at", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as SupabaseMatchRow[]).map(mapMatch);
  },

  async generateBracket(tournamentId: string, actor: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, actor);

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
      .select("team_id, created_at")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });
    if (entriesError) throw entriesError;

    const entryRows = (entries ?? []) as Array<Pick<SupabaseTournamentEntryRow, "team_id" | "created_at">>;
    if (entryRows.length < 2) {
      throw new Error("At least 2 registered teams are required to generate a bracket");
    }

    const teamIds = entryRows.map((entry) => entry.team_id);
    const { data: teams, error: teamsError } = await client.from("teams").select("*").in("id", teamIds);
    if (teamsError) throw teamsError;
    const teamMap = new Map(((teams ?? []) as SupabaseTeamRow[]).map((team) => [team.id, team]));

    const { data: stage, error: stageError } = await client
      .from("tournament_stages")
      .insert({
        tournament_id: tournamentId,
        name: "Main Bracket",
        stage_order: 1,
        stage_type: "MAIN",
        format: "SINGLE_ELIMINATION",
        best_of: 1,
      })
      .select("*")
      .single();
    if (stageError) throw stageError;

    const seededTeams = entryRows
      .map((entry) => teamMap.get(entry.team_id))
      .filter((team): team is SupabaseTeamRow => Boolean(team));

    const bracketSize = nextPowerOfTwo(seededTeams.length);
    const totalRounds = Math.log2(bracketSize);
    const slots: Array<SupabaseTeamRow | null> = [...seededTeams];
    while (slots.length < bracketSize) slots.push(null);

    const matchesToInsert: Array<Record<string, string | number | null>> = [];
    for (let round = 1; round <= totalRounds; round += 1) {
      const matchesInRound = bracketSize / 2 ** round;
      for (let position = 1; position <= matchesInRound; position += 1) {
        const baseMatch = {
          tournament_id: tournamentId,
          stage_id: (stage as SupabaseTournamentStageRow).id,
          round_label: createRoundLabel(round, totalRounds),
          round_number: round,
          position_in_round: position,
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

    const { data: insertedMatches, error: insertError } = await client.from("matches").insert(matchesToInsert).select("*");
    if (insertError) throw insertError;

    const createdMatches = ((insertedMatches ?? []) as SupabaseMatchRow[]).sort((a, b) => {
      if ((a.round_number ?? 0) !== (b.round_number ?? 0)) return (a.round_number ?? 0) - (b.round_number ?? 0);
      return (a.position_in_round ?? 0) - (b.position_in_round ?? 0);
    });

    // Auto-advance BYEs into round 2
    for (const match of createdMatches.filter((item) => item.round_number === 1 && item.winner_team_id)) {
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
        .eq("position_in_round", nextPosition);
    }

    return createdMatches.map(mapMatch);
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

    const { data: match, error: matchError } = await client
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .eq("tournament_id", tournamentId)
      .single();

    if (matchError) throw matchError;

    const row = match as SupabaseMatchRow;
    const winner_name =
      data.team1Score === data.team2Score ? null : data.team1Score > data.team2Score ? row.team1_name : row.team2_name;

    const { data: updated, error } = await client
      .from("matches")
      .update({
        team1_score: data.team1Score,
        team2_score: data.team2Score,
        status: data.status ?? "COMPLETED",
        winner_name,
        winner_team_id:
          data.team1Score === data.team2Score ? null : data.team1Score > data.team2Score ? row.team1_id ?? null : row.team2_id ?? null,
        loser_team_id:
          data.team1Score === data.team2Score ? null : data.team1Score > data.team2Score ? row.team2_id ?? null : row.team1_id ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select("*")
      .single();

    if (error) throw error;
    const updatedRow = updated as SupabaseMatchRow;

    if ((updatedRow.round_number ?? 0) > 0 && updatedRow.winner_team_id) {
      const nextRound = (updatedRow.round_number ?? 0) + 1;
      const nextPosition = Math.ceil((updatedRow.position_in_round ?? 1) / 2);
      const slot = (updatedRow.position_in_round ?? 1) % 2 === 1 ? "team1" : "team2";
      const nextMatchPayload: Record<string, string | null> = {
        [`${slot}_id`]: updatedRow.winner_team_id,
        [`${slot}_name`]: updatedRow.winner_name,
      };

      await client
        .from("matches")
        .update(nextMatchPayload)
        .eq("tournament_id", tournamentId)
        .eq("round_number", nextRound)
        .eq("position_in_round", nextPosition);
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
      payment_status: tournamentRow.entry_fee > 0 ? "PENDING" : "PAID",
    });

    if (error) throw error;
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
    data: { memberName: string; memberRiotId?: string; requester: AppUserPayload },
  ): Promise<Team> {
    const client = requireSupabase();
    await ensureUser(client, data.requester);

    const memberId = crypto.randomUUID();
    await ensureUser(client, {
      id: memberId,
      name: data.memberName,
      role: "PLAYER",
      riotId: data.memberRiotId,
    });

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

    const { error } = await client.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
    if (error) throw error;
  },
};
