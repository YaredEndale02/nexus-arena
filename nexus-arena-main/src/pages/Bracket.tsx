import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { X, Clock, Swords, Loader2 } from "lucide-react";
import { api, type MatchReport, type Tournament } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type BracketNode = {
  id: string;
  round: number;
  position: number;
  roundLabel: string;
  team1: { name: string; score: number } | null;
  team2: { name: string; score: number } | null;
  winner: string | null;
  status: "Upcoming" | "Live" | "Completed";
  scheduledTime: string;
};

function mapMatchToNode(match: MatchReport): BracketNode {
  const status =
    match.status === "COMPLETED"
      ? "Completed"
      : match.status === "IN_PROGRESS" || match.status === "LIVE"
        ? "Live"
        : "Upcoming";

  return {
    id: match.id,
    round: match.roundNumber ?? 1,
    position: match.positionInRound ?? 1,
    roundLabel: match.roundLabel,
    team1: match.team1Name && match.team1Name !== "TBD" && match.team1Name !== "BYE"
      ? { name: match.team1Name, score: match.team1Score }
      : null,
    team2: match.team2Name && match.team2Name !== "TBD" && match.team2Name !== "BYE"
      ? { name: match.team2Name, score: match.team2Score }
      : null,
    winner: match.winnerName ?? null,
    status,
    scheduledTime: match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : "TBD",
  };
}

function MatchNode({ match, isFinal, onClick }: { match: BracketNode; isFinal?: boolean; onClick: () => void }) {
  const isLive = match.status === "Live";
  const isCompleted = match.status === "Completed";

  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-card p-3 w-56 cursor-pointer hover:border-primary/40 transition-all",
        isLive && "border-red-500/40 neon-glow-blue",
        isFinal && match.winner && "animate-golden-pulse border-gold/50",
        isFinal && "w-64",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            isLive ? "text-red-400" : isCompleted ? "text-muted-foreground" : "text-neon-purple",
          )}
        >
          {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1" />}
          {match.status}
        </span>
      </div>

      {[match.team1, match.team2].map((team, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between py-1.5 px-2 rounded-md mb-1 transition-colors",
            team && match.winner === team.name && "bg-primary/10",
            !team && "opacity-40",
          )}
        >
          <span
            className={cn(
              "text-sm font-medium truncate max-w-[150px]",
              team && match.winner === team.name ? "text-primary font-bold" : "text-foreground",
            )}
          >
            {team?.name || "TBD"}
          </span>
          <span
            className={cn(
              "text-sm font-heading font-bold min-w-[16px] text-center",
              team && match.winner === team.name ? "text-primary" : "text-muted-foreground",
            )}
          >
            {team?.score ?? "-"}
          </span>
        </div>
      ))}

      <div className="mt-2 text-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{match.roundLabel}</span>
      </div>
    </div>
  );
}

function MatchDetailPanel({ match, onClose }: { match: BracketNode; onClose: () => void }) {
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
          <p className="font-heading font-bold text-foreground mt-1">{match.team1?.name || "TBD"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-heading text-3xl font-bold text-foreground">{match.team1?.score ?? 0}</span>
          <span className="text-muted-foreground text-xl">-</span>
          <span className="font-heading text-3xl font-bold text-foreground">{match.team2?.score ?? 0}</span>
        </div>
        <div className="text-center">
          <p className="font-heading font-bold text-foreground mt-1">{match.team2?.name || "TBD"}</p>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" /> Scheduled: {match.scheduledTime}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Swords className="w-4 h-4" /> Status:{" "}
          <span className={cn(match.status === "Live" ? "text-red-400" : "text-foreground")}>{match.status}</span>
        </div>
      </div>
    </div>
  );
}

export default function Bracket() {
  const { toast } = useToast();
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<BracketNode[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<BracketNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const tournamentData = await api.getTournaments();
        setTournaments(tournamentData);
        const initialTournamentId = selectedTournamentId || tournamentData.find((item) => (item._count?.matches ?? 0) > 0)?.id || tournamentData[0]?.id || "";
        setSelectedTournamentId(initialTournamentId);

        if (initialTournamentId) {
          const matchData = await api.getTournamentMatches(initialTournamentId);
          setMatches(matchData.map(mapMatchToNode));
        } else {
          setMatches([]);
        }
      } catch (error) {
        toast({
          title: "Bracket unavailable",
          description: error instanceof Error ? error.message : "Failed to load bracket data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [selectedTournamentId, toast]);

  const selectedTournament = useMemo(
    () => tournaments.find((tournament) => tournament.id === selectedTournamentId) ?? null,
    [selectedTournamentId, tournaments],
  );

  const rounds = useMemo(() => {
    const grouped = new Map<number, BracketNode[]>();
    matches.forEach((match) => {
      const roundMatches = grouped.get(match.round) ?? [];
      roundMatches.push(match);
      grouped.set(match.round, roundMatches);
    });
    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, roundMatches]) => ({
        round,
        label: roundMatches[0]?.roundLabel ?? `Round ${round}`,
        matches: roundMatches.sort((a, b) => a.position - b.position),
      }));
  }, [matches]);

  return (
    <Layout>
      <div className="mb-6 animate-fade-in">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Live <span className="text-primary">Bracket</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          {selectedTournament ? `${selectedTournament.title} - ${selectedTournament.gameTitle}` : "Follow active tournament brackets in real time"}
        </p>
      </div>

      <div className="mb-6 max-w-sm">
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Tournament</label>
        <select
          value={selectedTournamentId}
          onChange={(e) => setSelectedTournamentId(e.target.value)}
          className="flex h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
        >
          <option value="">Select a tournament</option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="font-heading italic animate-pulse">Building the bracket view...</p>
            </div>
          ) : rounds.length === 0 ? (
            <div className="glass p-6 rounded-xl text-center text-muted-foreground">
              No generated bracket yet. Create registrations, then generate the bracket from Tournament Control.
            </div>
          ) : (
            <div className="flex items-start gap-8 min-w-[900px]">
              {rounds.map((roundGroup, roundIndex) => (
                <div
                  key={roundGroup.round}
                  className="flex flex-col gap-6"
                  style={{ marginTop: `${roundIndex * 48}px` }}
                >
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{roundGroup.label}</span>
                  {roundGroup.matches.map((match, index) => (
                    <div key={match.id} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                      <MatchNode
                        match={match}
                        isFinal={roundIndex === rounds.length - 1}
                        onClick={() => setSelectedMatch(match)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

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
