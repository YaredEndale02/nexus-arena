import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Swords, AlertTriangle } from "lucide-react";
import { Tournament, MatchReport, TournamentEntry } from "@/lib/api";
import { getBracketReadiness } from "@/lib/tournamentLifecycle";
import { isCheckInRequired } from "./TournamentManager";

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
              <Button asChild variant="outline" size="sm" className="border-white/10">
                <a href={`/bracket?tournament=${tournament.id}`} target="_blank" rel="noreferrer">
                  Open Public Bracket
                </a>
              </Button>
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
                <div key={match.id} className="grid gap-3 rounded-xl border border-white/10 bg-background/30 p-4 md:grid-cols-[1.4fr,1fr,1fr,auto] md:items-end">
                  <div>
                    <p className="font-semibold">{match.roundLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      {match.team1Name} vs {match.team2Name}
                    </p>
                  </div>
                  <Input
                    type="number"
                    value={match.team1Score}
                    onChange={(e) => setMatchReportScore(match.id, 1, Number(e.target.value))}
                  />
                  <Input
                    type="number"
                    value={match.team2Score}
                    onChange={(e) => setMatchReportScore(match.id, 2, Number(e.target.value))}
                  />
                  <Button onClick={() => reportMatch(tournament.id, match)} disabled={busyTournamentId === match.id}>
                    Report
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
