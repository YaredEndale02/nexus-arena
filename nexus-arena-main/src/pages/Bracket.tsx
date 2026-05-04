import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X, Clock, Swords, Loader2, RefreshCw, Wifi } from "lucide-react";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { api, type MatchReport, type Tournament } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type BracketNode = {
  id: string;
  round: number;
  position: number;
  roundLabel: string;
  team1: { name: string; score: number } | null;
  team2: { name: string; score: number } | null;
  winner: string | null;
  status: "Upcoming" | "Live" | "Completed";
  scheduledTime: string;
  bracketSide: string;
};

function mapMatchToNode(match: MatchReport): BracketNode {
  const status =
    match.status === "COMPLETED"
      ? "Completed"
      : match.status === "IN_PROGRESS" || match.status === "LIVE"
        ? "Live"
        : "Upcoming";

  return {
    id: match.id,
    round: match.roundNumber ?? 1,
    position: match.positionInRound ?? 1,
    roundLabel: match.roundLabel,
    team1:
      match.team1Name && match.team1Name !== "TBD" && match.team1Name !== "BYE"
        ? { name: match.team1Name, score: match.team1Score }
        : null,
    team2:
      match.team2Name && match.team2Name !== "TBD" && match.team2Name !== "BYE"
        ? { name: match.team2Name, score: match.team2Score }
        : null,
    winner: match.winnerName ?? null,
    status,
    scheduledTime: match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : "TBD",
    bracketSide: match.bracketSide ?? "UPPER",
  };
}

function MatchNode({ 
  match, 
  isFinal, 
  onClick, 
  isHighlighted, 
  onHoverTeam 
}: { 
  match: BracketNode; 
  isFinal?: boolean; 
  onClick: () => void;
  isHighlighted: boolean;
  onHoverTeam: (teamName: string | null) => void;
}) {
  const isLive = match.status === "Live";
  const isCompleted = match.status === "Completed";

  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-card p-3 w-60 cursor-pointer transition-all duration-300 relative",
        isLive && "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]",
        isFinal && match.winner && "animate-golden-pulse border-gold/50",
        isFinal && "w-72",
        isHighlighted && "border-primary/60 bg-primary/5 scale-[1.02] z-10 shadow-[0_0_30px_rgba(var(--primary),0.2)]",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isLive ? "text-red-400" : isCompleted ? "text-muted-foreground" : "text-neon-purple",
          )}
        >
          {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1" />}
          {match.status}
        </span>
        <span className="text-[9px] text-muted-foreground font-mono opacity-50">#{match.id.slice(0, 4)}</span>
      </div>

      {[match.team1, match.team2].map((team, i) => (
        <div
          key={i}
          onMouseEnter={() => onHoverTeam(team?.name || null)}
          onMouseLeave={() => onHoverTeam(null)}
          className={cn(
            "flex items-center justify-between py-2 px-3 rounded-md mb-1 transition-all duration-200",
            team && match.winner === team.name && "bg-emerald-500/10 border border-emerald-500/20",
            team && isHighlighted && "font-bold",
            !team && "opacity-40 bg-white/5",
            team && "hover:bg-white/10"
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className={cn(
                "text-sm truncate",
                team && match.winner === team.name ? "text-emerald-400 font-bold" : "text-foreground",
              )}
            >
              {team?.name || "TBD"}
            </span>
          </div>
          <span
            className={cn(
              "text-sm font-heading font-black min-w-[20px] text-right",
              team && match.winner === team.name ? "text-emerald-400" : "text-muted-foreground",
            )}
          >
            {team?.score ?? (match.status === "Upcoming" ? "" : "0")}
          </span>
        </div>
      ))}

      <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{match.roundLabel}</span>
        {match.scheduledTime !== "TBD" && (
           <span className="text-[9px] text-muted-foreground/60 flex items-center gap-1">
             <Clock className="w-2 h-2" /> {new Date(match.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
        )}
      </div>
    </div>
  );
}

function MatchDetailPanel({ match, onClose }: { match: BracketNode; onClose: () => void }) {
  return (
    <div className="glass p-6 rounded-xl animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">Match Details</h3>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-6 mb-6">
        <div className="text-center">
          <p className="font-heading font-bold text-foreground mt-1">{match.team1?.name || "TBD"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-heading text-3xl font-bold text-foreground">{match.team1?.score ?? 0}</span>
          <span className="text-muted-foreground text-xl">-</span>
          <span className="font-heading text-3xl font-bold text-foreground">{match.team2?.score ?? 0}</span>
        </div>
        <div className="text-center">
          <p className="font-heading font-bold text-foreground mt-1">{match.team2?.name || "TBD"}</p>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" /> Scheduled: {match.scheduledTime}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Swords className="w-4 h-4" /> Status:{" "}
          <span className={cn(match.status === "Live" ? "text-red-400" : "text-foreground")}>{match.status}</span>
        </div>
      </div>
    </div>
  );
}

export default function Bracket() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTournamentId = searchParams.get("tournament") ?? "";
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<BracketNode[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<BracketNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<"ALL" | "UPPER" | "LOWER" | "GRAND_FINAL">("ALL");
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [foldedRounds, setFoldedRounds] = useState<Set<number>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const toggleRoundFold = (round: number) => {
    setFoldedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  };

  useEffect(() => {
    const loadTournaments = async () => {
      setIsLoading(true);
      try {
        const tournamentData = await api.getTournaments();
        setTournaments(tournamentData);
        setSelectedTournamentId((current) => {
          const hasRequestedTournament =
            requestedTournamentId && tournamentData.some((item) => item.id === requestedTournamentId);

          return (
            (hasRequestedTournament ? requestedTournamentId : "") ||
            current ||
            tournamentData.find((item) => (item._count?.matches ?? 0) > 0)?.id ||
            tournamentData[0]?.id ||
            ""
          );
        });
      } catch (error) {
        toast({
          title: "Bracket unavailable",
          description: error instanceof Error ? error.message : "Failed to load bracket data",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    void loadTournaments();
  }, [requestedTournamentId, toast]);

  const loadMatches = useCallback(async (silent = false) => {
    if (!selectedTournamentId) {
      setMatches([]);
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const matchData = await api.getTournamentMatches(selectedTournamentId);
      setMatches(matchData.map(mapMatchToNode));
      setLastUpdated(new Date());
    } catch (error) {
      toast({
        title: "Bracket unavailable",
        description: error instanceof Error ? error.message : "Failed to load matches for this tournament",
        variant: "destructive",
      });
      setMatches([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedTournamentId, toast]);


  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  // Real-time subscription: auto-refresh when matches change
  // Real-time subscription: auto-refresh when matches change
  useEffect(() => {
    if (!selectedTournamentId) return;

    const subscription = api.subscribeToMatches(selectedTournamentId, () => {
      // Opt-in to full list refresh to ensure dependencies (like advancing winners) are reflected
      void loadMatches(true);
      setIsLiveConnected(true);
    });

    return () => {
      void subscription.unsubscribe();
      setIsLiveConnected(false);
    };
  }, [selectedTournamentId, loadMatches]);

  useEffect(() => {
    if (!selectedTournamentId) return;
    if (requestedTournamentId === selectedTournamentId) return;
    setSearchParams({ tournament: selectedTournamentId }, { replace: true });
  }, [requestedTournamentId, selectedTournamentId, setSearchParams]);

  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === selectedTournamentId) ?? null,
    [selectedTournamentId, tournaments],
  );

  const getGroupedRounds = (filterSide: string) => {
    const grouped = new Map<number, BracketNode[]>();
    matches.filter(m => m.bracketSide === filterSide || (filterSide === 'UPPER' && !m.bracketSide)).forEach((match) => {
      const roundMatches = grouped.get(match.round) ?? [];
      roundMatches.push(match);
      grouped.set(match.round, roundMatches);
    });
    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, roundMatches]) => ({
        round,
        label: roundMatches[0]?.roundLabel ?? `Round ${round}`,
        matches: roundMatches.sort((a, b) => a.position - b.position),
      }));
  };

  const upperRounds = useMemo(() => getGroupedRounds('UPPER'), [matches]);
  const lowerRounds = useMemo(() => getGroupedRounds('LOWER'), [matches]);
  const grandFinalRounds = useMemo(() => {
    const gf = getGroupedRounds('GRAND_FINAL');
    if (gf.length === 0 && upperRounds.length > 0) {
      return [upperRounds[upperRounds.length - 1]];
    }
    return gf;
  }, [matches, upperRounds]);

  const hasMatches = upperRounds.length > 0 || lowerRounds.length > 0;

  useEffect(() => {
    if (upperRounds.length > 0) {
      setFoldedRounds(prev => {
        const next = new Set(prev);
        upperRounds.forEach((roundGroup) => {
          const allFinished = roundGroup.matches.every(m => m.status === 'Completed');
          // Don't auto-fold the last round (the Final)
          if (allFinished && roundGroup.round < upperRounds.length) {
            next.add(roundGroup.round);
          }
        });
        return next;
      });
    }
  }, [upperRounds.length]);

  return (
    <Layout>
      <div className="mb-6 animate-fade-in">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Live <span className="text-primary">Bracket</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {selectedTournament ? `${selectedTournament.title} - ${selectedTournament.gameTitle}` : "Follow active tournament brackets in real time"}
        </p>
      </div>

      {/* Stage & Round Navigator */}
      {hasMatches && (
        <div className="space-y-4 mb-8">
          {/* Stage Tabs */}
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
            {[
              { id: "ALL", label: "Full View", icon: Wifi },
              { id: "UPPER", label: "Upper Bracket", icon: Swords },
              { id: "LOWER", label: "Lower Bracket", icon: Swords },
              { id: "GRAND_FINAL", label: "Grand Finals", icon: Clock },
            ].map((stage) => {
              if (stage.id === "LOWER" && lowerRounds.length === 0) return null;
              if (stage.id === "GRAND_FINAL" && grandFinalRounds.length === 0) return null;
              
              const active = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    active ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <stage.icon className="w-3 h-3" />
                  {stage.label}
                </button>
              );
            })}
          </div>

          {/* Quick Round Navigator */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => {
                setActiveRound(null);
                setActiveStage("ALL");
              }}
              className={cn(
                "px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeRound === null && activeStage === "ALL"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:border-primary/50"
              )}
            >
              Show All
            </button>
            
            <div className="w-[1px] h-4 bg-white/10 mx-1" />

            {(activeStage === "ALL" || activeStage === "UPPER") && upperRounds.map((round) => (
              <button
                key={`nav-${round.round}`}
                onClick={() => {
                  setActiveRound(round.round === activeRound ? null : round.round);
                  const el = document.getElementById(`round-column-${round.round}`);
                  if (activeRound === null) {
                    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  activeRound === round.round
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                    : foldedRounds.has(round.round) 
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                      : "bg-white/5 border-white/10 text-muted-foreground hover:border-primary/50"
                )}
              >
                {round.label} {foldedRounds.has(round.round) && "(Folded)"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="max-w-sm flex-1">
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Tournament</label>
          <select
            value={selectedTournamentId}
            onChange={(e) => {
              setSelectedTournamentId(e.target.value);
              setSelectedMatch(null);
            }}
            className="flex h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <option value="">Select a tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.title}
              </option>
            ))}
          </select>
        </div>

        {selectedTournamentId && (
          <div className="flex items-center gap-3 pb-1">
            {/* Live connection status */}
            <div className={cn(
              "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border",
              isLiveConnected
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                : "text-muted-foreground border-white/10 bg-white/5"
            )}>
              <Wifi className="w-3 h-3" />
              {isLiveConnected ? "Live" : "Connecting..."}
              {isLiveConnected && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            {/* Manual refresh */}
            <button
              onClick={() => void loadMatches(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-white/5 border border-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="font-heading italic animate-pulse">Building the bracket view...</p>
            </div>
          ) : !hasMatches ? (
            <div className="glass p-6 rounded-xl text-center text-muted-foreground">
              No generated bracket yet. Create registrations, then generate the bracket from Tournament Control.
            </div>
          ) : (
            <div className="space-y-12 pb-12">
              <div className="flex items-start gap-8 min-w-[900px]">
                {upperRounds
                  .filter(r => {
                    const stageMatch = activeStage === "ALL" || activeStage === "UPPER";
                    const roundMatch = activeRound === null || r.round === activeRound;
                    return stageMatch && roundMatch;
                  })
                  .map((roundGroup, roundIndex) => {
                  const isFolded = foldedRounds.has(roundGroup.round);
                  const matchHeight = 180;
                  
                  // Reset spacing if we are in single-round view
                  const roundScale = activeRound === null ? Math.pow(2, roundGroup.round - 1) : 1;
                  const cellHeight = matchHeight * roundScale;

                  if (isFolded) {
                    return (
                      <div 
                        key={`folded-${roundGroup.round}`}
                        onClick={() => toggleRoundFold(roundGroup.round)}
                        className="w-12 h-full min-h-[400px] bg-white/5 border border-white/10 rounded-xl flex flex-col items-center py-6 cursor-pointer hover:bg-white/10 transition-all group self-stretch"
                      >
                        <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                          {roundGroup.label} (Folded)
                        </span>
                        <div className="mt-auto p-2 bg-primary/20 rounded-full group-hover:scale-110 transition-transform">
                          <RefreshCw className="w-3 h-3 text-primary" />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`round-${roundGroup.round}`}
                      className="flex flex-col"
                      style={{ 
                        width: isFolded ? '48px' : '260px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div className="flex items-center justify-between mb-4 px-2 group cursor-pointer" onClick={() => toggleRoundFold(roundGroup.round)}>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                          {roundGroup.label}
                        </span>
                        {!isFolded && <span className="text-[8px] text-primary opacity-0 group-hover:opacity-100 uppercase font-bold tracking-tighter">Fold</span>}
                      </div>
                      
                      {roundGroup.matches.map((match, index) => {
                        const matchKey = `${match.id}-${match.team1?.name}-${match.team1?.score}-${match.team2?.name}-${match.team2?.score}-${match.status}`;
                        const isHighlighted = hoveredTeam !== null && (match.team1?.name === hoveredTeam || match.team2?.name === hoveredTeam);
                        const isPathHighlighted = hoveredTeam !== null && (
                          (match.status !== 'Completed' && (match.team1?.name === hoveredTeam || match.team2?.name === hoveredTeam)) ||
                          (match.status === 'Completed' && match.winner === hoveredTeam)
                        );
                        
                        return (
                          <div 
                            key={matchKey} 
                            className="relative flex items-center justify-center"
                            style={{ height: `${cellHeight}px` }}
                          >
                            <div className={cn("animate-highlight-flash relative", isHighlighted && "z-20")} style={{ animationDelay: `${index * 50}ms` }}>
                              <MatchNode
                                match={match}
                                isFinal={roundGroup.round === Math.max(...upperRounds.map(r => r.round)) && grandFinalRounds.length === 0}
                                onClick={() => setSelectedMatch(match)}
                                isHighlighted={isHighlighted}
                                onHoverTeam={setHoveredTeam}
                              />
                            </div>
                          
                            {/* Connection Lines (Refined) */}
                            {roundGroup.round < Math.max(...upperRounds.map(r => r.round)) && !foldedRounds.has(roundGroup.round + 1) && (
                              <>
                                {/* Horizontal Out */}
                                <div className={cn(
                                  "absolute -right-12 w-12 h-[3px] bg-white/30 transition-all duration-300",
                                  isPathHighlighted && "bg-primary shadow-[0_0_15px_rgba(var(--primary),1)] scale-y-150 z-10"
                                )} />
                                
                                {/* Vertical Connector (Elbow) */}
                                {(() => {
                                  const hasPartner = index % 2 === 0 ? index + 1 < roundGroup.matches.length : true;
                                  if (!hasPartner) return null; // No vertical line for solo matches

                                  const verticalHeight = cellHeight / 2;
                                  return (
                                    <div 
                                      className={cn(
                                        "absolute -right-12 w-[3px] bg-white/30 transition-all duration-300 z-10",
                                        isPathHighlighted && "bg-primary shadow-[0_0_15px_rgba(var(--primary),1)] scale-x-150"
                                      )} 
                                      style={{ 
                                        height: `${cellHeight / 2}px`,
                                        top: index % 2 === 0 ? '50%' : 'auto',
                                        bottom: index % 2 === 0 ? 'auto' : '50%'
                                      }}
                                    />
                                  );
                                })()}
                              </>
                            )}
                            
                            {roundGroup.round > 1 && !foldedRounds.has(roundGroup.round - 1) && (
                               <div className={cn(
                                 "absolute -left-12 w-12 h-[3px] bg-white/30 transition-all duration-300",
                                 isHighlighted && "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]"
                               )} />
                            )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
                
                {grandFinalRounds
                  .filter(r => {
                    if (activeStage === "GRAND_FINAL") return true;
                    if (activeStage === "ALL") {
                      return matches.some(m => m.bracketSide === "GRAND_FINAL");
                    }
                    if (activeStage === "UPPER") {
                      return !matches.some(m => m.bracketSide === "GRAND_FINAL");
                    }
                    if (activeStage === "LOWER") {
                      // Show in LOWER tab only if it's a true separate GRAND_FINAL
                      return matches.some(m => m.bracketSide === "GRAND_FINAL");
                    }
                    return false;
                  })
                  .map((roundGroup) => {
                  const matchHeight = 180;
                  const roundScale = Math.pow(2, upperRounds.length);
                  const firstMatchTopMargin = (roundScale - 1) * (matchHeight / 2);

                  return (
                    <div key="grand-final" className="flex flex-col" style={{ marginTop: `${firstMatchTopMargin}px` }}>
                      <span className="text-[10px] text-gold uppercase tracking-wider mb-2 ml-2">Grand Finals</span>
                      {roundGroup.matches.map((match, index) => {
                        const matchKey = `${match.id}-${match.team1?.name}-${match.team1?.score}-${match.team2?.name}-${match.team2?.score}-${match.status}`;
                        const isHighlighted = hoveredTeam !== null && (match.team1?.name === hoveredTeam || match.team2?.name === hoveredTeam);
                        
                        return (
                          <div key={matchKey} className="animate-highlight-flash flex items-center">
                            <MatchNode 
                              match={match} 
                              isFinal={true} 
                              onClick={() => setSelectedMatch(match)} 
                              isHighlighted={isHighlighted}
                              onHoverTeam={setHoveredTeam}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {lowerRounds.length > 0 && (activeStage === "ALL" || activeStage === "LOWER") && (
                <div id="lower-bracket-section" className="pt-8 border-t border-white/10">
                  <h3 className="font-heading text-lg font-bold text-muted-foreground mb-4">Lower Bracket</h3>
                  <div className="flex items-start gap-24 min-w-[1200px]">
                    {lowerRounds
                      .filter(r => activeRound === null || r.round === activeRound)
                      .map((roundGroup) => {
                      const matchHeight = 180;
                      // In lower bracket, scaling is different, but for now we keep it consistent
                      const roundScale = activeRound === null ? Math.pow(2, Math.floor((roundGroup.round - 1) / 2)) : 1;
                      const firstMatchTopMargin = activeRound === null ? (roundScale - 1) * (matchHeight / 2) : 0;
                      const matchGap = activeRound === null ? (roundScale - 1) * matchHeight : 0;

                      return (
                        <div
                          key={`lower-${roundGroup.round}`}
                          className="flex flex-col"
                          style={{ 
                            marginTop: `${firstMatchTopMargin}px`,
                            gap: `${matchGap + 24}px` 
                          }}
                        >
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 ml-2">{roundGroup.label}</span>
                          {roundGroup.matches.map((match, index) => {
                            const matchKey = `${match.id}-${match.team1?.name}-${match.team1?.score}-${match.team2?.name}-${match.team2?.score}-${match.status}`;
                            const isHighlighted = hoveredTeam !== null && (match.team1?.name === hoveredTeam || match.team2?.name === hoveredTeam);
                            
                            return (
                              <div key={matchKey} className="animate-highlight-flash h-[100px] flex items-center" style={{ animationDelay: `${index * 50}ms` }}>
                                <MatchNode
                                  match={match}
                                  onClick={() => setSelectedMatch(match)}
                                  isHighlighted={isHighlighted}
                                  onHoverTeam={setHoveredTeam}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="xl:w-80 shrink-0">
          {selectedMatch ? (
            <MatchDetailPanel match={selectedMatch} onClose={() => setSelectedMatch(null)} />
          ) : (
            <div className="glass p-6 rounded-xl text-center">
              <Swords className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Click a match to view details</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
