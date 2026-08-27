import { useState } from "react";
import { Link } from "react-router-dom";
import { Tournament } from "@/lib/api";
import { Users, Calendar, DollarSign, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RegistrationWizard } from "./RegistrationWizard";
import { RegistrationCountdown } from "./RegistrationCountdown";

const statusColors: Record<string, string> = {
  Live: "bg-red-500/20 text-red-400 border-red-500/30",
  "Registration Open": "badge-status-open font-bold",
  "Registration Closed": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Check-In": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Published: "bg-[#6B46C1]/20 text-purple-300 border-[#6B46C1]/40",
  Upcoming: "bg-[#6B46C1]/20 text-purple-300 border-[#6B46C1]/40",
  Completed: "bg-muted text-muted-foreground border-border",
  Draft: "bg-white/10 text-muted-foreground border-white/10",
  Cancelled: "bg-red-500/10 text-red-300 border-red-500/20",
};

export function TournamentCard({ tournament }: { tournament: Tournament & { isUserRegistered?: boolean } }) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const registeredTeams = tournament.registeredTeams ?? tournament._count?.entries ?? 0;
  const isFull = registeredTeams >= tournament.maxTeams;
  const waitlistCount = isFull ? registeredTeams - tournament.maxTeams : 0;
  const fillPct = tournament.maxTeams > 0 ? (Math.min(registeredTeams, tournament.maxTeams) / tournament.maxTeams) * 100 : 0;
  const spotsLeft = Math.max(0, tournament.maxTeams - registeredTeams);
  const statusLabel = tournament.displayStatus ?? "Upcoming";

  return (
    <>
      <div className="glass-card group relative overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-40 group-hover:opacity-60 transition-opacity",
            tournament.gradient,
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />

        <div className="relative p-5 flex flex-col h-full min-h-[280px]">
          <div className="flex items-start justify-between mb-3">
            <Badge className={cn("text-[10px] uppercase tracking-wider border", statusColors[statusLabel] ?? statusColors.Upcoming)}>
              {statusLabel === "Live" && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1" />
              )}
              {statusLabel}
            </Badge>
            {tournament.entryFee > 0 ? (
              <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                <DollarSign className="w-3 h-3" />${tournament.entryFee} ENTRY
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400 font-bold">FREE ENTRY</span>
            )}
          </div>

          <h3 className="font-heading text-xl font-bold text-foreground mb-1 leading-tight group-hover:text-primary transition-colors">
            {tournament.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-1">{tournament.gameTitle}</p>

          <div className="mb-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Prize Pool</span>
            <p className="font-heading text-2xl font-bold text-gold drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">
              ${tournament.prizePool.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <span className={cn("flex items-center gap-1.5 font-medium", isFull ? "text-amber-400" : "text-muted-foreground")}>
              <Users className="w-3.5 h-3.5" />
              {isFull ? tournament.maxTeams : registeredTeams}/{tournament.maxTeams} Teams
              {waitlistCount > 0 && <span className="text-[10px] opacity-70">(+{waitlistCount} Waitlist)</span>}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(tournament.startDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="mb-6">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  isFull ? "bg-amber-500" : "bg-gradient-to-r from-primary to-neon-purple"
                )}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <RegistrationCountdown
              registrationCloseAt={tournament.registrationCloseAt}
              registrationOpenAt={tournament.registrationOpenAt}
              registeredTeams={registeredTeams}
              maxTeams={tournament.maxTeams}
              variant="card"
              className="mt-2"
            />
            {isFull && !tournament.isUserRegistered && (
              <p className="text-[10px] font-bold text-amber-400 mt-1.5 uppercase tracking-wider">
                {tournament.waitlistEnabled ? "Waitlist Available" : "Tournament Full"}
              </p>
            )}
          </div>

          <div className="mt-auto space-y-3">
            {tournament.isUserRegistered ? (
              <Link 
                to={statusLabel === "Live" ? `/live?tournamentId=${tournament.id}` : "/registrations"}
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-heading font-bold text-sm tracking-wider bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] transition-transform"
              >
                VIEW MY MATCH
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : statusLabel === "Registration Open" ? (
              <button
                onClick={() => setIsWizardOpen(true)}
                className={cn(
                  "w-full py-3 rounded-xl flex items-center justify-center gap-2 font-heading font-extrabold text-sm tracking-wider",
                  isFull 
                    ? tournament.waitlistEnabled 
                      ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]" 
                      : "bg-[#1A1C1F] text-muted-foreground border border-[#2B2E33] cursor-not-allowed"
                    : "btn-cta"
                )}
                disabled={isFull && !tournament.waitlistEnabled}
              >
                {isFull ? (tournament.waitlistEnabled ? "JOIN WAITLIST" : "REGISTRATION FULL") : "REGISTER NOW"}
                {!isFull && <ChevronRight className="w-4 h-4 stroke-[3]" />}
              </button>
            ) : statusLabel === "Check-In" ? (
              <button
                onClick={() => setIsWizardOpen(true)}
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-heading font-bold text-sm tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
              >
                TEAM CHECK-IN
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : statusLabel === "Live" ? (
              <Link 
                to={`/live?tournamentId=${tournament.id}`}
                className="w-full py-3 rounded-xl flex items-center justify-center font-heading font-bold text-sm tracking-wider bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:bg-red-600 transition-all animate-pulse"
              >
                WATCH LIVE
              </Link>
            ) : statusLabel === "Published" ? (
              <Link
                to={`/tournaments/${tournament.id}`}
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-heading font-bold text-sm tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 transition-colors"
              >
                VIEW DETAILS
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : statusLabel === "Completed" ? (
              <button className="w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider bg-white/5 text-muted-foreground border border-border hover:bg-white/10 transition-colors">
                VIEW RESULTS
              </button>
            ) : (
              <button className="w-full py-3 rounded-xl font-heading font-bold text-sm tracking-wider bg-neon-purple/20 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/30 transition-colors">
                COMING SOON
              </button>
            )}
            
            {statusLabel !== "Published" && (
              <Link
                to={`/tournaments/${tournament.id}`}
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-heading font-bold text-sm tracking-wider bg-white/5 text-foreground border border-white/10 hover:bg-white/10 transition-colors"
              >
                TOURNAMENT INFO
              </Link>
            )}
          </div>
        </div>
      </div>

      <RegistrationWizard
        tournament={tournament}
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </>
  );
}
