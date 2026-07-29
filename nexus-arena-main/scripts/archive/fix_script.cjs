const fs = require('fs');
let content = fs.readFileSync('src/lib/api.ts', 'utf-8');
content = content.replace(/\r\n/g, '\n');

const new_generateBracket = `
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
      throw new Error(\`Bracket generation blocked: \${readiness.issues.join(" ")}\`);
    }

    const isDoubleElim = (tournament as any).bracketType === "DOUBLE_ELIMINATION";

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
          round_label: isDoubleElim ? \`Upper R\${round}\` : createRoundLabel(round, totalRounds),
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
                    round_label: \`Lower R\${round}\`,
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
            round_label: \`Grand Finals\`,
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

    let createdMatches = ((insertedMatches ?? []) as SupabaseMatchRow[]);

    const upperMatches = createdMatches.filter(m => m.bracket_side === "UPPER" || m.bracket_side === null || m.bracket_side === undefined);
    for (const match of upperMatches.filter((item) => item.round_number === 1 && item.winner_team_id)) {
      const nextRound = (match.round_number ?? 1) + 1;
      const nextPosition = Math.ceil((match.position_in_round ?? 1) / 2);
      const slot = (match.position_in_round ?? 1) % 2 === 1 ? "team1" : "team2";
      await client
        .from("matches")
        .update({
          [\`\${slot}_id\`]: match.winner_team_id,
          [\`\${slot}_name\`]: match.winner_name,
        })
        .eq("tournament_id", tournamentId)
        .eq("round_number", nextRound)
        .eq("bracket_side", "UPPER")
        .eq("position_in_round", nextPosition);
    }

    const { data: finalMatches } = await client.from("matches").select("*").eq("tournament_id", tournamentId);
    return (finalMatches ?? []).map(mapMatch);
  },
`;

const startIdx = content.indexOf('  async generateBracket(tournamentId: string, actor: AppUserPayload) {');
const endFuncStr = 'async createMatchReport(';
const endIdx = content.indexOf(endFuncStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    content = content.slice(0, startIdx) + new_generateBracket.trim() + '\n\n  ' + content.slice(endIdx);
    fs.writeFileSync('src/lib/api.ts', content, 'utf-8');
    console.log('Replaced whole generateBracket');
} else {
    console.log('Could not find generateBracket or createMatchReport bounds');
}
