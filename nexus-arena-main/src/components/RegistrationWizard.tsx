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
import { CheckCircle2, Users, Shield, ArrowRight, Loader2, AlertCircle, ClipboardCheck, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const mode = tournament?.status === "CHECK_IN" ? "check-in" : "registration";

  useEffect(() => {
    if (isOpen && user) {
      const loadDialogData = async () => {
        setIsLoading(true);
        try {
          const [myTeams, entries] = await Promise.all([
            api.getMyTeams(user.id),
            tournament ? api.getMyTournamentEntries(tournament.id, user.id) : Promise.resolve([]),
          ]);
          setTeams(myTeams);
          setMyEntries(entries);
          if (myTeams.length > 0) setSelectedTeamId(myTeams[0].id);
        } catch (error) {
          console.error("Failed to load teams", error);
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
    }
  }, [isOpen, tournament, user]);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const handleRegister = async () => {
    if (!tournament || !selectedTeamId || !user) return;
    setIsRegistering(true);
    try {
      await api.registerTeam(tournament.id, selectedTeamId, user.id);
      setStep(4);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registration failed";
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
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
      <DialogContent className="sm:max-w-[500px] glass border-white/10 p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-neon-purple/20 p-6 border-b border-white/10">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              {mode === "check-in" ? "Tournament Check-In" : "Tournament Registration"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {mode === "check-in"
                ? `${tournament.title} - confirm your team attendance`
                : `${tournament.title} - $${tournament.entryFee} Entry`}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          {!user ? (
            <AuthPanel
              title="Sign in to register"
              description="Use a player or organizer account before entering a tournament."
            />
          ) : (
            <>
          {mode === "registration" && (
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

          {mode === "check-in" ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h3 className="font-heading text-lg font-bold">Captain Self Check-In</h3>
              <p className="text-sm text-muted-foreground">
                Select one of your registered teams and confirm they are ready to compete.
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
                      <div className="rounded-lg border border-white/10 bg-background/30 p-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Roster lock is still controlled by tournament staff after captain check-in.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-white/20 rounded-xl">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground">None of your teams are registered for this tournament yet.</p>
                </div>
              )}
            </div>
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
              ) : teams.length > 0 ? (
                <div className="grid gap-3">
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
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-white/20 rounded-xl">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground">You don't have any teams yet.</p>
                  <Button
                    variant="link"
                    className="text-primary mt-2"
                    onClick={() => {
                      onClose();
                      window.location.href = "/teams";
                    }}
                  >
                    Create a Team
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedTeam && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="font-heading text-lg font-bold">Roster Verification</h3>
              <p className="text-sm text-muted-foreground">
                Verify all team members are ready. Game ID linking is optional but recommended.
              </p>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {selectedTeam.members.map((member) => (
                  <div
                    key={member.user.id}
                    className="p-3 rounded-lg bg-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                        {member.user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.user.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {member.user.riotId ? `ID: ${member.user.riotId}` : "Game ID Not Linked"}
                        </p>
                      </div>
                    </div>
                    {member.user.riotId ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
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
                  <span className="text-primary font-bold">${tournament.entryFee}</span>
                </div>
              </div>
              <p className="text-[10px] text-center text-muted-foreground italic">
                By clicking "Confirm Registration", you agree to the tournament rules and fair play
                policy.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="py-12 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="font-heading text-3xl font-bold">You're In!</h2>
              <p className="text-muted-foreground max-w-[280px]">
                Successfully registered{" "}
                <span className="text-foreground font-bold">{selectedTeam?.name}</span> for the
                tournament.
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
          ) : step < 4 ? (
            <div className="flex w-full gap-3">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 bg-transparent border-white/10"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={() => (step === 3 ? void handleRegister() : setStep(step + 1))}
                disabled={(step === 1 && !selectedTeamId) || isRegistering}
                className="flex-[2] bg-primary hover:neon-glow-blue"
              >
                {isRegistering ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : step === 3 ? (
                  "Confirm Registration"
                ) : (
                  <>
                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                  </>
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
