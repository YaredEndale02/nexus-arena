import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api, type MatchReport, type MyRegistration } from "@/lib/api";
import { CalendarDays, ClipboardCheck, ExternalLink, Loader2, Swords, ShieldCheck, Trophy, Users, LogOut, AlertTriangle } from "lucide-react";

const statusTone: Record<string, string> = {
  Draft: "text-muted-foreground",
  Published: "text-sky-300",
  "Registration Open": "text-primary",
  "Registration Closed": "text-amber-300",
  "Check-In": "text-emerald-300",
  Live: "text-red-400",
  Completed: "text-muted-foreground",
  Cancelled: "text-red-300",
};

export default function MyRegistrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<MyRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);

  const loadRegistrations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await api.getMyRegistrations(user.id);
      setRegistrations(data);
    } catch (error) {
      toast({
        title: "Load failed",
        description: error instanceof Error ? error.message : "Failed to load registrations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (!user) return;
    void loadRegistrations();
  }, [loadRegistrations, user]);

  const stats = useMemo(() => {
    return {
      total: registrations.length,
      checkInOpen: registrations.filter((item) => item.tournament.status === "CHECK_IN").length,
      checkedIn: registrations.filter((item) => item.entry.checkInStatus === "CHECKED_IN").length,
    };
  }, [registrations]);

  // Map of tournamentId -> matches (for "My Next Match" display)
  const [matchMap, setMatchMap] = useState<Record<string, MatchReport[]>>({});

  useEffect(() => {
    const ids = registrations.map((r) => r.tournament.id);
    ids.forEach(async (id) => {
      if (matchMap[id]) return;
      try {
        const matches = await api.getTournamentMatches(id);
        setMatchMap((prev) => ({ ...prev, [id]: matches }));
      } catch {
        setMatchMap((prev) => ({ ...prev, [id]: [] }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrations]);

  const getNextMatch = (registration: MyRegistration): MatchReport | null => {
    const matches = matchMap[registration.tournament.id] ?? [];
    const teamName = registration.entry.teamName;
    return (
      matches.find(
        (m) =>
          m.status !== "COMPLETED" &&
          (m.team1Name === teamName || m.team2Name === teamName),
      ) ?? null
    );
  };

  // Withdraw handler
  const [withdrawingEntryId, setWithdrawingEntryId] = useState<string | null>(null);

  const handleWithdraw = async (registration: MyRegistration) => {
    setWithdrawingEntryId(registration.entry.id);
    try {
      await api.deleteTournamentEntry(registration.entry.id);
      setRegistrations((current) =>
        current.filter((r) => r.entry.id !== registration.entry.id),
      );
      toast({
        title: "Registration withdrawn",
        description: `${registration.entry.teamName} has been removed from ${registration.tournament.title}.`,
      });
    } catch (error) {
      toast({
        title: "Could not withdraw",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWithdrawingEntryId(null);
    }
  };

  const checkInLabel = (status: string) => {
    switch (status) {
      case "CHECKED_IN": return "✅ Confirmed";
      case "PENDING": return "⚠️ Check in now!";
      case "MISSED": return "❌ Missed check-in";
      case "NOT_OPEN": return "Check-in not open yet";
      default: return status;
    }
  };

  const handleCheckIn = async (registration: MyRegistration) => {
    setBusyEntryId(registration.entry.id);
    try {
      const updated = await api.updateTournamentEntryCheckIn(registration.entry.id, "CHECKED_IN");
      setRegistrations((current) =>
        current.map((item) =>
          item.entry.id === updated.id
            ? {
                ...item,
                entry: updated,
              }
            : item,
        ),
      );
      toast({
        title: "Checked in",
        description: `${updated.teamName} is confirmed for ${registration.tournament.title}.`,
      });
    } catch (error) {
      toast({
        title: "Check-in failed",
        description: error instanceof Error ? error.message : "Unable to complete team check-in",
        variant: "destructive",
      });
    } finally {
      setBusyEntryId(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-10 space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">My Registrations</h1>
            <p className="text-muted-foreground">
              Track registered teams, complete captain check-in, and jump back into tournament action.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass border-white/10">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Registered Teams</p>
              <p className="font-heading text-3xl font-bold mt-2">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/10">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Check-In Open</p>
              <p className="font-heading text-3xl font-bold mt-2">{stats.checkInOpen}</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/10">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Checked In</p>
              <p className="font-heading text-3xl font-bold mt-2">{stats.checkedIn}</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : registrations.length === 0 ? (
          <Card className="glass border-white/10">
            <CardContent className="py-16 text-center space-y-4">
              <Trophy className="w-14 h-14 text-muted-foreground mx-auto opacity-20" />
              <div>
                <h2 className="font-heading text-2xl font-bold">No Registrations Yet</h2>
                <p className="text-muted-foreground mt-2">
                  Create a team and register for a tournament to start tracking it here.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Button asChild>
                  <Link to="/teams">Go To Teams</Link>
                </Button>
                <Button asChild variant="outline" className="border-white/10">
                  <Link to="/">Browse Tournaments</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {registrations.map((registration) => {
              const { tournament, entry } = registration;
              const canCheckIn = tournament.status === "CHECK_IN" && entry.checkInStatus !== "CHECKED_IN";
              const canWithdraw =
                tournament.status === "REGISTRATION_OPEN" &&
                entry.checkInStatus === "NOT_OPEN";
              const nextMatch = getNextMatch(registration);
              const bracketGenerated = (matchMap[tournament.id] ?? []).length > 0;

              return (
                <Card key={entry.id} className="glass border-white/10">
                  <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="font-heading text-2xl">{tournament.title}</CardTitle>
                      <CardDescription className="mt-1">{`${entry.teamName} | ${tournament.gameTitle}`}</CardDescription>
                    </div>
                    <div className={`text-sm font-semibold ${statusTone[tournament.displayStatus ?? "Draft"] ?? "text-foreground"}`}>
                      {tournament.displayStatus}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Stats row */}
                    <div className="grid gap-3 md:grid-cols-4 text-sm">
                      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <p className="text-muted-foreground">Check-In</p>
                        <p className="font-semibold">{checkInLabel(entry.checkInStatus)}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <p className="text-muted-foreground">Roster Lock</p>
                        <p className="font-semibold">{entry.rosterLockedAt ? "Locked" : "Pending"}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-semibold">{new Date(tournament.startDate).toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <p className="text-muted-foreground">Entry Fee</p>
                        <p className="font-semibold">
                          {tournament.entryFee > 0 ? (
                            entry.paymentStatus === "PENDING" ? (
                              <span className="text-amber-400">Pay at check-in (${tournament.entryFee})</span>
                            ) : (
                              `$${tournament.entryFee}`
                            )
                          ) : (
                            <span className="text-emerald-400">Free</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Your Next Match card */}
                    <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                        <Swords className="w-4 h-4 text-[#D4AF37]" />
                        Your Next Match
                      </div>
                      {!bracketGenerated ? (
                        <p className="text-sm text-muted-foreground">
                          Bracket not generated yet — check back after registration closes.
                        </p>
                      ) : nextMatch ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">
                            {nextMatch.team1Name} <span className="text-[#D4AF37] font-bold">vs</span> {nextMatch.team2Name}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 text-foreground">
                              <CalendarDays className="w-3 h-3 text-[#D4AF37]" />
                              {nextMatch.scheduledAt
                                ? new Date(nextMatch.scheduledAt).toLocaleString()
                                : "Time TBD"}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#1A1C1F] border border-[#2B2E33] text-[#F8E297]">
                              {nextMatch.roundLabel}
                            </span>
                            {nextMatch.stationNumber && (
                              <span className="px-2.5 py-0.5 rounded-full bg-[#1A1C1F] border border-[#2B2E33] text-foreground">
                                Station {nextMatch.stationNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-[#CCFF00] font-semibold">
                          All your matches are complete 🏆
                        </p>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="rounded-2xl border border-[#2B2E33] bg-[#1A1C1F] p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            Team {entry.teamName}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarDays className="w-4 h-4" />
                            Registration: {entry.registrationStatus}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ShieldCheck className="w-4 h-4" />
                            Payment: {entry.paymentStatus}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {canCheckIn && (
                            <Button
                              onClick={() => void handleCheckIn(registration)}
                              disabled={busyEntryId === entry.id}
                              className="btn-cta font-extrabold"
                            >
                              {busyEntryId === entry.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <ClipboardCheck className="w-4 h-4 mr-2 stroke-[2.5]" />
                              )}
                              Check In Team
                            </Button>
                          )}
                          <Button asChild variant="outline" className="border-white/10">
                            <Link to={`/bracket?tournament=${tournament.id}`}>
                              View Bracket
                              <ExternalLink className="w-4 h-4 ml-2" />
                            </Link>
                          </Button>
                          <Button asChild variant="outline" className="border-white/10">
                            <Link to={`/tournaments/${tournament.id}`}>Open Tournament</Link>
                          </Button>
                          {canWithdraw && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                                  disabled={withdrawingEntryId === entry.id}
                                >
                                  {withdrawingEntryId === entry.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <LogOut className="w-4 h-4 mr-2" />
                                  )}
                                  Withdraw
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="glass border-white/10">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-heading flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                                    Withdraw from Tournament?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to withdraw{" "}
                                    <span className="font-semibold text-foreground">{entry.teamName}</span>{" "}
                                    from{" "}
                                    <span className="font-semibold text-foreground">{tournament.title}</span>?
                                    This cannot be undone — you will need to re-register if spots are still available.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleWithdraw(registration)}
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                  >
                                    Yes, Withdraw
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
