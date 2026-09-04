import type { SupabaseTeamRow, SupabaseTournamentRow } from "@/integrations/supabase/types";
import type { AppUserPayload, Team } from "./types";
import {
  assertTeamRosterUnlocked,
  ensureUser,
  generateUUID,
  getTeamsByCaptain,
  hydrateTeams,
  requireSupabase,
} from "./helpers";
import { broadcastService } from "@/services/broadcastService";

export const teamService = {
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

    const { data: existingEntry } = await client
      .from("tournament_entries")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (existingEntry) {
      throw new Error("This team is already registered for this tournament");
    }

    const { error } = await client.from("tournament_entries").insert({
      team_id: teamId,
      tournament_id: tournamentId,
      registration_status: "APPROVED",
      check_in_status: "NOT_OPEN",
      payment_status: tournamentRow.entry_fee > 0 ? "PENDING" : "PAID",
    });

    if (error) throw error;

    const { data: teamData } = await client.from("teams").select("name").eq("id", teamId).single();
    void broadcastService.notifyTournamentOrganizers(
      tournamentId,
      `<b>New Registration!</b>\n\nTeam <b>${teamData?.name || "Unknown"}</b> has registered for your tournament.`
    );
  },

  async deleteTournamentEntry(entryId: string) {
    const client = requireSupabase();
    const { error } = await client.from("tournament_entries").delete().eq("id", entryId);
    if (error) throw new Error(error.message ?? "Failed to delete tournament entry");
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

    const { error: memberError } = await client.from("team_members").insert({
      team_id: team.id,
      user_id: requester.id,
      role: "MEMBER",
    });

    if (memberError) {
      console.warn("Join team member insert warning/error:", memberError.message);
    }

    const [hydratedTeam] = await hydrateTeams(client, [team as SupabaseTeamRow]);

    const captain = hydratedTeam.members.find((m) => m.user.id === hydratedTeam.captainId);
    if (captain?.user.telegramChatId) {
      void broadcastService.sendTelegramNotification(
        captain.user.telegramChatId,
        `<b>New Teammate!</b>\n\n${requester.name} has joined <b>${hydratedTeam.name}</b> using your invite code. 🎮`
      );
    }

    if (requester.telegramChatId) {
      void broadcastService.sendTelegramNotification(
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
};
