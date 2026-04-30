import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { ApiTournamentStatus, Tournament, MatchReport, TournamentEntry } from "@/lib/api";
import { getAllowedStatusTransitions, getBracketReadiness } from "@/lib/tournamentLifecycle";
import { isCheckInRequired } from "./TournamentManager";
import { cn } from "@/lib/utils";

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

export function TournamentOverviewTab({
  tournament,
  entries,
  matches,
  busyTournamentId,
  changeTournamentStatus,
  deleteTournament,
}: {
  tournament: Tournament;
  entries: TournamentEntry[];
  matches: MatchReport[];
  busyTournamentId: string | null;
  changeTournamentStatus: (id: string, status: ApiTournamentStatus) => void;
  deleteTournament: (id: string) => void;
}) {
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

  return (
    <div className="space-y-6 outline-none">
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
                onClick={() => changeTournamentStatus(tournament.id, action.status)}
              >
                {action.status === "REGISTRATION_OPEN" && (tournament.status === "REGISTRATION_CLOSED" || tournament.status === "CHECK_IN") 
                  ? "Reopen Registration" 
                  : action.label}
              </Button>
            ))}
          </CardContent>
          <CardContent className="pt-0 border-t border-white/5 mt-4">
            <Button
              asChild
              className="w-full mt-4 bg-primary/20 text-primary hover:bg-primary/30 border-primary/20"
              variant="outline"
            >
              <a href={`/broadcast/${tournament.id}`} target="_blank" rel="noreferrer">
                Open Broadcast Overlay
              </a>
            </Button>
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
        <div className="grid gap-3 md:grid-cols-4 text-sm p-6">
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

        <div className="grid gap-3 md:grid-cols-4 text-sm p-6 pt-0">
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
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 m-6 mt-0 text-sm text-amber-100">
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 m-6 mt-0">
            <h3 className="font-heading text-lg mb-2">Rules</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tournament.rules}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
