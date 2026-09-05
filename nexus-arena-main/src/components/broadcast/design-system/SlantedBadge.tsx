import React from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlantedBadgeProps {
  text: string;
  icon?: React.ReactNode;
  variant?: "primary" | "dark" | "outline";
  className?: string;
}

/**
 * SlantedBadge
 * The signature tournament badge from the top of the reference broadcast design.
 * Features a dynamic slanted parallelogram with high-contrast text.
 */
export function SlantedBadge({
  text,
  icon = <Shield className="w-4 h-4 text-black fill-black" />,
  variant = "primary",
  className = "",
}: SlantedBadgeProps) {
  const isPrimary = variant === "primary";
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "volt-skew px-6 py-2 inline-flex items-center shadow-lg transition-transform",
        isPrimary && "bg-[var(--overlay-primary)] shadow-[0_0_30px_rgba(210,255,13,0.2)]",
        isDark && "bg-[#111] border-l-4 border-[var(--overlay-primary)]",
        variant === "outline" && "border border-[var(--overlay-primary)] bg-black/40",
        className
      )}
    >
      <div className="volt-unskew flex items-center gap-3">
        {icon}
        <span
          className={cn(
            "text-xs font-black uppercase tracking-[0.35em] italic truncate max-w-[400px]",
            isPrimary ? "text-black" : "text-white"
          )}
        >
          {text}
        </span>
      </div>
    </div>
  );
}
