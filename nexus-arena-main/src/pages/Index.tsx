import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { StatsBar } from "@/components/StatsBar";
import { TournamentCard } from "@/components/TournamentCard";
import { api, Tournament } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, TrendingUp, Clock, Flame, Loader2 } from "lucide-react";

const fallbackTournaments: Tournament[] = [];

const Index = () => {
  const [tournamentList, setTournamentList] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [filter, setFilter] = useState("All");

  const { user } = useAuth();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const [tournaments, registrations] = await Promise.all([
          api.getTournaments(),
          user ? api.getMyRegistrations(user.id) : Promise.resolve([])
        ]);
        setTournamentList(tournaments.map(t => ({
          ...t,
          isUserRegistered: registrations.some(r => r.tournament.id === t.id)
        })));
        setIsUsingFallback(false);
      } catch (error) {
        console.error("Error fetching tournaments:", error);
        setTournamentList(fallbackTournaments);
        setIsUsingFallback(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournaments();
  }, [user]);

  const filteredTournaments = tournamentList.filter((t) => {
    if (filter === "All") return true;
    if (filter === "Live") return t.status === "LIVE" || t.displayStatus === "Live";
    if (filter === "Open") return t.status === "REGISTRATION_OPEN" || t.displayStatus === "Registration Open";
    if (filter === "Upcoming") return ["REGISTRATION_CLOSED", "PUBLISHED"].includes(t.status) || t.displayStatus === "Registration Closed" || t.displayStatus === "Published";
    return true;
  });

  return (
    <Layout>
      {/* Page header */}
      <div className="mb-8 animate-fade-in text-center lg:text-left">
        <h1 className="font-heading text-4xl lg:text-5xl font-bold text-foreground">
          Welcome to <span className="text-primary">ADWA ARENA</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Compete. Dominate. Win.</p>
      </div>

      {/* Stats */}
      <StatsBar />

      {/* Section header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-primary" />
          <h2 className="font-heading text-2xl font-bold text-foreground italic">
            {filter === "All" ? "Active" : filter} Tournaments
          </h2>
        </div>
        {isUsingFallback && (
          <p className="text-xs text-amber-300">
            Showing fallback tournament data while the API connection is unavailable.
          </p>
        )}
        <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit overflow-x-auto no-scrollbar max-w-full">
          {["All", "Live", "Open", "Upcoming"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-3 min-h-[44px] min-w-[80px] rounded-xl text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
                filter === f
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tournament grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="font-heading italic animate-pulse">Gathering tournament data...</p>
        </div>
      ) : filteredTournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {filteredTournaments.map((t, i) => (
            <div key={t.id} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <TournamentCard tournament={t} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/5 mb-12">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">No Tournaments Found</h3>
          <p className="text-muted-foreground">Check back later or check your server connection.</p>
        </div>
      )}

      {/* Quick links row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Trophy, title: "LEADERBOARD", desc: "See who's on top of the ADWA ARENA rankings", color: "text-gold" },
          { icon: TrendingUp, title: "TRENDING", desc: "Most popular tournaments this week", color: "text-primary" },
          { icon: Clock, title: "RECENT RESULTS", desc: "Latest outcomes from the battlegrounds", color: "text-neon-purple" },
        ].map((item) => (
          <div key={item.title} className="glass-card p-6 flex items-center gap-5 cursor-pointer group hover:scale-[1.02] transition-transform duration-300">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all border border-white/10">
              <item.icon className={`w-7 h-7 ${item.color}`} />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground tracking-wide">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Index;
