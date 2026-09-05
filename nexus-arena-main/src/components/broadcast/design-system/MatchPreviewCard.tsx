import React from "react";
import { Timer, Swords } from "lucide-react";
import { SlantedCard } from "./SlantedCard";
import type { MatchReport } from "@/lib/api";

export interface MatchPreviewCardProps {
  match?: {
    team1Name?: string;
    team2Name?: string;
    team1Score?: number;
    team2Score?: number;
    roundLabel?: string;
    scheduledAt?: string | null;
    status?: string;
  } | null;
  label?: string;
  className?: string;
}

/**
 * MatchPreviewCard
 * The iconic "UP NEXT" card from the reference broadcast overlay.
 * Features a slanted graphite card with an electric volt accent left-border and club matchup details.
 */
export function MatchPreviewCard({
  match,
  label = "UP NEXT",
  className = "",
}: MatchPreviewCardProps) {
  if (!match) {
    return (
      <SlantedCard accentBorder={false} className={`p-8 text-center ${className}`}>
        <div className="text-white/30 italic text-sm font-black uppercase tracking-widest">
          No upcoming matches scheduled
        </div>
      </SlantedCard>
    );
  }

  const isLive = match.status === "IN_PROGRESS" || match.status === "LIVE";

  return (
    <SlantedCard borderWidth="thick" className={`p-8 relative ${className}`}>
      {/* Top Section / Up Next badge */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--overlay-primary)] flex items-center gap-2 italic">
          <span className="w-2 h-2 rounded-full bg-[var(--overlay-primary)] animate-pulse inline-block" />
          {label}
        </span>
        {isLive && (
          <span className="bg-red-600/90 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded italic animate-pulse">
            LIVE MATCH
          </span>
        )}
      </div>

      {/* Matchup Teams (Team 1 VS Team 2) */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 italic">
            Club
          </p>
          <p className="text-2xl sm:text-3xl font-black text-white truncate uppercase italic tracking-tight">
            {match.team1Name || "TBD"}
          </p>
        </div>

        <span className="text-white/20 font-black text-2xl sm:text-3xl italic px-4 shrink-0">
          VS
        </span>

        <div className="flex-1 min-w-0 text-right">
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 italic">
            Club
          </p>
          <p className="text-2xl sm:text-3xl font-black text-white truncate uppercase italic tracking-tight">
            {match.team2Name || "TBD"}
          </p>
        </div>
      </div>

      {/* Footer Info: Round & Scheduled Time */}
      <div className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] border-t border-white/10 pt-4 italic">
        <span className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-[var(--overlay-primary)]" />
          {match.roundLabel || "Tournament Match"}
        </span>
        <span>
          {match.scheduledAt
            ? new Date(match.scheduledAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "TBD"}
        </span>
      </div>
    </SlantedCard>
  );
}
