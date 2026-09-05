import React, { useMemo } from "react";
import { Trophy, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchReport } from "@/lib/api";

export interface EsportsPlayoffBracketProps {
  tournamentId: string;
  tournamentTitle?: string;
  gameTitle?: string;
  matches?: MatchReport[];
  primaryColor?: string; // hex string without #, defaults to "e62429" (crimson)
  bgColor?: string; // hex string without #, defaults to "0d0b10"
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
 * Trapezoidal 3D Beveled Team Card matching the reference esports graphic
 */
function BeveledTeamCard({
  name,
  score,
  isWinner,
  isLoser,
  isLive,
  align = "left",
  width = 175,
  height = 36,
  primaryColorHex = "e62429",
  isFinal = false,
}: TeamSlotProps) {
  const isTbd = !name || name === "TBD" || name === "BYE";
  const displayName = isTbd ? (name === "BYE" ? "BYE • Advances" : "TBD") : name;
  const isNumericScore = score !== undefined && score !== null && !isTbd;

  const primaryBg = `#${primaryColorHex}`;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      className={cn(
        "relative select-none transition-all duration-300 group flex items-center px-3 font-heading",
        isLoser && "opacity-50 grayscale-[30%]"
      )}
    >
      <style>{`
        .esport-skew {
          transform: skewX(-12deg);
        }
        .esport-unskew {
          transform: skewX(12deg);
        }
      `}</style>

      {/* Trapezoidal / Skewed Card Body with 3D Bevel */}
      <div
        className={cn(
          "absolute inset-0 esport-skew rounded-sm overflow-hidden transition-all duration-200 border",
          isTbd
            ? "bg-[#14121a]/85 border-white/10"
            : "border-white/25 shadow-lg",
          isWinner && "ring-1 ring-amber-400/80 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]",
          isLive && "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
        )}
        style={{
          background: isTbd
            ? "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.4) 100%)"
            : `linear-gradient(180deg, rgba(255,255,255,0.25) 0%, ${primaryBg} 28%, #8a0e12 100%)`,
          boxShadow: isTbd
            ? "inset 0 1px 0 rgba(255,255,255,0.05)"
            : `inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Subtle glossy top shine reflection */}
        <div className="absolute top-0 inset-x-0 h-[40%] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      </div>

      {/* Card Content (Unskewed) */}
      <div className={cn(
        "relative z-10 w-full esport-unskew flex items-center justify-between gap-1.5",
        align === "right" && "flex-row-reverse"
      )}>
        <div className={cn("flex items-center gap-1.5 min-w-0 flex-1", align === "right" && "flex-row-reverse")}>
          {isWinner && (
            <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)] animate-pulse" />
          )}
          {isLive && (
            <span className="w-2 h-2 rounded-full bg-white shrink-0 animate-ping" />
          )}
          <span
            className={cn(
              "font-black tracking-tight text-white uppercase italic truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]",
              isFinal ? "text-sm sm:text-base" : "text-[11px] sm:text-xs",
              isTbd ? "text-white/40 font-bold" : "text-white"
            )}
            title={name || ""}
          >
            {displayName}
          </span>
        </div>

        {/* Score pill */}
        {isNumericScore ? (
          <div
            className={cn(
              "bg-black/60 border border-white/20 px-1.5 py-0.5 rounded text-center min-w-[22px] shrink-0 text-white font-black tabular-nums italic text-[11px] drop-shadow-md",
              isWinner && "bg-amber-950/80 border-amber-400/50 text-amber-300 font-black",
              isLive && "bg-red-950 border-red-500 text-red-100"
            )}
          >
            {score}
          </div>
        ) : isLive ? (
          <span className="text-[9px] font-black uppercase tracking-wider bg-red-600 px-1 py-0.2 rounded text-white italic animate-pulse">
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
  primaryColorHex = "e62429",
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
      <BeveledTeamCard
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
      <BeveledTeamCard
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
  primaryColor = "e62429",
  bgColor = "0d0b10",
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
      className="relative w-screen h-screen overflow-hidden font-heading select-none flex flex-col justify-between"
      style={{
        backgroundColor: `#${bgColor}`,
        backgroundImage: `radial-gradient(ellipse at 50% 38%, rgba(${parseInt(primaryColor.slice(0, 2), 16) || 230}, ${parseInt(primaryColor.slice(2, 4), 16) || 36}, ${parseInt(primaryColor.slice(4, 6), 16) || 41}, 0.18) 0%, transparent 65%)`,
      }}
    >
      {/* Subtle scanline / cyber texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* SVG Canvas for Brackets, Corners & Connecting Lines (1920x1080 normalized) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
          <linearGradient id="redGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={`#${primaryColor}`} stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff4d4d" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Outer Sci-Fi Angular Corner Brackets (matching reference graphic) */}
        {/* Top-Left Corner Bracket */}
        <path
          d="M 60 140 L 140 60 L 260 60"
          fill="none"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="3"
        />
        <line x1="140" y1="60" x2="135" y2="45" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <line x1="60" y1="140" x2="45" y2="135" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />

        {/* Top-Right Corner Bracket */}
        <path
          d="M 1860 140 L 1780 60 L 1660 60"
          fill="none"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="3"
        />
        <line x1="1780" y1="60" x2="1785" y2="45" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <line x1="1860" y1="140" x2="1875" y2="135" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />

        {/* Bottom-Left Corner Bracket */}
        <path
          d="M 60 940 L 140 1020 L 260 1020"
          fill="none"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="3"
        />

        {/* Bottom-Right Corner Bracket */}
        <path
          d="M 1860 940 L 1780 1020 L 1660 1020"
          fill="none"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="3"
        />

        {/* LEFT WING CONNECTOR LINES */}
        {/* 1. Left R16 Match 1 & 2 -> Upper QF */}
        <path
          d="M 315 260 H 350 V 400 H 315 M 350 330 H 425"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2.5"
        />

        {/* 2. Left R16 Match 3 & 4 -> Lower QF */}
        <path
          d="M 315 630 H 350 V 770 H 315 M 350 700 H 425"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2.5"
        />

        {/* 3. Left Upper QF & Lower QF -> Left Semifinal */}
        <path
          d="M 600 330 H 640 V 495 H 700 M 600 700 H 640 V 535 H 700"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2.5"
        />

        {/* 4. Left Semifinal -> Grand Final Top Slot */}
        <path
          d="M 875 515 H 900 V 440 H 940"
          fill="none"
          stroke={`#${primaryColor}`}
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />

        {/* RIGHT WING CONNECTOR LINES (Mirrored) */}
        {/* 1. Right R16 Match 5 & 6 -> Upper QF */}
        <path
          d="M 1605 260 H 1570 V 400 H 1605 M 1570 330 H 1495"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2.5"
        />

        {/* 2. Right R16 Match 7 & 8 -> Lower QF */}
        <path
          d="M 1605 630 H 1570 V 770 H 1605 M 1570 700 H 1495"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2.5"
        />

        {/* 3. Right Upper QF & Lower QF -> Right Semifinal */}
        <path
          d="M 1320 330 H 1280 V 495 H 1220 M 1320 700 H 1280 V 535 H 1220"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2.5"
        />

        {/* 4. Right Semifinal -> Grand Final Bottom Slot */}
        <path
          d="M 1045 515 H 1020 V 590 H 980"
          fill="none"
          stroke={`#${primaryColor}`}
          strokeWidth="2.5"
          strokeDasharray="4 2"
        />
      </svg>

      {/* TOP CHAMPIONSHIP HEADER */}
      <div className="relative z-10 pt-6 flex flex-col items-center">
        {/* Small top category */}
        <span className="text-white/70 font-black text-xs sm:text-sm tracking-[0.5em] uppercase italic">
          THE
        </span>

        {/* Big metallic Playoff title */}
        <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] leading-none my-1">
          PLAYOFFS
        </h1>

        {/* Glowing tapered red horizontal divider line */}
        <div className="flex items-center gap-3 w-full max-w-xl justify-center mt-1">
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
          
          {/* Golden Trophy Emblem */}
          <div className="relative mb-3 flex flex-col items-center">
            {/* Ambient gold halo glow */}
            <div className="absolute -inset-4 bg-amber-400/20 rounded-full blur-xl animate-pulse" />
            
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 p-0.5 shadow-2xl flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#120f18] flex items-center justify-center">
                <Trophy className="w-9 h-9 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.8)]" />
              </div>
            </div>

            {/* Final Title */}
            <span className="mt-2 text-base sm:text-lg font-black tracking-[0.3em] uppercase italic text-amber-300 drop-shadow-[0_2px_10px_rgba(251,191,36,0.6)]">
              FINAL
            </span>
          </div>

          {/* Grand Final Match Pair (2 Cards) */}
          <div className="w-full flex flex-col items-center gap-3">
            <BeveledTeamCard
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
            <div className="flex items-center gap-2">
              <div className="h-[1px] w-8 bg-white/20" />
              <span className="text-xs font-black italic tracking-widest text-white/50 bg-black/60 px-2.5 py-0.5 rounded border border-white/10">
                {finalMatch?.team1Score !== undefined && finalMatch?.team2Score !== undefined && finalMatch.status !== "SCHEDULED"
                  ? `${finalMatch.team1Score} - ${finalMatch.team2Score}`
                  : "VS"}
              </span>
              <div className="h-[1px] w-8 bg-white/20" />
            </div>

            <BeveledTeamCard
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
