import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { CreateTournamentModal } from "@/components/admin/CreateTournamentModal";
import { TournamentTable } from "@/components/admin/TournamentTable";
import { TournamentManager } from "@/components/admin/TournamentManager";
import { cn } from "@/lib/utils";

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
  streamUrl: string;
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
  streamUrl: "",
});

const createMatchForm = (): MatchFormState => ({
  roundLabel: "Quarterfinal",
  team1Name: "",
  team2Name: "",
  scheduledAt: "",
});

const createDelegationForm = (): DelegationFormState => ({
  userId: "",
  role: "REFEREE",
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

const validateTournamentForm = (form: TournamentFormState) => {
  return validateTournamentConfiguration({
    ...form,
    registrationOpenAt: normalizeOptionalDate(form.registrationOpenAt),
    registrationCloseAt: normalizeOptionalDate(form.registrationCloseAt),
  });
};

const toTournamentPayload = (form: TournamentFormState) => ({
  ...form,
  startDate: toIsoOrEmpty(form.startDate),
  registrationOpenAt: normalizeOptionalDate(form.registrationOpenAt),
  registrationCloseAt: normalizeOptionalDate(form.registrationCloseAt),
});

const isCheckInRequired = (status: ApiTournamentStatus) => 
  ["REGISTRATION_CLOSED", "CHECK_IN", "LIVE"].includes(status);



export default function AdminTournaments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
  const [activeControlTab, setActiveControlTab] = useState("overview");


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
        description: (error as any)?.message || "Failed to load tournaments",
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
        title: "Error",
        description: (error as any)?.message || "Failed to refresh tournament operations",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    void loadManagedTournaments();
  }, [loadManagedTournaments, user]);

  // Real-time match updates
  useEffect(() => {
    if (!activeTournamentId) return;

    const matchSub = api.subscribeToMatches(activeTournamentId, () => {
      // Re-fetch matches to ensure we have full hydrated data (teams, etc.)
      void refreshTournamentOps(activeTournamentId);
    });

    return () => {
      void matchSub.unsubscribe();
    };
  }, [activeTournamentId, refreshTournamentOps]);



  const beginEditingTournament = (tournament: Tournament) => {
    setEditingTournamentId(tournament.id);
    setEditingForm({
      title: tournament.title || "",
      gameTitle: tournament.gameTitle || "",
      format: tournament.format,
      bracketType: ((tournament as unknown as Record<string, string>).bracketType as "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN" | "SWISS" | "GROUP_STAGE") || "SINGLE_ELIMINATION",
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
      streamUrl: tournament.streamUrl || "",
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
      // 1. Update general tournament details
      const updated = await api.updateTournament(tournamentId, {
        ...toTournamentPayload(editingForm),
        actor: user,
      });

      // 2. Update the live stream link in the dedicated table
      await api.updateTournamentStream(tournamentId, editingForm.streamUrl);

      setManagedTournaments((current) => current.map((item) => (item.id === tournamentId ? updated : item)));
      setEditingTournamentId(null);
      toast({
        title: "Tournament updated",
        description: "Tournament details and stream link were saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as any)?.message || "Failed to update tournament",
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

      // Trigger Telegram Broadcast if tournament is being published
      if (status === "PUBLISHED") {
        void api.broadcastTournamentNotification(updated);
      }

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

  const updateEntrySeed = (entryId: string, seed: number | null) => {
    setTournamentEntries((current) => {
      const next = { ...current };
      for (const tid in next) {
        next[tid] = next[tid].map((e) => (e.id === entryId ? { ...e, seedNumber: seed } : e));
      }
      return next;
    });
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

  const updateMatchScore = async (tournamentId: string, match: MatchReport) => {
    if (!user) return;
    setBusyTournamentId(match.id);
    try {
      const updated = await api.reportMatchResult(tournamentId, match.id, {
        team1Score: match.team1Score,
        team2Score: match.team2Score,
        status: "IN_PROGRESS",
        actor: user,
      });
      setMatchReports((current) => ({
        ...current,
        [tournamentId]: (current[tournamentId] ?? []).map((item) => (item.id === updated.id ? updated : item)),
      }));
      toast({
        title: "Score updated",
        description: `${updated.team1Name} ${updated.team1Score} – ${updated.team2Score} ${updated.team2Name}`,
      });
    } catch (error) {
      toast({
        title: "Score update failed",
        description: error instanceof Error ? error.message : "Failed to update score",
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

  const deleteEntry = async (tournamentId: string, entryId: string) => {
    if (!confirm("Are you sure you want to remove this participant?")) return;
    setBusyTournamentId(tournamentId);
    try {
      await api.deleteTournamentEntry(entryId);
      setTournamentEntries((current) => ({
        ...current,
        [tournamentId]: (current[tournamentId] ?? []).filter((e) => e.id !== entryId),
      }));
      toast({ title: "Participant removed" });
    } catch (error) {
      toast({ title: "Failed to remove participant", description: (error as any).message, variant: "destructive" });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const updateMatchParticipants = async (tournamentId: string, matchId: string, data: any) => {
    setBusyTournamentId(matchId);
    try {
      await api.updateMatchParticipants(matchId, data);
      await refreshTournamentOps(tournamentId);
      toast({ title: "Match updated" });
    } catch (error) {
      toast({ title: "Failed to update match", description: (error as any).message, variant: "destructive" });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const simulateFullTournament = async (tournamentId: string) => {
    setBusyTournamentId(tournamentId);
    try {
      let hasMore = true;
      let totalSimulated = 0;

      while (hasMore) {
        const currentMatches = await api.getTournamentMatches(tournamentId);
        const playable = currentMatches.filter(m => 
          m.status !== "COMPLETED" && 
          m.team1Name && m.team1Name !== "TBD" && m.team1Name !== "BYE" &&
          m.team2Name && m.team2Name !== "TBD" && m.team2Name !== "BYE"
        );

        if (playable.length === 0) {
          hasMore = false;
          break;
        }

        for (const match of playable) {
          const score1 = Math.floor(Math.random() * 3);
          const score2 = Math.floor(Math.random() * 3);
          const finalScore1 = score1 === score2 ? score1 + 1 : score1;
          
          await reportMatch(tournamentId, {
            ...match,
            team1Score: finalScore1,
            team2Score: score2
          });
          totalSimulated++;
          // Small delay to allow DB/State to catch up and visualize
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Refresh to get new winners in next round slots
        await refreshTournamentOps(tournamentId);
      }

      toast({ title: "Simulation Complete", description: `Simulated ${totalSimulated} matches. Tournament finished!` });
    } catch (error) {
      toast({ title: "Simulation Error", description: error instanceof Error ? error.message : "Failed to simulate", variant: "destructive" });
    } finally {
      setBusyTournamentId(null);
    }
  };

  const restartTournament = async (tournamentId: string) => {
    if (!confirm("CRITICAL WARNING: This will DELETE all matches and reset the tournament status. This cannot be undone. Continue?")) return;
    setBusyTournamentId(tournamentId);
    try {
      // 1. Reset bracket (clears matches and stages)
      await api.resetBracket(tournamentId, user!);
      
      // 2. Reset team check-in statuses to NOT_OPEN
      const { error: entriesError } = await supabase
        .from("tournament_entries")
        .update({ 
          check_in_status: "NOT_OPEN",
          checked_in_at: null,
          roster_locked_at: null
        })
        .eq("tournament_id", tournamentId);
      
      if (entriesError) throw entriesError;

      // 3. Reset tournament status to REGISTRATION_OPEN
      const { error: tournamentError } = await supabase
        .from("tournaments")
        .update({ 
          status: "REGISTRATION_OPEN",
          published_at: null 
        })
        .eq("id", tournamentId);
        
      if (tournamentError) throw tournamentError;
      
      await loadManagedTournaments();
      toast({ title: "Tournament Restarted", description: "Matches cleared, status reset, and check-ins reset." });
    } catch (error) {
      toast({ title: "Restart Failed", description: error instanceof Error ? error.message : "Failed to restart", variant: "destructive" });
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
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hidden md:block">
                <span className="text-muted-foreground mr-2">Managed:</span>
                <span className="font-bold text-primary">{managedTournaments.length}</span>
              </div>
              {user && (user.role === "ORGANIZER" || user.role === "ADMIN") && <CreateTournamentModal user={user} onSuccess={loadManagedTournaments} />}
            </div>
          )}
        </div>

        {!activeTournamentId ? (
          <>


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
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <TournamentTable 
              tournaments={managedTournaments} 
              onSelect={(id) => {
                setActiveTournamentId(id);
                setActiveControlTab("overview");
              }}
              onDelete={deleteTournament}
            />
          </div>
        )}
      </>
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

              const registrationOrderByEntryId = new Map(
                entries.map((entry, index) => [entry.id, index + 1])
              );
              // ... continuation of dashboard tabs

                const canManageDelegation = user.role === "ADMIN" || tournament.organizerId === user.id;

              return (
                <TournamentManager
                  key={tournament.id}
                  tournament={tournament}
                  userRole={user.role}
                  userId={user.id}
                  entries={entries}
                  matches={matches}
                  admins={admins}
                  isEditing={isEditing}
                  editingForm={editingForm}
                  matchForm={matchForm}
                  delegationForm={delegationForm}
                  autoSeedStrategy={autoSeedStrategies[tournament.id] ?? "REGISTRATION_ORDER"}
                  busyTournamentId={busyTournamentId}
                  registrationOrderByEntryId={registrationOrderByEntryId}
                  setEditingForm={setEditingForm}
                  setMatchForm={(form: { roundLabel: string; team1Name: string; team2Name: string; scheduledAt: string }) => setMatchForms(current => ({ ...current, [tournament.id]: form }))}
                  setDelegationForm={(form: { userId: string; role: Exclude<TournamentAdminRole, "OWNER"> }) => setDelegationForms(current => ({ ...current, [tournament.id]: form }))}
                  setAutoSeedStrategy={(strategy: string) => setAutoSeedStrategies(current => ({ ...current, [tournament.id]: strategy as AutoSeedStrategy }))}
                  setBusyTournamentId={setBusyTournamentId}
                  setEditingTournamentId={(id: string | null) => {
                    if (id === null) setEditingTournamentId(null);
                    else {
                      const t = managedTournaments.find(x => x.id === id);
                      if (t) beginEditingTournament(t);
                    }
                  }}
                  saveTournamentEdits={saveTournamentEdits}
                  deleteTournament={deleteTournament}
                  changeTournamentStatus={changeTournamentStatus}
                  autoAssignSeeds={autoAssignSeeds}
                  updateEntrySeed={updateEntrySeed}
                  updateEntryCheckIn={updateEntryCheckIn}
                  lockEntryRoster={lockEntryRoster}
                  saveEntrySeed={saveEntrySeed}
                  createMatch={createMatch}
                  reportMatch={reportMatch}
                  updateMatchScore={updateMatchScore}
                  refreshTournamentOps={refreshTournamentOps}
                  generateBracket={generateBracket}
                  resetAndRegenerateBracket={resetAndRegenerateBracket}
                  setMatchReportScore={(matchId: string, team: 1|2, score: number) => {
                    setMatchReports((current) => ({
                      ...current,
                      [tournament.id]: (current[tournament.id] ?? []).map((item) =>
                        item.id === matchId ? { ...item, [`team${team}Score`]: score } : item
                      )
                    }))
                  }}
                  addDelegatedStaff={addDelegatedStaff}
                  removeDelegatedStaff={removeDelegatedStaff}
                  deleteEntry={deleteEntry}
                  updateMatchParticipants={updateMatchParticipants}
                  simulateFullTournament={simulateFullTournament}
                  restartTournament={restartTournament}
                />
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
