import { Layout } from "@/components/Layout";
import { leaderboard, chatMessages, matchStats } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Play, Send, Smile, Trophy, Target, Shield, Coins, Star, TrendingUp, TrendingDown } from "lucide-react";

function StreamPlayer() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="relative aspect-video bg-gradient-to-br from-muted to-background flex items-center justify-center group cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Play button */}
        <div className="w-20 h-20 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary/30 transition-all group-hover:scale-110">
          <Play className="w-8 h-8 text-primary ml-1" />
        </div>

        {/* Stream info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold uppercase">Live</span>
                <span className="text-xs text-white/70">12,847 viewers</span>
              </div>
              <h3 className="font-heading text-lg font-bold text-white">Valorant Champions Series — Semi Finals</h3>
            </div>
          </div>
        </div>

        {/* Overlay decorative */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center">
            <Trophy className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-xs font-bold text-white/80 font-heading tracking-wider">ARENAX BROADCAST</span>
        </div>
      </div>
    </div>
  );
}

function MatchStatsWidget() {
  const stats = matchStats;
  const statRows = [
    { label: "Kills", t1: stats.team1.kills, t2: stats.team2.kills, icon: Target },
    { label: "Deaths", t1: stats.team1.deaths, t2: stats.team2.deaths, icon: Shield },
    { label: "Assists", t1: stats.team1.assists, t2: stats.team2.assists, icon: Star },
    { label: "Rounds Won", t1: stats.team1.roundsWon, t2: stats.team2.roundsWon, icon: Trophy },
    { label: "Economy", t1: stats.team1.economy, t2: stats.team2.economy, icon: Coins },
  ];

  return (
    <div className="glass-card p-5">
      <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-primary mb-4">Match Stats</h3>

      {/* Team headers */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{stats.team1.logo}</span>
          <div>
            <p className="text-sm font-bold text-foreground">{stats.team1.name}</p>
            <p className="text-xs text-primary">Rating: {stats.team1.rating}</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">VS</span>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{stats.team2.name}</p>
            <p className="text-xs text-muted-foreground">Rating: {stats.team2.rating}</p>
          </div>
          <span className="text-xl">{stats.team2.logo}</span>
        </div>
      </div>

      {/* Stat bars */}
      <div className="space-y-3">
        {statRows.map((row) => {
          const total = row.t1 + row.t2;
          const pct1 = total > 0 ? (row.t1 / total) * 100 : 50;
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-foreground font-medium">{row.label === "Economy" ? `$${row.t1.toLocaleString()}` : row.t1}</span>
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-foreground font-medium">{row.label === "Economy" ? `$${row.t2.toLocaleString()}` : row.t2}</span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
                <div className="bg-primary rounded-l-full transition-all duration-500" style={{ width: `${pct1}%` }} />
                <div className="bg-neon-purple rounded-r-full transition-all duration-500" style={{ width: `${100 - pct1}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeaderboardWidget() {
  return (
    <div className="glass-card p-5">
      <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-gold mb-4">Leaderboard</h3>
      <div className="space-y-2">
        {leaderboard.slice(0, 8).map((entry, i) => (
          <div
            key={entry.rank}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-white/5",
              i < 3 && "bg-white/[0.03]"
            )}
          >
            <span className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
              i === 0 && "bg-gold/20 text-gold",
              i === 1 && "bg-gray-400/20 text-gray-400",
              i === 2 && "bg-amber-700/20 text-amber-600",
              i > 2 && "text-muted-foreground"
            )}>
              {entry.rank}
            </span>
            <span className="text-lg">{entry.logo}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{entry.team}</p>
              <p className="text-[10px] text-muted-foreground">{entry.wins}W - {entry.losses}L</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-heading font-bold text-foreground">{entry.points.toLocaleString()}</p>
              <span className={cn(
                "text-[10px] font-bold",
                entry.streak.startsWith("W") ? "text-emerald-400" : "text-red-400"
              )}>
                {entry.streak.startsWith("W") ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                {entry.streak}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatWidget() {
  const [messages] = useState(chatMessages);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const badgeColors: Record<string, string> = {
    VIP: "bg-gold/20 text-gold",
    MOD: "bg-emerald-500/20 text-emerald-400",
    PLAYER: "bg-primary/20 text-primary",
  };

  return (
    <div className="glass-card flex flex-col h-[500px]">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-foreground">
          Live Chat <span className="text-xs text-muted-foreground font-body font-normal ml-2">847 online</span>
        </h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2 animate-fade-in">
            <span className="text-lg shrink-0">{msg.avatar}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {msg.badge && (
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold uppercase", badgeColors[msg.badge] || "bg-white/10 text-muted-foreground")}>
                    {msg.badge}
                  </span>
                )}
                <span className="text-xs font-bold text-primary">{msg.user}</span>
                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
              </div>
              <p className="text-sm text-foreground/90 break-words">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send a message..."
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <Smile className="w-4 h-4" />
            </button>
          </div>
          <button className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Live() {
  return (
    <Layout>
      <div className="mb-6 animate-fade-in">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Broadcast <span className="text-primary">Hub</span>
        </h1>
        <p className="text-muted-foreground mt-1">Watch live matches, track stats, and join the conversation</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content - stream + stats */}
        <div className="xl:col-span-2 space-y-6">
          <StreamPlayer />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MatchStatsWidget />
            <LeaderboardWidget />
          </div>
        </div>

        {/* Chat sidebar */}
        <div>
          <ChatWidget />
        </div>
      </div>
    </Layout>
  );
}
