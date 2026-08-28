import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AuthPanel } from "@/components/AuthPanel";
import { useAuth } from "@/hooks/useAuth";
import { api, Team, Tournament, TournamentEntry } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  Users, 
  Shield, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  ClipboardCheck, 
  Lock, 
  Search, 
  Plus,
  Copy,
  Send,
  MessageCircle,
  Disc
} from "lucide-react";
import confetti from 'canvas-confetti';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface RegistrationWizardProps {
  tournament: Tournament | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RegistrationWizard({ tournament, isOpen, onClose }: RegistrationWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myEntries, setMyEntries] = useState<TournamentEntry[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Solo fields
  const [soloFullName, setSoloFullName] = useState(user?.name || "");
  const [soloEmail, setSoloEmail] = useState(user?.email || "");
  const [soloPhone, setSoloPhone] = useState(user?.phoneNumber || "");

  // Search fields
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{id: string, name: string, email: string|null, riot_id: string|null}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isSubmittingNewTeam, setIsSubmittingNewTeam] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);
  const [isJoinCodeFormOpen, setIsJoinCodeFormOpen] = useState(false);
  const [currentTeamCode, setCurrentTeamCode] = useState<string | null>(null);

  const mode = tournament?.status === "CHECK_IN" ? "check-in" : "registration";
  const isSolo = tournament?.format === "SOLO";

  useEffect(() => {
    if (isOpen && user) {
      const loadDialogData = async () => {
        setIsLoading(true);
        try {
          const entries = tournament ? await api.getMyTournamentEntries(tournament.id, user.id) : [];
          setMyEntries(entries);

          if (!isSolo) {
            const myTeams = await api.getMyTeams(user.id);
            setTeams(myTeams);
            if (myTeams.length > 0) setSelectedTeamId(myTeams[0].id);
          }
        } catch (error) {
          console.error("Failed to load registration data", error);
        } finally {
          setIsLoading(false);
        }
      };

      void loadDialogData();
    } else {
      setStep(1);
      setTeams([]);
      setMyEntries([]);
      setSelectedTeamId("");
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isOpen, tournament, user, isSolo]);

  useEffect(() => {
    if (user && isSolo) {
      setSoloFullName(user.name);
      setSoloEmail(user.email);
      setSoloPhone(user?.phoneNumber || "");
    }
  }, [user, isSolo]);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId);

  const handleRegister = async () => {
    if (!tournament || !user) return;
    setIsRegistering(true);
    try {
      if (isSolo) {
        if (!soloFullName || !soloPhone || !soloEmail) {
          throw new Error("Please fill in all fields.");
        }
        await api.registerSolo(tournament.id, {
          id: user.id,
          name: soloFullName,
          role: "PLAYER",
          email: soloEmail,
          phoneNumber: soloPhone,
          riotId: undefined,
        });
      } else {
        if (!selectedTeamId) throw new Error("No team selected");
        await api.registerTeam(tournament.id, selectedTeamId, user.id);
      }
      
      // Trigger Victory Confetti!
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#2dd4bf', '#ffffff']
      });

      setStep(isSolo ? 2 : 4);
    } catch (error: any) {
      const message = error?.message || (error instanceof Error ? error.message : "Registration failed");
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCreateTeamInWizard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTeamName.trim()) return;
    setIsSubmittingNewTeam(true);
    try {
      const newTeam = await api.createTeam({
        name: newTeamName.trim(),
        captain: user,
      });
      setTeams(current => [...current, newTeam]);
      setSelectedTeamId(newTeam.id);
      setIsCreatingTeam(false);
      setNewTeamName("");
      setStep(2); // Auto-advance to Roster Verification
      toast({ title: "Team created", description: `"${newTeam.name}" is ready for registration.` });
    } catch (error: any) {
      toast({ 
        title: "Creation failed", 
        description: (error as any)?.message || "Failed to create team", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmittingNewTeam(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;
    setIsJoiningByCode(true);
    try {
      const joinedTeam = await api.joinTeamByCode(inviteCode.trim(), {
        id: user.id,
        name: user.name,
        role: "PLAYER",
      });
      setTeams(current => [...current.filter(t => t.id !== joinedTeam.id), joinedTeam]);
      setSelectedTeamId(joinedTeam.id);
      setIsJoinCodeFormOpen(false);
      setInviteCode("");
      toast({ title: "Welcome to the squad!", description: `You've joined "${joinedTeam.name}".` });
    } catch (error: any) {
      toast({ 
        title: "Join failed", 
        description: (error as any)?.message || "Invalid code", 
        variant: "destructive" 
      });
    } finally {
      setIsJoiningByCode(false);
    }
  };

  useEffect(() => {
    if (selectedTeamId && step === 2) {
      const fetchCode = async () => {
        try {
          const code = await api.getOrCreateInviteCode(selectedTeamId);
          setCurrentTeamCode(code);
        } catch (err) {
          console.warn("Could not fetch invite code", err);
        }
      };
      void fetchCode();
    }
  }, [selectedTeamId, step]);

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await api.searchUsers(searchQuery);
      // Filter out existing members
      const existingIds = new Set(selectedTeam?.members.map(m => m.user.id));
      setSearchResults(results.filter(r => !existingIds.has(r.id)));
    } catch (error: any) {
      const message = error?.message || (error instanceof Error ? error.message : "Search failed");
      toast({ title: "Search failed", description: message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (targetUser: {id: string, name: string}) => {
    if (!selectedTeamId || !user) return;
    setIsAddingMember(true);
    try {
      const updatedTeam = await api.addTeamMember(selectedTeamId, {
        memberName: targetUser.name,
        userId: targetUser.id,
        requester: { id: user.id, name: user.name, role: "PLAYER" }
      });
      setTeams(current => current.map(t => t.id === updatedTeam.id ? updatedTeam : t));
      setSearchResults(current => current.filter(u => u.id !== targetUser.id));
      toast({ title: "Player added", description: `${targetUser.name} added to your roster.` });
    } catch (error: any) {
      const message = error?.message || (error instanceof Error ? error.message : "Failed to add member");
      toast({ title: "Failed to add member", description: message, variant: "destructive" });
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleCheckIn = async (entryId: string) => {
    setIsCheckingIn(true);
    try {
      const updatedEntry = await api.updateTournamentEntryCheckIn(entryId, "CHECKED_IN");
      setMyEntries((current) => current.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)));
      toast({
        title: "Check-in complete",
        description: `${updatedEntry.teamName} has been checked in.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Check-in failed";
      toast({
        title: "Check-in Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (!tournament) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden glass border-white/10 max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-primary/20 to-neon-purple/20 p-6 border-b border-white/10">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              {mode === "check-in" ? "Tournament Check-In" : "Tournament Registration"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {mode === "check-in"
                ? `${tournament.title} - confirm your attendance`
                : `${tournament.title} - ETB ${tournament.entryFee} Entry`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!user ? (
            <AuthPanel
              title="Sign in to register"
              description="Use a player or organizer account before entering a tournament."
            />
          ) : (
            <>
          {mode === "registration" && !isSolo && (
            <div className="flex items-center gap-2 mb-8">
              {[1, 2, 3, 4].map((progressStep) => (
                <div
                  key={progressStep}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-300",
                    step >= progressStep ? "bg-primary" : "bg-white/10",
                  )}
                />
              ))}
            </div>
          )}

          {mode === "registration" && myEntries.length > 0 && step < 4 && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Already Registered</p>
                <p className="text-sm opacity-90">You've already register for this tournament.</p>
              </div>
            </div>
          )}

          {mode === "check-in" ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="font-heading text-lg font-bold">Self Check-In</h3>
              <p className="text-sm text-muted-foreground">
                Select your entry and confirm you are ready to compete.
              </p>

              {isLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : myEntries.length > 0 ? (
                <div className="space-y-3">
                  {myEntries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold">{entry.teamName}</p>
                          <p className="text-xs text-muted-foreground">
                            Check-In: {entry.checkInStatus} · Roster: {entry.rosterLockedAt ? "Locked" : "Pending lock by admin"}
                          </p>
                        </div>
                        {entry.checkInStatus === "CHECKED_IN" ? (
                          <span className="inline-flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            Checked In
                          </span>
                        ) : (
                          <Button
                            onClick={() => void handleCheckIn(entry.id)}
                            disabled={isCheckingIn}
                            className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
                          >
                            {isCheckingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
                            Check In
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-white/20 rounded-xl">
                  <span className="text-muted-foreground">You are not registered for this tournament yet.</span>
                </div>
              )}
            </div>
          ) : isSolo ? (
            step === 1 ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="font-heading text-lg font-bold">Player Details</h3>
                <p className="text-sm text-muted-foreground">
                  Provide your details to register for this solo tournament.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-bold opacity-80">Full Name</label>
                    <Input value={soloFullName} onChange={e => setSoloFullName(e.target.value)} placeholder="John Doe" className="bg-background/50" />
                  </div>
                  <div>
                    <label className="text-sm font-bold opacity-80">Phone Number</label>
                    <Input value={soloPhone} onChange={e => setSoloPhone(e.target.value)} placeholder="+1 234 567 8900" className="bg-background/50" />
                  </div>
                  <div>
                    <label className="text-sm font-bold opacity-80">Email</label>
                    <Input type="email" value={soloEmail} onChange={e => setSoloEmail(e.target.value)} placeholder="player@example.com" className="bg-background/50" />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Tournament</span>
                    <span className="font-bold">{tournament.title}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between items-center text-lg font-heading">
                    <span className="text-foreground font-bold">Entry Fee</span>
                    <span className="text-primary font-bold">ETB {tournament.entryFee}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                <h2 className="font-heading text-3xl font-bold">You're In!</h2>
                <p className="text-muted-foreground max-w-[280px]">
                  Successfully registered as <span className="text-foreground font-bold">{soloFullName}</span> for the tournament.
                </p>
              </div>
            )
          ) : step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="font-heading text-lg font-bold">Select Your Team</h3>
              <p className="text-sm text-muted-foreground">
                Choose the team you want to represent in this tournament.
              </p>

              {isLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {isCreatingTeam ? (
                    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4 animate-in zoom-in-95">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm">Create New Team</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setIsCreatingTeam(false)}
                          className="text-xs hover:bg-white/5"
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Team Name</label>
                        <Input 
                          placeholder="e.g. Neon Vipers" 
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          className="bg-background/50 border-white/10"
                        />
                      </div>
                      <Button 
                        onClick={handleCreateTeamInWizard} 
                        disabled={!newTeamName.trim() || isSubmittingNewTeam}
                        className="w-full bg-primary"
                      >
                        {isSubmittingNewTeam ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Confirm & Select
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {teams.length > 0 ? (
                        <>
                          {teams.map((team) => (
                            <div
                              key={team.id}
                              onClick={() => setSelectedTeamId(team.id)}
                              className={cn(
                                "p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                                selectedTeamId === team.id
                                  ? "bg-primary/10 border-primary neon-glow-blue"
                                  : "bg-white/5 border-white/10 hover:bg-white/10",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold">
                                  {team.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold">{team.name}</p>
                                  <p className="text-xs text-muted-foreground">{team.members.length} Members</p>
                                </div>
                              </div>
                              {selectedTeamId === team.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                            </div>
                          ))}
                          
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <Button 
                              variant="outline" 
                              className="border-white/10 bg-transparent hover:bg-white/5"
                              onClick={() => setIsCreatingTeam(true)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              New Team
                            </Button>
                            <Button 
                              variant="outline" 
                              className="border-white/10 bg-transparent hover:bg-white/5"
                              onClick={() => setIsJoinCodeFormOpen(true)}
                            >
                              <ClipboardCheck className="w-4 h-4 mr-2" />
                              Join by Code
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="p-8 text-center border border-dashed border-white/20 rounded-xl space-y-4">
                          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                          <p className="text-muted-foreground">You don't have any teams yet.</p>
                          <div className="flex flex-col gap-2">
                            <Button
                              className="bg-primary text-black"
                              onClick={() => setIsCreatingTeam(true)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create My First Team
                            </Button>
                            <Button
                              variant="outline"
                              className="border-white/10"
                              onClick={() => setIsJoinCodeFormOpen(true)}
                            >
                              <ClipboardCheck className="w-4 h-4 mr-2" />
                              Join by Invite Code
                            </Button>
                          </div>
                        </div>
                      )}

                      {isJoinCodeFormOpen && (
                        <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4 animate-in zoom-in-95">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm">Join Team by Code</h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setIsJoinCodeFormOpen(false)}
                              className="text-xs hover:bg-white/5"
                            >
                              Cancel
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Invite Code</label>
                            <Input 
                              placeholder="e.g. NX-A1B2C3" 
                              value={inviteCode}
                              onChange={(e) => setInviteCode(e.target.value)}
                              className="bg-background/50 border-white/10"
                            />
                          </div>
                          <Button 
                            onClick={handleJoinByCode} 
                            disabled={!inviteCode.trim() || isJoiningByCode}
                            className="w-full bg-primary"
                          >
                            {isJoiningByCode ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
                            Join Squad
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && !isSolo && selectedTeam && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold">Roster Verification</h3>
                <div className="flex gap-1">
                  <div className={cn("w-2 h-2 rounded-full", selectedTeam.members.length >= (tournament.minPlayersPerTeam || 1) ? "bg-emerald-500" : "bg-amber-500")} />
                  <div className={cn("w-2 h-2 rounded-full", selectedTeam.members.every(m => m.user.riotId) ? "bg-emerald-500" : "bg-amber-500")} />
                </div>
              </div>
              
              {/* Readiness Checklist */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {selectedTeam.members.length >= (tournament.minPlayersPerTeam || 1) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>Team Size ({selectedTeam.members.length}/{tournament.minPlayersPerTeam || 1} required)</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase opacity-60">
                    {selectedTeam.members.length >= (tournament.minPlayersPerTeam || 1) ? "Ready" : "Incomplete"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {selectedTeam.members.every(m => m.user.riotId) ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                    <span>All Riot IDs linked</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase opacity-60">
                    {selectedTeam.members.every(m => m.user.riotId) ? "Ready" : "Missing IDs"}
                  </span>
                </div>
                
                {/* Invite Code Display */}
                {currentTeamCode && (
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between bg-primary/10 p-2 rounded-lg border border-primary/20">
                      <div>
                        <p className="text-[10px] uppercase font-bold opacity-60">Share Code with Friends</p>
                        <p className="text-sm font-mono font-bold text-primary">{currentTeamCode}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="hover:bg-primary/20"
                        onClick={() => {
                          navigator.clipboard.writeText(currentTeamCode);
                          toast({ title: "Copied!", description: "Invite code copied to clipboard." });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 bg-green-500/10 border-green-500/20 hover:bg-green-500/20 text-[10px] gap-1.5 h-8"
                        onClick={() => {
                          const msg = encodeURIComponent(`Join my squad for the ${tournament?.title} tournament! Code: ${currentTeamCode}`);
                          window.open(`https://wa.me/?text=${msg}`, '_blank');
                        }}
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 text-[10px] gap-1.5 h-8"
                        onClick={() => {
                          const msg = encodeURIComponent(`Join my squad for the ${tournament?.title} tournament! Code: ${currentTeamCode}`);
                          window.open(`https://t.me/share/url?url=${window.location.origin}&text=${msg}`, '_blank');
                        }}
                      >
                        <Send className="w-3 h-3" /> Telegram
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 text-[10px] gap-1.5 h-8"
                        onClick={() => {
                          navigator.clipboard.writeText(`Join my squad for the ${tournament?.title}! Code: ${currentTeamCode}`);
                          toast({ title: "Discord Link Ready!", description: "Message copied. Paste it in your Discord server." });
                        }}
                      >
                        <Disc className="w-3 h-3" /> Discord
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Verify all team members are ready or add new players.
              </p>

              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                {selectedTeam.members.map((member) => (
                  <div
                    key={member.user.id}
                    className="p-3 rounded-lg bg-white/5 flex items-center justify-between border border-transparent hover:border-white/5 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                        {member.user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.user.name}</p>
                        {member.user.riotId ? (
                          <p className="text-[10px] text-emerald-400 font-bold">{member.user.riotId}</p>
                        ) : (
                          <p className="text-[10px] text-amber-400">Missing Riot ID</p>
                        )}
                      </div>
                    </div>
                    {member.user.riotId ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <div className="group relative">
                        <AlertCircle className="w-4 h-4 text-amber-400 cursor-help" />
                        <div className="absolute bottom-full right-0 mb-2 w-32 p-2 bg-black text-[10px] rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          Player must link their Riot ID in their profile settings.
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10 mt-4 space-y-3">
                <h4 className="text-sm font-bold opacity-80">Add Players</h4>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search by name or email..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background/50"
                  />
                  <Button variant="outline" onClick={handleSearchUsers} disabled={!searchQuery || isSearching}>
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="space-y-2 mt-2 p-2 border border-white/10 rounded-lg bg-black/20">
                    {searchResults.map(res => (
                      <div key={res.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5">
                        <div className="text-sm">
                          <p className="font-medium">{res.name}</p>
                          <div className="flex flex-col gap-0.5">
                            {res.riot_id && (
                              <p className="text-[10px] text-primary font-bold">{res.riot_id}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground">{res.email || "No email"}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleAddMember(res)} disabled={isAddingMember}>
                          <Plus className="w-4 h-4 text-primary" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && !isSolo && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="font-heading text-lg font-bold">Final Confirmation</h3>
              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Tournament</span>
                  <span className="font-bold">{tournament.title}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Team</span>
                  <span className="font-bold">{selectedTeam?.name}</span>
                </div>
                <div className="h-px bg-white/10" />
                <div className="flex justify-between items-center text-lg font-heading">
                  <span className="text-foreground font-bold">Total Entry Fee</span>
                  <span className="text-primary font-bold">ETB {tournament.entryFee}</span>
                </div>
              </div>
              <p className="text-[10px] text-center text-muted-foreground italic">
                By clicking "Confirm Registration", you agree to the tournament rules and fair play policy.
              </p>
            </div>
          )}

          {step === 4 && !isSolo && (
            <div className="py-12 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="font-heading text-3xl font-bold">You're In!</h2>
              <p className="text-muted-foreground max-w-[280px]">
                Successfully registered <span className="text-foreground font-bold">{selectedTeam?.name}</span> for the tournament.
              </p>
            </div>
          )}
            </>
          )}
        </div>

        <DialogFooter className="p-6 bg-white/5 border-t border-white/10">
          {!user ? (
            <Button onClick={onClose} variant="outline" className="w-full border-white/10 bg-transparent">
              Close
            </Button>
          ) : mode === "check-in" ? (
            <Button onClick={onClose} className="w-full bg-primary">
              Done
            </Button>
          ) : (isSolo && step === 1) || (!isSolo && step < 4) ? (
            <div className="flex w-full gap-3">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 bg-transparent border-white/10">
                  Back
                </Button>
              )}
              <Button
                onClick={() => {
                  if (isSolo) handleRegister();
                  else if (step === 3) handleRegister();
                  else setStep(step + 1);
                }}
                disabled={
                  (!isSolo && step === 1 && !selectedTeamId) || 
                  (!isSolo && step === 2 && selectedTeam && (selectedTeam.members.length < (tournament.minPlayersPerTeam || 1) || !selectedTeam.members.every(m => m.user.riotId))) ||
                  isRegistering || 
                  (isSolo && (!soloFullName || !soloPhone || !soloEmail)) || 
                  myEntries.length > 0
                }
                className="flex-[2] bg-primary hover:neon-glow-blue"
              >
                {isRegistering ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (isSolo || step === 3) ? (
                  "Confirm Registration"
                ) : (
                  <>Next Step <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={onClose} className="w-full bg-primary">
              Awesome!
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
