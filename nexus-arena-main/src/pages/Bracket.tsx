import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X, Clock, Swords, Loader2, RefreshCw, Wifi, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
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

const cleanName = (name: string) => name.replace(/\s*\(Manual\)\s*/gi, "").trim();

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
        ? { name: cleanName(match.team1Name), score: match.team1Score }
        : null,
    team2:
      match.team2Name && match.team2Name !== "TBD" && match.team2Name !== "BYE"
        ? { name: cleanName(match.team2Name), score: match.team2Score }
        : null,
    winner: match.winnerName ? cleanName(match.winnerName) : null,
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
        "glass-card p-5 w-64 cursor-pointer transition-all duration-300 relative",
        isLive && "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]",
        isFinal && match.winner && "animate-golden-pulse border-gold/50",
        isFinal && "w-72",
        isHighlighted && "border-primary/60 bg-primary/5 scale-[1.02] z-10 shadow-[0_0_30px_rgba(var(--primary),0.2)]",
      )}
    >
      {/* Match ID tucked into corner */}
      <span className="absolute top-2 right-3 text-[7px] text-muted-foreground/20 font-mono tracking-tighter">#{match.id.slice(0, 4)}</span>

      <div className="flex items-center justify-between mb-4">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-widest",
            isLive ? "text-red-400" : isCompleted ? "text-muted-foreground" : "text-neon-purple",
          )}
        >
          {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1" />}
          {match.status}
        </span>
      </div>

      {[match.team1, match.team2].map((team, i) => {
        const isWinner = team && match.winner === team.name;
        const isTBD = !team;

        return (
          <div
            key={i}
            onMouseEnter={() => onHoverTeam(team?.name || null)}
            onMouseLeave={() => onHoverTeam(null)}
            className={cn(
              "flex items-center justify-between py-3 px-4 rounded-lg mb-2 transition-all duration-200 border",
              isWinner ? "bg-emerald-500/10 border-emerald-500/30" : "border-transparent",
              isTBD ? "border-dashed border-white/10 bg-white/2" : "hover:bg-white/5",
              team && isHighlighted && "font-bold",
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span
                className={cn(
                  "text-sm truncate transition-colors",
                  isWinner ? "text-emerald-400 font-bold" : isTBD ? "text-muted-foreground/40" : "text-foreground",
                )}
              >
                {team?.name || "TBD"}
              </span>
            </div>
            <span
              className={cn(
                "text-sm font-heading font-black min-w-[24px] text-right transition-colors",
                isWinner ? "text-emerald-400" : isTBD ? "text-muted-foreground/10" : "text-muted-foreground",
              )}
            >
              {team?.score ?? (match.status === "Upcoming" ? "" : "0")}
            </span>
          </div>
        );
      })}

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">{match.roundLabel}</span>
        {match.scheduledTime !== "TBD" && (
           <span className="text-[9px] text-muted-foreground/30 flex items-center gap-1">
             <Clock className="w-2.5 h-2.5" /> {new Date(match.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
        )}
      </div>
    </div>
  );
}

function MatchDetailPanel({ match, onClose }: { match: BracketNode; onClose: () => void }) {
  return (
    <div className="glass p-6 rounded-xl animate-scale-in relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">Match Details</h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{match.roundLabel} • #{match.id.slice(0, 8)}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-col gap-6 mb-8">
        {[match.team1, match.team2].map((team, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
            <span className="font-bold text-white/90">{team?.name || "TBD"}</span>
            <span className="text-2xl font-black text-primary">{team?.score ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Scheduled</span>
          <span className="text-foreground font-medium">{match.scheduledTime}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-2"><Swords className="w-4 h-4" /> Status</span>
          <span className={cn(
            "font-black uppercase tracking-wider px-2 py-0.5 rounded text-[10px]",
            match.status === "Live" ? "bg-red-500/20 text-red-400" : "bg-white/10 text-muted-foreground"
          )}>{match.status}</span>
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
  const [zoomLevel, setZoomLevel] = useState(1.0);
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
          <div className="flex flex-wrap p-1 bg-white/5 border border-white/10 rounded-xl w-full sm:w-fit">
            {[
              { id: "ALL", label: "Full View", icon: Wifi },
              { id: "UPPER", label: "Upper", icon: Swords },
              { id: "LOWER", label: "Lower", icon: Swords },
              { id: "GRAND_FINAL", label: "Finals", icon: Clock },
            ].map((stage) => {
              if (stage.id === "LOWER" && lowerRounds.length === 0) return null;
              if (stage.id === "GRAND_FINAL" && grandFinalRounds.length === 0) return null;
              
              const active = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id as any)}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all",
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
          <div className="flex flex-wrap items-center gap-3 pb-1">
            {/* Live connection status */}
            <div className={cn(
              "flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border",
              isLiveConnected
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                : "text-muted-foreground border-white/10 bg-white/5"
            )}>
              <Wifi className="w-3 h-3" />
              {isLiveConnected ? "Live" : "Connecting..."}
              {isLiveConnected && (
                <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground">
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md p-0.5">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
                title="Zoom Out"
                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-white/10"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                onClick={() => setZoomLevel(1.0)}
                title="Reset Zoom"
                className="px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground hover:text-foreground rounded hover:bg-white/10"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
                title="Zoom In"
                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-white/10"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>

            {/* Manual refresh */}
            <button
              onClick={() => void loadMatches(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-white/5 border border-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
              {isRefreshing ? "..." : "Refresh"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-6 relative">
        <div className="flex-1 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {/* Mobile Scroll Hint */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-4 text-[10px] font-bold text-primary/40 uppercase tracking-widest animate-pulse">
            <RefreshCw className="w-3 h-3 rotate-90" />
            Swipe to view rounds
          </div>

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
            <div className="space-y-12 pb-12 transition-transform duration-200" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
              <div className="flex items-start gap-8 sm:gap-32 px-4">
                {upperRounds
                  .filter(r => {
                    const stageMatch = activeStage === "ALL" || activeStage === "UPPER";
                    const roundMatch = activeRound === null || r.round === activeRound;
                    return stageMatch && roundMatch;
                  })
                  .map((roundGroup, roundIndex) => {
                  const isFolded = foldedRounds.has(roundGroup.round);
                  const matchHeight = 180;
                  
                  const roundScale = activeRound === null ? Math.pow(2, roundGroup.round - 1) : 1;
                  const cellHeight = matchHeight * roundScale;

                  if (isFolded) {
                    return (
                      <div 
                        key={`folded-${roundGroup.round}`}
                        onClick={() => toggleRoundFold(roundGroup.round)}
                        className="w-10 sm:w-12 h-full min-h-[400px] bg-white/5 border border-white/10 rounded-xl flex flex-col items-center py-6 cursor-pointer hover:bg-white/10 transition-all group self-stretch snap-start"
                      >
                        <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                          {roundGroup.label}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`round-${roundGroup.round}`}
                      id={`round-column-${roundGroup.round}`}
                      className="flex flex-col snap-start"
                      style={{ 
                        width: isFolded ? '40px' : '260px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div className="flex items-center justify-between mb-10 px-2 group cursor-pointer border-b-2 border-white/10 pb-6" onClick={() => toggleRoundFold(roundGroup.round)}>
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-[12px] font-black text-primary uppercase tracking-[0.4em] mb-2">
                            {roundGroup.label.split(' ')[0]}
                          </span>
                          <span className="text-xl sm:text-2xl font-heading font-black text-foreground leading-none tracking-tight">
                            {roundGroup.label}
                          </span>
                        </div>
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
                          
                            {roundGroup.round < Math.max(...upperRounds.map(r => r.round)) && !foldedRounds.has(roundGroup.round + 1) && (
                              <>
                                <div className={cn(
                                  "absolute -right-8 sm:-right-16 w-8 sm:w-16 h-[3px] bg-white/10 transition-all duration-300",
                                  isPathHighlighted && "bg-primary shadow-[0_0_20px_rgba(var(--primary),1)] h-[4px] z-10"
                                )} />
                                
                                {(() => {
                                  const hasPartner = index % 2 === 0 ? index + 1 < roundGroup.matches.length : true;
                                  if (!hasPartner) return null;

                                  return (
                                    <div 
                                      className={cn(
                                        "absolute -right-8 sm:-right-16 w-[3px] bg-white/10 transition-all duration-300 z-10",
                                        isPathHighlighted && "bg-primary shadow-[0_0_20px_rgba(var(--primary),1)] w-[4px]"
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
                                 "absolute -left-8 sm:-left-16 w-8 sm:w-16 h-[3px] bg-white/10 transition-all duration-300",
                                 isHighlighted && "bg-primary shadow-[0_0_15px_rgba(var(--primary),0.8)] h-[4px]"
                               )} />
                            )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
                
                {grandFinalRounds.length > 0 && grandFinalRounds
                  .filter(r => {
                    if (activeStage === "GRAND_FINAL") return true;
                    if (activeStage === "ALL") return matches.some(m => m.bracketSide === "GRAND_FINAL");
                    return false;
                  })
                  .map((roundGroup) => {
                  const matchHeight = 180;
                  const roundScale = Math.pow(2, upperRounds.length);
                  const firstMatchTopMargin = (roundScale - 1) * (matchHeight / 2);

                  return (
                    <div key="grand-final" className="flex flex-col snap-start" style={{ marginTop: `${firstMatchTopMargin}px` }}>
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
                  <h3 className="font-heading text-xl font-black text-muted-foreground mb-6 uppercase tracking-widest">Lower Bracket</h3>
                  <div className="flex items-start gap-8 sm:gap-32">
                    {lowerRounds
                      .filter(r => activeRound === null || r.round === activeRound)
                      .map((roundGroup) => {
                      const matchHeight = 180;
                      const roundScale = activeRound === null ? Math.pow(2, Math.floor((roundGroup.round - 1) / 2)) : 1;
                      const firstMatchTopMargin = activeRound === null ? (roundScale - 1) * (matchHeight / 2) : 0;
                      const matchGap = activeRound === null ? (roundScale - 1) * matchHeight : 0;

                      return (
                        <div
                          key={`lower-${roundGroup.round}`}
                          className="flex flex-col snap-start"
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

        {/* Floating/Bottom Sheet Panel for Mobile */}
        <div className={cn(
          "xl:w-80 shrink-0",
          "fixed inset-x-4 bottom-4 z-40 xl:relative xl:inset-auto xl:z-0 xl:block",
          !selectedMatch && "hidden xl:block"
        )}>
          {selectedMatch ? (
            <MatchDetailPanel match={selectedMatch} onClose={() => setSelectedMatch(null)} />
          ) : (
            <div className="hidden xl:block glass p-6 rounded-xl text-center">
              <Swords className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Click a match to view details</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
