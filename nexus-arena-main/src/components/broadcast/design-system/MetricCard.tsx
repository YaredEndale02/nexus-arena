import React from "react";
import { cn } from "@/lib/utils";
import { SlantedCard } from "./SlantedCard";

export interface MetricCardProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subValue?: string;
  statusText?: string;
  accentColor?: string;
  className?: string;
}

/**
 * MetricCard
 * Standardized data metric card from the bottom of the reference broadcast overlay.
 * Used for Viewers, Stream Delay, Break Timers, Round counters, etc.
 */
export function MetricCard({
  icon,
  label,
  value,
  subValue,
  statusText,
  accentColor,
  className = "",
}: MetricCardProps) {
  return (
    <SlantedCard
      accentBorder={Boolean(accentColor)}
      variant="subtle"
      className={cn("p-5 border-l-4 border-transparent hover:border-white/20 transition-colors", className)}
    >
      <div className="flex flex-col">
        {/* Label & Icon Header */}
        <div className="flex items-center gap-2 mb-2 text-white/40">
          {icon}
          <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">
            {label}
          </span>
          {statusText && (
            <span className="ml-auto flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--overlay-primary)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--overlay-primary)] animate-pulse" />
              {statusText}
            </span>
          )}
        </div>

        {/* Value Display */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-white tracking-tighter italic tabular-nums">
            {value}
          </span>
          {subValue && (
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider italic">
              {subValue}
            </span>
          )}
        </div>
      </div>
    </SlantedCard>
  );
}
