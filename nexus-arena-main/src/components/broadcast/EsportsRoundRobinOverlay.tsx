import React, { useState, useEffect, useMemo } from "react";
import { Trophy, Crown, Activity, Shield, ChevronRight, CheckCircle2, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { SlantedBadge } from "@/components/broadcast/design-system";

export interface EsportsRoundRobinOverlayProps {
  tournamentId: string;
  tournamentTitle?: string;
  gameTitle?: string;
  matches?: any[];
  primaryColor?: string; // hex string without #, defaults to "d2ff0d" (electric volt)
  bgColor?: string; // hex string without #, defaults to "050505"
  qualificationCutoff?: number; // default 2 (Top 2 advance to playoffs)
}

interface StandingRow {
  rank: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: ("W" | "D" | "L")[];
}

export function EsportsRoundRobinOverlay({
  tournamentId,
  tournamentTitle = "",
  gameTitle = "",
  matches: initialMatches = [],
  primaryColor = "d2ff0d",
  bgColor = "050505",
  qualificationCutoff = 2,
}: EsportsRoundRobinOverlayProps) {
  const [matches, setMatches] = useState<any[]>(initialMatches);
  const [selectedRound, setSelectedRound] = useState<number | "ALL">("ALL");

  const voltHex = primaryColor.startsWith("#") ? primaryColor : `#${primaryColor}`;

  // Sync initial matches
  useEffect(() => {
    if (initialMatches && initialMatches.length > 0) {
      setMatches(initialMatches);
    }
  }, [initialMatches]);

  // Real-time Supabase subscription for live scores
  useEffect(() => {
    if (!supabase || !tournamentId) return;

    const fetchMatches = async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("round_number", { ascending: true })
        .order("position_in_round", { ascending: true });

      if (data && data.length > 0) {
        setMatches(
          data.map((row: any) => ({
            id: row.id,
            tournamentId: row.tournament_id,
            roundLabel: row.round_label,
            roundNumber: row.round_number,
            positionInRound: row.position_in_round,
            team1Name: row.team1_name,
            team2Name: row.team2_name,
            team1Score: row.team1_score ?? 0,
            team2Score: row.team2_score ?? 0,
            status: row.status,
            scheduledAt: row.scheduled_at,
            winnerName: row.winner_name,
            bracketSide: row.bracket_side,
          }))
        );
      }
    };

    fetchMatches();

    const channel = supabase
      .channel(`round-robin-overlay-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const raw = payload.new as any;
            setMatches((prev) =>
              prev.map((m) =>
                m.id === raw.id
                  ? {
                      ...m,
                      team1Score: raw.team1_score ?? 0,
                      team2Score: raw.team2_score ?? 0,
                      status: raw.status,
                      winnerName: raw.winner_name,
                    }
                  : m
              )
            );
          } else if (payload.eventType === "INSERT") {
            fetchMatches();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  // Extract distinct rounds
  const rounds = useMemo(() => {
    const roundMap = new Map<number, { roundNumber: number; label: string; matches: any[] }>();

    for (const m of matches) {
      const rNum = m.roundNumber ?? 1;
      if (!roundMap.has(rNum)) {
        roundMap.set(rNum, {
          roundNumber: rNum,
          label: m.roundLabel || `Round ${rNum}`,
          matches: [],
        });
      }
      roundMap.get(rNum)!.matches.push(m);
    }

    return [...roundMap.values()].sort((a, b) => a.roundNumber - b.roundNumber);
  }, [matches]);

  // Default selected round to active round
  useEffect(() => {
    if (rounds.length > 0 && selectedRound === "ALL") {
      const activeRound = rounds.find((r) => r.matches.some((m) => m.status === "IN_PROGRESS" || m.status === "LIVE"));
      if (activeRound) {
        setSelectedRound(activeRound.roundNumber);
      } else {
        const nextRound = rounds.find((r) => r.matches.some((m) => m.status !== "COMPLETED"));
        if (nextRound) setSelectedRound(nextRound.roundNumber);
      }
    }
  }, [rounds, selectedRound]);

  // Compute standings table
  const standings: StandingRow[] = useMemo(() => {
    const table = new Map<
      string,
      {
        team: string;
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goalsFor: number;
        goalsAgainst: number;
        form: ("W" | "D" | "L")[];
      }
    >();

    const ensure = (name: string) => {
      if (!name || name === "TBD" || name === "BYE") return null;
      if (!table.has(name)) {
        table.set(name, {
          team: name,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          form: [],
        });
      }
      return table.get(name)!;
    };

    // 1. Seed all participating teams
    for (const m of matches) {
      if (m.team1Name) ensure(m.team1Name);
      if (m.team2Name) ensure(m.team2Name);
    }

    // 2. Accumulate completed matches in sequence
    const completedMatches = matches
      .filter((m) => m.status === "COMPLETED")
      .sort((a, b) => (a.roundNumber ?? 1) - (b.roundNumber ?? 1));

    for (const m of completedMatches) {
      const t1 = ensure(m.team1Name);
      const t2 = ensure(m.team2Name);
      if (!t1 || !t2) continue;

      const s1 = m.team1Score ?? 0;
      const s2 = m.team2Score ?? 0;

      t1.played++;
      t2.played++;
      t1.goalsFor += s1;
      t1.goalsAgainst += s2;
      t2.goalsFor += s2;
      t2.goalsAgainst += s1;

      if (s1 > s2) {
        t1.won++;
        t2.lost++;
        t1.form.push("W");
        t2.form.push("L");
      } else if (s2 > s1) {
        t2.won++;
        t1.lost++;
        t2.form.push("W");
        t1.form.push("L");
      } else {
        t1.drawn++;
        t2.drawn++;
        t1.form.push("D");
        t2.form.push("D");
      }
    }

    // 3. Sort by Points -> Goal Difference -> Goals For -> Name
    return [...table.values()]
      .map((r) => ({
        ...r,
        goalDiff: r.goalsFor - r.goalsAgainst,
        points: r.won * 3 + r.drawn,
        form: r.form.slice(-4), // Last 4 match form indicators
      }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.goalDiff - a.goalDiff ||
          b.goalsFor - a.goalsFor ||
          a.team.localeCompare(b.team)
      )
      .map((r, idx) => ({ ...r, rank: idx + 1 }));
  }, [matches]);

  const completedCount = matches.filter((m) => m.status === "COMPLETED").length;
  const hasLiveMatches = matches.some((m) => m.status === "IN_PROGRESS" || m.status === "LIVE");

  // Filter fixtures for right panel
  const displayedMatches = useMemo(() => {
    if (selectedRound === "ALL") {
      return matches;
    }
    return matches.filter((m) => (m.roundNumber ?? 1) === selectedRound);
  }, [matches, selectedRound]);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden font-heading select-none flex flex-col justify-between bg-[#050505] text-white p-8 sm:p-10"
      style={
        {
          "--overlay-primary": voltHex,
          "--overlay-bg": `#${bgColor}`,
        } as React.CSSProperties
      }
    >
      <style>{`
        .volt-pattern {
          background-image: repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.015) 0px,
            rgba(255, 255, 255, 0.015) 2px,
            transparent 2px,
            transparent 12px
          );
        }
        .volt-glow {
          position: absolute;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, var(--overlay-primary) 0%, transparent 70%);
          opacity: 0.04;
          filter: blur(150px);
          pointer-events: none;
          border-radius: 9999px;
        }
        .bracket-skew { transform: skewX(-12deg); }
        .bracket-unskew { transform: skewX(12deg); }

        @keyframes rowFadeIn {
          0% { opacity: 0; transform: translateY(12px) skewX(-12deg); }
          100% { opacity: 1; transform: translateY(0) skewX(-12deg); }
        }
        .row-anim {
          animation: rowFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* Subtle geometric pattern & ambient volt glow */}
      <div className="absolute inset-0 volt-pattern opacity-40 pointer-events-none" />
      <div className="volt-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP CHAMPIONSHIP HEADER */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-end justify-between border-b border-white/10 pb-4">
        <div>
          {/* Slanted Tournament Badge */}
          <div className="mb-2">
            <SlantedBadge text={tournamentTitle || "OFFICIAL TOURNAMENT"} />
          </div>

          {/* Dual-Tone Headline */}
          <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase text-white drop-shadow-md leading-none">
            ROUND ROBIN <span style={{ color: voltHex }}>LEAGUE TABLE</span>
          </h1>
        </div>

        {/* Live Metrics & Stage Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-[#111111] px-5 py-2.5 bracket-skew border-l-4 border-[var(--overlay-primary)] shadow-lg">
            <div className="bracket-unskew flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-white/70">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    hasLiveMatches ? "bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" : "bg-[var(--overlay-primary)] animate-pulse"
                  )}
                />
                <span className={hasLiveMatches ? "text-red-400 font-black italic" : "text-white/80"}>
                  {hasLiveMatches ? "LIVE MATCHES ONGOING" : "LIVE STANDINGS"}
                </span>
              </div>
              <span className="text-white/20">|</span>
              <div className="flex items-center gap-2">
                <span className="text-white/40">MATCHES PLAYED:</span>
                <span className="bg-white/10 px-2.5 py-0.5 rounded text-white font-black tabular-nums italic">
                  {completedCount} / {matches.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 2. DUAL-PANEL MAIN ARENA (Standings Table + Fixtures Panel) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 grid grid-cols-[1fr_440px] gap-8 py-6 items-start overflow-hidden">
        
        {/* ── LEFT PANEL: LEAGUE STANDINGS TABLE ── */}
        <div className="flex flex-col h-full justify-between">
          <div className="flex flex-col">
            {/* Table Column Headers */}
            <div className="flex bg-[#141414] bracket-skew mb-2 px-6 py-2.5 border-l-4 border-transparent shadow-sm">
              <div
                className="bracket-unskew w-full grid items-center gap-3 text-[10px] font-black text-white/40 uppercase tracking-widest italic"
                style={{ gridTemplateColumns: "2.5rem 1fr 3.5rem 3.5rem 3.5rem 3.5rem 3.5rem 3.5rem 4.5rem 5rem" }}
              >
                <span>POS</span>
                <span>TEAM / SQUAD</span>
                <span className="text-center">MP</span>
                <span className="text-center">W</span>
                <span className="text-center">D</span>
                <span className="text-center">L</span>
                <span className="text-center">GF</span>
                <span className="text-center">GA</span>
                <span className="text-center">GD</span>
                <span className="text-right" style={{ color: voltHex }}>PTS</span>
              </div>
            </div>

            {/* Standings Rows */}
            {standings.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-white/30 bracket-skew bg-[#0d0d0d] border border-white/5">
                <div className="bracket-unskew flex flex-col items-center">
                  <Shield className="w-8 h-8 mb-2 opacity-40 text-[var(--overlay-primary)]" />
                  <span className="text-base font-black uppercase tracking-widest italic">AWAITING REGISTERED TEAMS</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[560px] pr-1">
                {standings.map((row, i) => {
                  const isTop1 = row.rank === 1;
                  const isQualified = row.rank <= qualificationCutoff;

                  return (
                    <div
                      key={row.team}
                      className={cn(
                        "row-anim flex px-6 py-3 bracket-skew border-l-4 transition-all duration-200 shadow-md",
                        isTop1
                          ? "bg-white text-black border-t border-b border-t-white/30 border-b-white/10 shadow-[0_0_20px_rgba(210,255,13,0.2)]"
                          : isQualified
                          ? "bg-[#141414] text-white border-t border-b border-white/10 hover:bg-[#181818]"
                          : "bg-[#0d0d0d] text-white/80 border-t border-b border-white/5 opacity-80 hover:opacity-100 hover:bg-[#121212]"
                      )}
                      style={{
                        borderLeftColor: isTop1 ? voltHex : isQualified ? voltHex : "rgba(255,255,255,0.12)",
                        animationDelay: `${0.05 + i * 0.04}s`,
                      }}
                    >
                      <div
                        className="bracket-unskew w-full grid items-center gap-3 text-sm font-heading"
                        style={{ gridTemplateColumns: "2.5rem 1fr 3.5rem 3.5rem 3.5rem 3.5rem 3.5rem 3.5rem 4.5rem 5rem" }}
                      >
                        {/* Rank */}
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "font-black italic tabular-nums text-base",
                              isTop1 ? "text-black" : isQualified ? "text-white" : "text-white/40"
                            )}
                          >
                            {String(row.rank).padStart(2, "0")}
                          </span>
                        </div>

                        {/* Team Name */}
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {isTop1 ? (
                            <Crown className="w-4 h-4 shrink-0 text-amber-500 drop-shadow-sm" />
                          ) : isQualified ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: voltHex }} />
                          ) : null}
                          <span
                            className={cn(
                              "font-black tracking-tight uppercase italic truncate",
                              isTop1 ? "text-black text-base" : "text-white text-sm"
                            )}
                            title={row.team}
                          >
                            {row.team}
                          </span>
                        </div>

                        {/* Matches Played */}
                        <span className={cn("text-center font-bold tabular-nums", isTop1 ? "text-black/70" : "text-white/60")}>
                          {row.played}
                        </span>

                        {/* Won */}
                        <span className={cn("text-center font-bold tabular-nums", isTop1 ? "text-black" : "text-white/90")}>
                          {row.won}
                        </span>

                        {/* Drawn */}
                        <span className={cn("text-center font-bold tabular-nums", isTop1 ? "text-black/60" : "text-white/50")}>
                          {row.drawn}
                        </span>

                        {/* Lost */}
                        <span className={cn("text-center font-bold tabular-nums", isTop1 ? "text-black/60" : "text-white/50")}>
                          {row.lost}
                        </span>

                        {/* Goals For */}
                        <span className={cn("text-center font-bold tabular-nums", isTop1 ? "text-black/70" : "text-white/60")}>
                          {row.goalsFor}
                        </span>

                        {/* Goals Against */}
                        <span className={cn("text-center font-bold tabular-nums", isTop1 ? "text-black/60" : "text-white/50")}>
                          {row.goalsAgainst}
                        </span>

                        {/* Goal Difference */}
                        <span
                          className={cn(
                            "text-center font-black tabular-nums italic",
                            row.goalDiff > 0
                              ? isTop1 ? "text-emerald-700" : "text-emerald-400"
                              : row.goalDiff < 0
                              ? isTop1 ? "text-red-700" : "text-red-400"
                              : isTop1 ? "text-black/50" : "text-white/40"
                          )}
                        >
                          {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                        </span>

                        {/* Total Points Badge */}
                        <div className="flex justify-end">
                          <div
                            className={cn(
                              "px-3 py-0.5 rounded-xs text-center min-w-[34px] font-black tabular-nums italic text-base shadow-sm",
                              isTop1 ? "text-black font-black" : "text-white border border-white/10"
                            )}
                            style={{
                              backgroundColor: isTop1 ? voltHex : "#1c1c1c",
                              color: isTop1 ? "#000" : voltHex,
                            }}
                          >
                            {row.points}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Qualification Zone Legend */}
          <div className="flex items-center gap-6 pt-3 text-[10px] font-black uppercase tracking-widest text-white/50 italic border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: voltHex }} />
              <span>TOP {qualificationCutoff} ADVANCES TO PLAYOFFS</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-white/20" />
              <span>ELIMINATION ZONE</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: FIXTURES & LIVE MATCHES ── */}
        <div className="flex flex-col h-full bg-[#0a0a0a] border border-white/10 p-5 shadow-2xl overflow-hidden">
          {/* Header & Round Tabs */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[var(--overlay-primary)]" />
              <span className="text-xs font-black uppercase tracking-widest italic text-white/90">
                FIXTURES & RESULTS
              </span>
            </div>

            {/* Round Filter Tabs */}
            {rounds.length > 1 && (
              <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-sm border border-white/10">
                <button
                  onClick={() => setSelectedRound("ALL")}
                  className={cn(
                    "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 transition-colors italic",
                    selectedRound === "ALL"
                      ? "text-black rounded-xs"
                      : "text-white/50 hover:text-white"
                  )}
                  style={{ backgroundColor: selectedRound === "ALL" ? voltHex : undefined }}
                >
                  ALL
                </button>
                {rounds.map((r) => (
                  <button
                    key={r.roundNumber}
                    onClick={() => setSelectedRound(r.roundNumber)}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 transition-colors italic",
                      selectedRound === r.roundNumber
                        ? "text-black rounded-xs"
                        : "text-white/50 hover:text-white"
                    )}
                    style={{ backgroundColor: selectedRound === r.roundNumber ? voltHex : undefined }}
                  >
                    R{r.roundNumber}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Matches List */}
          <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
            {displayedMatches.length === 0 ? (
              <div className="py-16 text-center text-white/30 text-xs font-bold uppercase tracking-widest italic">
                NO MATCHES SCHEDULED IN THIS ROUND
              </div>
            ) : (
              displayedMatches.map((m) => {
                const isCompleted = m.status === "COMPLETED";
                const isLive = m.status === "IN_PROGRESS" || m.status === "LIVE";
                const isT1Winner = isCompleted && m.team1Score > m.team2Score;
                const isT2Winner = isCompleted && m.team2Score > m.team1Score;

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col bg-[#111111] p-3 border-l-4 transition-all shadow-md",
                      isLive
                        ? "border-red-500 bg-[#141111] shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        : isCompleted
                        ? "border-[var(--overlay-primary)]"
                        : "border-white/20 hover:border-white/40"
                    )}
                  >
                    {/* Fixture Round & Live Pill */}
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/40 mb-2 italic">
                      <span>{m.roundLabel || `ROUND ${m.roundNumber ?? 1}`}</span>
                      {isLive ? (
                        <span className="bg-red-600 text-white px-1.5 py-0.2 rounded-xs font-black animate-pulse">
                          LIVE
                        </span>
                      ) : isCompleted ? (
                        <span className="text-white/40">FINAL</span>
                      ) : (
                        <span className="text-white/30">UPCOMING</span>
                      )}
                    </div>

                    {/* Team 1 Row */}
                    <div className="flex items-center justify-between py-1">
                      <span
                        className={cn(
                          "font-black text-sm uppercase italic truncate max-w-[280px]",
                          isT1Winner ? "text-white" : isCompleted ? "text-white/50" : "text-white/90"
                        )}
                      >
                        {m.team1Name || "TBD"}
                      </span>
                      <div
                        className={cn(
                          "px-2 py-0.5 rounded-xs font-black tabular-nums italic text-xs min-w-[24px] text-center",
                          isT1Winner
                            ? "text-black"
                            : isCompleted
                            ? "bg-[#1a1a1a] text-white/70 border border-white/10"
                            : isLive
                            ? "bg-red-500 text-white"
                            : "bg-[#161616] text-white/40"
                        )}
                        style={{ backgroundColor: isT1Winner ? voltHex : undefined }}
                      >
                        {isCompleted || isLive ? m.team1Score : "-"}
                      </div>
                    </div>

                    {/* Team 2 Row */}
                    <div className="flex items-center justify-between py-1 border-t border-white/5">
                      <span
                        className={cn(
                          "font-black text-sm uppercase italic truncate max-w-[280px]",
                          isT2Winner ? "text-white" : isCompleted ? "text-white/50" : "text-white/90"
                        )}
                      >
                        {m.team2Name || "TBD"}
                      </span>
                      <div
                        className={cn(
                          "px-2 py-0.5 rounded-xs font-black tabular-nums italic text-xs min-w-[24px] text-center",
                          isT2Winner
                            ? "text-black"
                            : isCompleted
                            ? "bg-[#1a1a1a] text-white/70 border border-white/10"
                            : isLive
                            ? "bg-red-500 text-white"
                            : "bg-[#161616] text-white/40"
                        )}
                        style={{ backgroundColor: isT2Winner ? voltHex : undefined }}
                      >
                        {isCompleted || isLive ? m.team2Score : "-"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 3. BOTTOM FOOTER */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 pt-4 flex flex-col items-center border-t border-white/10">
        <div className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 italic">
          <span>{tournamentTitle || "OFFICIAL BROADCAST"}</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--overlay-primary)] animate-pulse" />
            <span>REAL-TIME DATABASE SYNC • 1080P60 BROADCAST</span>
          </div>
          <span>{gameTitle ? `${gameTitle} • ` : ""}ROUND ROBIN OVERLAY</span>
        </div>
      </div>
    </div>
  );
}
