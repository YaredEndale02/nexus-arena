import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Target, Lock, Save, ClipboardCheck, UserPlus, Users as UsersIcon, Trash2, Download } from "lucide-react";
import { Tournament, TournamentEntry, TournamentEntryCheckInStatus, api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  refreshTournamentOps,
  setBusyTournamentId,
  deleteEntry,
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
  refreshTournamentOps: (tournamentId: string) => void;
  setBusyTournamentId: (id: string | null) => void;
  deleteEntry: (tournamentId: string, entryId: string) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleExportCSV = () => {
    if (entries.length === 0) {
      toast({ title: "Nothing to export", description: "No entries found for this tournament.", variant: "destructive" });
      return;
    }

    const headers = ["Team Name", "Seed", "Registration Order", "Registration Status", "Payment Status", "Check-In Status", "Checked In At", "Roster Locked At", "Registered At", "Captain Email", "Captain Phone"];

    const rows = entries.map((entry) => [
      entry.teamName,
      entry.seedNumber ?? "",
      registrationOrderByEntryId.get(entry.id) ?? "",
      entry.registrationStatus,
      entry.paymentStatus,
      entry.checkInStatus,
      entry.checkedInAt ?? "",
      entry.rosterLockedAt ?? "",
      entry.createdAt ?? "",
      entry.captainEmail ?? "",
      entry.captainPhone ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = tournament.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    link.href = url;
    link.download = `${safeTitle}_players.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exported!", description: `${entries.length} entries exported to CSV.` });
  };

  const handleManualAdd = async () => {
    const n = (document.getElementById(`manual-name-${tournament.id}`) as HTMLInputElement).value;
    const e = (document.getElementById(`manual-email-${tournament.id}`) as HTMLInputElement).value;
    const p = (document.getElementById(`manual-phone-${tournament.id}`) as HTMLInputElement).value;
    if (!n || !e || !p) {
      toast({ title: "Error", description: "All fields are mandatory", variant: "destructive" });
      return;
    }
    setBusyTournamentId(tournament.id);
    try {
      await api.adminAddUsers(tournament.id, [{ name: n, email: e, phoneNumber: p }], user!);
      toast({ title: "Success", description: "Player added successfully" });
      (document.getElementById(`manual-name-${tournament.id}`) as HTMLInputElement).value = "";
      (document.getElementById(`manual-email-${tournament.id}`) as HTMLInputElement).value = "";
      (document.getElementById(`manual-phone-${tournament.id}`) as HTMLInputElement).value = "";
      refreshTournamentOps(tournament.id);
    } catch (err: any) {
      toast({ title: "Operation failed", description: err.message, variant: "destructive" });
    }
    setBusyTournamentId(null);
  };

  const handleBulkImport = async () => {
    const val = (document.getElementById(`bulk-input-${tournament.id}`) as HTMLTextAreaElement).value;
    if (!val.trim()) return;
    let list = [];
    try {
      if (val.trim().startsWith("[")) {
        const rawList = JSON.parse(val);
        list = rawList.map((item: any) => ({
          name: item.name || item.fullName || item.playerName || item.Player || item.Name,
          email: item.email || item.emailAddress || item.Email,
          phoneNumber: item.phoneNumber || item.phone || item.mobile || item.Phone || item.PhoneNumber
        })).filter((x: any) => x.name && x.email && x.phoneNumber);
      } else {
        list = val.trim().split("\n").map(line => {
          const parts = line.split(",");
          return {
            name: parts[0]?.trim(),
            email: parts[1]?.trim(),
            phoneNumber: parts[2]?.trim()
          };
        }).filter(x => x.name && x.phoneNumber && x.email);
      }

      if (list.length === 0) throw new Error("No valid data found. Ensure Name, Email, and Phone are present.");

      setBusyTournamentId(tournament.id);
      await api.adminAddUsers(tournament.id, list, user!);
      toast({ title: "Bulk Success", description: `Successfully added ${list.length} players.` });
      (document.getElementById(`bulk-input-${tournament.id}`) as HTMLTextAreaElement).value = "";
      refreshTournamentOps(tournament.id);
    } catch (err: any) {
      toast({ title: "Bulk Error", description: err.message, variant: "destructive" });
    }
    setBusyTournamentId(null);
  };

  return (
    <div className="space-y-6 outline-none">
      <Card className="glass border-white/10">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Participants</CardTitle>
              <CardDescription>Manage entries, check-ins, and seeds.</CardDescription>
            </div>
            <Button
              variant="outline"
              className="border-white/10 shrink-0"
              onClick={handleExportCSV}
              disabled={entries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
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
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    disabled={busyTournamentId === tournament.id}
                    onClick={() => deleteEntry(tournament.id, entry.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 mt-8">
            <div>
              <h3 className="font-heading text-lg">Manual & Bulk Registration</h3>
              <p className="text-sm text-muted-foreground">Add players one-by-one or import via JSON/CSV text.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input id={`manual-name-${tournament.id}`} placeholder="Player Name" className="bg-white/5" />
              <Input id={`manual-email-${tournament.id}`} placeholder="Email" className="bg-white/5" />
              <Input id={`manual-phone-${tournament.id}`} placeholder="Phone Number" className="bg-white/5" />
            </div>
            <Button variant="outline" className="border-white/10" onClick={handleManualAdd}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Player One-by-One
            </Button>

            <div className="pt-4 border-t border-white/10">
              <Label>Bulk Import (JSON Array or CSV: Name,Email,Phone)</Label>
              <textarea
                id={`bulk-input-${tournament.id}`}
                className="w-full h-32 bg-white/5 border border-white/10 rounded-md p-2 mt-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={'[{"name": "John", "email": "john@test.com", "phoneNumber": "12345678"}]\nOR\nJohn,john@test.com,12345678\nJane,jane@test.com,87654321'}
              />
              <Button variant="outline" className="mt-2 border-white/10" onClick={handleBulkImport}>
                <UsersIcon className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
