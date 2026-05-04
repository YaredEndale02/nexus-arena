import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Swords, AlertTriangle, RefreshCw, CheckCircle2, Pencil } from "lucide-react";
import { Tournament, MatchReport, TournamentEntry } from "@/lib/api";
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
  generateBracket: (id: string) => void;
  resetAndRegenerateBracket: (id: string) => void;
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
          {!readiness.ready && matches.length === 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 mb-4">
              <div className="flex items-center gap-2 font-semibold text-amber-200 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Bracket Generation Blocked
              </div>
              <ul className="text-xs text-amber-200/80 space-y-1">
                {readiness.issues.map((issue) => <li key={issue}>• {issue}</li>)}
              </ul>
            </div>
          )}

          {matches.length === 0 ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
              <p className="text-sm mb-4">No matches generated yet. Ensure registration is closed and check-ins are complete.</p>
              <Button 
                disabled={!readiness.ready || busyTournamentId === tournament.id} 
                onClick={() => generateBracket(tournament.id)}
              >
                Generate Initial Bracket
              </Button>
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
                const roundLabels = Array.from(new Set(matches.map(m => m.roundLabel)));
                return roundLabels.map(label => {
                  const roundMatches = matches.filter(m => m.roundLabel === label);
                  return (
                    <div key={label} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary/60">{label}</h3>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                      <div className="grid gap-4">
                        {roundMatches.map((match) => (
                          <div key={match.id} className="rounded-xl border border-white/10 bg-background/30 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-white/90">{match.team1Name} vs {match.team2Name}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{label} • Match #{match.id.slice(0, 4)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  {tournament.status !== "COMPLETED" && (
                                    <Button variant="ghost" size="sm" onClick={() => startEditing(match)} className="text-primary hover:text-primary/80 h-7 px-2">
                                      <Pencil className="w-3 h-3 mr-1" /> Edit
                                    </Button>
                                  )}
                                  <span className={cn(
                                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                                    match.status === "LIVE" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                                    match.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                                    "bg-white/5 text-white/30 border-white/10"
                                  )}>{match.status}</span>
                                </div>
                              </div>

                              {editingMatchId === match.id && (
                                <div className="grid gap-3 md:grid-cols-2 p-3 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in zoom-in-95">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Team 1</Label>
                                    <select
                                      className="w-full bg-background border border-white/10 rounded-md px-2 py-1.5 text-sm"
                                      value={matchEditData?.team1Id || ""}
                                      onChange={(e) => {
                                        const teamId = e.target.value || null;
                                        const team1Name = entries.find(ent => ent.teamId === teamId)?.teamName || "BYE";
                                        setMatchEditData(prev => prev ? { ...prev, team1Id: teamId, team1Name } : null);
                                      }}
                                    >
                                      <option value="">BYE</option>
                                      {entries.map(ent => (
                                        <option key={ent.id} value={ent.teamId}>{ent.teamName}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Team 2</Label>
                                    <select
                                      className="w-full bg-background border border-white/10 rounded-md px-2 py-1.5 text-sm"
                                      value={matchEditData?.team2Id || ""}
                                      onChange={(e) => {
                                        const teamId = e.target.value || null;
                                        const team2Name = entries.find(ent => ent.teamId === teamId)?.teamName || "BYE";
                                        setMatchEditData(prev => prev ? { ...prev, team2Id: teamId, team2Name } : null);
                                      }}
                                    >
                                      <option value="">BYE</option>
                                      {entries.map(ent => (
                                        <option key={ent.id} value={ent.teamId}>{ent.teamName}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex gap-2 col-span-full pt-1">
                                    <Button onClick={handleSaveEdit} size="sm" className="h-8 text-xs">Save Changes</Button>
                                    <Button variant="ghost" onClick={() => setEditingMatchId(null)} size="sm" className="h-8 text-xs">Cancel</Button>
                                  </div>
                                </div>
                              )}

                              {/* Score inputs */}
                              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
                                <div className="relative group">
                                  <Input
                                    type="number"
                                    placeholder={match.team1Name}
                                    value={match.team1Score}
                                    onChange={(e) => setMatchReportScore(match.id, 1, Number(e.target.value))}
                                    disabled={match.status === "COMPLETED"}
                                    className="pr-10"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground opacity-50">{match.team1Name.slice(0, 3).toUpperCase()}</span>
                                </div>
                                <div className="relative group">
                                  <Input
                                    type="number"
                                    placeholder={match.team2Name}
                                    value={match.team2Score}
                                    onChange={(e) => setMatchReportScore(match.id, 2, Number(e.target.value))}
                                    disabled={match.status === "COMPLETED"}
                                    className="pr-10"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground opacity-50">{match.team2Name.slice(0, 3).toUpperCase()}</span>
                                </div>
                                <Button
                                  variant="outline"
                                  className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                                  disabled={busyTournamentId === match.id || match.status === "COMPLETED"}
                                  onClick={() => updateMatchScore(tournament.id, match)}
                                  title="Push score to broadcast overlay"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  Update Score
                                </Button>
                                <Button
                                  className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                                  disabled={busyTournamentId === match.id || match.status === "COMPLETED"}
                                  onClick={() => {
                                    if (confirm(`Mark this match as completed?\n${match.team1Name} ${match.team1Score} – ${match.team2Score} ${match.team2Name}`)) {
                                      reportMatch(tournament.id, match);
                                    }
                                  }}
                                  title="Mark match as complete and trigger winner animation"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Complete
                                </Button>
                              </div>
                            </div>
                        ))}
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
