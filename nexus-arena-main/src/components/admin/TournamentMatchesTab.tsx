import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Swords, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
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
}) {
  const readiness = getBracketReadiness(
    entries.map((entry) => ({
      teamId: entry.teamId,
      teamName: entry.teamName,
      checkInStatus: entry.checkInStatus,
      rosterLockedAt: entry.rosterLockedAt ?? null,
    })),
    isCheckInRequired(tournament.status),
  );

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

          <div className="space-y-3">
            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches reported yet.</p>
            ) : (
              matches.map((match) => (
                <div key={match.id} className="rounded-xl border border-white/10 bg-background/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{match.roundLabel}</p>
                        <p className="text-sm text-muted-foreground">{match.team1Name} vs {match.team2Name}</p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full border",
                        match.status === "LIVE" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                        match.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                        "bg-white/5 text-white/30 border-white/10"
                      )}>{match.status}</span>
                    </div>

                    {/* Score inputs */}
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
                      <Input
                        type="number"
                        placeholder={match.team1Name}
                        value={match.team1Score}
                        onChange={(e) => setMatchReportScore(match.id, 1, Number(e.target.value))}
                        disabled={match.status === "COMPLETED"}
                      />
                      <Input
                        type="number"
                        placeholder={match.team2Name}
                        value={match.team2Score}
                        onChange={(e) => setMatchReportScore(match.id, 2, Number(e.target.value))}
                        disabled={match.status === "COMPLETED"}
                      />
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
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
