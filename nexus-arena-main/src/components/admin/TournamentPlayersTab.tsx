import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Target, Lock, Save, ClipboardCheck } from "lucide-react";
import { Tournament, TournamentEntry, TournamentEntryCheckInStatus } from "@/lib/api";

type AutoSeedStrategy = "REGISTRATION_ORDER" | "RANDOM" | "MANUAL";

export function TournamentPlayersTab({
  tournament,
  entries,
  autoSeedStrategy,
  busyTournamentId,
  registrationOrderByEntryId,
  setAutoSeedStrategy,
  autoAssignSeeds,
  updateEntrySeed,
  updateEntryCheckIn,
  lockEntryRoster,
  saveEntrySeed,
}: {
  tournament: Tournament;
  entries: TournamentEntry[];
  autoSeedStrategy: AutoSeedStrategy;
  busyTournamentId: string | null;
  registrationOrderByEntryId: Map<string, number>;
  setAutoSeedStrategy: (strategy: AutoSeedStrategy) => void;
  autoAssignSeeds: (id: string) => void;
  updateEntrySeed: (entryId: string, seed: number | null) => void;
  updateEntryCheckIn: (tournamentId: string, entryId: string, status: TournamentEntryCheckInStatus) => void;
  lockEntryRoster: (tournamentId: string, entryId: string) => void;
  saveEntrySeed: (tournamentId: string, entry: TournamentEntry) => void;
}) {
  return (
    <div className="space-y-6 outline-none">
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription>Manage entries, check-ins, and seeds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-heading text-lg">Entries, Check-In & Roster Lock</h3>
            <p className="text-sm text-muted-foreground">Assign bracket seeds, complete check-in, and lock rosters before generating matches.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={autoSeedStrategy}
              onChange={(e) => setAutoSeedStrategy(e.target.value as AutoSeedStrategy)}
              className="flex h-10 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              <option value="REGISTRATION_ORDER">Registration Order</option>
            </select>
            <Button
              variant="outline"
              className="border-white/10"
              disabled={busyTournamentId === tournament.id || entries.length < 2}
              onClick={() => autoAssignSeeds(tournament.id)}
            >
              <Target className="w-4 h-4 mr-2" />
              Auto Assign
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              Uses the selected strategy to seed eligible entries before bracket generation.
            </p>
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams registered yet.</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="grid gap-3 rounded-xl border border-white/10 bg-background/30 p-4 md:grid-cols-[1.2fr,140px,1fr,1fr,auto,auto] md:items-end">
                  <div>
                    <p className="font-semibold">{entry.teamName}</p>
                    <p className="text-xs text-muted-foreground">
                      {`Reg Order: ${registrationOrderByEntryId.get(entry.id) ?? "-"} | Check-In: ${entry.checkInStatus} | Roster: ${entry.rosterLockedAt ? "Locked" : "Unlocked"}`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Seed</Label>
                    <Input
                      type="number"
                      min={1}
                      max={tournament.maxTeams}
                      value={entry.seedNumber ?? ""}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        updateEntrySeed(entry.id, rawValue === "" ? null : Number(rawValue));
                      }}
                      className="bg-white/5 border-white/10"
                      disabled={busyTournamentId === tournament.id}
                    />
                  </div>
                  <select
                    value={entry.checkInStatus}
                    onChange={(e) => updateEntryCheckIn(tournament.id, entry.id, e.target.value as TournamentEntryCheckInStatus)}
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    disabled={busyTournamentId === tournament.id}
                  >
                    <option value="NOT_OPEN">Not Open</option>
                    <option value="PENDING">Pending</option>
                    <option value="CHECKED_IN">Checked In</option>
                    <option value="MISSED">Missed</option>
                  </select>
                  <Button
                    variant="outline"
                    className="border-white/10"
                    disabled={busyTournamentId === tournament.id || Boolean(entry.rosterLockedAt) || entry.checkInStatus !== "CHECKED_IN"}
                    onClick={() => lockEntryRoster(tournament.id, entry.id)}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Lock Roster
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/10"
                    disabled={busyTournamentId === tournament.id}
                    onClick={() => saveEntrySeed(tournament.id, entry)}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Seed
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/10"
                    disabled={busyTournamentId === tournament.id}
                    onClick={() => updateEntryCheckIn(tournament.id, entry.id, "CHECKED_IN")}
                  >
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Quick Check-In
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
