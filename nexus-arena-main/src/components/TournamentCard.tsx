import { useState } from "react";
import { Tournament } from "@/lib/api";
import { Users, Calendar, DollarSign, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RegistrationWizard } from "./RegistrationWizard";

const statusColors: Record<string, string> = {
  Live: "bg-red-500/20 text-red-400 border-red-500/30",
  "Registration Open": "bg-primary/20 text-primary border-primary/30",
  Upcoming: "bg-neon-purple/20 text-neon-purple border-neon-purple/30",
  Completed: "bg-muted text-muted-foreground border-border",
  Draft: "bg-white/10 text-muted-foreground border-white/10",
  Cancelled: "bg-red-500/10 text-red-300 border-red-500/20",
};

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const registeredTeams = tournament.registeredTeams ?? tournament._count?.entries ?? 0;
  const spotsLeft = tournament.maxTeams - registeredTeams;
  const fillPct = tournament.maxTeams > 0 ? (registeredTeams / tournament.maxTeams) * 100 : 0;
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

        <div className="relative p-5 flex flex-col h-full min-h-[260px]">
          <div className="flex items-start justify-between mb-3">
            <Badge className={cn("text-xs border", statusColors[statusLabel] ?? statusColors.Upcoming)}>
              {statusLabel === "Live" && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1" />
              )}
              {statusLabel}
            </Badge>
            {tournament.entryFee > 0 ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" />${tournament.entryFee} entry
              </span>
            ) : (
              <span className="text-xs text-emerald-400 font-medium">FREE ENTRY</span>
            )}
          </div>

          <h3 className="font-heading text-xl font-bold text-foreground mb-1 leading-tight">
            {tournament.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{tournament.gameTitle}</p>

          <div className="mb-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Prize Pool</span>
            <p className="font-heading text-2xl font-bold text-gold">
              ${tournament.prizePool.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {registeredTeams}/{tournament.maxTeams} teams
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(tournament.startDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="mb-4">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-neon-purple transition-all duration-500"
                style={{ width: `${fillPct}%` }}
              />
            </div>
            {spotsLeft > 0 && spotsLeft <= 5 && (
              <p className="text-xs text-primary mt-1">{spotsLeft} spots left!</p>
            )}
          </div>

          <div className="mt-auto">
            {statusLabel === "Registration Open" ? (
              <button
                onClick={() => setIsWizardOpen(true)}
                className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-heading font-bold text-sm tracking-wider bg-gradient-to-r from-primary to-neon-blue text-primary-foreground animate-pulse-glow hover:scale-[1.02] transition-transform"
              >
                REGISTER NOW
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : statusLabel === "Live" ? (
              <button className="w-full py-2.5 rounded-lg font-heading font-bold text-sm tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors">
                WATCH LIVE
              </button>
            ) : statusLabel === "Completed" ? (
              <button className="w-full py-2.5 rounded-lg font-heading font-bold text-sm tracking-wider bg-white/5 text-muted-foreground border border-border hover:bg-white/10 transition-colors">
                VIEW RESULTS
              </button>
            ) : (
              <button className="w-full py-2.5 rounded-lg font-heading font-bold text-sm tracking-wider bg-neon-purple/20 text-neon-purple border border-neon-purple/30 hover:bg-neon-purple/30 transition-colors">
                COMING SOON
              </button>
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
