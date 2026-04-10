import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api, type MyRegistration } from "@/lib/api";
import { CalendarDays, ClipboardCheck, ExternalLink, Loader2, ShieldCheck, Trophy, Users } from "lucide-react";

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
                    <div className="grid gap-3 md:grid-cols-4 text-sm">
                      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <p className="text-muted-foreground">Check-In</p>
                        <p className="font-semibold">{entry.checkInStatus}</p>
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
                        <p className="font-semibold">${tournament.entryFee}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            Team {entry.teamName}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarDays className="w-4 h-4" />
                            Registration status: {entry.registrationStatus}
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
                              className="bg-emerald-500 hover:bg-emerald-500/90 text-black"
                            >
                              {busyEntryId === entry.id ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <ClipboardCheck className="w-4 h-4 mr-2" />
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
