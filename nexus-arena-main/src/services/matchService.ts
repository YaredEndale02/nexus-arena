import type { SupabaseMatchRow, SupabaseTeamRow, SupabaseTournamentStageRow } from "@/integrations/supabase/types";
import { assertValidMatchScores } from "@/lib/tournamentLifecycle";
import { createBracketSlots } from "@/lib/bracketSeeding";
import type { AppUserPayload, MatchReport } from "./types";
import {
  auditLog,
  cleanName,
  createRoundLabel,
  ensureUser,
  getTournamentById,
  mapMatch,
  nextPowerOfTwo,
  requireSupabase,
} from "./helpers";

export const matchService = {
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

  async resetBracket(tournamentId: string, actor: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, actor);

    try {
      await client.from("chat_messages").delete().eq("tournament_id", tournamentId);
    } catch (e) {
      /* ignore */
    }

    const { error: matchDeleteError } = await client
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId);
    if (matchDeleteError) throw new Error(`Failed to delete matches: ${matchDeleteError.message}`);

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

    const entryRows = (entries ?? []);

    const uniqueEntryRows = Array.from(
      entryRows.reduce((map, entry) => {
        const existing = map.get(entry.team_id);
        if (!existing || (entry.seed_number && !existing.seed_number)) {
          map.set(entry.team_id, entry);
        }
        return map;
      }, new Map<string, (typeof entryRows)[0]>()).values()
    );

    const teamIds = uniqueEntryRows.map((entry) => entry.team_id);
    const { data: teams, error: teamsError } = await client.from("teams").select("*").in("id", teamIds);
    if (teamsError) throw teamsError;
    const teamMap = new Map(((teams ?? []) as SupabaseTeamRow[]).map((team) => [team.id, team]));

    const requireCheckIn = ["REGISTRATION_CLOSED", "CHECK_IN", "LIVE"].includes(tournament.status as string);

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

    const eligibleEntries = uniqueEntryRows
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

    const teamCount = eligibleEntries.length;
    const bracketSize = nextPowerOfTwo(teamCount);
    const totalRounds = Math.log2(bracketSize);

    const slots = createBracketSlots(
      eligibleEntries.map((e) => ({
        teamId: e.team.id,
        teamName: e.team.name,
        seedNumber: e.seedNumber,
        createdAt: e.createdAt,
      })),
      bracketSize
    );

    const matchGrid: Record<string, any> = {};

    for (let r = 1; r <= totalRounds; r++) {
      const matchCountInRound = bracketSize / Math.pow(2, r);
      for (let pos = 1; pos <= matchCountInRound; pos++) {
        matchGrid[`${r}-${pos}`] = {
          tournament_id: tournamentId,
          stage_id: (stage as SupabaseTournamentStageRow).id,
          round_label: createRoundLabel(r, totalRounds),
          round_number: r,
          position_in_round: pos,
          bracket_side: "UPPER",
          status: "SCHEDULED",
          team1_id: null,
          team1_name: "TBD",
          team2_id: null,
          team2_name: "TBD",
        };
      }
    }

    const r1ActiveMatches = new Set<string>();

    for (let i = 0; i < bracketSize; i += 2) {
      const pos = i / 2 + 1;
      const t1 = slots[i];
      const t2 = slots[i + 1];
      const matchKey = `1-${pos}`;
      const match = matchGrid[matchKey];

      if (t1 && t2) {
        match.team1_id = t1.teamId;
        match.team1_name = cleanName(t1.teamName);
        match.team2_id = t2.teamId;
        match.team2_name = cleanName(t2.teamName);
        r1ActiveMatches.add(matchKey);
      } else if (t1 || t2) {
        const winner = t1 || t2;
        const nextRound = 2;
        const nextPos = Math.ceil(pos / 2);
        const nextSlot = pos % 2 === 1 ? "team1" : "team2";
        const nextMatchKey = `${nextRound}-${nextPos}`;

        if (matchGrid[nextMatchKey]) {
          matchGrid[nextMatchKey][`${nextSlot}_id`] = winner?.teamId;
          matchGrid[nextMatchKey][`${nextSlot}_name`] = cleanName(winner?.teamName || "BYE");
        }
      }
    }

    const matchesToInsert: any[] = [];

    r1ActiveMatches.forEach((key) => {
      matchesToInsert.push(matchGrid[key]);
    });

    for (let r = 2; r <= totalRounds; r++) {
      const matchCountInRound = bracketSize / Math.pow(2, r);
      for (let pos = 1; pos <= matchCountInRound; pos++) {
        matchesToInsert.push(matchGrid[`${r}-${pos}`]);
      }
    }

    const { data: insertedMatches, error: insertError } = await client.from("matches").insert(matchesToInsert).select("*");
    if (insertError) throw insertError;

    const finalMatches = (insertedMatches ?? []) as SupabaseMatchRow[];

    await auditLog(client, actor.id, "TOURNAMENT", tournamentId, "GENERATE_BRACKET", { matchCount: finalMatches.length });

    return finalMatches.map(mapMatch);
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

    if (data.status !== "IN_PROGRESS") {
      assertValidMatchScores(data.team1Score, data.team2Score);
    } else {
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
      winner: updatePayload.winner_name ?? null,
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
            [`${dropSlot}_name`]: updatedRow.team1_id === updatedRow.loser_team_id ? updatedRow.team1_name : updatedRow.team2_name,
          }).eq("id", lowerTarget.id);
        }
      }
    }
    return mapMatch(updatedRow);
  },

  async updateMatchParticipants(
    matchId: string,
    data: { team1Id?: string | null; team2Id?: string | null; team1Name?: string; team2Name?: string }
  ) {
    const client = requireSupabase();
    const { error } = await client
      .from("matches")
      .update({
        team1_id: data.team1Id,
        team2_id: data.team2Id,
        team1_name: data.team1Name,
        team2_name: data.team2Name,
      })
      .eq("id", matchId);
    if (error) throw error;
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
};
