import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, CalendarDays, ClipboardCheck, ExternalLink, Globe, Loader2, ScrollText, ShieldCheck, Trophy, Users, Play } from "lucide-react";
import { Layout } from "@/components/Layout";
import { SEOHead } from "@/components/SEOHead";
import { RegistrationWizard } from "@/components/RegistrationWizard";
import { RegistrationCountdown } from "@/components/RegistrationCountdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api, type MatchReport, type Tournament, type TournamentEntry } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

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

export default function TournamentDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<MatchReport[]>([]);
  const [myEntries, setMyEntries] = useState<TournamentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadTournament = async () => {
      setIsLoading(true);
      try {
        const [tournamentData, matchData, entries] = await Promise.all([
          api.getTournament(id),
          api.getTournamentMatches(id),
          user ? api.getMyTournamentEntries(id, user.id) : Promise.resolve([]),
        ]);

        setTournament(tournamentData);
        setMatches(matchData);
        setMyEntries(entries);
      } catch (error) {
        toast({
          title: "Tournament unavailable",
          description: error instanceof Error ? error.message : "Failed to load tournament details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadTournament();
  }, [id, toast, user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!id) return;

    const matchSub = api.subscribeToMatches(id, () => {
      // Refresh matches when they change
      void api.getTournamentMatches(id).then(setMatches);
    });

    const entrySub = api.subscribeToEntries(id, () => {
      // Refresh my entries when entries change (e.g. check-in status)
      if (user) {
        void api.getMyTournamentEntries(id, user.id).then(setMyEntries);
      }
      // Also refresh tournament data to get updated registered count
      void api.getTournament(id).then(setTournament);
    });

    return () => {
      void matchSub.unsubscribe();
      void entrySub.unsubscribe();
    };
  }, [id, user]);

  const nextMatch = useMemo(() => {
    return matches.find((match) => match.status !== "COMPLETED") ?? matches[0] ?? null;
  }, [matches]);

  const checkedInCount = useMemo(() => {
    return myEntries.filter((entry) => entry.checkInStatus === "CHECKED_IN").length;
  }, [myEntries]);

  if (isLoading) {
    return (
      <Layout>
        <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="font-heading italic animate-pulse">Loading tournament details...</p>
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <Card className="glass border-white/10 max-w-3xl mx-auto mt-10">
          <CardContent className="py-16 text-center space-y-4">
            <Trophy className="w-14 h-14 text-muted-foreground mx-auto opacity-20" />
            <div>
              <h1 className="font-heading text-3xl font-bold">Tournament Not Found</h1>
              <p className="text-muted-foreground mt-2">
                This tournament could not be loaded or may no longer be available.
              </p>
            </div>
            <Button asChild>
              <Link to="/">Back To Tournaments</Link>
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const canRegister = tournament.status === "REGISTRATION_OPEN";
  const canCheckIn = tournament.status === "CHECK_IN";
  const isOrganizer = user?.role === "ORGANIZER";
  const registeredTeams = tournament.registeredTeams ?? tournament._count?.entries ?? 0;
  
  const actionLabel = isOrganizer 
    ? "Manage Tournament" 
    : canCheckIn 
      ? "Team Check-In" 
      : canRegister 
        ? "Register Team" 
        : null;
        
  const actionDescription = isOrganizer
    ? "Go to the admin dashboard to manage settings, brackets, and players."
    : canCheckIn
      ? "Captains can confirm attendance for registered teams here."
      : canRegister
        ? "Captains can register an eligible team from this page."
        : "Registration actions are currently closed.";

  const structuredData = tournament ? {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": tournament.title,
    "description": `${tournament.gameTitle} tournament on ADWA ARENA. Format: ${tournament.format}, Bracket: ${tournament.bracketType}.`,
    "startDate": tournament.startDate,
    "sport": tournament.gameTitle,
    "eventStatus": tournament.status === "CANCELLED" 
      ? "https://schema.org/EventCancelled" 
      : tournament.status === "COMPLETED" 
        ? "https://schema.org/EventPostponed" 
        : "https://schema.org/EventScheduled",
    "eventAttendanceMode": tournament.tournamentType === "ONLINE" 
      ? "https://schema.org/OnlineEventAttendanceMode" 
      : tournament.tournamentType === "LAN" 
        ? "https://schema.org/OfflineEventAttendanceMode" 
        : "https://schema.org/MixedEventAttendanceMode",
    "location": tournament.tournamentType === "ONLINE" ? {
      "@type": "VirtualLocation",
      "url": `https://adwaarena.com/tournaments/${tournament.id}`
    } : {
      "@type": "Place",
      "name": (tournament as any).creator?.venueLocation || "LAN Arena Venue",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": (tournament as any).creator?.venueLocation || "Addis Ababa"
      }
    },
    "offers": {
      "@type": "Offer",
      "url": `https://adwaarena.com/tournaments/${tournament.id}`,
      "price": tournament.entryFee ? String(tournament.entryFee) : "0",
      "priceCurrency": "ETB",
      "availability": tournament.status === "REGISTRATION_OPEN" 
        ? "https://schema.org/InStock" 
        : "https://schema.org/SoldOut",
      "validFrom": tournament.registrationOpenAt || (tournament as any).createdAt
    },
    "organizer": {
      "@type": "Organization",
      "name": (tournament as any).creator?.organizationName || (tournament as any).creator?.name || "ADWA ARENA",
      "url": "https://adwaarena.com"
    }
  } : undefined;

  return (
    <Layout>
      <SEOHead
        title={tournament ? `${tournament.title} (${tournament.gameTitle})` : "Tournament Details"}
        description={tournament ? `${tournament.title} — ${tournament.gameTitle} tournament. ${registeredTeams}/${tournament.maxTeams} teams registered. Starts ${new Date(tournament.startDate).toLocaleDateString()}. Register and track brackets on ADWA ARENA.` : undefined}
        canonicalUrl={tournament ? `https://adwaarena.com/tournaments/${tournament.id}` : undefined}
        keywords={tournament ? `${tournament.gameTitle}, ${tournament.title}, esports tournament, ${tournament.bracketType}, ADWA ARENA` : undefined}
        structuredData={structuredData}
      />
      <div className="space-y-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4 max-w-3xl">
            <div className={`text-sm font-semibold ${statusTone[tournament.displayStatus ?? "Draft"] ?? "text-foreground"}`}>
              {tournament.displayStatus}
            </div>
            <div>
              <h1 className="font-heading text-4xl font-bold text-foreground">{tournament.title}</h1>
              <p className="text-muted-foreground mt-2 text-lg">
                {tournament.gameTitle} tournament hub for registration, check-in, and bracket access.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <CalendarDays className="w-4 h-4" />
                Starts {new Date(tournament.startDate).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <Users className="w-4 h-4" />
                {registeredTeams}/{tournament.maxTeams} teams registered
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <Globe className="w-4 h-4" />
                {tournament.tournamentType} | {tournament.format}
              </span>
            </div>
            
            {tournament.displayStatus === "Registration Open" && (
              <RegistrationCountdown
                registrationCloseAt={tournament.registrationCloseAt}
                registrationOpenAt={tournament.registrationOpenAt}
                registeredTeams={registeredTeams}
                maxTeams={tournament.maxTeams}
                variant="banner"
                className="mt-4"
              />
            )}
          </div>

          {/* Pay-at-check-in banner */}
          {tournament.entryFee > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                This tournament has an entry fee of{" "}
                <span className="font-bold text-amber-200">ETB {tournament.entryFee}</span>.{" "}
                Payment is collected manually by the organizer at check-in.
              </span>
            </div>
          )}

          {/* Rules — always visible above the fold */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-heading text-xl font-bold mb-3 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary" />
              Tournament Rules
            </h2>
            {tournament.rules?.trim() ? (
              <p className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                {tournament.rules.trim()}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Rules will be posted by the organizer before the tournament begins.
              </p>
            )}
          </div>

          <Card className="glass border-white/10 lg:w-[360px]">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Tournament Action</CardTitle>
              <CardDescription>{actionDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.displayStatus === "Live" && (
                <Button asChild className="w-full bg-red-500 hover:bg-red-600 animate-pulse-glow shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                  <Link to={`/live?tournamentId=${tournament.id}`}>
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Watch Broadcast Live
                  </Link>
                </Button>
              )}

              {actionLabel ? (
                isOrganizer ? (
                  <Button asChild className="w-full">
                    <Link to="/admin/tournaments">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      {actionLabel}
                    </Link>
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setIsWizardOpen(true)} 
                    className="w-full btn-cta font-extrabold py-6 text-base tracking-wider"
                  >
                    {canCheckIn ? <ClipboardCheck className="w-5 h-5 mr-2 stroke-[2.5]" /> : <ShieldCheck className="w-5 h-5 mr-2 stroke-[2.5]" />}
                    {actionLabel}
                  </Button>
                )
              ) : (
                tournament.displayStatus !== "Live" && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                    Registration is not open right now. You can still follow the tournament and view the bracket.
                  </div>
                )
              )}

              <Button asChild variant="outline" className="w-full border-white/10">
                <Link to={`/bracket?tournament=${tournament.id}`}>
                  View Bracket
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>

              {!isOrganizer && (
                <Button asChild variant="outline" className="w-full border-white/10">
                  <Link to="/registrations">My Registrations</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="glass border-white/10">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Prize Pool</p>
              <p className="font-heading text-3xl font-bold mt-2">${tournament.prizePool.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/10">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Entry Fee</p>
              <p className="font-heading text-3xl font-bold mt-2">ETB {tournament.entryFee}</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/10">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Roster Range</p>
              <p className="font-heading text-3xl font-bold mt-2">
                {tournament.minPlayersPerTeam}-{tournament.maxPlayersPerTeam ?? tournament.minPlayersPerTeam}
              </p>
            </CardContent>
          </Card>
          {!isOrganizer && (
            <Card className="glass border-white/10">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Your Check-Ins</p>
                <p className="font-heading text-3xl font-bold mt-2">{checkedInCount}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="font-heading text-2xl">Overview</CardTitle>
              <CardDescription>Key tournament settings and participation windows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-muted-foreground">Registration Opens</p>
                  <p className="font-semibold mt-2">
                    {tournament.registrationOpenAt ? new Date(tournament.registrationOpenAt).toLocaleString() : "Not scheduled"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-muted-foreground">Registration Closes</p>
                  <p className="font-semibold mt-2">
                    {tournament.registrationCloseAt ? new Date(tournament.registrationCloseAt).toLocaleString() : "Not scheduled"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-muted-foreground">Visibility</p>
                  <p className="font-semibold mt-2">{tournament.visibility}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-muted-foreground">Waitlist</p>
                  <p className="font-semibold mt-2">{tournament.waitlistEnabled ? "Enabled" : "Disabled"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h2 className="font-heading text-xl font-bold mb-3">Rules</h2>
                <p className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                  {tournament.rules?.trim() || "Tournament rules have not been published yet."}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {!isOrganizer && (
              <Card className="glass border-white/10">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">Your Entry Status</CardTitle>
                  <CardDescription>
                    {user ? "Captain-facing view of your registered teams for this tournament." : "Sign in as a captain to see your team status here."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!user ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                      Sign in to register, self check-in, and track roster lock status for your teams.
                    </div>
                  ) : myEntries.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                      None of your teams are registered for this tournament yet.
                    </div>
                  ) : (
                    myEntries.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                        <p className="font-semibold">{entry.teamName}</p>
                        <p className="text-sm text-muted-foreground">Check-In: {entry.checkInStatus}</p>
                        <p className="text-sm text-muted-foreground">
                          Roster: {entry.rosterLockedAt ? "Locked by staff" : "Not locked yet"}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Bracket Snapshot</CardTitle>
                <CardDescription>Quick read on match activity before opening the full bracket.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-muted-foreground">Matches Created</p>
                  <p className="font-heading text-3xl font-bold mt-2">{matches.length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-muted-foreground">Next Match</p>
                  <p className="font-semibold mt-2">
                    {nextMatch ? `${nextMatch.team1Name} vs ${nextMatch.team2Name}` : "Bracket not generated yet"}
                  </p>
                  {nextMatch?.scheduledAt && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(nextMatch.scheduledAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <RegistrationWizard
        tournament={tournament}
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </Layout>
  );
}
