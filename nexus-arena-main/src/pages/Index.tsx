import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { StatsBar } from "@/components/StatsBar";
import { TournamentCard } from "@/components/TournamentCard";
import { SEOHead } from "@/components/SEOHead";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { api, Tournament } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { Trophy, TrendingUp, Clock, Flame, Loader2, HelpCircle } from "lucide-react";

const fallbackTournaments: Tournament[] = [];

const Index = () => {
  const [tournamentList, setTournamentList] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [filter, setFilter] = useState("All");

  const { user } = useAuth();
  const { t } = useLanguage();

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

  const faqStructuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "ADWA ARENA",
      "url": "https://adwaarena.com",
      "description": "Premier esports tournament platform for competitive gaming, automated brackets, and live broadcasts."
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do I register a team for a tournament on ADWA ARENA?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Browse active tournaments on the home page, select an open tournament, and click 'Register Team'. Enter your team name and roster to secure your spot."
          }
        },
        {
          "@type": "Question",
          "name": "How does player check-in work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "When a tournament enters the Check-In phase (before match time), visit your Registrations tab and click 'Check In Team' to confirm attendance."
          }
        },
        {
          "@type": "Question",
          "name": "Can I host LAN and Online esports tournaments?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! ADWA ARENA supports Online, LAN, and Hybrid tournament formats with automated bracket generation and live broadcast overlays."
          }
        },
        {
          "@type": "Question",
          "name": "Are tournament brackets updated in real time?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. All brackets, match schedules, and scoreboards update in real time for players, spectators, and organizers."
          }
        }
      ]
    }
  ];

  return (
    <Layout>
      <SEOHead
        title="Competitive Esports Tournament Platform"
        description="Compete in professional esports tournaments on ADWA ARENA. Register teams, track live brackets, and broadcast matches for PUBG Mobile, Valorant, FC25, and more."
        canonicalUrl="https://adwaarena.com/"
        keywords="ADWA ARENA, esports tournaments, competitive gaming, tournament brackets, LAN tournaments, PUBG Mobile, Valorant, FC25"
        structuredData={faqStructuredData}
      />

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
            {filter === "All" ? t("activeTournaments") : `${filter} Tournaments`}
          </h2>
        </div>
        {isUsingFallback && (
          <p className="text-xs text-amber-300">
            Showing fallback tournament data while the API connection is unavailable.
          </p>
        )}
        <div className="flex gap-2 bg-[#1A1C1F] p-1.5 rounded-2xl border border-[#2B2E33] w-fit overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: "All", label: t("filterAll") },
            { id: "Live", label: t("filterLive") },
            { id: "Open", label: t("filterOpen") },
            { id: "Upcoming", label: t("filterUpcoming") },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-5 py-3 min-h-[44px] min-w-[80px] rounded-xl text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
                filter === id
                  ? "bg-[#D4AF37] text-black font-extrabold shadow-[0_0_20px_rgba(212,175,55,0.35)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {label}
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
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">{t("noTournamentsFound")}</h3>
          <p className="text-muted-foreground">Check back later or check your server connection.</p>
        </div>
      )}

      {/* Quick links row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
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

      {/* FAQ Knowledge Base Section (AI & Search Engine Optimization) */}
      <div className="glass rounded-3xl border border-white/10 p-8 sm:p-10 mb-12 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
            <p className="text-xs text-muted-foreground">Everything you need to know about competing on ADWA ARENA</p>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          <AccordionItem value="item-1" className="border border-white/10 rounded-2xl px-5 bg-white/5">
            <AccordionTrigger className="text-sm font-bold text-foreground hover:no-underline">
              How do I register a team for a tournament?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Browse through the active tournaments on the homepage, select an event that matches your game, and click <span className="text-foreground font-semibold">"Register Team"</span>. Fill in your squad details and roster. You can view your active entries anytime under the Registrations tab.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2" className="border border-white/10 rounded-2xl px-5 bg-white/5">
            <AccordionTrigger className="text-sm font-bold text-foreground hover:no-underline">
              How does the check-in process work?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              When registration closes and the event transitions to <span className="text-emerald-400 font-semibold">Check-In</span> status (usually 30–60 minutes before matches begin), captains must go to the Registrations tab and click <span className="text-foreground font-semibold">"Check In Team"</span> to lock their roster and confirm tournament readiness.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3" className="border border-white/10 rounded-2xl px-5 bg-white/5">
            <AccordionTrigger className="text-sm font-bold text-foreground hover:no-underline">
              Can organizers host both Online and LAN tournaments?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Yes! ADWA ARENA supports Online, LAN, and Hybrid formats. Organizers can configure LAN station counts, automated elimination brackets (Single, Double, Swiss, Round Robin), and connect real-time live broadcast scoreboards.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4" className="border border-white/10 rounded-2xl px-5 bg-white/5">
            <AccordionTrigger className="text-sm font-bold text-foreground hover:no-underline">
              Are brackets and match updates real-time?
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              Yes. All brackets, match schedules, and stream overlays update in real time. Players receive their next scheduled match details, and spectators can watch live score progressions directly on the platform.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Layout>
  );
};

export default Index;
