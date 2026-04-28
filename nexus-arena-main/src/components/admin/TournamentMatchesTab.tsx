import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Swords } from "lucide-react";
import { Tournament, MatchReport } from "@/lib/api";

export function TournamentMatchesTab({
  tournament,
  matches,
  matchForm,
  busyTournamentId,
  setMatchForm,
  setBusyTournamentId,
  createMatch,
  reportMatch,
  refreshTournamentOps,
  setMatchReportScore,
}: {
  tournament: Tournament;
  matches: MatchReport[];
  matchForm: { roundLabel: string; team1Name: string; team2Name: string; scheduledAt: string };
  busyTournamentId: string | null;
  setMatchForm: (form: any) => void;
  setBusyTournamentId: (id: string | null) => void;
  createMatch: (tournamentId: string) => void;
  reportMatch: (tournamentId: string, match: MatchReport) => void;
  refreshTournamentOps: (tournamentId: string) => void;
  setMatchReportScore: (matchId: string, team: 1 | 2, score: number) => void;
}) {
  return (
    <div className="space-y-6 outline-none">
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle>Match Operations</CardTitle>
          <CardDescription>Generate brackets and report results.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-heading text-lg">Match Reporting</h3>
            <p className="text-sm text-muted-foreground">Create match stubs and log official scores.</p>
          </div>
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
