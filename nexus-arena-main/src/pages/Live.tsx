import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Play, Send, Smile, Trophy, Target, Shield, Coins, Star, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import { api, Tournament, MatchReport } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function StreamPlayer({ tournament }: { tournament: Tournament }) {
  const streamUrl = tournament?.streamUrl || "";
  const isTikTok = streamUrl.toLowerCase().includes("tiktok.com");
  
  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    
    // Twitch
    if (url.includes("twitch.tv/")) {
      const channel = url.split("twitch.tv/")[1]?.split("/")[0]?.split("?")[0];
      return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&muted=false`;
    }
    
    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      let videoId = "";
      if (url.includes("v=")) videoId = url.split("v=")[1]?.split("&")[0];
      else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1]?.split("?")[0];
      else if (url.includes("/live/")) videoId = url.split("/live/")[1]?.split("?")[0];
      else if (url.includes("/embed/")) videoId = url.split("/embed/")[1]?.split("?")[0];
      
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0`;
    }
    
    // TikTok
    if (url.includes("tiktok.com")) {
      if (url.includes("/live")) {
        const parts = url.split("/");
        const userPart = parts.find(p => p.startsWith("@"));
        if (userPart) return `https://www.tiktok.com/embed/v2/live?id=${userPart.substring(1)}`;
      }
      if (url.includes("/video/")) {
        const videoId = url.split("/video/")[1]?.split("?")[0];
        if (videoId) return `https://www.tiktok.com/embed/v2/${videoId}`;
      }
    }
    
    if (url.includes("http")) return url;
    return null;
  };

  const embedUrl = getEmbedUrl(streamUrl);

  if (!embedUrl) {
    return (
      <div className="glass-card aspect-video bg-black/40 flex flex-col items-center justify-center p-8 text-center">
        <Trophy className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
        <p className="text-muted-foreground font-heading uppercase tracking-widest text-xs">No Active Stream</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden bg-black ring-1 ring-white/5 shadow-2xl">
      <div 
        className={cn("relative w-full bg-black mx-auto", isTikTok ? "max-w-[400px]" : "aspect-video")}
        style={isTikTok ? { aspectRatio: '9/16', maxHeight: '70vh' } : {}}
      >
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
        />
        
        <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-primary/80 to-neon-purple/80 backdrop-blur-sm flex items-center justify-center">
            <Trophy className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-[10px] font-bold text-white/80 font-heading tracking-widest drop-shadow-md">Nexus Arena Live</span>
        </div>

        {/* Big centered Watch Button for high visibility */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <a 
            href={tournament.streamUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="pointer-events-auto flex flex-col items-center gap-3 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:scale-105 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Play className="w-6 h-6 fill-current" />
            </div>
            <span className="uppercase tracking-widest text-sm">
              Watch on {isTikTok ? 'TikTok' : tournament.streamUrl.includes('twitch') ? 'Twitch' : 'YouTube'}
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

function MatchStatsWidget({ match }: { match?: MatchReport }) {
  if (!match) {
    return (
      <div className="glass-card p-5 h-full flex items-center justify-center text-muted-foreground text-sm italic">
        No live match data available
      </div>
    );
  }

  const statRows = [
    { label: "Score", t1: match.team1Score, t2: match.team2Score, icon: Target },
    // Mocking other stats for now as they aren't in DB yet
    { label: "Rounds", t1: Math.floor(match.team1Score * 1.2), t2: Math.floor(match.team2Score * 1.2), icon: Trophy },
  ];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-primary">Live Match</h3>
        <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-bold uppercase">{match.status}</span>
      </div>

      {/* Team headers */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-lg">🛡️</div>
          <div>
            <p className="text-sm font-bold text-foreground truncate max-w-[100px]">{match.team1Name}</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">VS</span>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground truncate max-w-[100px]">{match.team2Name}</p>
          </div>
          <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-lg">⚔️</div>
        </div>
      </div>

      {/* Stat bars */}
      <div className="space-y-3">
        {statRows.map((row) => {
          const total = row.t1 + row.t2 || 1;
          const pct1 = (row.t1 / total) * 100;
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-foreground font-medium">{row.t1}</span>
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-foreground font-medium">{row.t2}</span>
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

function LeaderboardWidget({ standings }: { standings?: any[] }) {
  if (!standings || standings.length === 0) {
    return (
      <div className="glass-card p-5 h-full flex items-center justify-center text-muted-foreground text-sm italic">
        Standings will appear here
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-gold mb-4">Standings</h3>
      <div className="space-y-2">
        {standings.slice(0, 6).map((entry, i) => (
          <div
            key={entry.teamName}
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
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{entry.teamName}</p>
              <p className="text-[10px] text-muted-foreground">{entry.wins}W - {entry.losses}L</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-heading font-bold text-foreground">{entry.points} pts</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatWidget({ tournamentId }: { tournamentId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await api.getChatMessages(tournamentId);
        setMessages(history);
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };
    fetchHistory();

    // Subscribe to new messages
    const channel = api.subscribeToChat(tournamentId, (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [tournamentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    try {
      await api.sendChatMessage(tournamentId, user.id, input);
      setInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const badgeColors: Record<string, string> = {
    VIP: "bg-gold/20 text-gold",
    MOD: "bg-emerald-500/20 text-emerald-400",
    ADMIN: "bg-red-500/20 text-red-400",
    ORGANIZER: "bg-primary/20 text-primary",
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e10]">
      <div className="p-4 border-b border-white/5 bg-black/20">
        <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-foreground">
          Live Chat <span className="text-xs text-muted-foreground font-body font-normal ml-2">Broadcast Feed</span>
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
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs italic">
            No messages yet. Be the first to say hi!
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          {user ? (
            <>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Send a message..."
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <button 
                onClick={handleSend}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-full p-2 text-center text-xs text-muted-foreground">
              Sign in to join the chat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function Live() {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get("tournamentId");
  const queryClient = useQueryClient();

  const { data: activeTournaments } = useQuery({
    queryKey: ["active-tournaments"],
    queryFn: () => api.getTournaments(), // This will fetch all, we can filter for active ones
  });

  const { data: tournament, isLoading } = useQuery({
    queryKey: ["live-tournament", tournamentId],
    queryFn: async () => {
      if (tournamentId) {
        return api.getTournament(tournamentId);
      }
      return api.getLatestActiveTournament();
    },
  });

  const { data: standings } = useQuery({
    queryKey: ["tournament-standings", tournament?.id],
    enabled: !!tournament?.id,
    queryFn: () => api.getTournamentStandings(tournament!.id),
  });

  const { data: matches } = useQuery({
    queryKey: ["tournament-matches", tournament?.id],
    enabled: !!tournament?.id,
    queryFn: () => api.getTournamentMatches(tournament!.id),
  });

  const { data: streams } = useQuery({
    queryKey: ["tournament-streams", tournament?.id],
    enabled: !!tournament?.id,
    queryFn: () => api.getTournamentStreams(tournament!.id),
  });

  useEffect(() => {
    if (!tournament?.id) return;
    const channel = api.subscribeToMatches(tournament.id, () => {
      queryClient.invalidateQueries({ queryKey: ["tournament-matches", tournament.id] });
      queryClient.invalidateQueries({ queryKey: ["tournament-standings", tournament.id] });
    });
    return () => {
      channel.unsubscribe();
    };
  }, [tournament?.id, queryClient]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground animate-pulse">Initializing Broadcast Feed...</p>
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <Play className="w-8 h-8 text-muted-foreground opacity-20" />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-2">No Active Broadcast</h1>
          <p className="text-muted-foreground max-w-sm mb-8 italic">
            There are no live events currently broadcasting. Check back soon for the next pro league match.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <select 
              onChange={(e) => window.location.href = `/live?tournamentId=${e.target.value}`}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors w-full"
            >
              <option value="">Switch to Another Event...</option>
              {activeTournaments?.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>
      </Layout>
    );
  }

  const primaryStream = streams?.find(s => s.is_primary)?.stream_url || tournament?.streamUrl;

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0a0a0c]">
        {/* Left Side: Stream & Stats */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isChatOpen ? "mr-0" : ""
        )}>
          {/* Header Bar */}
          <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h1 className="font-heading text-sm font-bold tracking-tight uppercase">
                  {tournament?.title} <span className="text-primary">Live</span>
                </h1>
              </div>
              <div className="h-4 w-px bg-white/10 hidden md:block" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest hidden md:block">
                {tournament?.gameTitle} Global Broadcast
              </p>
            </div>

            <div className="flex items-center gap-4">
              <select 
                value={tournament?.id}
                onChange={(e) => window.location.href = `/live?tournamentId=${e.target.value}`}
                className="bg-white/5 border border-white/10 rounded px-3 py-1 text-[11px] text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value={tournament?.id}>{tournament?.title}</option>
                {activeTournaments?.filter(t => t.id !== tournament?.id && ["LIVE", "PUBLISHED"].includes(t.status)).map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="p-1.5 hover:bg-white/5 rounded transition-colors text-muted-foreground hover:text-foreground"
              >
                {isChatOpen ? <TrendingDown className="w-4 h-4 rotate-90" /> : <TrendingUp className="w-4 h-4 -rotate-90" />}
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <div className="max-w-[1400px] mx-auto space-y-6">
              <StreamPlayer tournament={{ ...tournament, streamUrl: primaryStream }} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                <MatchStatsWidget match={matches?.find(m => m.status === 'LIVE' || m.status === 'IN_PROGRESS') || matches?.[0]} />
                <LeaderboardWidget standings={standings} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Docked Chat */}
        <aside className={cn(
          "w-80 border-l border-white/10 bg-[#0e0e10] flex flex-col transition-all duration-300",
          isChatOpen ? "translate-x-0" : "translate-x-full w-0 border-none"
        )}>
          <div className="flex-1 overflow-hidden">
            <ChatWidget tournamentId={tournament.id} />
          </div>
        </aside>
      </div>
    </Layout>
  );
}
