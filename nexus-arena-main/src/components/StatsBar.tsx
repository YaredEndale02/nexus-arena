import { Trophy, Users, DollarSign, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delay: number;
}

function AnimatedCounter({ value, prefix = "", suffix = "", delay }: { value: number; prefix?: string; suffix?: string; delay: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 1500;
      const steps = 40;
      const increment = value / steps;
      let current = 0;
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplay(value);
          clearInterval(interval);
        } else {
          setDisplay(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <span className="font-heading text-2xl lg:text-3xl font-bold text-foreground">
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}

function StatItem({ icon, label, value, prefix, suffix, delay }: StatItemProps) {
  return (
    <div className="glass-card p-3 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 animate-count-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="text-center sm:text-left min-w-0 flex-1">
        <div className="flex flex-col">
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} delay={delay} />
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-0.5 truncate w-full">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StatsBar() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
      <StatItem icon={<Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />} label="Active Tournaments" value={24} delay={0} />
      <StatItem icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-neon-purple" />} label="Active Players" value={3847} delay={150} />
      <StatItem icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-gold" />} label="Prize Pool" value={535000} prefix="$" delay={300} />
      <StatItem icon={<Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />} label="Matches Today" value={42} delay={450} />
    </div>
  );
}
