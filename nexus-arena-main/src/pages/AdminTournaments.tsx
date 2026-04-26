import { useCallback, useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  api,
  type AutoSeedStrategy,
  type ApiTournamentStatus,
  type MatchReport,
  type Tournament,
  type TournamentAdminAssignment,
  type TournamentAdminRole,
  type TournamentEntry,
  type TournamentEntryCheckInStatus,
} from "@/lib/api";
import { getAllowedStatusTransitions, getBracketReadiness, validateTournamentConfiguration } from "@/lib/tournamentLifecycle";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarIcon,
  ClipboardCheck,
  DollarSign,
  Info,
  LayoutDashboard,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Swords,
  Target,
  Trash2,
  Trophy,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";

type TournamentFormState = {
  title: string;
  gameTitle: string;
  format: Tournament["format"];
  bracketType: "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN" | "SWISS" | "GROUP_STAGE";
  tournamentType: Tournament["tournamentType"];
  rules: string;
  startDate: string;
  registrationOpenAt: string;
  registrationCloseAt: string;
  maxTeams: number;
  minPlayersPerTeam: number;
  maxPlayersPerTeam: number;
  entryFee: number;
  prizePool: number;
  waitlistEnabled: boolean;
  visibility: Tournament["visibility"];
};

type MatchFormState = {
  roundLabel: string;
  team1Name: string;
  team2Name: string;
  scheduledAt: string;
};

type DelegationFormState = {
  userId: string;
  role: Exclude<TournamentAdminRole, "OWNER">;
};

const createTournamentForm = (): TournamentFormState => ({
  title: "",
  gameTitle: "",
  format: "TEAM",
  bracketType: "SINGLE_ELIMINATION",
  tournamentType: "ONLINE",
  rules: "",
  startDate: "",
  registrationOpenAt: "",
  registrationCloseAt: "",
  maxTeams: 16,
  minPlayersPerTeam: 5,
  maxPlayersPerTeam: 5,
  entryFee: 0,
  prizePool: 0,
  waitlistEnabled: false,
  visibility: "PUBLIC",
});

const createMatchForm = (): MatchFormState => ({
  roundLabel: "Quarterfinal",
  team1Name: "",
  team2Name: "",
  scheduledAt: "",
});

const createDelegationForm = (): DelegationFormState => ({
  userId: "",
  role: "STAFF",
});

const statusActions: Array<{ label: string; status: ApiTournamentStatus }> = [
  { label: "Save Draft", status: "DRAFT" },
  { label: "Publish", status: "PUBLISHED" },
  { label: "Open Registration", status: "REGISTRATION_OPEN" },
  { label: "Close Registration", status: "REGISTRATION_CLOSED" },
  { label: "Open Check-In", status: "CHECK_IN" },
  { label: "Go Live", status: "LIVE" },
  { label: "Complete", status: "COMPLETED" },
  { label: "Cancel", status: "CANCELLED" },
];

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function normalizeOptionalDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function toIsoOrEmpty(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function validateTournamentForm(form: TournamentFormState) {
  return validateTournamentConfiguration({
    title: form.title,
    gameTitle: form.gameTitle,
    startDate: toIsoOrEmpty(form.startDate),
    registrationOpenAt: toIsoOrEmpty(form.registrationOpenAt) || null,
    registrationCloseAt: toIsoOrEmpty(form.registrationCloseAt) || null,
    maxTeams: form.maxTeams,
    minPlayersPerTeam: form.minPlayersPerTeam,
    maxPlayersPerTeam: form.maxPlayersPerTeam,
    entryFee: form.entryFee,
    prizePool: form.prizePool,
  });
}

function isCheckInRequired(status: ApiTournamentStatus) {
  return status === "REGISTRATION_CLOSED" || status === "CHECK_IN" || status === "LIVE";
}

function toTournamentPayload(form: TournamentFormState) {
  const startDate = toIsoOrEmpty(form.startDate);
  if (!startDate) {
    throw new Error("Start date is required and must be valid.");
  }

  return {
    title: form.title.trim(),
    gameTitle: form.gameTitle.trim(),
    format: form.format,
    bracketType: form.bracketType,
    tournamentType: form.tournamentType,
    rules: form.rules.trim() || null,
    startDate,
    registrationOpenAt: normalizeOptionalDate(form.registrationOpenAt),
    registrationCloseAt: normalizeOptionalDate(form.registrationCloseAt),
    maxTeams: form.maxTeams,
    minPlayersPerTeam: form.minPlayersPerTeam,
    maxPlayersPerTeam: form.maxPlayersPerTeam,
    entryFee: form.entryFee,
    prizePool: form.prizePool,
    waitlistEnabled: form.waitlistEnabled,
    visibility: form.visibility,
  };
}

export default function AdminTournaments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<TournamentFormState>(createTournamentForm());
  const [managedTournaments, setManagedTournaments] = useState<Tournament[]>([]);
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<TournamentFormState>(createTournamentForm());
  const [matchForms, setMatchForms] = useState<Record<string, MatchFormState>>({});
  const [matchReports, setMatchReports] = useState<Record<string, MatchReport[]>>({});
  const [tournamentAdmins, setTournamentAdmins] = useState<Record<string, TournamentAdminAssignment[]>>({});
  const [tournamentEntries, setTournamentEntries] = useState<Record<string, TournamentEntry[]>>({});
  const [delegationForms, setDelegationForms] = useState<Record<string, DelegationFormState>>({});
  const [autoSeedStrategies, setAutoSeedStrategies] = useState<Record<string, AutoSeedStrategy>>({});
  const [busyTournamentId, setBusyTournamentId] = useState<string | null>(null);

  const activeTournament = useMemo(() => 
    managedTournaments.find(t => t.id === activeTournamentId),
    [managedTournaments, activeTournamentId]
  );

  const loadManagedTournaments = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const tournaments = await api.getManagedTournaments(user);
      setManagedTournaments(tournaments);
      const nextMatchForms: Record<string, MatchFormState> = {};
      const nextReports: Record<string, MatchReport[]> = {};
      const nextAdmins: Record<string, TournamentAdminAssignment[]> = {};
      const nextEntries: Record<string, TournamentEntry[]> = {};
      const nextDelegationForms: Record<string, DelegationFormState> = {};
      const nextAutoSeedStrategies: Record<string, AutoSeedStrategy> = {};
      await Promise.all(
        tournaments.map(async (tournament) => {
          nextMatchForms[tournament.id] = createMatchForm();
          nextDelegationForms[tournament.id] = createDelegationForm();
          nextAutoSeedStrategies[tournament.id] = "REGISTRATION_ORDER";
          try {
            const [matches, admins, entries] = await Promise.all([
              api.getTournamentMatches(tournament.id),
              api.getTournamentAdmins(tournament.id),
              api.getTournamentEntries(tournament.id),
            ]);
            nextReports[tournament.id] = matches;
            nextAdmins[tournament.id] = admins;
            nextEntries[tournament.id] = entries;
          } catch {
            nextReports[tournament.id] = [];
            nextAdmins[tournament.id] = [];
            nextEntries[tournament.id] = [];
          }
        }),
      );
      setMatchForms(nextMatchForms);
      setMatchReports(nextReports);
      setTournamentAdmins(nextAdmins);
      setTournamentEntries(nextEntries);
      setDelegationForms(nextDelegationForms);
      setAutoSeedStrategies(nextAutoSeedStrategies);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load tournaments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  const refreshTournamentOps = useCallback(async (tournamentId: string) => {
    try {
      const [matches, admins, entries] = await Promise.all([
        api.getTournamentMatches(tournamentId),
        api.getTournamentAdmins(tournamentId),
        api.getTournamentEntries(tournamentId),
      ]);
      setMatchReports((current) => ({ ...current, [tournamentId]: matches }));
      setTournamentAdmins((current) => ({ ...current, [tournamentId]: admins }));
      setTournamentEntries((current) => ({ ...current, [tournamentId]: entries }));
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Failed to refresh tournament operations",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    void loadManagedTournaments();
  }, [loadManagedTournaments, user]);

  const createFormErrors = useMemo(() => validateTournamentForm(formData), [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (createFormErrors.length > 0) {
      toast({
        title: "Validation failed",
        description: createFormErrors[0],
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await api.createTournament({
        ...toTournamentPayload(formData),
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
      format: tournament.format,
      bracketType: (tournament as any).bracketType || "SINGLE_ELIMINATION",
      tournamentType: tournament.tournamentType,
      rules: tournament.rules ?? "",
      startDate: toDateTimeLocal(tournament.startDate),
      registrationOpenAt: toDateTimeLocal(tournament.registrationOpenAt),
      registrationCloseAt: toDateTimeLocal(tournament.registrationCloseAt),
      maxTeams: tournament.maxTeams,
      minPlayersPerTeam: tournament.minPlayersPerTeam,
      maxPlayersPerTeam: tournament.maxPlayersPerTeam ?? tournament.minPlayersPerTeam,
      entryFee: tournament.entryFee,
      prizePool: tournament.prizePool,
      waitlistEnabled: tournament.waitlistEnabled,
      visibility: tournament.visibility,
    });
  };

  const saveTournamentEdits = async (tournamentId: string) => {
    if (!user) return;
    const editErrors = validateTournamentForm(editingForm);
    if (editErrors.length > 0) {
      toast({
        title: "Validation failed",
        description: editErrors[0],
        variant: "destructive",
      });
      return;
    }
    setBusyTournamentId(tournamentId);
    try {
      const updated = await api.updateTournament(tournamentId, {
        ...toTournamentPayload(editingForm),
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
      await refreshTournamentOps(tournamentId);
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

  const addDelegatedStaff = async (tournamentId: string) => {
    if (!user) return;
    const form = delegationForms[tournamentId] ?? createDelegationForm();
    if (!form.userId.trim()) {
      toast({
        title: "User ID required",
        description: "Enter a user ID to assign tournament staff.",
        variant: "destructive",
      });
      return;
    }

    setBusyTournamentId(tournamentId);
    try {
      await api.addTournamentAdmin(tournamentId, form.userId.trim(), form.role, user);
      setDelegationForms((current) => ({
        ...current,
        [tournamentId]: createDelegationForm(),
      }));
      await refreshTournamentOps(tournamentId);
      toast({
        title: "Staff assigned",
        description: "Tournament staff access has been updated.",
      });
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: error instanceof Error ? error.message : "Failed to assign tournament staff",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const removeDelegatedStaff = async (tournamentId: string, userId: string) => {
    if (!user) return;
    setBusyTournamentId(tournamentId);
    try {
      await api.removeTournamentAdmin(tournamentId, userId, user);
      await refreshTournamentOps(tournamentId);
      toast({
        title: "Staff removed",
        description: "Delegated tournament access was revoked.",
      });
    } catch (error) {
      toast({
        title: "Removal failed",
        description: error instanceof Error ? error.message : "Failed to remove tournament staff",
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
        description: "The tournament was removed permanently.",
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

  const updateEntryCheckIn = async (
    tournamentId: string,
    entryId: string,
    status: TournamentEntryCheckInStatus,
  ) => {
    setBusyTournamentId(tournamentId);
    try {
      const updated = await api.updateTournamentEntryCheckIn(entryId, status);
      setTournamentEntries((current) => ({
        ...current,
        [tournamentId]: (current[tournamentId] ?? []).map((entry) => (entry.id === updated.id ? updated : entry)),
      }));
      toast({
        title: "Check-in updated",
        description: `${updated.teamName} is now ${updated.checkInStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Check-in failed",
        description: error instanceof Error ? error.message : "Failed to update check-in",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const saveEntrySeed = async (tournamentId: string, entry: TournamentEntry) => {
    setBusyTournamentId(tournamentId);
    try {
      const updated = await api.updateTournamentEntrySeed(entry.id, entry.seedNumber ?? null);
      setTournamentEntries((current) => ({
        ...current,
        [tournamentId]: (current[tournamentId] ?? []).map((item) => (item.id === updated.id ? updated : item)),
      }));
      toast({
        title: "Seed updated",
        description: `${updated.teamName} is now ${updated.seedNumber ? `seed ${updated.seedNumber}` : "set to auto seeding"}.`,
      });
    } catch (error) {
      toast({
        title: "Seed update failed",
        description: error instanceof Error ? error.message : "Failed to update seed",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const autoAssignSeeds = async (tournamentId: string) => {
    if (!user) return;
    const strategy = autoSeedStrategies[tournamentId] ?? "REGISTRATION_ORDER";
    setBusyTournamentId(tournamentId);
    try {
      const updatedEntries = await api.autoAssignTournamentSeeds(tournamentId, user, strategy);
      setTournamentEntries((current) => ({
        ...current,
        [tournamentId]: updatedEntries,
      }));
      toast({
        title: "Seeds assigned",
        description: "Seeds were assigned using registration order from the current eligible entries.",
      });
    } catch (error) {
      toast({
        title: "Auto assignment failed",
        description: error instanceof Error ? error.message : "Failed to auto assign bracket seeds",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const lockEntryRoster = async (tournamentId: string, entryId: string) => {
    setBusyTournamentId(tournamentId);
    try {
      const updated = await api.lockTournamentEntryRoster(entryId);
      setTournamentEntries((current) => ({
        ...current,
        [tournamentId]: (current[tournamentId] ?? []).map((entry) => (entry.id === updated.id ? updated : entry)),
      }));
      toast({
        title: "Roster locked",
        description: `${updated.teamName} roster is now locked.`,
      });
    } catch (error) {
      toast({
        title: "Roster lock failed",
        description: error instanceof Error ? error.message : "Failed to lock roster",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const createMatch = async (tournamentId: string) => {
    if (!user) return;
    const form = matchForms[tournamentId];
    if (!form?.roundLabel || !form.team1Name || !form.team2Name) {
      toast({
        title: "Missing fields",
        description: "Round label and both team names are required to create a match.",
        variant: "destructive",
      });
      return;
    }
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

  const generateBracket = async (tournamentId: string) => {
    if (!user) return;
    setBusyTournamentId(tournamentId);
    try {
      const createdMatches = await api.generateBracket(tournamentId, user);
      setMatchReports((current) => ({
        ...current,
        [tournamentId]: createdMatches,
      }));
      toast({
        title: "Bracket generated",
        description: "Single-elimination matches were created from the registered teams.",
      });
      await loadManagedTournaments();
    } catch (error) {
      toast({
        title: "Bracket generation failed",
        description: error instanceof Error ? error.message : "Failed to generate bracket",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const resetAndRegenerateBracket = async (tournamentId: string) => {
    if (!user) return;
    setBusyTournamentId(tournamentId);
    try {
      // 1. Call api.resetBracket to delete existing matches and stages
      await api.resetBracket(tournamentId, user);

      // 2. Re-generate bracket fresh
      const createdMatches = await api.generateBracket(tournamentId, user);
      setMatchReports((current) => ({
        ...current,
        [tournamentId]: createdMatches,
      }));

      toast({
        title: "Bracket regenerated",
        description: `New bracket created with ${createdMatches.length} matches from the current entries.`,
      });
      await loadManagedTournaments();
    } catch (error) {
      toast({
        title: "Regeneration failed",
        description: error instanceof Error ? error.message : "Failed to regenerate bracket",
        variant: "destructive",
      });
    } finally {
      setBusyTournamentId(null);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-20 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="font-heading text-3xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground italic">Only organizers and admins can manage tournaments.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-10 px-4 space-y-8 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {activeTournamentId ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveTournamentId(null)}
                className="hover:bg-white/10"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">
                {activeTournamentId ? activeTournament?.title : "Tournament Manager"}
              </h1>
              <p className="text-muted-foreground">
                {activeTournamentId 
                  ? `${activeTournament?.gameTitle} - ${activeTournament?.displayStatus}`
                  : "Create, publish, and manage your esports events from one dashboard."}
              </p>
            </div>
          </div>

          {!activeTournamentId && (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
                <span className="text-muted-foreground mr-2">Total Tournaments:</span>
                <span className="font-bold text-primary">{managedTournaments.length}</span>
              </div>
            </div>
          )}
        </div>

        {!activeTournamentId ? (
          <>
            <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3 mb-4">
                <Plus className="w-5 h-5 text-primary" />
                <h2 className="font-heading text-xl font-bold">Launch New Event</h2>
              </div>
              <Card className="glass border-white/10">
                <CardHeader>
                  <CardTitle className="font-heading italic">Create Tournament</CardTitle>
                  <CardDescription>Configure format, rules, registration dates, and entry settings before publishing.</CardDescription>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <Label htmlFor="format">Format</Label>
                  <select
                    id="format"
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as Tournament["format"] })}
                    className="flex h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    <option value="TEAM">Team</option>
                    <option value="SOLO">Solo</option>
                    <option value="DUO">Duo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bracketType">Bracket Type</Label>
                  <select
                    id="bracketType"
                    value={formData.bracketType}
                    onChange={(e) => setFormData({ ...formData, bracketType: e.target.value as any })}
                    className="flex h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    <option value="SINGLE_ELIMINATION">Single Elimination</option>
                    <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tournamentType">Tournament Type</Label>
                  <select
                    id="tournamentType"
                    value={formData.tournamentType}
                    onChange={(e) =>
                      setFormData({ ...formData, tournamentType: e.target.value as Tournament["tournamentType"] })
                    }
                    className="flex h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="LAN">LAN</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rules">Rules</Label>
                <textarea
                  id="rules"
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  placeholder="Match rules, eligibility requirements, scoring details, and dispute process."
                  className="min-h-28 w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <div className="relative">
                    <Input
                      id="startDate"
                      type="datetime-local"
                      className="pl-10 h-12 bg-white/5 border-white/10"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                    <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationOpenAt">Registration Opens</Label>
                  <Input
                    id="registrationOpenAt"
                    type="datetime-local"
                    className="h-12 bg-white/5 border-white/10"
                    value={formData.registrationOpenAt}
                    onChange={(e) => setFormData({ ...formData, registrationOpenAt: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationCloseAt">Registration Closes</Label>
                  <Input
                    id="registrationCloseAt"
                    type="datetime-local"
                    className="h-12 bg-white/5 border-white/10"
                    value={formData.registrationCloseAt}
                    onChange={(e) => setFormData({ ...formData, registrationCloseAt: e.target.value })}
                  />
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
                  <Label htmlFor="minPlayersPerTeam">Min Players Per Team</Label>
                  <Input
                    id="minPlayersPerTeam"
                    type="number"
                    className="h-12 bg-white/5 border-white/10"
                    value={formData.minPlayersPerTeam}
                    onChange={(e) => setFormData({ ...formData, minPlayersPerTeam: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPlayersPerTeam">Max Players Per Team</Label>
                  <Input
                    id="maxPlayersPerTeam"
                    type="number"
                    className="h-12 bg-white/5 border-white/10"
                    value={formData.maxPlayersPerTeam}
                    onChange={(e) => setFormData({ ...formData, maxPlayersPerTeam: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <select
                    id="visibility"
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as Tournament["visibility"] })}
                    className="flex h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="UNLISTED">Unlisted</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitlistEnabled">Waitlist</Label>
                  <select
                    id="waitlistEnabled"
                    value={formData.waitlistEnabled ? "enabled" : "disabled"}
                    onChange={(e) => setFormData({ ...formData, waitlistEnabled: e.target.value === "enabled" })}
                    className="flex h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    <option value="disabled">Disabled</option>
                    <option value="enabled">Enabled</option>
                  </select>
                </div>
              </div>

              {createFormErrors.length > 0 && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                  {createFormErrors[0]}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full h-12 text-lg font-heading tracking-wider bg-gradient-to-r from-primary to-neon-purple hover:neon-glow-blue transition-all"
                disabled={isSubmitting || createFormErrors.length > 0}
              >
                {isSubmitting ? "SAVING..." : "CREATE DRAFT TOURNAMENT"}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse font-heading tracking-widest uppercase text-xs">Synchronizing Events...</p>
          </div>
        ) : managedTournaments.length === 0 ? (
          <div className="py-20 text-center glass border-dashed border-white/10 rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-muted-foreground opacity-20" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground">No tournaments yet</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2 italic">
              Ready to kick off the next pro league? Fill out the draft form above to get started.
            </p>
          </div>
        ) : !activeTournamentId ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {managedTournaments.map((tournament) => (
              <Card 
                key={tournament.id} 
                className="glass border-white/10 hover:border-primary/40 transition-all group cursor-pointer"
                onClick={() => setActiveTournamentId(tournament.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                      tournament.status === "LIVE" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                      tournament.status === "PUBLISHED" ? "text-blue-400 border-blue-500/20 bg-blue-500/5" :
                      "text-muted-foreground border-white/10 bg-white/5"
                    )}>
                      {tournament.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {(tournament._count?.entries ?? 0)} / {tournament.maxTeams} Teams
                    </span>
                  </div>
                  <CardTitle className="font-heading text-lg group-hover:text-primary transition-colors line-clamp-1">
                    {tournament.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-1">{tournament.gameTitle} • {tournament.format}</CardDescription>
                </CardHeader>
                <CardFooter className="pt-0 flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground italic">
                    Starts {tournament.startDate ? new Date(tournament.startDate).toLocaleDateString() : "TBD"}
                  </span>
                  <Button variant="ghost" size="sm" className="text-xs hover:bg-primary/10 hover:text-primary">
                    Manage Dashboard
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {managedTournaments.filter(t => t.id === activeTournamentId).map(tournament => {
              const isEditing = editingTournamentId === tournament.id;
              const matches = matchReports[tournament.id] ?? [];
              const admins = tournamentAdmins[tournament.id] ?? [];
              const entries = tournamentEntries[tournament.id] ?? [];
              const matchForm = matchForms[tournament.id] ?? createMatchForm();
              const delegationForm = delegationForms[tournament.id] ?? createDelegationForm();
              const allowedTransitions = getAllowedStatusTransitions(tournament.status);
              const readiness = getBracketReadiness(
                entries.map((entry) => ({
                  teamId: entry.teamId,
                  teamName: entry.teamName,
                  checkInStatus: entry.checkInStatus,
                  rosterLockedAt: entry.rosterLockedAt ?? null,
                })),
                isCheckInRequired(tournament.status),
              );
              // ... continuation of dashboard tabs

                const canManageDelegation = user.role === "ADMIN" || tournament.organizerId === user.id;

              return (
                <Tabs key={tournament.id} defaultValue="overview" className="w-full space-y-6">
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-white/5 border border-white/10 p-1 h-auto gap-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 gap-2 h-10"><LayoutDashboard className="w-4 h-4" /> Overview</TabsTrigger>
                    <TabsTrigger value="players" className="data-[state=active]:bg-primary/20 gap-2 h-10"><Users className="w-4 h-4" /> Players</TabsTrigger>
                    <TabsTrigger value="matches" className="data-[state=active]:bg-primary/20 gap-2 h-10"><Swords className="w-4 h-4" /> Matches</TabsTrigger>
                    <TabsTrigger value="settings" className="data-[state=active]:bg-primary/20 gap-2 h-10"><Settings className="w-4 h-4" /> Settings</TabsTrigger>
                    <TabsTrigger value="staff" className="data-[state=active]:bg-primary/20 gap-2 h-10"><Shield className="w-4 h-4" /> Staff</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6 outline-none">
                    <div className="grid gap-6 md:grid-cols-3">
                      <Card className="glass border-white/10">
                        <CardHeader className="pb-2">
                          <CardDescription>Status & Control</CardDescription>
                          <CardTitle className="text-2xl font-bold">{tournament.displayStatus}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                          {statusActions.map((action) => (
                            <Button
                              key={action.status}
                              variant="outline"
                              size="sm"
                              className="border-white/10 text-xs"
                              disabled={busyTournamentId === tournament.id || (action.status !== tournament.status && !allowedTransitions.includes(action.status))}
                              onClick={() => void changeTournamentStatus(tournament.id, action.status)}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </CardContent>
                      </Card>
                      
                      <Card className="glass border-white/10">
                        <CardHeader className="pb-2">
                          <CardDescription>Participants</CardDescription>
                          <CardTitle className="text-2xl font-bold">{(tournament._count?.entries ?? 0)} / {tournament.maxTeams}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">{entries.filter(e => e.checkInStatus === "CHECKED_IN").length} Checked In</p>
                        </CardContent>
                      </Card>

                      <Card className="glass border-white/10">
                        <CardHeader className="pb-2">
                          <CardDescription>Readiness</CardDescription>
                          <CardTitle className={cn("text-2xl font-bold", readiness.ready ? "text-emerald-400" : "text-amber-400")}>
                            {readiness.ready ? "Ready" : "Action Required"}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">{readiness.issues.length} Pending Preconditions</p>
                        </CardContent>
                      </Card>
                    </div>

                    {!readiness.ready && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 animate-pulse">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-200">Bracket Generation Blocked</p>
                            <ul className="text-xs text-amber-200/80 mt-1 space-y-1">
                              {readiness.issues.map((issue) => <li key={issue}>• {issue}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    <Card className="glass border-white/10">
                      <CardHeader>
                        <CardTitle className="text-lg">Rules & Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {tournament.rules || "No specific rules provided for this event."}
                        </p>
                      </CardContent>
                      <CardFooter className="border-t border-white/5 pt-4">
                        <Button variant="outline" className="border-red-500/20 text-red-300 hover:bg-red-500/10 ml-auto" onClick={() => void deleteTournament(tournament.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Tournament
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                    <CardContent className="space-y-6">
                      {isEditing && (
                        <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={editingForm.title} onChange={(e) => setEditingForm((current) => ({ ...current, title: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Game</Label>
                            <Input value={editingForm.gameTitle} onChange={(e) => setEditingForm((current) => ({ ...current, gameTitle: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Format</Label>
                            <select
                              value={editingForm.format}
                              onChange={(e) => setEditingForm((current) => ({ ...current, format: e.target.value as Tournament["format"] }))}
                              className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                            >
                              <option value="TEAM">Team</option>
                              <option value="SOLO">Solo</option>
                              <option value="DUO">Duo</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Bracket Type</Label>
                            <select
                              value={editingForm.bracketType}
                              onChange={(e) => setEditingForm((current) => ({ ...current, bracketType: e.target.value as any }))}
                              className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                            >
                              <option value="SINGLE_ELIMINATION">Single Elimination</option>
                              <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Tournament Type</Label>
                            <select
                              value={editingForm.tournamentType}
                              onChange={(e) =>
                                setEditingForm((current) => ({ ...current, tournamentType: e.target.value as Tournament["tournamentType"] }))
                              }
                              className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                            >
                              <option value="ONLINE">Online</option>
                              <option value="LAN">LAN</option>
                              <option value="HYBRID">Hybrid</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input type="datetime-local" value={editingForm.startDate} onChange={(e) => setEditingForm((current) => ({ ...current, startDate: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Registration Opens</Label>
                            <Input type="datetime-local" value={editingForm.registrationOpenAt} onChange={(e) => setEditingForm((current) => ({ ...current, registrationOpenAt: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Registration Closes</Label>
                            <Input type="datetime-local" value={editingForm.registrationCloseAt} onChange={(e) => setEditingForm((current) => ({ ...current, registrationCloseAt: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Teams</Label>
                            <Input type="number" value={editingForm.maxTeams} onChange={(e) => setEditingForm((current) => ({ ...current, maxTeams: Number(e.target.value) }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Min Players Per Team</Label>
                            <Input type="number" value={editingForm.minPlayersPerTeam} onChange={(e) => setEditingForm((current) => ({ ...current, minPlayersPerTeam: Number(e.target.value) }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Players Per Team</Label>
                            <Input type="number" value={editingForm.maxPlayersPerTeam} onChange={(e) => setEditingForm((current) => ({ ...current, maxPlayersPerTeam: Number(e.target.value) }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Entry Fee</Label>
                            <Input type="number" value={editingForm.entryFee} onChange={(e) => setEditingForm((current) => ({ ...current, entryFee: Number(e.target.value) }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Prize Pool</Label>
                            <Input type="number" value={editingForm.prizePool} onChange={(e) => setEditingForm((current) => ({ ...current, prizePool: Number(e.target.value) }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Visibility</Label>
                            <select
                              value={editingForm.visibility}
                              onChange={(e) => setEditingForm((current) => ({ ...current, visibility: e.target.value as Tournament["visibility"] }))}
                              className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                            >
                              <option value="PUBLIC">Public</option>
                              <option value="UNLISTED">Unlisted</option>
                              <option value="PRIVATE">Private</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Waitlist</Label>
                            <select
                              value={editingForm.waitlistEnabled ? "enabled" : "disabled"}
                              onChange={(e) => setEditingForm((current) => ({ ...current, waitlistEnabled: e.target.value === "enabled" }))}
                              className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                            >
                              <option value="disabled">Disabled</option>
                              <option value="enabled">Enabled</option>
                            </select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Rules</Label>
                            <textarea
                              value={editingForm.rules}
                              onChange={(e) => setEditingForm((current) => ({ ...current, rules: e.target.value }))}
                              className="min-h-24 w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm"
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
                          <p className="font-semibold">{new Date(tournament.startDate).toLocaleString()}</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <p className="text-muted-foreground">Format</p>
                          <p className="font-semibold">{tournament.format}</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <p className="text-muted-foreground">Entry Settings</p>
                          <p className="font-semibold">{tournament.minPlayersPerTeam}-{tournament.maxPlayersPerTeam ?? tournament.minPlayersPerTeam} players</p>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <p className="text-muted-foreground">Match Reports</p>
                          <p className="font-semibold">{matches.length}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4 text-sm">
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                          <p className="text-muted-foreground">Registration Window</p>
                          <p className="font-semibold">{tournament.registrationOpenAt ? new Date(tournament.registrationOpenAt).toLocaleString() : "Not set"}</p>
                          <p className="text-xs text-muted-foreground mt-1">{tournament.registrationCloseAt ? new Date(tournament.registrationCloseAt).toLocaleString() : "No close date"}</p>
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
                          <p className="text-muted-foreground">Visibility / Waitlist</p>
                          <p className="font-semibold">{tournament.visibility}</p>
                          <p className="text-xs text-muted-foreground mt-1">{tournament.waitlistEnabled ? "Waitlist enabled" : "Waitlist disabled"}</p>
                        </div>
                      </div>

                      {!readiness.ready && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                          <div className="flex items-center gap-2 font-semibold mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            Bracket Preconditions Not Met
                          </div>
                          {readiness.issues.map((issue) => (
                            <p key={issue} className="text-xs">{issue}</p>
                          ))}
                        </div>
                      )}

                      {tournament.rules && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <h3 className="font-heading text-lg mb-2">Rules</h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tournament.rules}</p>
                        </div>
                      )}

                      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div>
                          <h3 className="font-heading text-lg">Delegated Staff</h3>
                          <p className="text-sm text-muted-foreground">Assign tournament-scoped admins, referees, and staff.</p>
                        </div>
                        <div className="space-y-2">
                          {admins.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No delegated staff assigned yet.</p>
                          ) : (
                            admins.map((assignment) => (
                              <div key={assignment.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-background/30 p-3">
                                <div>
                                  <p className="font-medium">{assignment.userName}</p>
                                  <p className="text-xs text-muted-foreground">{assignment.userId} · {assignment.role}</p>
                                </div>
                                {assignment.role !== "OWNER" && canManageDelegation && (
                                  <Button
                                    variant="outline"
                                    className="border-red-500/20 text-red-300 hover:bg-red-500/10"
                                    disabled={busyTournamentId === tournament.id}
                                    onClick={() => void removeDelegatedStaff(tournament.id, assignment.userId)}
                                  >
                                    <UserX className="w-4 h-4 mr-2" />
                                    Remove
                                  </Button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        {canManageDelegation && (
                          <div className="grid gap-3 md:grid-cols-[1fr,180px,auto]">
                            <Input
                              placeholder="User ID"
                              value={delegationForm.userId}
                              onChange={(e) =>
                                setDelegationForms((current) => ({
                                  ...current,
                                  [tournament.id]: { ...delegationForm, userId: e.target.value },
                                }))
                              }
                            />
                            <select
                              value={delegationForm.role}
                              onChange={(e) =>
                                setDelegationForms((current) => ({
                                  ...current,
                                  [tournament.id]: {
                                    ...delegationForm,
                                    role: e.target.value as Exclude<TournamentAdminRole, "OWNER">,
                                  },
                                }))
                              }
                              className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                            >
                              <option value="STAFF">Staff</option>
                              <option value="REFEREE">Referee</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                            <Button disabled={busyTournamentId === tournament.id} onClick={() => void addDelegatedStaff(tournament.id)}>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Add Staff
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div>
                          <h3 className="font-heading text-lg">Entries, Check-In & Roster Lock</h3>
                          <p className="text-sm text-muted-foreground">Assign bracket seeds, complete check-in, and lock rosters before generating matches.</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <select
                            value={autoSeedStrategies[tournament.id] ?? "REGISTRATION_ORDER"}
                            onChange={(e) =>
                              setAutoSeedStrategies((current) => ({
                                ...current,
                                [tournament.id]: e.target.value as AutoSeedStrategy,
                              }))
                            }
                            className="flex h-10 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                          >
                            <option value="REGISTRATION_ORDER">Registration Order</option>
                          </select>
                          <Button
                            variant="outline"
                            className="border-white/10"
                            disabled={busyTournamentId === tournament.id || entries.length < 2}
                            onClick={() => void autoAssignSeeds(tournament.id)}
                          >
                            <Target className="w-4 h-4 mr-2" />
                            Auto Assign
                          </Button>
                          <p className="text-xs text-muted-foreground self-center">
                            Uses the selected strategy to seed eligible entries before bracket generation.
                          </p>
                        </div>
                        {entries.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No teams registered yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {entries.map((entry) => (
                              <div key={entry.id} className="grid gap-3 rounded-xl border border-white/10 bg-background/30 p-4 md:grid-cols-[1.2fr,140px,1fr,1fr,auto,auto] md:items-end">
                                <div>
                                  <p className="font-semibold">{entry.teamName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {`Reg Order: ${registrationOrderByEntryId.get(entry.id) ?? "-"} | Check-In: ${entry.checkInStatus} | Roster: ${entry.rosterLockedAt ? "Locked" : "Unlocked"}`}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Seed</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={tournament.maxTeams}
                                    value={entry.seedNumber ?? ""}
                                    onChange={(e) => {
                                      const rawValue = e.target.value;
                                      setTournamentEntries((current) => ({
                                        ...current,
                                        [tournament.id]: (current[tournament.id] ?? []).map((item) =>
                                          item.id === entry.id
                                            ? {
                                                ...item,
                                                seedNumber: rawValue === "" ? null : Number(rawValue),
                                              }
                                            : item,
                                        ),
                                      }));
                                    }}
                                    className="bg-white/5 border-white/10"
                                    disabled={busyTournamentId === tournament.id}
                                  />
                                </div>
                                <select
                                  value={entry.checkInStatus}
                                  onChange={(e) => void updateEntryCheckIn(tournament.id, entry.id, e.target.value as TournamentEntryCheckInStatus)}
                                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                                  disabled={busyTournamentId === tournament.id}
                                >
                                  <option value="NOT_OPEN">Not Open</option>
                                  <option value="PENDING">Pending</option>
                                  <option value="CHECKED_IN">Checked In</option>
                                  <option value="MISSED">Missed</option>
                                </select>
                                <Button
                                  variant="outline"
                                  className="border-white/10"
                                  disabled={busyTournamentId === tournament.id || Boolean(entry.rosterLockedAt) || entry.checkInStatus !== "CHECKED_IN"}
                                  onClick={() => void lockEntryRoster(tournament.id, entry.id)}
                                >
                                  <Lock className="w-4 h-4 mr-2" />
                                  Lock Roster
                                </Button>
                                <Button
                                  variant="outline"
                                  className="border-white/10"
                                  disabled={busyTournamentId === tournament.id}
                                  onClick={() => void saveEntrySeed(tournament.id, entry)}
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Seed
                                </Button>
                                <Button
                                  variant="outline"
                                  className="border-white/10"
                                  disabled={busyTournamentId === tournament.id}
                                  onClick={() => void updateEntryCheckIn(tournament.id, entry.id, "CHECKED_IN")}
                                >
                                  <ClipboardCheck className="w-4 h-4 mr-2" />
                                  Quick Check-In
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
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
                        <Button variant="outline" className="border-white/10" onClick={async () => {
                          const n = (document.getElementById(`manual-name-${tournament.id}`) as any).value;
                          const e = (document.getElementById(`manual-email-${tournament.id}`) as any).value;
                          const p = (document.getElementById(`manual-phone-${tournament.id}`) as any).value;
                          if(!n || !e || !p) {
                            toast({ title: "Error", description: "All fields are mandatory", variant: "destructive" });
                            return;
                          }
                          setBusyTournamentId(tournament.id);
                          try {
                            await api.adminAddUsers(tournament.id, [{name: n, email: e, phoneNumber: p}], user!);
                            toast({ title: "Success", description: "Player added successfully" });
                            (document.getElementById(`manual-name-${tournament.id}`) as any).value = "";
                            (document.getElementById(`manual-email-${tournament.id}`) as any).value = "";
                            (document.getElementById(`manual-phone-${tournament.id}`) as any).value = "";
                            refreshTournamentOps(tournament.id);
                          } catch(err) { 
                            toast({ title: "Operation failed", description: err.message, variant: "destructive" });
                          }
                          setBusyTournamentId(null);
                        }}>
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
                          <Button variant="outline" className="mt-2 border-white/10" onClick={async () => {
                            const val = (document.getElementById(`bulk-input-${tournament.id}`) as any).value;
                            if (!val.trim()) return;
                            let list = [];
                            try {
                              if(val.trim().startsWith("[")) {
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
                              
                              if(list.length === 0) throw new Error("No valid data found. Ensure Name, Email, and Phone are present.");
                              
                              setBusyTournamentId(tournament.id);
                              await api.adminAddUsers(tournament.id, list, user!);
                              toast({ title: "Bulk Success", description: `Successfully added ${list.length} players.` });
                              (document.getElementById(`bulk-input-${tournament.id}`) as any).value = "";
                              refreshTournamentOps(tournament.id);
                            } catch(err) { 
                              toast({ title: "Bulk Error", description: err.message, variant: "destructive" });
                            }
                            setBusyTournamentId(null);
                          }}>
                            <Users className="w-4 h-4 mr-2" />
                            Bulk Import
                          </Button>
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
