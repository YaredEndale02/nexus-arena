import React from "react";
import { cn } from "@/lib/utils";

export interface SlantedCardProps {
  children: React.ReactNode;
  accentBorder?: boolean;
  borderWidth?: "normal" | "thick";
  variant?: "dark" | "subtle" | "ghost";
  className?: string;
  unskewContent?: boolean;
  onClick?: () => void;
}

/**
 * SlantedCard
 * The foundational container from the reference design.
 * Features a -12deg slanted parallelogram in dark graphite with an electric volt accent left-border.
 */
export function SlantedCard({
  children,
  accentBorder = true,
  borderWidth = "normal",
  variant = "dark",
  className = "",
  unskewContent = true,
  onClick,
}: SlantedCardProps) {
  const bgClass =
    variant === "dark"
      ? "bg-[#111111]"
      : variant === "subtle"
      ? "bg-[#181818]"
      : "bg-black/40 backdrop-blur-md";

  const borderClass = accentBorder
    ? borderWidth === "thick"
      ? "border-l-8 border-[var(--overlay-primary)]"
      : "border-l-4 border-[var(--overlay-primary)]"
    : "border border-white/10";

  return (
    <div
      onClick={onClick}
      className={cn(
        "volt-skew shadow-2xl relative overflow-hidden transition-all duration-200",
        bgClass,
        borderClass,
        onClick && "cursor-pointer hover:scale-[1.01]",
        className
      )}
    >
      {/* Subtle top glossy highlight reflection */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-white/20 via-white/5 to-transparent pointer-events-none" />

      {/* Unskewed Inner Content */}
      <div className={cn("w-full h-full", unskewContent && "volt-unskew")}>
        {children}
      </div>
    </div>
  );
}
