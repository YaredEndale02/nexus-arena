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
  isUpcoming?: boolean;
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
  isUpcoming,
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
        isLoser && "opacity-30"
      )}
    >
      {/* Slanted Card Container (-12deg) */}
      <div
        className={cn(
          "absolute inset-0 bracket-skew transition-all duration-300 border-t border-b shadow-lg",
          align === "right" ? "border-r-4 border-l-0" : "border-l-4 border-r-0",
          isTbd
            ? "bg-[#0d0d0d] border-white/5"
            : isWinner
            ? "bg-[#161616] border-t-white/15 border-b-white/5 shadow-[0_0_15px_rgba(210,255,13,0.18)]"
            : isLive
            ? "bg-[#161616] border-t-red-500/25 border-b-red-500/10 shadow-[0_0_18px_rgba(239,68,68,0.25)]"
            : isUpcoming
            ? "bg-[#141414] border-t-white/15 border-b-white/5 shadow-[0_0_14px_rgba(210,255,13,0.12)]"
            : "bg-[#111111] border-white/10 hover:bg-[#151515]"
        )}
        style={{
          borderLeftColor:
            align !== "right"
              ? isWinner
                ? voltHex
                : isLive
                ? "#ef4444"
                : isUpcoming
                ? voltHex
                : isTbd
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.2)"
              : undefined,
          borderRightColor:
            align === "right"
              ? isWinner
                ? voltHex
                : isLive
                ? "#ef4444"
                : isUpcoming
                ? voltHex
                : isTbd
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.2)"
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
          {isUpcoming && !isWinner && !isLive && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: voltHex }} />
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

        {/* Clean Score Badge / Status */}
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
        ) : isUpcoming && !isTbd ? (
          <span
            className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded italic text-black"
            style={{ backgroundColor: voltHex }}
          >
            NEXT
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
  gap = 6,
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

  // Check if upcoming / next
  const hasTeams =
    match?.team1Name &&
    match.team1Name !== "TBD" &&
    match?.team2Name &&
    match.team2Name !== "TBD";
  const isUpcoming = !isCompleted && !isLive && Boolean(hasTeams);

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
        isUpcoming={isUpcoming}
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
        isUpcoming={isUpcoming}
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

/**
 * Modular Dynamic SVG Fork Connector
 * Precisely links two feeder matches into a downstream match.
 * Visualizes:
 * - Advancing winner lines in solid electric volt
 * - Live battles in animated flowing dashes
 * - Upcoming matches with dynamic flowing electricity
 * - Inactive graphite tracks
 */
interface ForkConnectorProps {
  y1: number;
  y2: number;
  yTarget: number;
  direction: "ltr" | "rtl";
  width?: number;
  height?: number;
  mTop?: MatchReport | null;
  mBottom?: MatchReport | null;
  mTarget?: MatchReport | null;
  primaryColorHex: string;
}

function ForkConnector({
  y1,
  y2,
  yTarget,
  direction,
  width = 40,
  height = 640,
  mTop,
  mBottom,
  mTarget,
  primaryColorHex,
}: ForkConnectorProps) {
  const voltHex = primaryColorHex.startsWith("#") ? primaryColorHex : `#${primaryColorHex}`;
  const midX = width / 2;

  // Status flags
  const isTopCompleted = mTop?.status === "COMPLETED";
  const isTopLive = mTop?.status === "IN_PROGRESS" || mTop?.status === "LIVE";
  const isTopWinner = isTopCompleted && Boolean(mTop?.winnerName);

  const isBottomCompleted = mBottom?.status === "COMPLETED";
  const isBottomLive = mBottom?.status === "IN_PROGRESS" || mBottom?.status === "LIVE";
  const isBottomWinner = isBottomCompleted && Boolean(mBottom?.winnerName);

  const isTargetCompleted = mTarget?.status === "COMPLETED";
  const isTargetLive = mTarget?.status === "IN_PROGRESS" || mTarget?.status === "LIVE";
  const isTargetUpcoming =
    !isTargetCompleted &&
    (isTargetLive ||
      (Boolean(mTarget?.team1Name) &&
        mTarget?.team1Name !== "TBD" &&
        Boolean(mTarget?.team2Name) &&
        mTarget?.team2Name !== "TBD") ||
      isTopWinner ||
      isBottomWinner);

  // Path coordinates
  // LTR: from 0 (left) to width (right)
  // RTL: from width (right) to 0 (left)
  const isLtr = direction === "ltr";
  const xStart = isLtr ? 0 : width;
  const xEnd = isLtr ? width : 0;

  const topPath = `M ${xStart} ${y1} H ${midX} V ${yTarget}`;
  const bottomPath = `M ${xStart} ${y2} H ${midX} V ${yTarget}`;
  const stemPath = `M ${midX} ${yTarget} H ${xEnd}`;

  return (
    <g>
      {/* 1. Base Graphite Inactive Tracks */}
      <path d={topPath} fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.5" />
      <path d={bottomPath} fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.5" />
      <path d={stemPath} fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.5" />

      {/* 2. Top Feeder Active Path */}
      {isTopWinner ? (
        <path
          d={topPath}
          fill="none"
          stroke={voltHex}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 4px ${voltHex}80)` }}
        />
      ) : isTopLive ? (
        <path
          d={topPath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeDasharray="6 3"
          className="volt-flow"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 5px rgba(239,68,68,0.7))" }}
        />
      ) : null}

      {/* 3. Bottom Feeder Active Path */}
      {isBottomWinner ? (
        <path
          d={bottomPath}
          fill="none"
          stroke={voltHex}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 4px ${voltHex}80)` }}
        />
      ) : isBottomLive ? (
        <path
          d={bottomPath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeDasharray="6 3"
          className="volt-flow"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 5px rgba(239,68,68,0.7))" }}
        />
      ) : null}

      {/* 4. Target Stem Path (What is coming and next) */}
      {isTargetCompleted ? (
        <path
          d={stemPath}
          fill="none"
          stroke={voltHex}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${voltHex}80)` }}
        />
      ) : isTargetLive ? (
        <path
          d={stemPath}
          fill="none"
          stroke={voltHex}
          strokeWidth="2.5"
          strokeDasharray="6 3"
          className="volt-flow-fast volt-glow-pulse"
          strokeLinecap="round"
        />
      ) : isTargetUpcoming ? (
        <path
          d={stemPath}
          fill="none"
          stroke={voltHex}
          strokeWidth="2"
          strokeDasharray="5 3"
          className="volt-flow"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${voltHex}70)` }}
        />
      ) : null}

      {/* 5. Dynamic Junction Node / Pulse */}
      {(isTargetUpcoming || isTargetLive || isTopWinner || isBottomWinner) && (
        <g>
          {isTargetLive && (
            <circle
              cx={midX}
              cy={yTarget}
              r={6}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.5"
              className="animate-ping"
            />
          )}
          <circle
            cx={midX}
            cy={yTarget}
            r={isTargetLive ? 3.5 : 2.5}
            fill={isTargetLive ? "#ef4444" : voltHex}
            style={{ filter: `drop-shadow(0 0 4px ${voltHex})` }}
          />
        </g>
      )}

      {/* 6. Arrival Marker into Target Match */}
      {(isTargetUpcoming || isTargetLive) && (
        <circle
          cx={xEnd}
          cy={yTarget}
          r={2.5}
          fill={voltHex}
          className="animate-pulse"
          style={{ filter: `drop-shadow(0 0 5px ${voltHex})` }}
        />
      )}
    </g>
  );
}

/**
 * Connector between Semifinal and Grand Final Slot
 */
interface FinalConnectorProps {
  ySF: number;
  yFinal: number;
  direction: "ltr" | "rtl";
  width?: number;
  height?: number;
  mSF?: MatchReport | null;
  mFinal?: MatchReport | null;
  primaryColorHex: string;
}

function FinalConnector({
  ySF,
  yFinal,
  direction,
  width = 48,
  height = 640,
  mSF,
  mFinal,
  primaryColorHex,
}: FinalConnectorProps) {
  const voltHex = primaryColorHex.startsWith("#") ? primaryColorHex : `#${primaryColorHex}`;
  const midX = width / 2;

  const isLtr = direction === "ltr";
  const xStart = isLtr ? 0 : width;
  const xEnd = isLtr ? width : 0;

  const isSFCompleted = mSF?.status === "COMPLETED";
  const isSFWinner = isSFCompleted && Boolean(mSF?.winnerName);
  const isFinalCompleted = mFinal?.status === "COMPLETED";
  const isFinalLive = mFinal?.status === "IN_PROGRESS" || mFinal?.status === "LIVE";
  const isFinalUpcoming =
    !isFinalCompleted &&
    (isFinalLive ||
      Boolean(mFinal?.team1Name && mFinal?.team1Name !== "TBD") ||
      Boolean(mFinal?.team2Name && mFinal?.team2Name !== "TBD") ||
      isSFWinner);

  const path = `M ${xStart} ${ySF} H ${midX} V ${yFinal} H ${xEnd}`;

  return (
    <g>
      {/* Base Graphite Track */}
      <path d={path} fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.5" />

      {/* Active Line */}
      {isFinalCompleted ? (
        <path
          d={path}
          fill="none"
          stroke={voltHex}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 5px ${voltHex}90)` }}
        />
      ) : isFinalLive ? (
        <path
          d={path}
          fill="none"
          stroke={voltHex}
          strokeWidth="2.5"
          strokeDasharray="6 3"
          className="volt-flow-fast volt-glow-pulse"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : isSFWinner || isFinalUpcoming ? (
        <path
          d={path}
          fill="none"
          stroke={voltHex}
          strokeWidth="2"
          strokeDasharray="5 3"
          className="volt-flow"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 4px ${voltHex}70)` }}
        />
      ) : null}

      {/* Arrival Marker */}
      {isFinalUpcoming && (
        <circle
          cx={xEnd}
          cy={yFinal}
          r={3}
          fill={voltHex}
          className="animate-pulse"
          style={{ filter: `drop-shadow(0 0 6px ${voltHex})` }}
        />
      )}
    </g>
  );
}

export function EsportsPlayoffBracket({
  tournamentId,
  tournamentTitle = "",
  gameTitle = "",
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
    const finalM =
      matches.find((m) => m.roundNumber === maxRound && (m.positionInRound === 1 || !m.positionInRound)) || null;

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

  const voltHex = primaryColor.startsWith("#") ? primaryColor : `#${primaryColor}`;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden font-heading select-none flex flex-col justify-between bg-[#050505] text-white"
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
          width: 750px;
          height: 750px;
          background: radial-gradient(circle, var(--overlay-primary) 0%, transparent 70%);
          opacity: 0.035;
          filter: blur(140px);
          pointer-events: none;
          border-radius: 9999px;
        }
        .bracket-skew { transform: skewX(-12deg); }
        .bracket-unskew { transform: skewX(12deg); }

        /* Dynamic Line Flow Animations */
        @keyframes voltLineFlow {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes voltPulseGlow {
          0%, 100% {
            filter: drop-shadow(0 0 2px var(--overlay-primary)) drop-shadow(0 0 6px var(--overlay-primary));
            opacity: 0.85;
          }
          50% {
            filter: drop-shadow(0 0 5px var(--overlay-primary)) drop-shadow(0 0 14px var(--overlay-primary));
            opacity: 1;
          }
        }
        @keyframes slideInLeft {
          0% { opacity: 0; transform: translateX(-35px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          0% { opacity: 0; transform: translateX(35px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleUpCenter {
          0% { opacity: 0; transform: scale(0.93); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes trophyPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 25px rgba(210, 255, 13, 0.2);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 0 35px rgba(210, 255, 13, 0.45);
          }
        }

        .volt-flow {
          animation: voltLineFlow 1.2s linear infinite;
        }
        .volt-flow-fast {
          animation: voltLineFlow 0.8s linear infinite;
        }
        .volt-glow-pulse {
          animation: voltPulseGlow 2s ease-in-out infinite;
        }
        .trophy-glow {
          animation: trophyPulse 3s ease-in-out infinite;
        }

        /* Staggered Entrance Animations */
        .anim-col-r16-l { animation: slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both; }
        .anim-col-qf-l { animation: slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
        .anim-col-sf-l { animation: slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both; }
        .anim-col-final { animation: scaleUpCenter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both; }
        .anim-col-sf-r { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both; }
        .anim-col-qf-r { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
        .anim-col-r16-r { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both; }
      `}</style>

      {/* Subtle geometric pattern & ambient volt glow */}
      <div className="absolute inset-0 volt-pattern opacity-40 pointer-events-none" />
      <div className="volt-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* TOP CHAMPIONSHIP HEADER */}
      <div className="relative z-10 pt-5 flex flex-col items-center">
        {/* Slanted Tournament Badge */}
        <div className="mb-2 volt-anim-1">
          <SlantedBadge text={tournamentTitle || "OFFICIAL TOURNAMENT"} />
        </div>

        {/* Dual-Tone Playoff Title */}
        <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter uppercase text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)] leading-none my-1 volt-anim-2">
          THE <span style={{ color: voltHex }}>PLAYOFFS</span>
        </h1>

        {/* Glowing tapered horizontal divider line */}
        <div className="flex items-center gap-3 w-full max-w-xl justify-center mt-1 volt-anim-3">
          <div
            className="h-[2px] flex-1"
            style={{
              background: `linear-gradient(to right, transparent, ${voltHex}, ${voltHex})`,
            }}
          />
          <div className="w-2.5 h-2.5 rotate-45 shrink-0" style={{ backgroundColor: voltHex }} />
          <div
            className="h-[2px] flex-1"
            style={{
              background: `linear-gradient(to left, transparent, ${voltHex}, ${voltHex})`,
            }}
          />
        </div>
      </div>

      {/* MAIN BRACKET ARENA - Modular Integrated Precision Architecture */}
      <div className="relative z-10 flex-1 w-full max-w-[1720px] mx-auto px-4 flex items-center justify-center">
        <div className="flex items-center justify-between w-full h-[640px]">
          
          {/* 1. LEFT R16 COLUMN (4 Matches, Centers at y = 80, 240, 400, 560) */}
          <div className="w-[175px] h-full grid grid-rows-4 anim-col-r16-l shrink-0">
            <div className="h-[160px] flex items-center justify-center">
              <MatchPair
                match={leftR16[0]}
                align="left"
                width={175}
                primaryColorHex={primaryColor}
                onClick={() => leftR16[0] && onMatchClick?.(leftR16[0])}
              />
            </div>
            <div className="h-[160px] flex items-center justify-center">
              <MatchPair
                match={leftR16[1]}
                align="left"
                width={175}
                primaryColorHex={primaryColor}
                onClick={() => leftR16[1] && onMatchClick?.(leftR16[1])}
              />
            </div>
            <div className="h-[160px] flex items-center justify-center">
              <MatchPair
                match={leftR16[2]}
                align="left"
                width={175}
                primaryColorHex={primaryColor}
                onClick={() => leftR16[2] && onMatchClick?.(leftR16[2])}
              />
            </div>
            <div className="h-[160px] flex items-center justify-center">
              <MatchPair
                match={leftR16[3]}
                align="left"
                width={175}
                primaryColorHex={primaryColor}
                onClick={() => leftR16[3] && onMatchClick?.(leftR16[3])}
              />
            </div>
          </div>

          {/* 2. LEFT CONNECTOR 1: R16 -> QF (Width 40, Height 640) */}
          <div className="w-[40px] h-full shrink-0">
            <svg viewBox="0 0 40 640" className="w-full h-full" preserveAspectRatio="none">
              {/* Upper Fork: R16 (80, 240) -> QF (160) */}
              <ForkConnector
                y1={80}
                y2={240}
                yTarget={160}
                direction="ltr"
                width={40}
                height={640}
                mTop={leftR16[0]}
                mBottom={leftR16[1]}
                mTarget={leftQF[0]}
                primaryColorHex={primaryColor}
              />
              {/* Lower Fork: R16 (400, 560) -> QF (480) */}
              <ForkConnector
                y1={400}
                y2={560}
                yTarget={480}
                direction="ltr"
                width={40}
                height={640}
                mTop={leftR16[2]}
                mBottom={leftR16[3]}
                mTarget={leftQF[1]}
                primaryColorHex={primaryColor}
              />
            </svg>
          </div>

          {/* 3. LEFT QF COLUMN (2 Matches, Centers at y = 160, 480) */}
          <div className="w-[175px] h-full grid grid-rows-2 anim-col-qf-l shrink-0">
            <div className="h-[320px] flex items-center justify-center">
              <MatchPair
                match={leftQF[0]}
                align="left"
                width={175}
                primaryColorHex={primaryColor}
                onClick={() => leftQF[0] && onMatchClick?.(leftQF[0])}
              />
            </div>
            <div className="h-[320px] flex items-center justify-center">
              <MatchPair
                match={leftQF[1]}
                align="left"
                width={175}
                primaryColorHex={primaryColor}
                onClick={() => leftQF[1] && onMatchClick?.(leftQF[1])}
              />
            </div>
          </div>

          {/* 4. LEFT CONNECTOR 2: QF -> SF (Width 40, Height 640) */}
          <div className="w-[40px] h-full shrink-0">
            <svg viewBox="0 0 40 640" className="w-full h-full" preserveAspectRatio="none">
              {/* Fork: QF (160, 480) -> SF (320) */}
              <ForkConnector
                y1={160}
                y2={480}
                yTarget={320}
                direction="ltr"
                width={40}
                height={640}
                mTop={leftQF[0]}
                mBottom={leftQF[1]}
                mTarget={leftSF}
                primaryColorHex={primaryColor}
              />
            </svg>
          </div>

          {/* 5. LEFT SF COLUMN (1 Match, Center at y = 320) */}
          <div className="w-[175px] h-full flex items-center justify-center anim-col-sf-l shrink-0">
            <MatchPair
              match={leftSF}
              align="left"
              width={175}
              label="SEMIFINAL"
              primaryColorHex={primaryColor}
              onClick={() => leftSF && onMatchClick?.(leftSF)}
            />
          </div>

          {/* 6. LEFT CONNECTOR 3: SF -> Final Top Slot (Width 48, Height 640) */}
          <div className="w-[48px] h-full shrink-0">
            <svg viewBox="0 0 48 640" className="w-full h-full" preserveAspectRatio="none">
              <FinalConnector
                ySF={320}
                yFinal={277}
                direction="ltr"
                width={48}
                height={640}
                mSF={leftSF}
                mFinal={finalMatch}
                primaryColorHex={primaryColor}
              />
            </svg>
          </div>

          {/* 7. GRAND FINAL CENTERPIECE (Width 240, Height 640) */}
          <div className="w-[240px] h-full relative flex flex-col items-center justify-center anim-col-final shrink-0">
            {/* Floating Trophy Emblem above cards */}
            <div className="absolute top-[135px] flex flex-col items-center pointer-events-none">
              <div className="relative w-14 h-14 rounded-full bg-[#141414] border-2 border-[var(--overlay-primary)] flex items-center justify-center trophy-glow">
                <Trophy className="w-7 h-7 text-[var(--overlay-primary)]" />
              </div>
              <span className="mt-2 text-[11px] font-black tracking-[0.3em] uppercase italic text-white/70">
                GRAND <span className="text-[var(--overlay-primary)]">FINAL</span>
              </span>
            </div>

            {/* Exactly centered Cards Block (Center at y = 320, Top card at 277, Bottom card at 363) */}
            <div className="w-full flex flex-col items-center">
              {/* Top Card (Team 1) */}
              <CleanTeamCard
                name={finalMatch?.team1Name}
                score={finalMatch?.team1Score}
                isWinner={finalMatch?.status === "COMPLETED" && finalMatch?.winnerName === finalMatch?.team1Name}
                isLoser={finalMatch?.status === "COMPLETED" && finalMatch?.winnerName !== finalMatch?.team1Name}
                isLive={finalMatch?.status === "IN_PROGRESS" || finalMatch?.status === "LIVE"}
                align="center"
                width={220}
                height={44}
                primaryColorHex={primaryColor}
                isFinal={true}
              />

              {/* VS Badge */}
              <div className="flex items-center gap-2 my-2">
                <div className="h-[1px] w-8 bg-white/10" />
                <span className="text-[10px] font-black italic tracking-widest text-[var(--overlay-primary)] bg-[#141414] px-3 py-0.5 bracket-skew border-l-2 border-[var(--overlay-primary)]">
                  <span className="bracket-unskew inline-block">
                    {finalMatch?.team1Score !== undefined &&
                    finalMatch?.team2Score !== undefined &&
                    finalMatch.status !== "SCHEDULED"
                      ? `${finalMatch.team1Score} – ${finalMatch.team2Score}`
                      : "VS"}
                  </span>
                </span>
                <div className="h-[1px] w-8 bg-white/10" />
              </div>

              {/* Bottom Card (Team 2) */}
              <CleanTeamCard
                name={finalMatch?.team2Name}
                score={finalMatch?.team2Score}
                isWinner={finalMatch?.status === "COMPLETED" && finalMatch?.winnerName === finalMatch?.team2Name}
                isLoser={finalMatch?.status === "COMPLETED" && finalMatch?.winnerName !== finalMatch?.team2Name}
                isLive={finalMatch?.status === "IN_PROGRESS" || finalMatch?.status === "LIVE"}
                align="center"
                width={220}
                height={44}
                primaryColorHex={primaryColor}
                isFinal={true}
              />
            </div>
          </div>

          {/* 8. RIGHT CONNECTOR 3: Final Bottom Slot <- SF (Width 48, Height 640) */}
          <div className="w-[48px] h-full shrink-0">
            <svg viewBox="0 0 48 640" className="w-full h-full" preserveAspectRatio="none">
              <FinalConnector
                ySF={320}
                yFinal={363}
                direction="rtl"
                width={48}
                height={640}
                mSF={rightSF}
                mFinal={finalMatch}
                primaryColorHex={primaryColor}
              />
            </svg>
          </div>

          {/* 9. RIGHT SF COLUMN (1 Match, Center at y = 320) */}
          <div className="w-[175px] h-full flex items-center justify-center anim-col-sf-r shrink-0">
            <MatchPair
              match={rightSF}
              align="right"
              width={175}
              label="SEMIFINAL"
              primaryColorHex={primaryColor}
              onClick={() => rightSF && onMatchClick?.(rightSF)}
            />
          </div>

          {/* 10. RIGHT CONNECTOR 2: SF <- QF (Width 40, Height 640) */}
          <div className="w-[40px] h-full shrink-0">
            <svg viewBox="0 0 40 640" className="w-full h-full" preserveAspectRatio="none">
              {/* Fork: QF (160, 480) -> SF (320) */}
              <ForkConnector
                y1={160}
                y2={480}
                yTarget={320}
                direction="rtl"
                width={40}
                height={640}
                mTop={rightQF[0]}
                mBottom={rightQF[1]}
                mTarget={rightSF}
                primaryColorHex={primaryColor}
              />
            </svg>
          </div>

          {/* 11. RIGHT QF COLUMN (2 Matches, Centers at y = 160, 480) */}
          <div className="w-[175px] h-full grid grid-rows-2 anim-col-qf-r shrink-0">
            <div className="h-[320px] flex items-center justify-center">
              <MatchPair
                match={rightQF[0]}
                align="right"
                width={175}
                primaryColorHex={primaryColor}
                onClick={() => rightQF[0] && onMatchClick?.(rightQF[0])}
              />
            </div>
            <div className="h-[320px] flex items-center justify-center">
              <MatchPair
                match={rightQF[1]}
                align="right"
                width={175}
                primaryColorHex={primaryColor}
                onClick={() => rightQF[1] && onMatchClick?.(rightQF[1])}
              />
            </div>
          </div>

          {/* 12. RIGHT CONNECTOR 1: QF <- R16 (Width 40, Height 640) */}
          <div className="w-[40px] h-full shrink-0">
            <svg viewBox="0 0 40 640" className="w-full h-full" preserveAspectRatio="none">
              {/* Upper Fork: R16 (80, 240) -> QF (160) */}
              <ForkConnector
                y1={80}
                y2={240}
                yTarget={160}
                direction="rtl"
                width={40}
                height={640}
                mTop={rightR16[0]}
                mBottom={rightR16[1]}
                mTarget={rightQF[0]}
                primaryColorHex={primaryColor}
              />
              {/* Lower Fork: R16 (400, 560) -> QF (480) */}
              <ForkConnector
                y1={400}
                y2={560}
                yTarget={480}
                direction="rtl"
                width={40}
                height={640}
                mTop={rightR16[2]}
                mBottom={rightR16[3]}
                mTarget={rightQF[1]}
                primaryColorHex={primaryColor}
              />
            </svg>
          </div>

          {/* 13. RIGHT R16 COLUMN (4 Matches, Centers at y = 80, 240, 400, 560) */}
          <div className="w-[175px] h-full grid grid-rows-4 anim-col-r16-r shrink-0">
            <div className="h-[160px] flex items-center justify-center">
              <MatchPair
                match={rightR16[0]}
                align="right"
                width={175}
                primaryColorHex={primaryColor}
                onClick={() => rightR16[0] && onMatchClick?.(rightR16[0])}
              />
            </div>
            <div className="h-[160px] flex items-center justify-center">
              <MatchPair
                match={rightR16[1]}
                align="right"
                width={175}
                primaryColorHex={primaryColor}
                onClick={() => rightR16[1] && onMatchClick?.(rightR16[1])}
              />
            </div>
            <div className="h-[160px] flex items-center justify-center">
              <MatchPair
                match={rightR16[2]}
                align="right"
                width={175}
                primaryColorHex={primaryColor}
                onClick={() => rightR16[2] && onMatchClick?.(rightR16[2])}
              />
            </div>
            <div className="h-[160px] flex items-center justify-center">
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
      </div>

      {/* BOTTOM FOOTER / TITLE */}
      <div className="relative z-10 pb-6 flex flex-col items-center">
        {/* Glowing tapered horizontal divider line */}
        <div className="flex items-center gap-3 w-full max-w-xl justify-center mb-2">
          <div
            className="h-[2px] flex-1"
            style={{
              background: `linear-gradient(to right, transparent, ${voltHex}, ${voltHex})`,
            }}
          />
          <div className="w-2.5 h-2.5 rotate-45 shrink-0" style={{ backgroundColor: voltHex }} />
          <div
            className="h-[2px] flex-1"
            style={{
              background: `linear-gradient(to left, transparent, ${voltHex}, ${voltHex})`,
            }}
          />
        </div>

        <h2 className="text-lg sm:text-2xl font-black italic tracking-widest uppercase text-white/90 drop-shadow-md">
          {tournamentTitle || "OFFICIAL BROADCAST"}
        </h2>
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-white/50 italic mt-0.5">
          {gameTitle ? `${gameTitle} • ` : ""}OFFICIAL BROADCAST BRACKET
        </span>
      </div>
    </div>
  );
}
