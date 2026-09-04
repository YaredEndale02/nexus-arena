import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Swords, AlertTriangle, RefreshCw, CheckCircle2, Pencil, Users, CheckCheck } from "lucide-react";
import { Tournament, MatchReport, TournamentEntry, TournamentEntryCheckInStatus } from "@/lib/api";
import { getBracketReadiness } from "@/lib/tournamentLifecycle";
import { isCheckInRequired } from "./TournamentManager";
import { cn } from "@/lib/utils";

export function TournamentMatchesTab({
  tournament,
  entries,
  matches,
  matchForm,
  busyTournamentId,
  setMatchForm,
  setBusyTournamentId,
  createMatch,
  reportMatch,
  updateMatchScore,
  refreshTournamentOps,
  setMatchReportScore,
  generateBracket,
  resetAndRegenerateBracket,
  bulkUpdateCheckIn,
  updateMatchParticipants,
  simulateFullTournament,
}: {
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: MatchReport[];
  matchForm: { roundLabel: string; team1Name: string; team2Name: string; scheduledAt: string };
  busyTournamentId: string | null;
  setMatchForm: (form: any) => void;
  setBusyTournamentId: (id: string | null) => void;
  createMatch: (tournamentId: string) => void;
  reportMatch: (tournamentId: string, match: MatchReport) => void;
  updateMatchScore: (tournamentId: string, match: MatchReport) => void;
  refreshTournamentOps: (tournamentId: string) => void;
  setMatchReportScore: (matchId: string, team: 1 | 2, score: number) => void;
  generateBracket: (id: string, options?: { bypassCheckIn?: boolean }) => void;
  resetAndRegenerateBracket: (id: string, options?: { bypassCheckIn?: boolean }) => void;
  bulkUpdateCheckIn?: (tournamentId: string, status: TournamentEntryCheckInStatus, entryIds?: string[]) => void;
  updateMatchParticipants: (tournamentId: string, matchId: string, data: any) => void;
  simulateFullTournament: (tournamentId: string) => void;
}) {
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [matchEditData, setMatchEditData] = useState<{ team1Id: string | null; team2Id: string | null; team1Name: string; team2Name: string } | null>(null);

  const readiness = getBracketReadiness(
    entries.map((entry) => ({
      teamId: entry.teamId,
      teamName: entry.teamName,
      checkInStatus: entry.checkInStatus,
      rosterLockedAt: entry.rosterLockedAt ?? null,
    })),
    isCheckInRequired(tournament.status),
  );

  const startEditing = (match: MatchReport) => {
    setEditingMatchId(match.id);
    setMatchEditData({
      team1Id: match.team1Id ?? null,
      team2Id: match.team2Id ?? null,
      team1Name: match.team1Name,
      team2Name: match.team2Name,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMatchId || !matchEditData) return;
    updateMatchParticipants(tournament.id, editingMatchId, matchEditData);
    setEditingMatchId(null);
  };

  return (
    <div className="space-y-6 outline-none">
      <Card className="glass border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bracket Management</CardTitle>
              <CardDescription>Generate and control the tournament flow.</CardDescription>
            </div>
            {matches.length > 0 && (
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="border-white/10">
                  <a href={`/bracket?tournament=${tournament.id}`} target="_blank" rel="noreferrer">
                    Open Public Bracket
                  </a>
                </Button>
                <Button asChild variant="secondary" size="sm" className="gap-2">
                  <a href={`/broadcast/${tournament.id}`} target="_blank" rel="noreferrer">
                    <Swords className="w-4 h-4" />
                    Broadcast Overlay
                  </a>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {matches.length === 0 ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-4">
              {readiness.issues.length > 0 ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-left">
                  <div className="flex items-center gap-2 font-semibold text-amber-200 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Bracket Requirements
                  </div>
                  <ul className="text-xs text-amber-200/80 space-y-1">
                    {readiness.issues.map((issue) => <li key={issue}>• {issue}</li>)}
                  </ul>
                </div>
              ) : readiness.warnings.length > 0 ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-left">
                  <div className="flex items-center gap-2 font-semibold text-amber-200 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Check-In Notice ({readiness.checkedInCount} of {readiness.totalCount} Checked In)
                  </div>
                  <ul className="text-xs text-amber-200/80 space-y-1">
                    {readiness.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  All {readiness.totalCount} participants are checked in and ready.
                </p>
              )}

              <p className="text-sm text-muted-foreground">
                Choose how you want to generate the tournament bracket:
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {/* 1. Generate with Checked In Teams */}
                {readiness.canGenerateCheckedIn && (
                  <Button 
                    disabled={busyTournamentId === tournament.id} 
                    onClick={() => generateBracket(tournament.id)}
                    className="gap-2"
                  >
                    <Swords className="w-4 h-4" />
                    Generate ({readiness.checkedInCount} Checked-In Teams)
                  </Button>
                )}

                {/* 2. Bypass Check-In & Generate All */}
                {readiness.canGenerateAll && (!readiness.fullyCheckedIn || !readiness.canGenerateCheckedIn) && (
                  <Button
                    variant="outline"
                    disabled={busyTournamentId === tournament.id}
                    onClick={() => generateBracket(tournament.id, { bypassCheckIn: true })}
                    className="border-white/10 gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Generate for All ({readiness.totalCount} Teams - Bypass Check-In)
                  </Button>
                )}

                {/* 3. Quick Check In All & Generate */}
                {bulkUpdateCheckIn && !readiness.fullyCheckedIn && readiness.canGenerateAll && (
                  <Button
                    variant="secondary"
                    disabled={busyTournamentId === tournament.id}
                    onClick={async () => {
                      if (confirm(`Check in all ${readiness.totalCount} teams and generate bracket?`)) {
                        await bulkUpdateCheckIn(tournament.id, "CHECKED_IN");
                        generateBracket(tournament.id);
                      }
                    }}
                    className="gap-2"
                  >
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    Check In All & Generate
                  </Button>
                )}

                {!readiness.canGenerateAll && (
                  <Button disabled>
                    At Least 2 Teams Required
                  </Button>
                )}
              </div>
            </div>
          ) : (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="text-sm">
                  <span className="text-emerald-400 font-bold">✓ Bracket is Live</span>
                  <p className="text-muted-foreground mt-1">{matches.length} active matches.</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-primary/20 text-primary hover:bg-primary/10"
                    disabled={busyTournamentId === tournament.id}
                    onClick={() => simulateFullTournament(tournament.id)}
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", busyTournamentId === tournament.id && "animate-spin")} />
                    Simulate Full Tournament
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={busyTournamentId === tournament.id}
                    onClick={() => {
                      if (confirm("WARNING: This will DELETE all existing matches. Continue?")) {
                        resetAndRegenerateBracket(tournament.id);
                      }
                    }}
                  >
                    Reset Bracket
                  </Button>
                </div>
              </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle>Manual Match Operations</CardTitle>
          <CardDescription>Create match stubs and log official scores.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Round label"
              value={matchForm.roundLabel}
              onChange={(e) => setMatchForm({ ...matchForm, roundLabel: e.target.value })}
            />
            <Input
              placeholder="Team one"
              value={matchForm.team1Name}
              onChange={(e) => setMatchForm({ ...matchForm, team1Name: e.target.value })}
            />
            <Input
              placeholder="Team two"
              value={matchForm.team2Name}
              onChange={(e) => setMatchForm({ ...matchForm, team2Name: e.target.value })}
            />
            <Input
              type="datetime-local"
              value={matchForm.scheduledAt}
              onChange={(e) => setMatchForm({ ...matchForm, scheduledAt: e.target.value })}
            />
          </div>
          <Button
            variant="outline"
            className="border-white/10"
            disabled={busyTournamentId === tournament.id}
            onClick={() => createMatch(tournament.id)}
          >
            Create Match Report
          </Button>

          <div className="space-y-8">
            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches reported yet.</p>
            ) : (
              (() => {
                // 1. Strict Chronological Flow: Sort by Round and Position
                const sortedMatches = [...matches].sort((a, b) => {
                  if (a.roundNumber !== b.roundNumber) {
                    return (a.roundNumber ?? 0) - (b.roundNumber ?? 0);
                  }
                  return (a.positionInRound ?? 0) - (b.positionInRound ?? 0);
                });

                const roundLabels = Array.from(new Set(sortedMatches.map(m => m.roundLabel)));
                
                return roundLabels.map(label => {
                  const roundMatches = sortedMatches.filter(m => m.roundLabel === label);
                  return (
                    <div key={label} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">{label}</h3>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                      <div className="grid gap-3">
                        {roundMatches.map((match) => {
                          const isMatchReady = match.team1Name !== "TBD" && match.team2Name !== "TBD";
                          const isCompleted = match.status === "COMPLETED";
                          const isLive = match.status === "LIVE";
                          
                          // Source Match Identification
                          const getSourceLabel = (pos: number) => {
                            if (match.roundNumber === 1) return null;
                            const prevRound = (match.roundNumber ?? 1) - 1;
                            const sourcePos1 = (match.positionInRound ?? 1) * 2 - 1;
                            const sourcePos2 = (match.positionInRound ?? 1) * 2;
                            const sourceMatch = sortedMatches.find(m => m.roundNumber === prevRound && m.positionInRound === (pos === 1 ? sourcePos1 : sourcePos2));
                            return sourceMatch ? `Winner of Match #${sourceMatch.id.slice(0, 4)}` : "Previous Round Winner";
                          };

                          return (
                            <div 
                              key={match.id} 
                              className={cn(
                                "group relative overflow-hidden rounded-xl border transition-all duration-300",
                                !isMatchReady ? "bg-white/[0.02] border-white/5 opacity-60" : "bg-white/[0.05] border-white/10 hover:border-primary/30",
                                isCompleted && "border-emerald-500/20 bg-emerald-500/[0.02]"
                              )}
                            >
                              {/* Status Indicator Bar */}
                              <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-1",
                                isLive ? "bg-red-500 animate-pulse" : 
                                isCompleted ? "bg-emerald-500" : 
                                isMatchReady ? "bg-primary/40" : "bg-white/10"
                              )} />

                              <div className="p-4 sm:p-5">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                  {/* Participants Side */}
                                  <div className="flex-1 space-y-4">
                                    {[1, 2].map((idx) => {
                                      const teamName = idx === 1 ? match.team1Name : match.team2Name;
                                      const isTbd = teamName === "TBD";
                                      const isWinner = isCompleted && match.winnerName === teamName;
                                      
                                      return (
                                        <div key={idx} className="flex items-center gap-4">
                                          <div className={cn(
                                            "flex-1 flex flex-col justify-center min-h-[48px] px-4 rounded-lg border transition-colors",
                                            isTbd ? "border-dashed border-white/10 bg-black/20" : 
                                            isWinner ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/5 bg-white/5"
                                          )}>
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <p className={cn(
                                                  "text-sm font-bold tracking-tight",
                                                  isTbd ? "text-white/20 italic" : 
                                                  isWinner ? "text-emerald-400" : "text-white/90"
                                                )}>
                                                  {teamName}
                                                </p>
                                                {isTbd && (
                                                  <p className="text-[9px] text-primary/30 font-medium uppercase mt-0.5 tracking-wider">
                                                    {getSourceLabel(idx)}
                                                  </p>
                                                )}
                                              </div>
                                              
                                              {/* Compact Score Input */}
                                              <div className="flex items-center gap-2">
                                                <Input
                                                  type="number"
                                                  value={idx === 1 ? match.team1Score : match.team2Score}
                                                  onChange={(e) => setMatchReportScore(match.id, idx as 1|2, Number(e.target.value))}
                                                  disabled={!isMatchReady || isCompleted}
                                                  className={cn(
                                                    "w-12 h-8 text-center font-black bg-black/40 border-white/10 p-0 focus-visible:ring-primary/30",
                                                    isWinner && "text-emerald-400 border-emerald-500/30"
                                                  )}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Actions Side */}
                                  <div className="flex lg:flex-col items-center gap-2 min-w-[160px]">
                                    {!isMatchReady ? (
                                      <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-white/5 bg-white/[0.02] w-full">
                                        <Swords className="w-4 h-4 text-white/10 mb-1" />
                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Locked</span>
                                      </div>
                                    ) : (
                                      <>
                                        <Button
                                          size="sm"
                                          className={cn(
                                            "w-full h-10 font-bold transition-all duration-300 gap-2",
                                            isCompleted ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" :
                                            "bg-primary hover:bg-primary/90 text-primary-foreground"
                                          )}
                                          disabled={busyTournamentId === match.id || isCompleted}
                                          onClick={() => {
                                            if (confirm(`Finalize results and promote winner?\n${match.team1Name} ${match.team1Score} – ${match.team2Score} ${match.team2Name}`)) {
                                              reportMatch(tournament.id, match);
                                            }
                                          }}
                                        >
                                          {isCompleted ? (
                                            <><CheckCircle2 className="w-4 h-4" /> Finalized</>
                                          ) : (
                                            <><Swords className="w-4 h-4" /> Finalize & Promote</>
                                          )}
                                        </Button>
                                        
                                        {!isCompleted && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-[10px] uppercase font-black tracking-widest text-primary/60 hover:text-primary hover:bg-primary/5 h-8"
                                            disabled={busyTournamentId === match.id}
                                            onClick={() => updateMatchScore(tournament.id, match)}
                                          >
                                            <RefreshCw className={cn("w-3 h-3 mr-2", busyTournamentId === match.id && "animate-spin")} />
                                            Update Live Score
                                          </Button>
                                        )}
                                      </>
                                    )}
                                    
                                    <div className="flex items-center gap-2 mt-auto">
                                      <p className="text-[9px] font-medium text-white/20 uppercase tracking-tighter">
                                        ID: <span className="text-white/40 font-mono">{match.id.slice(0, 8)}</span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
