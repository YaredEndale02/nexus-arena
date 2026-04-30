import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Match {
  id: string;
  team1_name: string;
  team2_name: string;
  team1_score: number;
  team2_score: number;
  status: string;
  round_label: string;
  scheduled_at: string | null;
  winner_name: string | null;
}

interface ScoreEvent {
  team: string;
  score1: number;
  score2: number;
  round: string;
}

interface WinnerEvent {
  winner: string;
  loser: string;
  score1: number;
  score2: number;
  round: string;
}

function MatchScore({ score, isChanging }: { score: number; isChanging: boolean }) {
  return (
    <div className={cn(
      "bg-black/40 border border-primary/30 px-5 py-2 rounded-xl text-4xl font-black text-primary min-w-[3.5rem] text-center tabular-nums transition-all duration-300 shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.1)]",
      isChanging && "scale-125 bg-primary/40 border-primary text-white shadow-[0_0_30px_rgba(var(--primary-rgb),0.6)]"
    )}>
      {score}
    </div>
  );
}

/** Full-width "SCORE UPDATE" banner — slides in from top, then fades out */
function ScoreAlert({ event, visible }: { event: ScoreEvent | null; visible: boolean }) {
  if (!event) return null;
  return (
    <div className={cn(
      "absolute inset-x-0 top-10 flex items-center justify-center transition-all duration-500 ease-out z-50 pointer-events-none",
      visible ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"
    )}>
      <div className="flex items-center gap-4 bg-primary text-primary-foreground px-8 py-3 rounded-2xl shadow-[0_10px_40px_rgba(var(--primary-rgb),0.5)] border border-white/20">
        <Zap className="w-5 h-5 animate-bounce" />
        <span className="font-black text-base uppercase tracking-[0.2em]">Score Update</span>
        <span className="bg-white/20 px-3 py-0.5 rounded-lg font-black text-lg tabular-nums">
          {event.score1} – {event.score2}
        </span>
        <span className="text-sm font-bold opacity-80 truncate max-w-[200px]">{event.team}</span>
        <Zap className="w-5 h-5 animate-bounce" />
      </div>
    </div>
  );
}

/** Full-screen winner celebration overlay */
function WinnerAlert({ event, visible }: { event: WinnerEvent | null; visible: boolean }) {
  if (!event) return null;
  return (
    <div className={cn(
      "fixed inset-0 flex flex-col items-center justify-center z-[100] pointer-events-none transition-all duration-700",
      visible ? "opacity-100" : "opacity-0"
    )}>
      {/* Dark vignette backdrop */}
      <div className={cn(
        "absolute inset-0 bg-black/70 transition-opacity duration-700",
        visible ? "opacity-100" : "opacity-0"
      )} />

      {/* Celebration card */}
      <div className={cn(
        "relative flex flex-col items-center gap-6 transition-all duration-700",
        visible ? "scale-100 translate-y-0" : "scale-90 translate-y-8"
      )}>
        {/* Glow rings */}
        <div className="absolute inset-0 rounded-full bg-yellow-400/10 blur-3xl scale-150 animate-pulse" />

        <div className="relative flex flex-col items-center gap-4 bg-[#050505]/90 border border-yellow-400/30 rounded-3xl px-16 py-10 shadow-[0_0_80px_rgba(255,215,0,0.15)] backdrop-blur-3xl">
          {/* Trophy icon */}
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.4)] animate-bounce">
            <Trophy className="w-10 h-10 text-black" />
          </div>

          <div className="text-[11px] font-black text-yellow-400/70 uppercase tracking-[0.4em]">
            {event.round} — Match Complete
          </div>

          <div className="text-white font-black text-5xl tracking-tight text-center drop-shadow-lg">
            {event.winner}
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-yellow-400/20 border border-yellow-400/30 px-6 py-2 rounded-xl text-3xl font-black text-yellow-400 tabular-nums">
              {event.score1} – {event.score2}
            </div>
          </div>

          <div className="text-white/30 text-sm font-bold">
            def. {event.loser}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BroadcastOverlay() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournamentName, setTournamentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedMatchId, setUpdatedMatchId] = useState<string | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Event state
  const [scoreEvent, setScoreEvent] = useState<ScoreEvent | null>(null);
  const [scoreAlertVisible, setScoreAlertVisible] = useState(false);
  const [winnerEvent, setWinnerEvent] = useState<WinnerEvent | null>(null);
  const [winnerAlertVisible, setWinnerAlertVisible] = useState(false);

  const matchesRef = useRef<Match[]>([]);
  const displayIndexRef = useRef(0);
  useEffect(() => { 
    matchesRef.current = matches; 
    displayIndexRef.current = displayIndex;
  }, [matches, displayIndex]);

  const triggerScoreAlert = (updated: Match, previous: Match) => {
    // Determine which team scored
    const scoringTeam =
      updated.team1_score > previous.team1_score ? updated.team1_name :
      updated.team2_score > previous.team2_score ? updated.team2_name :
      updated.team1_name; // fallback

    setScoreEvent({ team: scoringTeam, score1: updated.team1_score, score2: updated.team2_score, round: updated.round_label });
    setScoreAlertVisible(true);
    setTimeout(() => setScoreAlertVisible(false), 3000);
    setTimeout(() => setScoreEvent(null), 3700);
  };

  const triggerWinnerAlert = (match: Match) => {
    setWinnerEvent({
      winner: match.winner_name ?? "Winner",
      loser: match.winner_name === match.team1_name ? match.team2_name : match.team1_name,
      score1: match.team1_score,
      score2: match.team2_score,
      round: match.round_label,
    });
    setWinnerAlertVisible(true);
    setTimeout(() => setWinnerAlertVisible(false), 5000);
    setTimeout(() => setWinnerEvent(null), 5800);
  };

  useEffect(() => {
    if (!tournamentId || !supabase) return;

    const fetchData = async () => {
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("title")
        .eq("id", tournamentId)
        .single();
      if (tournament) setTournamentName(tournament.title);

      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("scheduled_at", { ascending: false })
        .limit(20);

      if (matchData) {
        const matchesArray = matchData as Match[];
        setMatches(matchesArray);
        const activeIndex = matchesArray.findIndex(m => m.status === "IN_PROGRESS" || m.status === "LIVE");
        if (activeIndex !== -1) {
          setDisplayIndex(activeIndex);
        }
      }
      setLoading(false);
    };

    fetchData();

    let cycleInterval: NodeJS.Timeout | null = null;
    
    const startCycle = () => {
      if (cycleInterval) clearInterval(cycleInterval);
      cycleInterval = setInterval(() => {
        const total = matchesRef.current.length;
        if (total <= 1) return;

        // Identify all currently active matches
        const activeIndexes = matchesRef.current
          .map((m, i) => (m.status === "IN_PROGRESS" || m.status === "LIVE" ? i : -1))
          .filter((i) => i !== -1);

        let nextIndex = (displayIndexRef.current + 1) % total;

        // If there is live action, strictly lock the carousel to only active matches
        if (activeIndexes.length > 0) {
          const currentActiveIdx = activeIndexes.indexOf(displayIndexRef.current);
          if (currentActiveIdx !== -1) {
            // We are already looking at a live match.
            // If it's the only live match, don't cycle away at all!
            if (activeIndexes.length === 1) return;
            // Otherwise, cycle to the next live match
            nextIndex = activeIndexes[(currentActiveIdx + 1) % activeIndexes.length];
          } else {
            // We were looking at an inactive match, jump immediately to the live action
            nextIndex = activeIndexes[0];
          }
        }

        setIsTransitioning(true);
        setTimeout(() => {
          setDisplayIndex(nextIndex);
          setIsTransitioning(false);
        }, 600);
      }, 15000);
    };

    startCycle();

    // Expose a way to jump to an index and reset the timer
    const jumpToMatch = (index: number) => {
      if (cycleInterval) clearInterval(cycleInterval);
      setIsTransitioning(true);
      setTimeout(() => {
        setDisplayIndex(index);
        setIsTransitioning(false);
        startCycle();
      }, 400);
    };

    const channel = supabase
      .channel("broadcast-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMatches((prev) => [payload.new as Match, ...prev].slice(0, 20));
          } else if (payload.eventType === "UPDATE") {
            console.log("Realtime UPDATE received:", payload);
            const updated = payload.new as Match;
            const previous = matchesRef.current.find((m) => m.id === updated.id) || (payload.old as Partial<Match>);
            console.log("Previous match state:", previous);

            // Score change trigger
            const scoreChanged =
              previous && (updated.team1_score !== previous.team1_score ||
              updated.team2_score !== previous.team2_score);
            console.log("Score changed:", scoreChanged);

            // Completion trigger
            const justCompleted =
              previous && updated.status === "COMPLETED" && previous.status !== "COMPLETED";

            if (justCompleted) {
              triggerWinnerAlert(updated);
            } else if (scoreChanged) {
              triggerScoreAlert(updated, previous as Match);
            }

            // Flash score box
            setUpdatedMatchId(updated.id);
            setTimeout(() => setUpdatedMatchId(null), 1200);

            // Jump display to the updated match smoothly, unless it's already visible
            const index = matchesRef.current.findIndex((m) => m.id === updated.id);
            if (index !== -1 && index !== displayIndexRef.current) {
              jumpToMatch(index);
            }

            setMatches((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMatches((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (cycleInterval) clearInterval(cycleInterval);
    };
  }, [tournamentId]);

  if (loading) return null;

  const match = matches[displayIndex] ?? null;
  const isCompleted = match?.status === "COMPLETED";
  const isT1Winner = isCompleted && match?.winner_name === match?.team1_name;
  const isT2Winner = isCompleted && match?.winner_name === match?.team2_name;
  const isUpdating = match ? updatedMatchId === match.id : false;

  return (
    <div className="fixed inset-0 bg-transparent flex flex-col justify-end p-10 pointer-events-none overflow-hidden font-heading select-none">
      <style>{`
        @keyframes glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        .animate-glow { animation: glow 3s ease-in-out infinite; }
        .text-shadow-lg { text-shadow: 0 2px 12px rgba(0,0,0,0.7); }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 35s linear infinite; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 0.8s ease-in-out;
        }
      `}</style>

      {/* ── Winner Celebration Overlay ── */}
      <WinnerAlert event={winnerEvent} visible={winnerAlertVisible} />

      <div className="w-full max-w-5xl mx-auto flex flex-col gap-0">

        {/* Tournament Header Badge */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-1.5 rounded-t-2xl w-fit shadow-[0_-5px_25px_rgba(var(--primary-rgb),0.35)] relative overflow-hidden group border-t border-x border-white/20">
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <Trophy className="w-4 h-4 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">{tournamentName || "ARENAX LIVE"}</span>
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1 shadow-[0_0_8px_#ef4444]" />
        </div>

        {/* Main Score Bar */}
        <div className="relative">
          {/* Score Alert Banner — anchored above bar */}
          <ScoreAlert event={scoreEvent} visible={scoreAlertVisible} />

          <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/40 via-white/5 to-primary/40 rounded-r-3xl opacity-40 blur-[2px]" />

          <div className={cn(
            "relative bg-[#050505]/95 backdrop-blur-3xl border-l-[7px] border-l-primary rounded-tr-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-visible border border-white/5 transition-opacity duration-500",
            isTransitioning ? "opacity-0" : "opacity-100"
          )}>
            {/* Score update shimmer sweep */}
            {isUpdating && (
              <div className="absolute inset-0 rounded-tr-3xl animate-shimmer pointer-events-none z-10" />
            )}

            {match ? (
              <div className="flex items-center justify-between gap-4 px-8 py-5">

                {/* Team 1 */}
                <div className={cn(
                  "flex flex-col items-end flex-1 min-w-0 transition-all duration-700",
                  isT1Winner ? "scale-105" : isT2Winner ? "opacity-25 grayscale" : ""
                )}>
                  <div className="flex items-center gap-2 max-w-full">
                    {isT1Winner && <Trophy className="w-5 h-5 text-yellow-400 shrink-0 drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" />}
                    <span className={cn(
                      "font-black truncate text-2xl tracking-tight text-shadow-lg transition-all duration-500",
                      isT1Winner ? "text-yellow-400" : "text-white",
                      isUpdating && "text-primary"
                    )}>
                      {match.team1_name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em] mt-0.5">
                    {match.round_label}
                  </span>
                </div>

                {/* Score */}
                <div className="flex items-center gap-4 shrink-0">
                  <MatchScore score={match.team1_score} isChanging={isUpdating} />
                  <span className="text-white/20 font-black text-lg italic select-none">–</span>
                  <MatchScore score={match.team2_score} isChanging={isUpdating} />
                </div>

                {/* Team 2 */}
                <div className={cn(
                  "flex flex-col items-start flex-1 min-w-0 transition-all duration-700",
                  isT2Winner ? "scale-105" : isT1Winner ? "opacity-25 grayscale" : ""
                )}>
                  <div className="flex items-center gap-2 max-w-full">
                    <span className={cn(
                      "font-black truncate text-2xl tracking-tight text-shadow-lg transition-all duration-500",
                      isT2Winner ? "text-yellow-400" : "text-white",
                      isUpdating && "text-primary"
                    )}>
                      {match.team2_name}
                    </span>
                    {isT2Winner && <Trophy className="w-5 h-5 text-yellow-400 shrink-0 drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" />}
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mt-0.5 transition-all duration-500",
                    match.status === "LIVE" || match.status === "IN_PROGRESS"
                      ? "bg-red-500/15 text-red-400 border-red-500/40 animate-pulse"
                      : isCompleted
                      ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                      : "bg-white/5 text-white/30 border-white/10"
                  )}>
                    {match.status}
                  </span>
                </div>

                {/* Dot pagination */}
                {matches.length > 1 && (
                  <div className="flex flex-col items-center gap-1 pl-6 border-l border-white/10 shrink-0">
                    {matches.map((_, i) => (
                      <div key={i} className={cn(
                        "w-1 rounded-full transition-all duration-500",
                        i === displayIndex ? "h-5 bg-primary" : "h-1.5 bg-white/20"
                      )} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-6 py-5 px-8 animate-pulse">
                <Clock className="text-primary w-6 h-6" />
                <div>
                  <p className="text-white font-black text-xl uppercase tracking-[0.2em]">Match Standby</p>
                  <p className="text-primary/50 text-xs font-bold uppercase tracking-wider mt-0.5">Waiting for the first match...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scrolling Ticker Footer */}
        <div className="relative h-9 bg-black/60 backdrop-blur-md border-x border-b border-white/10 rounded-b-2xl overflow-hidden flex items-center">
          <div className="absolute left-0 top-0 bottom-0 px-4 bg-primary text-primary-foreground text-[9px] font-black flex items-center z-30 shadow-[8px_0_20px_rgba(0,0,0,0.5)] tracking-widest uppercase">
            All Results
          </div>
          <div className="flex whitespace-nowrap animate-marquee pl-36">
            {[...matches, ...matches].map((m, i) => (
              <div key={`${m.id}-${i}`} className="flex items-center gap-3 px-6 border-r border-white/10">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{m.round_label}</span>
                <span className={cn("text-[11px] font-black", m.status === "COMPLETED" && m.winner_name === m.team1_name ? "text-primary" : "text-white/80")}>
                  {m.team1_name}
                </span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-black text-primary tabular-nums">
                  {m.team1_score}–{m.team2_score}
                </span>
                <span className={cn("text-[11px] font-black", m.status === "COMPLETED" && m.winner_name === m.team2_name ? "text-primary" : "text-white/80")}>
                  {m.team2_name}
                </span>
                {(m.status === "LIVE" || m.status === "IN_PROGRESS") && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[8px] font-black text-red-400 uppercase">LIVE</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-40 bg-primary/5 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
