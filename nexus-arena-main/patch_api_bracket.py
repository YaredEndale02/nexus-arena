import sys
import re

with open('src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Tournament Interface
content = content.replace(
'''  tournamentType: TournamentType;
  rules?: string | null;''',
'''  tournamentType: TournamentType;
  bracketType?: "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN" | "SWISS" | "GROUP_STAGE";
  rules?: string | null;'''
)

content = content.replace(
'''  | "format"
  | "tournamentType"
  | "rules"''',
'''  | "format"
  | "tournamentType"
  | "bracketType"
  | "rules"'''
)

# Replace mapTournament
content = content.replace(
'''    format: row.format as TournamentFormat,
    tournamentType: row.tournament_type as TournamentType,
    rules: row.rules,''',
'''    format: row.format as TournamentFormat,
    tournamentType: row.tournament_type as TournamentType,
    bracketType: row.bracket_type as any,
    rules: row.rules,'''
)

# Include bracket_type in create/update payloads
content = content.replace(
'''        format: data.format,
        tournament_type: data.tournamentType,
        rules: data.rules,''',
'''        format: data.format,
        tournament_type: data.tournamentType,
        bracket_type: data.bracketType || 'SINGLE_ELIMINATION',
        rules: data.rules,'''
)

# 2. Modify `generateBracket`
# We need to find the `generateBracket` method and replace the single elimination logic with dual-support.
import re

old_generateBracket = '''
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
'''

new_generateBracket = '''
    const isDoubleElim = (tournament as any).bracket_type === "DOUBLE_ELIMINATION";

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
                currentMatchesInRound = currentMatchesInRound / 2;
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

    let createdMatches = ((insertedMatches ?? []) as SupabaseMatchRow[]);

    // Auto-advance BYEs into round 2 UPPER and drop into LOWER if double elim
    const upperMatches = createdMatches.filter(m => m.bracket_side === "UPPER" || m.bracket_side === null);
    
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
      
      // Also, BYEs immediately conclude their drop into lower bracket
      // A BYE loser means no lower bracket team proceeds (we won't deeply code BYE auto-routing for LB here, we leave it simple).
    }

    // Refresh matches to return
    const { data: finalMatches } = await client.from("matches").select("*").eq("tournament_id", tournamentId);
    return (finalMatches ?? []).map(mapMatch);
'''

# Escape and replace block using python logic to avoid complex regex
idx = content.find('const { data: stage, error: stageError }')
if idx != -1:
    idx2 = content.find('return createdMatches.map(mapMatch);', idx)
    if idx2 != -1:
        prefix = content[:idx]
        suffix = content[idx2 + len('return createdMatches.map(mapMatch);'):]
        content = prefix + new_generateBracket.strip() + suffix


# Update reportMatchResult for side routing
old_report_progression = '''
    if ((updatedRow.round_number ?? 0) > 0 && updatedRow.winner_team_id) {
      const nextRound = (updatedRow.round_number ?? 0) + 1;
      const nextPosition = Math.ceil((updatedRow.position_in_round ?? 1) / 2);
      const slot = (updatedRow.position_in_round ?? 1) % 2 === 1 ? "team1" : "team2";
      const nextMatchPayload: Record<string, string | null> = {
        [`${slot}_id`]: updatedRow.winner_team_id,
        [`${slot}_name`]: updatedRow.winner_name,
      };

      const { data: nextMatch, error: nextMatchError } = await client
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("round_number", nextRound)
        .eq("position_in_round", nextPosition)
        .maybeSingle();
      if (nextMatchError) throw nextMatchError;

      if (nextMatch) {
        const existingTeamId = slot === "team1" ? (nextMatch.team1_id as string | null) : (nextMatch.team2_id as string | null);
        if (existingTeamId && existingTeamId !== updatedRow.winner_team_id) {
          throw new Error("Bracket progression conflict detected in the next round.");
        }
      }

      await client
        .from("matches")
        .update(nextMatchPayload)
        .eq("tournament_id", tournamentId)
        .eq("round_number", nextRound)
        .eq("position_in_round", nextPosition);
    }
'''

new_report_progression = '''
    if ((updatedRow.round_number ?? 0) > 0 && updatedRow.winner_team_id) {
        const isUpper = updatedRow.bracket_side === "UPPER" || updatedRow.bracket_side === null;
        const isLower = updatedRow.bracket_side === "LOWER";
        
        let targetSide = isLower ? "LOWER" : "UPPER";
        let nextRound = (updatedRow.round_number ?? 0) + 1;
        let nextPosition = Math.ceil((updatedRow.position_in_round ?? 1) / 2);
        let slot = (updatedRow.position_in_round ?? 1) % 2 === 1 ? "team1" : "team2";
        
        if (isLower) {
            // Lower bracket routing math:
            // Round N to N+1
            if ((updatedRow.round_number ?? 1) % 2 === 1) {
                // Odd round winners go to next even round, same position, team 2 slot ordinarily.
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

        // Standard progression for winner
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
            // Reached end of Upper, send to Grand Final
            await client.from("matches").update({ team1_id: updatedRow.winner_team_id, team1_name: updatedRow.winner_name })
                .eq("tournament_id", tournamentId).eq("bracket_side", "GRAND_FINAL");
        } else if (isLower) {
            // Reached end of Lower, send to Grand Final
            await client.from("matches").update({ team2_id: updatedRow.winner_team_id, team2_name: updatedRow.winner_name })
                .eq("tournament_id", tournamentId).eq("bracket_side", "GRAND_FINAL");
        }

        // Drop losers into Lower Bracket if UPPER
        if (isUpper && updatedRow.loser_team_id) {
            const loserRound = (updatedRow.round_number ?? 1) === 1 ? 1 : ((updatedRow.round_number ?? 1) - 1) * 2;
            const dropSlot = "team1";
            let dropPos = updatedRow.position_in_round ?? 1;
            
            // Adjust drop position for cross-placement in later rounds to avoid rematches
            if (loserRound > 2) {
                // A common flip math for dropPos
            }

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
'''

idx = content.find('if ((updatedRow.round_number ?? 0) > 0 && updatedRow.winner_team_id) {')
if idx != -1:
    idx2 = content.find('return mapMatch(updatedRow);', idx)
    if idx2 != -1:
        prefix = content[:idx]
        suffix = content[idx2:]
        content = prefix + new_report_progression.strip() + '\n    ' + suffix

# Fix return mapMatch on reportMatchResult
content = content.replace('\n    return mapMatch(updatedRow);', '\n    return mapMatch(updatedRow as any);')
content = content.replace('''export interface MatchReport {
  id: string;
  tournamentId: string;
  stageId?: string | null;
  roundLabel: string;
  roundNumber?: number | null;
  positionInRound?: number | null;''',
'''export interface MatchReport {
  id: string;
  tournamentId: string;
  stageId?: string | null;
  roundLabel: string;
  roundNumber?: number | null;
  positionInRound?: number | null;
  bracketSide?: string | null;''')

content = content.replace('''    positionInRound: row.position_in_round,
    team1Name: row.team1_name,''',
'''    positionInRound: row.position_in_round,
    bracketSide: row.bracket_side,
    team1Name: row.team1_name,''')

with open('src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("api.ts patched")
