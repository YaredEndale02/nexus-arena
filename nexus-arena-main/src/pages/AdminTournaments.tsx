import { useCallback, useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api, type ApiTournamentStatus, type MatchReport, type Tournament } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Trophy, Users, DollarSign, Target, Shield, Loader2, Pencil, Radio, Save, Trash2 } from "lucide-react";

type TournamentFormState = {
  title: string;
  gameTitle: string;
  startDate: string;
  maxTeams: number;
  entryFee: number;
  prizePool: number;
};

type MatchFormState = {
  roundLabel: string;
  team1Name: string;
  team2Name: string;
  scheduledAt: string;
};

const createTournamentForm = (): TournamentFormState => ({
  title: "",
  gameTitle: "",
  startDate: "",
  maxTeams: 16,
  entryFee: 0,
  prizePool: 0,
});

const createMatchForm = (): MatchFormState => ({
  roundLabel: "Quarterfinal",
  team1Name: "",
  team2Name: "",
  scheduledAt: "",
});

const statusActions: Array<{ label: string; status: ApiTournamentStatus }> = [
  { label: "Save Draft", status: "DRAFT" },
  { label: "Open Registration", status: "REGISTRATION_OPEN" },
  { label: "Close Registration", status: "REGISTRATION_CLOSED" },
  { label: "Go Live", status: "LIVE" },
  { label: "Complete", status: "COMPLETED" },
];

export default function AdminTournaments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<TournamentFormState>(createTournamentForm());
  const [managedTournaments, setManagedTournaments] = useState<Tournament[]>([]);
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<TournamentFormState>(createTournamentForm());
  const [matchForms, setMatchForms] = useState<Record<string, MatchFormState>>({});
  const [matchReports, setMatchReports] = useState<Record<string, MatchReport[]>>({});
  const [busyTournamentId, setBusyTournamentId] = useState<string | null>(null);

  const loadManagedTournaments = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const tournaments = await api.getTournaments(user.role === "ADMIN" ? undefined : user.id);
      setManagedTournaments(tournaments);
      const nextMatchForms: Record<string, MatchFormState> = {};
      const nextReports: Record<string, MatchReport[]> = {};
      await Promise.all(
        tournaments.map(async (tournament) => {
          nextMatchForms[tournament.id] = matchForms[tournament.id] ?? createMatchForm();
          try {
            nextReports[tournament.id] = await api.getTournamentMatches(tournament.id);
          } catch {
            nextReports[tournament.id] = [];
          }
        }),
      );
      setMatchForms(nextMatchForms);
      setMatchReports(nextReports);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load tournaments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [matchForms, toast, user]);

  useEffect(() => {
    if (!user) return;
    void loadManagedTournaments();
  }, [loadManagedTournaments, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await api.createTournament({
        ...formData,
        creator: user,
      });
      toast({
        title: "Tournament created",
        description: "Your event was saved as a draft. Publish it when the details are ready.",
      });
      setFormData(createTournamentForm());
      await loadManagedTournaments();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const beginEditingTournament = (tournament: Tournament) => {
    setEditingTournamentId(tournament.id);
    setEditingForm({
      title: tournament.title,
      gameTitle: tournament.gameTitle,
      startDate: tournament.startDate.slice(0, 10),
      maxTeams: tournament.maxTeams,
      entryFee: tournament.entryFee,
      prizePool: tournament.prizePool,
    });
  };

  const saveTournamentEdits = async (tournamentId: string) => {
    if (!user) return;
    setBusyTournamentId(tournamentId);
    try {
      const updated = await api.updateTournament(tournamentId, {
        ...editingForm,
        actor: user,
      });
      setManagedTournaments((current) => current.map((item) => (item.id === tournamentId ? updated : item)));
      setEditingTournamentId(null);
      toast({
        title: "Tournament updated",
        description: "Tournament details were saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update tournament",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const changeTournamentStatus = async (tournamentId: string, status: ApiTournamentStatus) => {
    if (!user) return;
    setBusyTournamentId(tournamentId);
    try {
      const updated = await api.updateTournamentStatus(tournamentId, status, user);
      setManagedTournaments((current) => current.map((item) => (item.id === tournamentId ? updated : item)));
      toast({
        title: "Status updated",
        description: `${updated.title} is now ${updated.displayStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Status update failed",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    if (!user) return;
    setBusyTournamentId(tournamentId);
    try {
      await api.deleteTournament(tournamentId, user);
      setManagedTournaments((current) => current.filter((item) => item.id !== tournamentId));
      toast({
        title: "Tournament deleted",
        description: "The draft tournament was removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete tournament",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const createMatch = async (tournamentId: string) => {
    if (!user) return;
    const form = matchForms[tournamentId];
    setBusyTournamentId(tournamentId);
    try {
      const created = await api.createMatchReport(tournamentId, {
        ...form,
        actor: user,
      });
      setMatchReports((current) => ({
        ...current,
        [tournamentId]: [...(current[tournamentId] ?? []), created],
      }));
      setMatchForms((current) => ({
        ...current,
        [tournamentId]: createMatchForm(),
      }));
      toast({
        title: "Match created",
        description: "You can now report scores on this match.",
      });
    } catch (error) {
      toast({
        title: "Match creation failed",
        description: error instanceof Error ? error.message : "Failed to create match",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const reportMatch = async (tournamentId: string, match: MatchReport) => {
    if (!user) return;
    setBusyTournamentId(match.id);
    try {
      const updated = await api.reportMatchResult(tournamentId, match.id, {
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        status: "COMPLETED",
        actor: user,
      });
      setMatchReports((current) => ({
        ...current,
        [tournamentId]: (current[tournamentId] ?? []).map((item) => (item.id === updated.id ? updated : item)),
      }));
      toast({
        title: "Match reported",
        description: `${updated.team1Name} ${updated.team1Score} - ${updated.team2Score} ${updated.team2Name}`,
      });
    } catch (error) {
      toast({
        title: "Match report failed",
        description: error instanceof Error ? error.message : "Failed to report match",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  if (!user || (user.role !== "ORGANIZER" && user.role !== "ADMIN")) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-20 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="font-heading text-3xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground italic">
            Only organizers and admins can manage tournaments.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-10 space-y-8">
        <div className="items-center flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Tournament Control Room</h1>
            <p className="text-muted-foreground">
              Create drafts, publish registrations, edit details, and report live match results.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="font-heading italic">Create Tournament</CardTitle>
              <CardDescription>New tournaments start as drafts so you can review details before publishing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Tournament Title</Label>
                <div className="relative">
                  <Input
                    id="title"
                    placeholder="e.g. Valorant Pro League Season 1"
                    className="pl-10 h-12 bg-white/5 border-white/10"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                  <Trophy className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gameTitle">Game Title</Label>
                  <div className="relative">
                    <Input
                      id="gameTitle"
                      placeholder="e.g. Valorant"
                      className="pl-10 h-12 bg-white/5 border-white/10"
                      value={formData.gameTitle}
                      onChange={(e) => setFormData({ ...formData, gameTitle: e.target.value })}
                      required
                    />
                    <Target className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <div className="relative">
                    <Input
                      id="startDate"
                      type="date"
                      className="pl-10 h-12 bg-white/5 border-white/10"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                    <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxTeams">Max Teams</Label>
                  <div className="relative">
                    <Input
                      id="maxTeams"
                      type="number"
                      className="pl-10 h-12 bg-white/5 border-white/10"
                      value={formData.maxTeams}
                      onChange={(e) => setFormData({ ...formData, maxTeams: Number(e.target.value) })}
                      required
                    />
                    <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entryFee">Entry Fee ($)</Label>
                  <div className="relative">
                    <Input
                      id="entryFee"
                      type="number"
                      className="pl-10 h-12 bg-white/5 border-white/10"
                      value={formData.entryFee}
                      onChange={(e) => setFormData({ ...formData, entryFee: Number(e.target.value) })}
                      required
                    />
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prizePool">Prize Pool ($)</Label>
                  <div className="relative">
                    <Input
                      id="prizePool"
                      type="number"
                      className="pl-10 h-12 bg-white/5 border-white/10"
                      value={formData.prizePool}
                      onChange={(e) => setFormData({ ...formData, prizePool: Number(e.target.value) })}
                      required
                    />
                    <Trophy className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full h-12 text-lg font-heading tracking-wider bg-gradient-to-r from-primary to-neon-purple hover:neon-glow-blue transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? "SAVING..." : "CREATE DRAFT TOURNAMENT"}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-2xl font-bold">Managed Tournaments</h2>
          </div>

          {isLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : managedTournaments.length === 0 ? (
            <Card className="glass border-white/10">
              <CardContent className="py-10 text-center text-muted-foreground">
                No tournaments yet. Create your first draft above.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {managedTournaments.map((tournament) => {
                const isEditing = editingTournamentId === tournament.id;
                const matches = matchReports[tournament.id] ?? [];
                const matchForm = matchForms[tournament.id] ?? createMatchForm();

                return (
                  <Card key={tournament.id} className="glass border-white/10">
                    <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <CardTitle className="font-heading text-2xl">{tournament.title}</CardTitle>
                        <CardDescription>
                          {`${tournament.gameTitle} · ${tournament.displayStatus} · ${(tournament._count?.entries ?? 0)}/${tournament.maxTeams} teams`}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" className="border-white/10" onClick={() => beginEditingTournament(tournament)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        {statusActions.map((action) => (
                          <Button
                            key={action.status}
                            variant="outline"
                            className="border-white/10"
                            disabled={busyTournamentId === tournament.id}
                            onClick={() => void changeTournamentStatus(tournament.id, action.status)}
                          >
                            {action.label}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          className="border-red-500/20 text-red-300 hover:bg-red-500/10"
                          disabled={busyTournamentId === tournament.id}
                          onClick={() => void deleteTournament(tournament.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {isEditing && (
                        <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                              value={editingForm.title}
                              onChange={(e) => setEditingForm((current) => ({ ...current, title: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Game</Label>
                            <Input
                              value={editingForm.gameTitle}
                              onChange={(e) => setEditingForm((current) => ({ ...current, gameTitle: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                              type="date"
                              value={editingForm.startDate}
                              onChange={(e) => setEditingForm((current) => ({ ...current, startDate: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Teams</Label>
                            <Input
                              type="number"
                              value={editingForm.maxTeams}
                              onChange={(e) => setEditingForm((current) => ({ ...current, maxTeams: Number(e.target.value) }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Entry Fee</Label>
                            <Input
                              type="number"
                              value={editingForm.entryFee}
                              onChange={(e) => setEditingForm((current) => ({ ...current, entryFee: Number(e.target.value) }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Prize Pool</Label>
                            <Input
                              type="number"
                              value={editingForm.prizePool}
                              onChange={(e) => setEditingForm((current) => ({ ...current, prizePool: Number(e.target.value) }))}
                            />
                          </div>
                          <div className="md:col-span-2 flex gap-2">
                            <Button onClick={() => void saveTournamentEdits(tournament.id)} disabled={busyTournamentId === tournament.id}>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </Button>
                            <Button variant="outline" className="border-white/10" onClick={() => setEditingTournamentId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-4 text-sm">
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <p className="text-muted-foreground">Start Date</p>
                          <p className="font-semibold">{new Date(tournament.startDate).toLocaleDateString()}</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <p className="text-muted-foreground">Entry Fee</p>
                          <p className="font-semibold">${tournament.entryFee}</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <p className="text-muted-foreground">Prize Pool</p>
                          <p className="font-semibold">${tournament.prizePool.toLocaleString()}</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <p className="text-muted-foreground">Match Reports</p>
                          <p className="font-semibold">{matches.length}</p>
                        </div>
                      </div>

                      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div>
                          <h3 className="font-heading text-lg">Match Reporting</h3>
                          <p className="text-sm text-muted-foreground">Create match stubs and log official scores.</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-4">
                          <Input
                            placeholder="Round label"
                            value={matchForm.roundLabel}
                            onChange={(e) =>
                              setMatchForms((current) => ({
                                ...current,
                                [tournament.id]: { ...matchForm, roundLabel: e.target.value },
                              }))
                            }
                          />
                          <Input
                            placeholder="Team one"
                            value={matchForm.team1Name}
                            onChange={(e) =>
                              setMatchForms((current) => ({
                                ...current,
                                [tournament.id]: { ...matchForm, team1Name: e.target.value },
                              }))
                            }
                          />
                          <Input
                            placeholder="Team two"
                            value={matchForm.team2Name}
                            onChange={(e) =>
                              setMatchForms((current) => ({
                                ...current,
                                [tournament.id]: { ...matchForm, team2Name: e.target.value },
                              }))
                            }
                          />
                          <Input
                            type="datetime-local"
                            value={matchForm.scheduledAt}
                            onChange={(e) =>
                              setMatchForms((current) => ({
                                ...current,
                                [tournament.id]: { ...matchForm, scheduledAt: e.target.value },
                              }))
                            }
                          />
                        </div>
                        <Button
                          variant="outline"
                          className="border-white/10"
                          disabled={busyTournamentId === tournament.id}
                          onClick={() => void createMatch(tournament.id)}
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
                                  onChange={(e) =>
                                    setMatchReports((current) => ({
                                      ...current,
                                      [tournament.id]: (current[tournament.id] ?? []).map((item) =>
                                        item.id === match.id ? { ...item, team1Score: Number(e.target.value) } : item,
                                      ),
                                    }))
                                  }
                                />
                                <Input
                                  type="number"
                                  value={match.team2Score}
                                  onChange={(e) =>
                                    setMatchReports((current) => ({
                                      ...current,
                                      [tournament.id]: (current[tournament.id] ?? []).map((item) =>
                                        item.id === match.id ? { ...item, team2Score: Number(e.target.value) } : item,
                                      ),
                                    }))
                                  }
                                />
                                <Button onClick={() => void reportMatch(tournament.id, match)} disabled={busyTournamentId === match.id}>
                                  Report
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
