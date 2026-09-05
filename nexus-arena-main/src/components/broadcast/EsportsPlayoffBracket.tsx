import React, { useMemo } from "react";
import { Trophy, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchReport } from "@/lib/api";
import { SlantedBadge } from "@/components/broadcast/design-system";

export interface EsportsPlayoffBracketProps {
  tournamentId: string;
  tournamentTitle?: string;
  gameTitle?: string;
  matches?: MatchReport[];
  primaryColor?: string; // hex string without #, defaults to "d2ff0d" (electric volt)
  bgColor?: string; // hex string without #, defaults to "050505"
  onMatchClick?: (match: MatchReport) => void;
}

interface TeamSlotProps {
  name?: string | null;
  score?: number | null;
  isWinner?: boolean;
  isLoser?: boolean;
  isLive?: boolean;
  align?: "left" | "right" | "center";
  width?: number;
  height?: number;
  primaryColorHex?: string;
  isFinal?: boolean;
}

/** 
 * Clean Modern Esports Team Card matching the Half-Time Intermission Design System
 */
function CleanTeamCard({
  name,
  score,
  isWinner,
  isLoser,
  isLive,
  align = "left",
  width = 175,
  height = 36,
  primaryColorHex = "d2ff0d",
  isFinal = false,
}: TeamSlotProps) {
  const isTbd = !name || name === "TBD" || name === "BYE";
  const displayName = isTbd ? (name === "BYE" ? "BYE • Advances" : "TBD") : name;
  const isNumericScore = score !== undefined && score !== null && !isTbd;
  const voltHex = primaryColorHex.startsWith("#") ? primaryColorHex : `#${primaryColorHex}`;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      className={cn(
        "relative select-none transition-all duration-300 group flex items-center font-heading",
        isLoser && "opacity-35"
      )}
    >
      {/* Slanted Card Container (-12deg) */}
      <div
        className={cn(
          "absolute inset-0 bracket-skew transition-all duration-200 border-t border-b shadow-lg",
          align === "right" ? "border-r-4 border-l-0" : "border-l-4 border-r-0",
          isTbd
            ? "bg-[#0d0d0d] border-white/5"
            : isWinner
            ? "bg-[#161616] border-t-white/15 border-b-white/5 shadow-[0_0_15px_rgba(210,255,13,0.12)]"
            : isLive
            ? "bg-[#161616] border-t-red-500/20 border-b-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            : "bg-[#111111] border-white/10 hover:bg-[#151515]"
        )}
        style={{
          borderLeftColor: align !== "right" 
            ? (isWinner ? voltHex : isLive ? "#ef4444" : isTbd ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.2)")
            : undefined,
          borderRightColor: align === "right" 
            ? (isWinner ? voltHex : isLive ? "#ef4444" : isTbd ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.2)")
            : undefined,
        }}
      />

      {/* Card Content (Unskewed +12deg) */}
      <div
        className={cn(
          "relative z-10 w-full px-3 bracket-unskew flex items-center justify-between gap-2",
          align === "right" && "flex-row-reverse"
        )}
      >
        <div className={cn("flex items-center gap-1.5 min-w-0 flex-1", align === "right" && "flex-row-reverse")}>
          {isWinner && (
            <Crown className="w-3.5 h-3.5 shrink-0" style={{ color: voltHex }} />
          )}
          {isLive && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
          )}
          <span
            className={cn(
              "font-black tracking-tight uppercase italic truncate",
              isFinal ? "text-sm sm:text-base" : "text-xs",
              isWinner ? "text-white" : isTbd ? "text-white/25 font-bold" : "text-white/90"
            )}
            title={name || ""}
          >
            {displayName}
          </span>
        </div>

        {/* Clean Score Badge */}
        {isNumericScore ? (
          <div
            className={cn(
              "px-2 py-0.5 rounded-xs text-center min-w-[22px] shrink-0 font-black tabular-nums italic text-xs transition-colors",
              isWinner
                ? "text-black font-black shadow-sm"
                : "bg-[#1c1c1c] text-white/80 border border-white/10"
            )}
            style={{
              backgroundColor: isWinner ? voltHex : undefined,
            }}
          >
            {score}
          </div>
        ) : isLive ? (
          <span className="text-[9px] font-black uppercase tracking-wider bg-red-600 px-1.5 py-0.2 rounded text-white italic animate-pulse">
            LIVE
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Single Match Pair (Team 1 + Team 2)
 */
function MatchPair({
  match,
  align = "left",
  width = 175,
  height = 36,
  gap = 8,
  primaryColorHex = "d2ff0d",
  isFinal = false,
  label,
  onClick,
}: {
  match?: MatchReport | null;
  align?: "left" | "right" | "center";
  width?: number;
  height?: number;
  gap?: number;
  primaryColorHex?: string;
  isFinal?: boolean;
  label?: string;
  onClick?: () => void;
}) {
  const isCompleted = match?.status === "COMPLETED";
  const isLive = match?.status === "IN_PROGRESS" || match?.status === "LIVE";
  const isT1Winner = isCompleted && match?.winnerName === match?.team1Name;
  const isT2Winner = isCompleted && match?.winnerName === match?.team2Name;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col items-center transition-transform duration-200 hover:scale-[1.02]",
        onClick ? "cursor-pointer" : "cursor-default"
      )}
      style={{ gap: `${gap}px` }}
    >
      <CleanTeamCard
        name={match?.team1Name}
        score={match?.team1Score}
        isWinner={isT1Winner}
        isLoser={isCompleted && !isT1Winner}
        isLive={isLive}
        align={align}
        width={width}
        height={height}
        primaryColorHex={primaryColorHex}
        isFinal={isFinal}
      />
      <CleanTeamCard
        name={match?.team2Name}
        score={match?.team2Score}
        isWinner={isT2Winner}
        isLoser={isCompleted && !isT2Winner}
        isLive={isLive}
        align={align}
        width={width}
        height={height}
        primaryColorHex={primaryColorHex}
        isFinal={isFinal}
      />
      {label && (
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50 italic mt-0.5 drop-shadow">
          {label}
        </span>
      )}
    </div>
  );
}

export function EsportsPlayoffBracket({
  tournamentId,
  tournamentTitle = "ICON EAFC TOURNAMENT",
  gameTitle = "EA SPORTS FC 25",
  matches = [],
  primaryColor = "d2ff0d",
  bgColor = "050505",
  onMatchClick,
}: EsportsPlayoffBracketProps) {
  // Determine rounds in the tournament
  const { r16Matches, qfMatches, sfMatches, finalMatch } = useMemo(() => {
    if (!matches || matches.length === 0) {
      return { r16Matches: [], qfMatches: [], sfMatches: [], finalMatch: null };
    }

    const roundNumbers = [...new Set(matches.map((m) => m.roundNumber ?? 1))].sort((a, b) => a - b);
    const maxRound = roundNumbers[roundNumbers.length - 1] ?? 1;

    // Identify final (highest round)
    const finalM = matches.find((m) => m.roundNumber === maxRound && (m.positionInRound === 1 || !m.positionInRound)) || null;

    // Identify semifinals (maxRound - 1)
    const sfM = matches
      .filter((m) => m.roundNumber === maxRound - 1)
      .sort((a, b) => (a.positionInRound ?? 0) - (b.positionInRound ?? 0));

    // Identify quarterfinals (maxRound - 2)
    const qfM = matches
      .filter((m) => m.roundNumber === maxRound - 2)
      .sort((a, b) => (a.positionInRound ?? 0) - (b.positionInRound ?? 0));

    // Identify Round of 16 (maxRound - 3)
    const r16M = matches
      .filter((m) => m.roundNumber === maxRound - 3)
      .sort((a, b) => (a.positionInRound ?? 0) - (b.positionInRound ?? 0));

    return {
      r16Matches: r16M,
      qfMatches: qfM,
      sfMatches: sfM,
      finalMatch: finalM,
    };
  }, [matches]);

  // Map to the 8 left & right slots
  // Left Wing:
  const leftR16 = [r16Matches[0], r16Matches[1], r16Matches[2], r16Matches[3]];
  const leftQF = [qfMatches[0], qfMatches[1]];
  const leftSF = sfMatches[0] || null;

  // Right Wing:
  const rightR16 = [r16Matches[4], r16Matches[5], r16Matches[6], r16Matches[7]];
  const rightQF = [qfMatches[2], qfMatches[3]];
  const rightSF = sfMatches[1] || null;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden font-heading select-none flex flex-col justify-between bg-[#050505] text-white"
      style={{
        "--overlay-primary": `#${primaryColor}`,
        "--overlay-bg": `#${bgColor}`,
      } as React.CSSProperties}
    >
      <style>{`
        .volt-pattern {
          background-image: repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.018) 0px,
            rgba(255, 255, 255, 0.018) 2px,
            transparent 2px,
            transparent 12px
          );
        }
        .volt-glow {
          position: absolute;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, var(--overlay-primary) 0%, transparent 70%);
          opacity: 0.035;
          filter: blur(120px);
          pointer-events: none;
          border-radius: 9999px;
        }
        .bracket-skew { transform: skewX(-12deg); }
        .bracket-unskew { transform: skewX(12deg); }
      `}</style>

      {/* Subtle geometric pattern & ambient volt glow */}
      <div className="absolute inset-0 volt-pattern opacity-40 pointer-events-none" />
      <div className="volt-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* SVG Canvas for Brackets & Connecting Lines (1920x1080 normalized) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* LEFT WING CONNECTOR LINES */}
        {/* 1. Left R16 Match 1 & 2 -> Upper QF */}
        <path
          d="M 315 260 H 350 V 400 H 315 M 350 330 H 425"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />

        {/* 2. Left R16 Match 3 & 4 -> Lower QF */}
        <path
          d="M 315 630 H 350 V 770 H 315 M 350 700 H 425"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />

        {/* 3. Left Upper QF & Lower QF -> Left Semifinal */}
        <path
          d="M 600 330 H 640 V 495 H 700 M 600 700 H 640 V 535 H 700"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />

        {/* 4. Left Semifinal -> Grand Final Top Slot */}
        <path
          d="M 875 515 H 900 V 440 H 940"
          fill="none"
          stroke={`#${primaryColor}`}
          strokeWidth="2"
          strokeDasharray="4 2"
          strokeOpacity="0.6"
        />

        {/* RIGHT WING CONNECTOR LINES (Mirrored) */}
        {/* 1. Right R16 Match 5 & 6 -> Upper QF */}
        <path
          d="M 1605 260 H 1570 V 400 H 1605 M 1570 330 H 1495"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />

        {/* 2. Right R16 Match 7 & 8 -> Lower QF */}
        <path
          d="M 1605 630 H 1570 V 770 H 1605 M 1570 700 H 1495"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />

        {/* 3. Right Upper QF & Lower QF -> Right Semifinal */}
        <path
          d="M 1320 330 H 1280 V 495 H 1220 M 1320 700 H 1280 V 535 H 1220"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        />

        {/* 4. Right Semifinal -> Grand Final Bottom Slot */}
        <path
          d="M 1045 515 H 1020 V 590 H 980"
          fill="none"
          stroke={`#${primaryColor}`}
          strokeWidth="2"
          strokeDasharray="4 2"
          strokeOpacity="0.6"
        />
      </svg>

      {/* TOP CHAMPIONSHIP HEADER */}
      <div className="relative z-10 pt-5 flex flex-col items-center">
        {/* Slanted Tournament Badge */}
        <div className="mb-2 volt-anim-1">
          <SlantedBadge text={tournamentTitle || "ICON EAFC TOURNAMENT"} />
        </div>

        {/* Dual-Tone Playoff Title */}
        <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] leading-none my-1 volt-anim-2">
          THE <span style={{ color: `#${primaryColor}` }}>PLAYOFFS</span>
        </h1>

        {/* Glowing tapered horizontal divider line */}
        <div className="flex items-center gap-3 w-full max-w-xl justify-center mt-1 volt-anim-3">
          <div
            className="h-[2px] flex-1"
            style={{
              background: `linear-gradient(to right, transparent, #${primaryColor}, #${primaryColor})`,
            }}
          />
          <div
            className="w-2.5 h-2.5 rotate-45 shrink-0"
            style={{ backgroundColor: `#${primaryColor}` }}
          />
          <div
            className="h-[2px] flex-1"
            style={{
              background: `linear-gradient(to left, transparent, #${primaryColor}, #${primaryColor})`,
            }}
          />
        </div>
      </div>

      {/* MAIN BRACKET ARENA (Symmetric convergence) */}
      <div className="relative z-10 flex-1 w-full max-w-[1840px] mx-auto px-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        
        {/* LEFT WING: R16 (Col 1) -> QF (Col 2) -> SF (Col 3) */}
        <div className="grid grid-cols-[180px_180px_180px] items-center justify-between h-[700px]">
          
          {/* Col 1: Left Round of 16 (4 Matches) */}
          <div className="flex flex-col justify-around h-full">
            <MatchPair
              match={leftR16[0]}
              align="left"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => leftR16[0] && onMatchClick?.(leftR16[0])}
            />
            <MatchPair
              match={leftR16[1]}
              align="left"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => leftR16[1] && onMatchClick?.(leftR16[1])}
            />
            <MatchPair
              match={leftR16[2]}
              align="left"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => leftR16[2] && onMatchClick?.(leftR16[2])}
            />
            <MatchPair
              match={leftR16[3]}
              align="left"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => leftR16[3] && onMatchClick?.(leftR16[3])}
            />
          </div>

          {/* Col 2: Left Quarterfinals (2 Matches) */}
          <div className="flex flex-col justify-around h-[70%]">
            <MatchPair
              match={leftQF[0]}
              align="left"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => leftQF[0] && onMatchClick?.(leftQF[0])}
            />
            <MatchPair
              match={leftQF[1]}
              align="left"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => leftQF[1] && onMatchClick?.(leftQF[1])}
            />
          </div>

          {/* Col 3: Left Semifinal (1 Match) */}
          <div className="flex flex-col justify-center items-center h-full">
            <MatchPair
              match={leftSF}
              align="left"
              width={175}
              label="SEMIFINAL"
              primaryColorHex={primaryColor}
              onClick={() => leftSF && onMatchClick?.(leftSF)}
            />
          </div>

        </div>

        {/* CENTERPIECE: Trophy + Grand Final */}
        <div className="flex flex-col items-center justify-center px-4 w-[240px]">
          
          {/* Trophy Emblem */}
          <div className="relative mb-3 flex flex-col items-center">
            <div className="relative w-14 h-14 rounded-full bg-[#141414] border-2 border-[var(--overlay-primary)] shadow-[0_0_25px_rgba(210,255,13,0.2)] flex items-center justify-center">
              <Trophy className="w-7 h-7 text-[var(--overlay-primary)]" />
            </div>

            {/* Final Title */}
            <span className="mt-2 text-xs font-black tracking-[0.3em] uppercase italic text-white/70">
              GRAND <span className="text-[var(--overlay-primary)]">FINAL</span>
            </span>
          </div>

          {/* Grand Final Match Pair (2 Cards) */}
          <div className="w-full flex flex-col items-center gap-2">
            <CleanTeamCard
              name={finalMatch?.team1Name}
              score={finalMatch?.team1Score}
              isWinner={finalMatch?.status === "COMPLETED" && finalMatch?.winnerName === finalMatch?.team1Name}
              isLoser={finalMatch?.status === "COMPLETED" && finalMatch?.winnerName !== finalMatch?.team1Name}
              isLive={finalMatch?.status === "IN_PROGRESS" || finalMatch?.status === "LIVE"}
              align="center"
              width={215}
              height={44}
              primaryColorHex={primaryColor}
              isFinal={true}
            />

            {/* VS or Score badge */}
            <div className="flex items-center gap-2 my-1">
              <div className="h-[1px] w-8 bg-white/10" />
              <span className="text-[10px] font-black italic tracking-widest text-[var(--overlay-primary)] bg-[#141414] px-3 py-0.5 bracket-skew border-l-2 border-[var(--overlay-primary)]">
                <span className="bracket-unskew inline-block">
                  {finalMatch?.team1Score !== undefined && finalMatch?.team2Score !== undefined && finalMatch.status !== "SCHEDULED"
                    ? `${finalMatch.team1Score} – ${finalMatch.team2Score}`
                    : "VS"}
                </span>
              </span>
              <div className="h-[1px] w-8 bg-white/10" />
            </div>

            <CleanTeamCard
              name={finalMatch?.team2Name}
              score={finalMatch?.team2Score}
              isWinner={finalMatch?.status === "COMPLETED" && finalMatch?.winnerName === finalMatch?.team2Name}
              isLoser={finalMatch?.status === "COMPLETED" && finalMatch?.winnerName !== finalMatch?.team2Name}
              isLive={finalMatch?.status === "IN_PROGRESS" || finalMatch?.status === "LIVE"}
              align="center"
              width={215}
              height={44}
              primaryColorHex={primaryColor}
              isFinal={true}
            />
          </div>

        </div>

        {/* RIGHT WING: SF (Col 1) -> QF (Col 2) -> R16 (Col 3) [Mirrored] */}
        <div className="grid grid-cols-[180px_180px_180px] items-center justify-between h-[700px]">
          
          {/* Col 1: Right Semifinal (1 Match) */}
          <div className="flex flex-col justify-center items-center h-full">
            <MatchPair
              match={rightSF}
              align="right"
              width={175}
              label="SEMIFINAL"
              primaryColorHex={primaryColor}
              onClick={() => rightSF && onMatchClick?.(rightSF)}
            />
          </div>

          {/* Col 2: Right Quarterfinals (2 Matches) */}
          <div className="flex flex-col justify-around h-[70%]">
            <MatchPair
              match={rightQF[0]}
              align="right"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => rightQF[0] && onMatchClick?.(rightQF[0])}
            />
            <MatchPair
              match={rightQF[1]}
              align="right"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => rightQF[1] && onMatchClick?.(rightQF[1])}
            />
          </div>

          {/* Col 3: Right Round of 16 (4 Matches) */}
          <div className="flex flex-col justify-around h-full">
            <MatchPair
              match={rightR16[0]}
              align="right"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => rightR16[0] && onMatchClick?.(rightR16[0])}
            />
            <MatchPair
              match={rightR16[1]}
              align="right"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => rightR16[1] && onMatchClick?.(rightR16[1])}
            />
            <MatchPair
              match={rightR16[2]}
              align="right"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => rightR16[2] && onMatchClick?.(rightR16[2])}
            />
            <MatchPair
              match={rightR16[3]}
              align="right"
              width={175}
              primaryColorHex={primaryColor}
              onClick={() => rightR16[3] && onMatchClick?.(rightR16[3])}
            />
          </div>

        </div>

      </div>

      {/* BOTTOM FOOTER / TITLE */}
      <div className="relative z-10 pb-6 flex flex-col items-center">
        {/* Glowing tapered red horizontal divider line */}
        <div className="flex items-center gap-3 w-full max-w-xl justify-center mb-2">
          <div
            className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#e62429] to-[#e62429]"
            style={{
              background: `linear-gradient(to right, transparent, #${primaryColor}, #${primaryColor})`,
            }}
          />
          <div
            className="w-2.5 h-2.5 rotate-45 shrink-0"
            style={{ backgroundColor: `#${primaryColor}` }}
          />
          <div
            className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[#e62429] to-[#e62429]"
            style={{
              background: `linear-gradient(to left, transparent, #${primaryColor}, #${primaryColor})`,
            }}
          />
        </div>

        <h2 className="text-lg sm:text-2xl font-black italic tracking-widest uppercase text-white/90 drop-shadow-md">
          {tournamentTitle || "WORLD CHAMPIONSHIP"}
        </h2>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-white/50 italic mt-0.5">
          {gameTitle} • OFFICIAL BROADCAST BRACKET
        </span>
      </div>
    </div>
  );
}
