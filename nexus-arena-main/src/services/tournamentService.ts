import type { SupabaseTournamentRow, SupabaseTournamentEntryRow } from "@/integrations/supabase/types";
import {
  assertValidStatusTransition,
  assertValidTournamentConfiguration,
} from "@/lib/tournamentLifecycle";
import { assignSequentialSeeds, compareEntriesBySeed } from "@/lib/bracketSeeding";
import type {
  ApiTournamentStatus,
  AppUserPayload,
  AutoSeedStrategy,
  MyRegistration,
  Tournament,
  TournamentAdminAssignment,
  TournamentAdminRole,
  TournamentEntry,
  TournamentEntryCheckInStatus,
  TournamentMutationInput,
} from "./types";
import {
  attachTournamentCounts,
  auditLog,
  buildTournamentValidationInput,
  ensureUser,
  getTournamentById,
  mapTournament,
  mapTournamentEntry,
  mapTournamentPayload,
  mergeTournamentInput,
  requireSupabase,
} from "./helpers";
import { broadcastService } from "@/services/broadcastService";
import { teamService } from "@/services/teamService";

export const tournamentService = {
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

    const { data: entries, error: entriesError } = await client
      .from("tournament_entries")
      .select("team_id, teams(name)")
      .eq("tournament_id", tournamentId);

    if (entriesError || !entries) return [];

    const { data: matches, error: matchesError } = await client
      .from("matches")
      .select("winner_team_id, team1_id, team2_id")
      .eq("tournament_id", tournamentId)
      .eq("status", "COMPLETED");

    if (matchesError) return [];

    const standings = entries.map((entry: any) => {
      const teamId = entry.team_id;
      const teamName = entry.teams?.name || "Unknown Team";

      const teamMatches = (matches || []).filter((m) => m.team1_id === teamId || m.team2_id === teamId);
      const wins = teamMatches.filter((m) => m.winner_team_id === teamId).length;
      const losses = teamMatches.length - wins;

      return {
        teamName,
        wins,
        losses,
        points: wins * 3,
      };
    });

    return standings.sort((a, b) => b.points - a.points || b.wins - a.wins);
  },

  async getManagedTournaments(actor: AppUserPayload): Promise<Tournament[]> {
    const client = requireSupabase();
    await ensureUser(client, actor);

    if (actor.role === "ADMIN") {
      return tournamentService.getTournaments();
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

    const { data: updated, error } = await client
      .from("tournaments")
      .update(payload)
      .eq("id", tournamentId)
      .select("*, stream_url")
      .single();

    if (error) throw error;
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
      tournamentService.getTournamentEntries(tournamentId),
      teamService.getMyTeams(captainUserId),
    ]);

    const myTeamIds = new Set(teams.map((team) => team.id));
    return entries.filter((entry) => myTeamIds.has(entry.teamId));
  },

  async getMyRegistrations(captainUserId: string): Promise<MyRegistration[]> {
    const client = requireSupabase();
    const teams = await teamService.getMyTeams(captainUserId);
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

    if (status === "CHECKED_IN") {
      const { data: entry } = await client
        .from("tournament_entries")
        .select("team_name, tournament_id")
        .eq("id", entryId)
        .single();

      if (entry) {
        void broadcastService.notifyTournamentOrganizers(
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
    const entries = await tournamentService.getTournamentEntries(tournamentId);

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

    return tournamentService.getTournamentEntries(tournamentId);
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

    void broadcastService.notifyTournamentOrganizers(
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
        const { data: existingUser } = await client
          .from("users")
          .select("id")
          .or(`email.eq.${player.email.trim()},phone_number.eq.${player.phoneNumber.trim()}`)
          .maybeSingle();

        if (existingUser) {
          const { data: userTeams } = await client
            .from("team_members")
            .select("team_id")
            .eq("user_id", existingUser.id);

          if (userTeams && userTeams.length > 0) {
            const teamIds = userTeams.map((t: any) => t.team_id);
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

        const { data: team, error: teamError } = await client
          .from("teams")
          .insert({
            name: player.name.trim(),
            captain_id: actor.id,
          })
          .select("id")
          .single();
        if (teamError) throw new Error(`Team creation failed: ${teamError.message}`);

        await client.from("team_members").insert({
          team_id: team.id,
          user_id: playerUserId,
          role: "MEMBER",
        });

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
      throw new Error(`Added ${added.length} player(s). Issues:\n${errors.join("\n")}`);
    }
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
            const { data: team } = await client.from("teams").select("name").eq("id", row.team_id).single();
            onUpdate(mapTournamentEntry(row, (team?.name as string) ?? "Unknown Team"));
          }
        }
      )
      .subscribe();
  },
};
