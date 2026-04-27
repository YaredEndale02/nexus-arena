import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Users } from "lucide-react";
import { Tournament, MatchReport, api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  const { user } = useAuth();
  const { toast } = useToast();

  const handleManualAdd = async () => {
    const n = (document.getElementById(`manual-name-${tournament.id}`) as HTMLInputElement).value;
    const e = (document.getElementById(`manual-email-${tournament.id}`) as HTMLInputElement).value;
    const p = (document.getElementById(`manual-phone-${tournament.id}`) as HTMLInputElement).value;
    if (!n || !e || !p) {
      toast({ title: "Error", description: "All fields are mandatory", variant: "destructive" });
      return;
    }
    setBusyTournamentId(tournament.id);
    try {
      await api.adminAddUsers(tournament.id, [{ name: n, email: e, phoneNumber: p }], user!);
      toast({ title: "Success", description: "Player added successfully" });
      (document.getElementById(`manual-name-${tournament.id}`) as HTMLInputElement).value = "";
      (document.getElementById(`manual-email-${tournament.id}`) as HTMLInputElement).value = "";
      (document.getElementById(`manual-phone-${tournament.id}`) as HTMLInputElement).value = "";
      refreshTournamentOps(tournament.id);
    } catch (err: any) {
      toast({ title: "Operation failed", description: err.message, variant: "destructive" });
    }
    setBusyTournamentId(null);
  };

  const handleBulkImport = async () => {
    const val = (document.getElementById(`bulk-input-${tournament.id}`) as HTMLTextAreaElement).value;
    if (!val.trim()) return;
    let list = [];
    try {
      if (val.trim().startsWith("[")) {
        list = JSON.parse(val);
      } else {
        list = val.trim().split("\n").map(line => {
          const parts = line.split(",");
          return {
            name: parts[0]?.trim(),
            email: parts[1]?.trim(),
            phoneNumber: parts[2]?.trim()
          };
        }).filter(x => x.name && x.phoneNumber && x.email);
      }

      if (list.length === 0) throw new Error("No valid data found. Ensure Name, Email, and Phone are present.");

      setBusyTournamentId(tournament.id);
      await api.adminAddUsers(tournament.id, list, user!);
      toast({ title: "Bulk Success", description: `Successfully added ${list.length} players.` });
      (document.getElementById(`bulk-input-${tournament.id}`) as HTMLTextAreaElement).value = "";
      refreshTournamentOps(tournament.id);
    } catch (err: any) {
      toast({ title: "Bulk Error", description: err.message, variant: "destructive" });
    }
    setBusyTournamentId(null);
  };

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

          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div>
              <h3 className="font-heading text-lg">Manual & Bulk Registration</h3>
              <p className="text-sm text-muted-foreground">Add players one-by-one or import via JSON/CSV text.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input id={`manual-name-${tournament.id}`} placeholder="Player Name" className="bg-white/5" />
              <Input id={`manual-email-${tournament.id}`} placeholder="Email" className="bg-white/5" />
              <Input id={`manual-phone-${tournament.id}`} placeholder="Phone Number" className="bg-white/5" />
            </div>
            <Button variant="outline" className="border-white/10" onClick={handleManualAdd}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Player One-by-One
            </Button>

            <div className="pt-4 border-t border-white/10">
              <Label>Bulk Import (JSON Array or CSV: Name,Email,Phone)</Label>
              <textarea
                id={`bulk-input-${tournament.id}`}
                className="w-full h-32 bg-white/5 border border-white/10 rounded-md p-2 mt-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={'[{"name": "John", "email": "john@test.com", "phoneNumber": "12345678"}]\nOR\nJohn,john@test.com,12345678\nJane,jane@test.com,87654321'}
              />
              <Button variant="outline" className="mt-2 border-white/10" onClick={handleBulkImport}>
                <Users className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
