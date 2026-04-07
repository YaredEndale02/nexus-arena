import { Layout } from "@/components/Layout";
import { bracketMatches, BracketMatch } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { X, Clock, MapPin, Swords } from "lucide-react";

function MatchNode({ match, isGrandFinal, onClick }: { match: BracketMatch; isGrandFinal?: boolean; onClick: () => void }) {
  const isLive = match.status === "Live";
  const isCompleted = match.status === "Completed";

  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-card p-3 w-56 cursor-pointer hover:border-primary/40 transition-all",
        isLive && "border-red-500/40 neon-glow-blue",
        isGrandFinal && match.winner && "animate-golden-pulse border-gold/50",
        isGrandFinal && "w-64"
      )}
    >
      {/* Status */}
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          isLive ? "text-red-400" : isCompleted ? "text-muted-foreground" : "text-neon-purple"
        )}>
          {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1" />}
          {match.status}
        </span>
        <span className="text-[10px] text-muted-foreground">{match.scheduledTime}</span>
      </div>

      {/* Teams */}
      {[match.team1, match.team2].map((team, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between py-1.5 px-2 rounded-md mb-1 transition-colors",
            team && match.winner === team.name && "bg-primary/10",
            !team && "opacity-40"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{team?.logo || "❓"}</span>
            <span className={cn(
              "text-sm font-medium truncate max-w-[120px]",
              team && match.winner === team.name ? "text-primary font-bold" : "text-foreground"
            )}>
              {team?.name || "TBD"}
            </span>
          </div>
          <span className={cn(
            "text-sm font-heading font-bold min-w-[16px] text-center",
            team && match.winner === team.name ? "text-primary" : "text-muted-foreground"
          )}>
            {team?.score ?? "-"}
          </span>
        </div>
      ))}

      {isGrandFinal && (
        <div className="mt-2 text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Grand Finals</span>
        </div>
      )}
    </div>
  );
}

function MatchDetailPanel({ match, onClose }: { match: BracketMatch; onClose: () => void }) {
  return (
    <div className="glass p-6 rounded-xl animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">Match Details</h3>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-6 mb-6">
        <div className="text-center">
          <span className="text-3xl">{match.team1?.logo || "❓"}</span>
          <p className="font-heading font-bold text-foreground mt-1">{match.team1?.name || "TBD"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-heading text-3xl font-bold text-foreground">{match.team1?.score ?? 0}</span>
          <span className="text-muted-foreground text-xl">-</span>
          <span className="font-heading text-3xl font-bold text-foreground">{match.team2?.score ?? 0}</span>
        </div>
        <div className="text-center">
          <span className="text-3xl">{match.team2?.logo || "❓"}</span>
          <p className="font-heading font-bold text-foreground mt-1">{match.team2?.name || "TBD"}</p>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" /> Scheduled: {match.scheduledTime}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Swords className="w-4 h-4" /> Status: <span className={cn(match.status === "Live" ? "text-red-400" : "text-foreground")}>{match.status}</span>
        </div>
        {match.maps && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" /> Maps: {match.maps.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Bracket() {
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);

  const winnersR1 = bracketMatches.filter(m => m.round === 1 && m.position <= 4);
  const winnersSemi = bracketMatches.filter(m => m.round === 2 && m.position <= 2);
  const winnersFinal = bracketMatches.filter(m => m.round === 3);
  const losersR1 = bracketMatches.filter(m => m.round === 1 && m.position > 4);
  const losersR2 = bracketMatches.filter(m => m.round === 2 && m.position > 2);
  const grandFinals = bracketMatches.filter(m => m.round === 4);

  return (
    <Layout>
      <div className="mb-6 animate-fade-in">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Live <span className="text-primary">Bracket</span>
        </h1>
        <p className="text-muted-foreground mt-1">Valorant Champions Series — Double Elimination</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Bracket visualization */}
        <div className="flex-1 overflow-x-auto">
          {/* Winners Bracket */}
          <div className="mb-8">
            <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-primary mb-4">Winners Bracket</h2>
            <div className="flex items-start gap-8 min-w-[900px]">
              {/* Round 1 */}
              <div className="flex flex-col gap-6">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Round 1</span>
                {winnersR1.map((m, i) => (
                  <div key={m.id} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                    <MatchNode match={m} onClick={() => setSelectedMatch(m)} />
                  </div>
                ))}
              </div>

              {/* Semi */}
              <div className="flex flex-col gap-6 mt-16">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Semifinals</span>
                {winnersSemi.map((m, i) => (
                  <div key={m.id} className="animate-fade-in" style={{ animationDelay: `${(i + 4) * 100}ms` }}>
                    <MatchNode match={m} onClick={() => setSelectedMatch(m)} />
                  </div>
                ))}
              </div>

              {/* Winners Final */}
              <div className="flex flex-col gap-6 mt-32">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Winners Final</span>
                {winnersFinal.map(m => (
                  <div key={m.id} className="animate-fade-in" style={{ animationDelay: "600ms" }}>
                    <MatchNode match={m} onClick={() => setSelectedMatch(m)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Losers Bracket */}
          <div className="mb-8">
            <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-red-400 mb-4">Losers Bracket</h2>
            <div className="flex items-start gap-8 min-w-[700px]">
              <div className="flex flex-col gap-6">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Round 1</span>
                {losersR1.map((m, i) => (
                  <div key={m.id} className="animate-fade-in" style={{ animationDelay: `${(i + 7) * 100}ms` }}>
                    <MatchNode match={m} onClick={() => setSelectedMatch(m)} />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-6 mt-10">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Round 2</span>
                {losersR2.map(m => (
                  <div key={m.id} className="animate-fade-in" style={{ animationDelay: "900ms" }}>
                    <MatchNode match={m} onClick={() => setSelectedMatch(m)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grand Finals */}
          <div>
            <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-gold mb-4">Grand Finals</h2>
            {grandFinals.map(m => (
              <div key={m.id} className="animate-fade-in" style={{ animationDelay: "1000ms" }}>
                <MatchNode match={m} isGrandFinal onClick={() => setSelectedMatch(m)} />
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="xl:w-80 shrink-0">
          {selectedMatch ? (
            <MatchDetailPanel match={selectedMatch} onClose={() => setSelectedMatch(null)} />
          ) : (
            <div className="glass p-6 rounded-xl text-center">
              <Swords className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Click a match to view details</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
