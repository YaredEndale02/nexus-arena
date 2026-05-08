import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Clock, Zap, Timer, ChevronRight, Activity, Users, Shield, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Match {
  id: string;
  tournamentId: string;
  roundLabel: string;
  roundNumber?: number | null;
  positionInRound?: number | null;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  status: string;
  scheduledAt?: string | null;
  winnerName?: string | null;
  team1Id?: string | null;
  team2Id?: string | null;
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

/** FC Style Score Update Banner (GOAL!) */
function ScoreAlert({ event, visible }: { event: ScoreEvent | null; visible: boolean }) {
  if (!event) return null;
  return (
    <div className={cn(
      "absolute inset-x-0 top-16 flex items-center justify-center transition-all duration-500 ease-out z-50 pointer-events-none",
      visible ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"
    )}>
      <style>{`
        .fc-skew { transform: skewX(-12deg); }
        .fc-unskew { transform: skewX(12deg); }
      `}</style>
      <div className="flex bg-[#111] fc-skew shadow-2xl border-l-4 border-[var(--fc-primary)]">
        <div className="bg-[var(--fc-primary)] px-6 py-4 flex items-center justify-center">
          <span className="fc-unskew font-black text-black text-3xl uppercase tracking-tighter italic">GOAL!</span>
        </div>
        <div className="fc-unskew flex items-center gap-6 px-8 py-4">
          <span className="text-white font-black text-2xl uppercase tracking-tight italic truncate max-w-[300px]">
            {event.team}
          </span>
          <span className="bg-white/10 px-4 py-1 rounded text-[var(--fc-primary)] font-black text-3xl tabular-nums italic">
            {event.score1} – {event.score2}
          </span>
        </div>
      </div>
    </div>
  );
}

/** FC Style Full-screen Winner Celebration Overlay */
function WinnerAlert({ event, visible }: { event: WinnerEvent | null; visible: boolean }) {
  if (!event) return null;
  return (
    <div className={cn(
      "fixed inset-0 flex flex-col items-center justify-center z-[100] pointer-events-none transition-all duration-700",
      visible ? "opacity-100" : "opacity-0"
    )}>
      <style>{`
        .fc-bg-pattern { background-image: repeating-linear-gradient( 45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 12px ); }
        .fc-skew { transform: skewX(-12deg); }
        .fc-unskew { transform: skewX(12deg); }
      `}</style>
      
      {/* Dark FC background */}
      <div className="absolute inset-0 bg-[var(--fc-bg)]/95 fc-bg-pattern backdrop-blur-sm" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--fc-primary)] opacity-10 blur-[150px] rounded-full" />

      {/* Celebration card */}
      <div className={cn(
        "relative flex flex-col items-center gap-6 transition-all duration-700 ease-out",
        visible ? "scale-100 translate-y-0" : "scale-90 translate-y-12"
      )}>
        <div className="flex bg-[#111] fc-skew shadow-2xl border-l-[8px] border-[var(--fc-primary)] flex-col items-center p-12">
          <div className="fc-unskew flex flex-col items-center">
            
            <div className="flex items-center gap-3 mb-6 bg-[var(--fc-primary)]/10 text-[var(--fc-primary)] px-6 py-2 rounded">
              <Trophy className="w-6 h-6" />
              <span className="font-black uppercase tracking-widest text-sm italic">Full Time</span>
            </div>

            <div className="text-white font-black text-7xl tracking-tighter uppercase italic text-center drop-shadow-lg mb-6">
              {event.winner}
            </div>

            <div className="bg-[var(--fc-primary)] text-black px-10 py-3 rounded-sm text-5xl font-black tabular-nums italic mb-6">
              {event.score1} – {event.score2}
            </div>

            <div className="text-white/40 text-lg font-bold uppercase tracking-widest italic">
              Defeated {event.loser}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

/** Full-screen Starting Soon Scene - FC Style */
function StartingSoonView({ tournamentName, startDate }: { tournamentName: string; startDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{ m: number; s: number }>({ m: 0, s: 0 });

  useEffect(() => {
    const target = new Date(startDate).getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [startDate]);

  return (
    <div className="fixed inset-0 bg-[var(--fc-bg)] flex flex-col items-center justify-center overflow-hidden font-heading select-none text-white">
      <style>{`
        .fc-bg-pattern { background-image: repeating-linear-gradient( 45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 12px ); }
        .fc-skew { transform: skewX(-12deg); }
        .fc-unskew { transform: skewX(12deg); }
      `}</style>
      
      {/* Background Animated Elements */}
      <div className="absolute inset-0 fc-bg-pattern opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--fc-bg)] via-transparent to-transparent opacity-80" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--fc-primary)] opacity-[0.04] blur-[100px] rounded-full animate-pulse" />

      <div className="relative z-10 flex flex-col items-center text-center px-10">
        
        <div className="bg-[var(--fc-primary)] px-8 py-2 fc-skew mb-10 shadow-[0_0_40px_rgba(210,255,13,0.2)]">
          <div className="fc-unskew flex items-center gap-3">
            <Shield className="w-5 h-5 text-black fill-black" />
            <span className="text-sm font-black uppercase tracking-[0.4em] text-black italic">{tournamentName || "ARENAX CHAMPIONSHIP"}</span>
          </div>
        </div>

        <h1 className="text-8xl font-black text-white tracking-tighter mb-12 uppercase italic drop-shadow-xl">
          Starting <span className="text-[var(--fc-primary)]">Soon</span>
        </h1>

        {/* FC Style Timer Block */}
        <div className="flex items-center gap-4 mb-16">
          <div className="bg-[#111] border-b-8 border-[var(--fc-primary)] fc-skew px-12 py-6 min-w-[200px] shadow-2xl">
            <div className="fc-unskew flex flex-col items-center">
              <span className="text-8xl font-black text-white tabular-nums italic tracking-tighter">
                {String(timeLeft.m).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-black text-[var(--fc-primary)] uppercase tracking-[0.4em] mt-2 italic">Minutes</span>
            </div>
          </div>

          <span className="text-6xl font-black text-[var(--fc-primary)] animate-pulse italic">:</span>

          <div className="bg-[#111] border-b-8 border-[var(--fc-primary)] fc-skew px-12 py-6 min-w-[200px] shadow-2xl">
            <div className="fc-unskew flex flex-col items-center">
              <span className="text-8xl font-black text-white tabular-nums italic tracking-tighter">
                {String(timeLeft.s).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-black text-[var(--fc-primary)] uppercase tracking-[0.4em] mt-2 italic">Seconds</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 text-white/40 font-black uppercase tracking-[0.3em] text-[10px] italic">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--fc-primary)] animate-pulse" />
            Live Broadcast Ready
          </div>
          <span className="opacity-20">/</span>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--fc-primary)]" />
            Servers Online
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
/** Compute group stage standings from a list of completed matches */
function computeStandings(matches: Match[]) {
  const table = new Map<string, { team: string; p: number; w: number; d: number; l: number; gf: number; ga: number }>();

  const ensure = (name: string) => {
    if (!table.has(name)) table.set(name, { team: name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    return table.get(name)!;
  };

  for (const m of matches) {
    if (m.status !== "COMPLETED") continue;
    const t1 = ensure(m.team1Name);
    const t2 = ensure(m.team2Name);
    t1.p++; t2.p++;
    t1.gf += m.team1Score; t1.ga += m.team2Score;
    t2.gf += m.team2Score; t2.ga += m.team1Score;
    if (m.team1Score > m.team2Score)      { t1.w++; t2.l++; }
    else if (m.team2Score > m.team1Score) { t2.w++; t1.l++; }
    else                                  { t1.d++; t2.d++; }
  }

  return [...table.values()]
    .map(r => ({ ...r, gd: r.gf - r.ga, pts: r.w * 3 + r.d }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
}

/** Full-screen Group Stage Table scene */
function GroupStageTableView({ tournamentName, tournamentId }: { tournamentName: string; tournamentId: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!supabase || !tournamentId) return;

    const fetchMatches = async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId);
      if (data) {
        setMatches((data as any[]).map(row => ({
          id: row.id,
          tournamentId: row.tournament_id,
          roundLabel: row.round_label,
          team1Name: row.team1_name,
          team2Name: row.team2_name,
          team1Score: row.team1_score ?? 0,
          team2Score: row.team2_score ?? 0,
          status: row.status,
          scheduledAt: row.scheduled_at,
          winnerName: row.winner_name,
        })));
      }
      setLoading(false);
    };

    fetchMatches();

    const channel = supabase
      .channel(`table-overlay-${tournamentId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          const raw = payload.new as any;
          setMatches(prev => prev.map(m => m.id === raw.id ? {
            ...m,
            team1Score: raw.team1_score ?? 0,
            team2Score: raw.team2_score ?? 0,
            status: raw.status,
            winnerName: raw.winner_name,
          } : m));
          setTick(t => t + 1);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  const rows = computeStandings(matches);
  const completed = matches.filter(m => m.status === "COMPLETED").length;

  return (
    <div className="fixed inset-0 bg-[var(--fc-bg)] flex flex-col items-center justify-center overflow-hidden font-heading select-none text-white">
      <style>{`
        @keyframes slide-in-skew { 0% { transform: translateX(-50px) skewX(-12deg); opacity: 0; } 100% { transform: translateX(0) skewX(-12deg); opacity: 1; } }
        .fc-bg-pattern { background-image: repeating-linear-gradient( 45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 12px ); }
        .fc-volt { color: var(--fc-primary); }
        .bg-fc-volt { background-color: var(--fc-primary); }
        .border-fc-volt { border-color: var(--fc-primary); }
        .fc-skew { transform: skewX(-12deg); }
        .fc-unskew { transform: skewX(12deg); }
        .fc-row-anim { animation: slide-in-skew 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      {/* FC Esports Style Background */}
      <div className="absolute inset-0 fc-bg-pattern opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--fc-bg)] via-transparent to-transparent opacity-80" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-fc-volt opacity-[0.03] blur-[150px] rounded-full translate-x-1/3 -translate-y-1/3" />

      <div className="relative z-10 w-full max-w-4xl px-8">

        {/* FC Header */}
        <div className="flex items-end gap-6 mb-6">
          <div className="bg-fc-volt px-6 py-3 fc-skew fc-row-anim" style={{ animationDelay: '0s' }}>
            <div className="fc-unskew flex items-center gap-3">
              <Shield className="w-6 h-6 text-black fill-black" />
              <h1 className="text-black font-black text-2xl uppercase tracking-tighter italic">Group Stage</h1>
            </div>
          </div>
          
          <div className="bg-[#111] border-b-4 border-fc-volt px-6 py-3 fc-skew fc-row-anim flex-1 flex justify-between items-center" style={{ animationDelay: '0.1s' }}>
            <div className="fc-unskew">
              <span className="text-white/50 text-xs font-bold uppercase tracking-widest block mb-0.5">Tournament</span>
              <span className="text-white font-black text-xl uppercase tracking-tight italic">{tournamentName || "ArenaX Championship"}</span>
            </div>
            <div className="fc-unskew flex items-center gap-3">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
                <span className="w-2 h-2 rounded-full bg-fc-volt animate-pulse" />
                Live Standings
              </span>
              <span className="bg-white/10 px-3 py-1 rounded text-sm font-black italic">{completed} / {matches.length}</span>
            </div>
          </div>
        </div>

        {/* FC Table Container */}
        <div className="w-full relative">
          
          {/* Headers */}
          <div className="flex bg-[#1a1a1a] fc-skew mb-2 px-8 py-2 border-l-4 border-transparent">
            <div className="fc-unskew w-full grid items-center gap-4 text-[10px] font-black text-white/40 uppercase tracking-widest italic"
              style={{ gridTemplateColumns: '2rem 1fr 3rem 3rem 3rem 3rem 3rem 3rem 4rem' }}>
              <span>#</span>
              <span>Club / Team</span>
              <span className="text-center">MP</span>
              <span className="text-center">W</span>
              <span className="text-center">D</span>
              <span className="text-center">L</span>
              <span className="text-center">GD</span>
              <span className="text-center">GF</span>
              <span className="text-right fc-volt">PTS</span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-white/20 fc-skew bg-[#111]">
              <div className="fc-unskew flex items-center gap-3">
                <TrendingUp className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-black uppercase tracking-widest italic">Syncing Data...</span>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 flex items-center justify-center text-white/20 fc-skew bg-[#111]">
              <div className="fc-unskew text-sm font-black uppercase tracking-widest italic">Awaiting match results</div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {rows.map((row, i) => {
                const isTop1 = i === 0;
                const isTop2 = i < 2;
                
                return (
                  <div
                    key={row.team}
                    className={cn(
                      "flex px-8 py-3.5 fc-skew fc-row-anim border-l-4 transition-all duration-300",
                      isTop1 ? "bg-white text-black border-fc-volt" : "bg-[#111] text-white border-transparent hover:bg-[#1a1a1a]"
                    )}
                    style={{ animationDelay: `${0.1 + (i * 0.05)}s` }}
                  >
                    <div className="fc-unskew w-full grid items-center gap-4"
                      style={{ gridTemplateColumns: '2rem 1fr 3rem 3rem 3rem 3rem 3rem 3rem 4rem' }}>
                      
                      {/* POS */}
                      <span className={cn("text-lg font-black italic", isTop1 ? "text-black" : "text-white/40")}>
                        {i + 1}
                      </span>

                      {/* TEAM */}
                      <span className="font-black text-lg truncate uppercase italic tracking-tight flex items-center gap-2">
                        {row.team}
                        {isTop1 && <Trophy className="w-4 h-4 fill-black text-black ml-1" />}
                      </span>

                      {/* STATS */}
                      {([row.p, row.w, row.d, row.l] as number[]).map((val, j) => (
                        <span key={j} className={cn("text-base font-bold italic text-center", isTop1 ? "text-black/70" : "text-white/60")}>
                          {val}
                        </span>
                      ))}

                      {/* GD */}
                      <span className={cn(
                        "text-base font-black italic text-center",
                        row.gd > 0 ? (isTop1 ? "text-green-700" : "fc-volt") : 
                        row.gd < 0 ? "text-red-500" : (isTop1 ? "text-black/50" : "text-white/30")
                      )}>
                        {row.gd > 0 ? `+${row.gd}` : row.gd}
                      </span>

                      {/* GF */}
                      <span className={cn("text-base font-bold italic text-center", isTop1 ? "text-black/70" : "text-white/40")}>
                        {row.gf}
                      </span>

                      {/* PTS */}
                      <span className={cn(
                        "text-2xl font-black italic text-right",
                        isTop1 ? "text-black" : "fc-volt"
                      )}>
                        {row.pts}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/** Live timer showing how long the break has been running - FC Style */
function BreakTimer() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;

  return (
    <div className="flex items-center gap-4 mt-8 stagger-4">
      <div className="bg-[#111] border-l-4 border-[var(--fc-primary)] fc-skew px-6 py-3 shadow-xl">
        <div className="fc-unskew flex items-center gap-4">
          <Clock className="w-5 h-5 text-[var(--fc-primary)]" />
          <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] italic mr-2">Break Elapsed</span>
          <span className="font-black text-2xl text-white tabular-nums tracking-tighter italic">
            {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--fc-primary)] animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--fc-primary)] italic">On Break</span>
      </div>
    </div>
  );
}

/** Full-screen Intermission Scene - FC Style */
function IntermissionView({ tournamentName, matches }: { tournamentName: string; matches: Match[] }) {
  const nextMatch = matches.find(m => m.status === "SCHEDULED") || (matches.length > 1 ? matches[1] : null);

  return (
    <div className="fixed inset-0 bg-[var(--fc-bg)] flex flex-col items-center justify-center overflow-hidden font-heading select-none text-white">
      <style>{`
        @keyframes stagger-up { 0%{opacity:0;transform:translateY(32px) skewX(-12deg)} 100%{opacity:1;transform:translateY(0) skewX(-12deg)} }
        .fc-bg-pattern { background-image: repeating-linear-gradient( 45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 12px ); }
        .fc-skew { transform: skewX(-12deg); }
        .fc-unskew { transform: skewX(12deg); }
        .stagger-1 { animation: stagger-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.05s; }
        .stagger-2 { animation: stagger-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.15s; }
        .stagger-3 { animation: stagger-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.25s; }
        .stagger-4 { animation: stagger-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.35s; }
      `}</style>

      {/* FC Esports Style Background */}
      <div className="absolute inset-0 fc-bg-pattern opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--fc-bg)] via-transparent to-transparent opacity-80" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--fc-primary)] opacity-[0.03] blur-[150px] rounded-full" />

      {/* Main Grid */}
      <div className="relative z-10 w-full max-w-6xl px-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

        {/* Left: BRB Text */}
        <div className="fc-skew">
          <div className="fc-unskew">
            
            <div className="bg-[var(--fc-primary)] px-6 py-2 fc-skew mb-8 inline-block shadow-lg stagger-1">
              <div className="fc-unskew flex items-center gap-3">
                <Shield className="w-4 h-4 text-black fill-black" />
                <span className="text-xs font-black uppercase tracking-[0.4em] text-black italic">{tournamentName || "ArenaX Championship"}</span>
              </div>
            </div>

            <h1 className="text-[clamp(5rem,8vw,8rem)] font-black text-white tracking-tighter leading-[0.85] uppercase italic drop-shadow-2xl stagger-2 mb-6">
              Half Time <br />
              <span className="text-[var(--fc-primary)]">Intermission</span>
            </h1>

            <p className="text-xl text-white/50 font-bold max-w-md italic stagger-3">
              We're taking a short break. Stay tuned — the action resumes shortly!
            </p>

            <BreakTimer />
          </div>
        </div>

        {/* Right: Up Next card + stats */}
        <div className="space-y-4">
          {nextMatch ? (
            <div className="bg-[#111] border-l-8 border-[var(--fc-primary)] fc-skew shadow-2xl p-8 relative overflow-hidden stagger-3">
              <div className="fc-unskew">
                
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--fc-primary)] mb-6 flex items-center gap-2 italic">
                  <span className="w-2 h-2 rounded-full bg-[var(--fc-primary)] animate-pulse inline-block" />
                  Up Next
                </span>

                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 italic">Club</p>
                    <p className="text-3xl font-black text-white truncate uppercase italic tracking-tight">{nextMatch.team1Name}</p>
                  </div>
                  <span className="text-white/20 font-black text-3xl italic px-4">VS</span>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 italic">Club</p>
                    <p className="text-3xl font-black text-white truncate uppercase italic tracking-tight">{nextMatch.team2Name}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] border-t border-white/10 pt-4 italic">
                  <span className="flex items-center gap-1.5">
                    <Timer className="w-3 h-3 text-[var(--fc-primary)]" />
                    {nextMatch.roundLabel}
                  </span>
                  <span>
                    {nextMatch.scheduledAt
                      ? new Date(nextMatch.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : "TBD"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#111] border-l-4 border-white/10 fc-skew p-8 text-center stagger-3">
              <div className="fc-unskew text-white/30 italic text-sm font-black uppercase tracking-widest">
                No upcoming matches scheduled
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a1a1a] fc-skew p-5 border-l-4 border-transparent hover:border-white/20 transition-colors stagger-4">
              <div className="fc-unskew flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-white/40">
                  <Users className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Viewers</span>
                </div>
                <span className="text-3xl font-black text-white tracking-tighter italic">1,248</span>
              </div>
            </div>
            <div className="bg-[#1a1a1a] fc-skew p-5 border-l-4 border-transparent hover:border-[var(--fc-primary)]/50 transition-colors stagger-4">
              <div className="fc-unskew flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-white/40">
                  <Activity className="w-4 h-4 text-[var(--fc-primary)]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Stream Delay</span>
                </div>
                <span className="text-3xl font-black text-white tracking-tighter italic">15s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BroadcastOverlay() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const scene = searchParams.get("scene") || "live";
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournament, setTournament] = useState<{ title: string; startDate: string } | null>(null);
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
      updated.team1Score > previous.team1Score ? updated.team1Name :
      updated.team2Score > previous.team2Score ? updated.team2Name :
      updated.team1Name; // fallback

    setScoreEvent({ team: scoringTeam, score1: updated.team1Score, score2: updated.team2Score, round: updated.roundLabel });
    setScoreAlertVisible(true);
    setTimeout(() => setScoreAlertVisible(false), 3000);
    setTimeout(() => setScoreEvent(null), 3700);
  };

  const triggerWinnerAlert = (match: Match) => {
    setWinnerEvent({
      winner: match.winnerName ?? "Winner",
      loser: match.winnerName === match.team1Name ? match.team2Name : match.team1Name,
      score1: match.team1Score,
      score2: match.team2Score,
      round: match.roundLabel,
    });
    setWinnerAlertVisible(true);
    setTimeout(() => setWinnerAlertVisible(false), 5000);
    setTimeout(() => setWinnerEvent(null), 5800);
  };

  useEffect(() => {
    if (!tournamentId || !supabase) return;

    const fetchData = async () => {
      const { data: tournamentData } = await supabase
        .from("tournaments")
        .select("title, start_date")
        .eq("id", tournamentId)
        .single();
      if (tournamentData) setTournament({ title: tournamentData.title, startDate: tournamentData.start_date });

      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("scheduled_at", { ascending: false })
        .limit(20);

      if (matchData) {
        const matchesArray = (matchData as any[]).map(row => ({
          id: row.id,
          tournamentId: row.tournament_id,
          roundLabel: row.round_label,
          roundNumber: row.round_number,
          positionInRound: row.position_in_round,
          team1Name: row.team1_name,
          team2Name: row.team2_name,
          team1Score: row.team1_score,
          team2Score: row.team2_score,
          status: row.status,
          scheduledAt: row.scheduled_at,
          winnerName: row.winner_name,
          team1Id: row.team1_id,
          team2Id: row.team2_id,
        })) as Match[];
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
            const raw = payload.new as any;
            const updated = {
              id: raw.id,
              tournamentId: raw.tournament_id,
              roundLabel: raw.round_label,
              roundNumber: raw.round_number,
              positionInRound: raw.position_in_round,
              team1Name: raw.team1_name,
              team2Name: raw.team2_name,
              team1Score: raw.team1_score,
              team2Score: raw.team2_score,
              status: raw.status,
              scheduledAt: raw.scheduled_at,
              winnerName: raw.winner_name,
              team1Id: raw.team1_id,
              team2Id: raw.team2_id,
            } as Match;
            setMatches((prev) => [updated, ...prev].slice(0, 20));
          } else if (payload.eventType === "UPDATE") {
            console.log("Realtime UPDATE received:", payload);
            const raw = payload.new as any;
            const updated = {
              id: raw.id,
              tournamentId: raw.tournament_id,
              roundLabel: raw.round_label,
              roundNumber: raw.round_number,
              positionInRound: raw.position_in_round,
              team1Name: raw.team1_name,
              team2Name: raw.team2_name,
              team1Score: raw.team1_score,
              team2Score: raw.team2_score,
              status: raw.status,
              scheduledAt: raw.scheduled_at,
              winnerName: raw.winner_name,
              team1Id: raw.team1_id,
              team2Id: raw.team2_id,
            } as Match;
            const previous = matchesRef.current.find((m) => m.id === updated.id);
            console.log("Previous match state:", previous);

            // Score change trigger
            const scoreChanged =
              previous && (updated.team1Score !== previous.team1Score ||
              updated.team2Score !== previous.team2Score);
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

  const primaryColor = searchParams.get("primary") || "d2ff0d";
  const bgColor = searchParams.get("bg") || "050505";

  const renderScene = () => {
    if (scene === "starting") {
      return <StartingSoonView tournamentName={tournament?.title || ""} startDate={tournament?.startDate || ""} />;
    }
    if (scene === "intermission") {
      return <IntermissionView tournamentName={tournament?.title || ""} matches={matches} />;
    }
    if (scene === "table") {
      return <GroupStageTableView tournamentName={tournament?.title || ""} tournamentId={tournamentId!} />;
    }
    return null; // Signals to render the live scene below
  };

  const activeSceneComponent = renderScene();

  if (activeSceneComponent) {
    return (
      <div style={{ '--fc-primary': `#${primaryColor}`, '--fc-bg': `#${bgColor}` } as any}>
        {activeSceneComponent}
      </div>
    );
  }

  const match = matches[displayIndex] ?? null;
  const isCompleted = match?.status === "COMPLETED";
  const isT1Winner = isCompleted && match?.winnerName === match?.team1Name;
  const isT2Winner = isCompleted && match?.winnerName === match?.team2Name;
  const isUpdating = match ? updatedMatchId === match.id : false;

  return (
    <div 
      className="fixed inset-0 bg-transparent pointer-events-none overflow-hidden font-heading select-none text-white"
      style={{ '--fc-primary': `#${primaryColor}`, '--fc-bg': `#${bgColor}` } as any}
    >
      <style>{`
        .fc-skew { transform: skewX(-12deg); }
        .fc-unskew { transform: skewX(12deg); }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(210,255,13,0.3) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 0.8s ease-in-out;
        }
      `}</style>

      {/* ── Alerts ── */}
      <WinnerAlert event={winnerEvent} visible={winnerAlertVisible} />
      <ScoreAlert event={scoreEvent} visible={scoreAlertVisible} />

      {/* ── Top-Left FC Scoreboard ── */}
      <div className={cn(
        "absolute top-10 left-10 transition-opacity duration-500",
        isTransitioning ? "opacity-0" : "opacity-100"
      )}>
        
        {/* Tournament Badge */}
        <div className="bg-[var(--fc-primary)] px-4 py-1 inline-flex fc-skew mb-[-5px] shadow-[0_0_20px_rgba(210,255,13,0.15)] border-t-[3px] border-l-[3px] border-white/20">
          <div className="fc-unskew flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-black italic">
              {tournament?.title || "ARENAX"}
            </span>
          </div>
        </div>

        {/* Main Score Bar */}
        <div className="flex">
          <div className="bg-[#111] border-l-[6px] border-[var(--fc-primary)] fc-skew shadow-2xl overflow-visible relative flex items-stretch">
            
            {/* Score update shimmer sweep */}
            {isUpdating && <div className="absolute inset-0 animate-shimmer pointer-events-none z-10" />}

            {match ? (
              <div className="fc-unskew flex items-center h-12">
                
                {/* Team 1 Abbreviation */}
                <div className={cn(
                  "flex items-center justify-center w-16 px-3 h-full transition-all duration-300",
                  isT1Winner ? "bg-[var(--fc-primary)] text-black" : isT2Winner ? "opacity-30" : "bg-[#111] text-white"
                )}>
                  <span className="font-black text-xl italic uppercase tracking-tighter truncate">
                    {match.team1Name.substring(0, 3)}
                  </span>
                </div>

                {/* Scores */}
                <div className="flex items-center justify-center bg-[#222] h-full px-4 border-x border-[#333]">
                  <span className={cn(
                    "font-black text-2xl tabular-nums italic w-6 text-center",
                    isUpdating && updatedMatchId === match.id ? "text-[var(--fc-primary)]" : "text-white"
                  )}>
                    {match.team1Score}
                  </span>
                  <span className="text-white/20 font-black text-lg italic mx-1">–</span>
                  <span className={cn(
                    "font-black text-2xl tabular-nums italic w-6 text-center",
                    isUpdating && updatedMatchId === match.id ? "text-[var(--fc-primary)]" : "text-white"
                  )}>
                    {match.team2Score}
                  </span>
                </div>

                {/* Team 2 Abbreviation */}
                <div className={cn(
                  "flex items-center justify-center w-16 px-3 h-full transition-all duration-300",
                  isT2Winner ? "bg-[var(--fc-primary)] text-black" : isT1Winner ? "opacity-30" : "bg-[#111] text-white"
                )}>
                  <span className="font-black text-xl italic uppercase tracking-tighter truncate">
                    {match.team2Name.substring(0, 3)}
                  </span>
                </div>

              </div>
            ) : (
              <div className="fc-unskew flex items-center px-6 h-12">
                <span className="text-white/40 font-black text-sm uppercase tracking-widest italic">
                  Standby
                </span>
              </div>
            )}
          </div>

          {/* Match Clock & Round Indicator */}
          {match && (
            <div className="bg-[var(--fc-primary)] text-black fc-skew px-4 shadow-xl flex items-center ml-1 border-r-[3px] border-b-[3px] border-white/20">
              <div className="fc-unskew flex items-center gap-3">
                <span className="font-black text-lg tabular-nums tracking-tighter italic">
                  45:00
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 italic border-l border-black/20 pl-2">
                  {match.roundLabel}
                </span>
              </div>
            </div>
          )}

        </div>
        
        {/* Match Status / Winner Indicator */}
        {match && (
          <div className="absolute top-[100%] right-0 mt-2">
            <div className={cn(
              "fc-skew px-4 py-1 text-[9px] font-black uppercase tracking-[0.3em] italic shadow-lg",
              match.status === "LIVE" || match.status === "IN_PROGRESS"
                ? "bg-red-600 text-white"
                : isCompleted
                ? "bg-white/10 text-[var(--fc-primary)] backdrop-blur-md"
                : "bg-white/5 text-white/50 backdrop-blur-md"
            )}>
              <div className="fc-unskew flex items-center gap-2">
                {(match.status === "LIVE" || match.status === "IN_PROGRESS") && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                {isCompleted ? "Full Time" : match.status}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
