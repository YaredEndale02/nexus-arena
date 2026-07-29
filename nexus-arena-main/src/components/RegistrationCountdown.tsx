import { useEffect, useState } from "react";
import { Clock, Flame, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RegistrationCountdownProps {
  registrationCloseAt?: string | null;
  registrationOpenAt?: string | null;
  registeredTeams: number;
  maxTeams: number;
  variant?: "card" | "hero" | "banner";
  className?: string;
}

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

/**
 * Helper to compute time remaining until a target ISO date string.
 */
export function calculateTimeLeft(targetDate?: string | null): TimeLeft {
  if (!targetDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
  }

  const diffMs = new Date(targetDate).getTime() - Date.now();
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isExpired: false, totalSeconds };
}

export function RegistrationCountdown({
  registrationCloseAt,
  registrationOpenAt,
  registeredTeams,
  maxTeams,
  variant = "card",
  className,
}: RegistrationCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(registrationCloseAt));

  useEffect(() => {
    if (!registrationCloseAt && !registrationOpenAt) return;

    const target = registrationCloseAt || registrationOpenAt;
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(target));
    }, 1000);

    return () => clearInterval(interval);
  }, [registrationCloseAt, registrationOpenAt]);

  const spotsLeft = Math.max(0, maxTeams - registeredTeams);
  const fillPct = maxTeams > 0 ? Math.min(100, Math.round((registeredTeams / maxTeams) * 100)) : 0;
  const isAlmostFull = spotsLeft > 0 && spotsLeft <= 4;
  const isHighUrgency = timeLeft.totalSeconds > 0 && timeLeft.totalSeconds <= 86400; // < 24 hours

  // Formatting helpers
  const pad = (n: number) => String(n).padStart(2, "0");

  if (variant === "card") {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Scarcity & Countdown Row */}
        <div className="flex items-center justify-between text-xs">
          {!timeLeft.isExpired && (
            <span
              className={cn(
                "flex items-center gap-1 font-mono font-bold text-[11px]",
                isHighUrgency ? "text-amber-400 animate-pulse" : "text-primary",
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              {timeLeft.days > 0 && `${timeLeft.days}d `}
              {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
            </span>
          )}

          {isAlmostFull && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 animate-pulse">
              <Flame className="w-3 h-3 text-rose-400" />
              {spotsLeft} Spot{spotsLeft === 1 ? "" : "s"} Left!
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === "banner" || variant === "hero") {
    return (
      <div
        className={cn(
          "rounded-2xl border p-4 sm:p-5 glass relative overflow-hidden transition-all",
          isAlmostFull
            ? "border-rose-500/40 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-card shadow-[0_0_30px_rgba(244,63,94,0.15)]"
            : "border-primary/30 bg-gradient-to-r from-primary/10 via-neon-purple/10 to-card",
          className,
        )}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isAlmostFull ? (
                <span className="flex items-center gap-1.5 text-xs font-black text-rose-400 uppercase tracking-widest bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 rounded-full animate-bounce">
                  <Flame className="w-3.5 h-3.5" />
                  Almost Full
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-widest bg-primary/20 border border-primary/30 px-2.5 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5" />
                  Registration Closing Soon
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {registeredTeams} of {maxTeams} teams registered ({fillPct}% capacity)
            </p>
          </div>

          {/* Ticking Clock Counter Blocks */}
          {!timeLeft.isExpired && (
            <div className="flex items-center gap-2 font-mono">
              {timeLeft.days > 0 && (
                <div className="flex flex-col items-center glass border-white/10 px-3 py-1.5 rounded-xl min-w-[50px]">
                  <span className="text-lg font-black text-foreground">{pad(timeLeft.days)}</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Days</span>
                </div>
              )}
              <div className="flex flex-col items-center glass border-white/10 px-3 py-1.5 rounded-xl min-w-[50px]">
                <span className="text-lg font-black text-primary">{pad(timeLeft.hours)}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Hours</span>
              </div>
              <span className="text-primary font-bold text-lg animate-pulse">:</span>
              <div className="flex flex-col items-center glass border-white/10 px-3 py-1.5 rounded-xl min-w-[50px]">
                <span className="text-lg font-black text-primary">{pad(timeLeft.minutes)}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Mins</span>
              </div>
              <span className="text-primary font-bold text-lg animate-pulse">:</span>
              <div className="flex flex-col items-center glass border-white/10 px-3 py-1.5 rounded-xl min-w-[50px]">
                <span className="text-lg font-black text-rose-400">{pad(timeLeft.seconds)}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Secs</span>
              </div>
            </div>
          )}
        </div>

        {/* Capacity Progress Bar */}
        <div className="mt-4 space-y-1">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                fillPct >= 90
                  ? "bg-gradient-to-r from-amber-500 to-rose-500"
                  : "bg-gradient-to-r from-primary to-neon-purple",
              )}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>{fillPct}% Filled</span>
            <span>{spotsLeft} Spots Available</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
