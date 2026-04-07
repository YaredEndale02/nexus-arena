import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type {
  SupabaseMatchRow,
  SupabaseTeamMemberRow,
  SupabaseTeamRow,
  SupabaseTournamentEntryRow,
  SupabaseTournamentRow,
  SupabaseUserRow,
} from "@/integrations/supabase/types";

export type ApiTournamentStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
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
  startDate: string;
  maxTeams: number;
  entryFee: number;
  prizePool: number;
  status: ApiTournamentStatus;
  organizerId?: string | null;
  gradient?: string;
  _count?: {
    entries: number;
    matches?: number;
  };
  registeredTeams?: number;
  displayStatus?: "Registration Open" | "Upcoming" | "Live" | "Completed" | "Draft" | "Cancelled";
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
  roundLabel: string;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  scheduledAt?: string | null;
  status: string;
  winnerName?: string | null;
}

const tournamentStatusMap: Record<ApiTournamentStatus, Tournament["displayStatus"]> = {
  DRAFT: "Draft",
  REGISTRATION_OPEN: "Registration Open",
  REGISTRATION_CLOSED: "Upcoming",
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
    displayStatus: tournamentStatusMap[tournament.status] ?? "Upcoming",
  };
}

function mapTournament(row: SupabaseTournamentRow, entryCount = 0, matchCount = 0): Tournament {
  return withDisplayStatus({
    id: row.id,
    title: row.title,
    gameTitle: row.game_title,
    startDate: row.start_date,
    maxTeams: row.max_teams,
    entryFee: row.entry_fee,
    prizePool: row.prize_pool,
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
    roundLabel: row.round_label,
    team1Name: row.team1_name,
    team2Name: row.team2_name,
    team1Score: row.team1_score,
    team2Score: row.team2_score,
    scheduledAt: row.scheduled_at,
    status: row.status,
    winnerName: row.winner_name,
  };
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

  const { data: members, error: membersError } = await client
    .from("team_members")
    .select("*")
    .in("team_id", teamIds);

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
    if (organizerId) {
      query = query.eq("organizer_id", organizerId);
    }

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
      mapTournament(
        tournament,
        entryCounts.get(tournament.id) ?? 0,
        matchCounts.get(tournament.id) ?? 0,
      ),
    );
  },

  async createTournament(
    data: Pick<Tournament, "title" | "gameTitle" | "startDate" | "maxTeams" | "entryFee" | "prizePool"> & {
      creator: AppUserPayload;
    },
  ) {
    const client = requireSupabase();
    await ensureUser(client, data.creator);

    const payload = {
      title: data.title,
      game_title: data.gameTitle,
      start_date: data.startDate,
      max_teams: data.maxTeams,
      entry_fee: data.entryFee,
      prize_pool: data.prizePool,
      status: "DRAFT",
      organizer_id: data.creator.id,
    };

    const { data: created, error } = await client.from("tournaments").insert(payload).select("*").single();
    if (error) throw error;
    return mapTournament(created as SupabaseTournamentRow);
  },

  async updateTournament(
    tournamentId: string,
    data: Partial<Pick<Tournament, "title" | "gameTitle" | "startDate" | "maxTeams" | "entryFee" | "prizePool">> & {
      actor: AppUserPayload;
    },
  ) {
    const client = requireSupabase();
    await ensureUser(client, data.actor);

    const updatePayload: Record<string, string | number> = {};
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.gameTitle !== undefined) updatePayload.game_title = data.gameTitle;
    if (data.startDate !== undefined) updatePayload.start_date = data.startDate;
    if (data.maxTeams !== undefined) updatePayload.max_teams = data.maxTeams;
    if (data.entryFee !== undefined) updatePayload.entry_fee = data.entryFee;
    if (data.prizePool !== undefined) updatePayload.prize_pool = data.prizePool;

    const { data: updated, error } = await client
      .from("tournaments")
      .update(updatePayload)
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
      .update({ status })
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
      data.team1Score === data.team2Score
        ? null
        : data.team1Score > data.team2Score
          ? row.team1_name
          : row.team2_name;

    const { data: updated, error } = await client
      .from("matches")
      .update({
        team1_score: data.team1Score,
        team2_score: data.team2Score,
        status: data.status ?? "COMPLETED",
        winner_name,
      })
      .eq("id", matchId)
      .select("*")
      .single();

    if (error) throw error;
    return mapMatch(updated as SupabaseMatchRow);
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

    const { data: updated, error } = await client
      .from("teams")
      .update(payload)
      .eq("id", teamId)
      .select("*")
      .single();

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

    const { error } = await client
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId);

    if (error) throw error;
  },
};
