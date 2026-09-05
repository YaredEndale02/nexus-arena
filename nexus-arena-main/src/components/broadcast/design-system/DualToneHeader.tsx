import React from "react";
import { SlantedBadge } from "./SlantedBadge";

export interface DualToneHeaderProps {
  badgeText?: string;
  badgeIcon?: React.ReactNode;
  line1: string;
  line2?: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * DualToneHeader
 * The iconic dual-tone championship typography from the reference design.
 * Features Line 1 in crisp white, Line 2 in electric volt, and an italicized subtitle.
 */
export function DualToneHeader({
  badgeText,
  badgeIcon,
  line1,
  line2,
  subtitle,
  className = "",
  children,
}: DualToneHeaderProps) {
  return (
    <div className={`volt-skew ${className}`}>
      <div className="volt-unskew">
        {/* Tournament / Category Badge */}
        {badgeText && (
          <div className="mb-8 volt-anim-1">
            <SlantedBadge text={badgeText} icon={badgeIcon} />
          </div>
        )}

        {/* Dual Tone Title */}
        <h1 className="text-[clamp(3.5rem,7vw,7.5rem)] font-black text-white tracking-tighter leading-[0.88] uppercase italic drop-shadow-2xl volt-anim-2 mb-6">
          {line1}
          {line2 && (
            <>
              <br />
              <span className="text-[var(--overlay-primary)] drop-shadow-[0_0_30px_rgba(210,255,13,0.3)]">
                {line2}
              </span>
            </>
          )}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-lg sm:text-xl text-white/50 font-bold max-w-md italic volt-anim-3 mb-8">
            {subtitle}
          </p>
        )}

        {/* Extra slot (e.g. BreakTimer) */}
        {children && <div className="volt-anim-4">{children}</div>}
      </div>
    </div>
  );
}
