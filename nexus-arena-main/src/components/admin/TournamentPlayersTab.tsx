import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Target, 
  Lock, 
  Save, 
  ClipboardCheck, 
  UserPlus, 
  Users as UsersIcon, 
  Trash2, 
  Download,
  Search,
  CheckCheck,
  LockKeyhole,
  X,
  Filter
} from "lucide-react";
import { Tournament, TournamentEntry, TournamentEntryCheckInStatus, api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type AutoSeedStrategy = "REGISTRATION_ORDER" | "RANDOM" | "MANUAL";

export function TournamentPlayersTab({
  tournament,
  entries,
  autoSeedStrategy,
  busyTournamentId,
  registrationOrderByEntryId,
  setAutoSeedStrategy,
  autoAssignSeeds,
  bulkUpdateCheckIn,
  bulkLockRosters,
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
  bulkUpdateCheckIn?: (tournamentId: string, status: TournamentEntryCheckInStatus, entryIds?: string[]) => void;
  bulkLockRosters?: (tournamentId: string, entryIds?: string[]) => void;
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

  const [searchQuery, setSearchQuery] = useState("");
  const [registrationFilter, setRegistrationFilter] = useState("ALL");
  const [checkInFilter, setCheckInFilter] = useState("ALL");

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

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = entry.teamName?.toLowerCase().includes(q);
        const matchEmail = entry.captainEmail?.toLowerCase().includes(q);
        const matchPhone = entry.captainPhone?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      if (registrationFilter !== "ALL") {
        if (entry.registrationStatus !== registrationFilter) return false;
      }

      if (checkInFilter !== "ALL") {
        if (entry.checkInStatus !== checkInFilter) return false;
      }

      return true;
    });
  }, [entries, searchQuery, registrationFilter, checkInFilter]);

  const handleBulkCheckInAll = () => {
    if (!bulkUpdateCheckIn) return;
    const targetIds = filteredEntries.length < entries.length ? filteredEntries.map((e) => e.id) : undefined;
    const count = targetIds ? targetIds.length : entries.length;
    if (confirm(`Check in ${count} participant(s)?`)) {
      bulkUpdateCheckIn(tournament.id, "CHECKED_IN", targetIds);
    }
  };

  const handleBulkLockRostersAll = () => {
    if (!bulkLockRosters) return;
    const targetIds = filteredEntries.length < entries.length ? filteredEntries.map((e) => e.id) : undefined;
    const count = targetIds ? targetIds.length : entries.length;
    if (confirm(`Lock rosters for ${count} participant(s)?`)) {
      bulkLockRosters(tournament.id, targetIds);
    }
  };

  const getRegistrationBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
      case "CONFIRMED":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{status}</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">PENDING</Badge>;
      case "REJECTED":
      case "CANCELLED":
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">{status}</Badge>;
      default:
        return <Badge variant="outline" className="border-white/10">{status}</Badge>;
    }
  };

  const getCheckInBadge = (status: string) => {
    switch (status) {
      case "CHECKED_IN":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Checked In</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Pending</Badge>;
      case "MISSED":
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">Missed</Badge>;
      default:
        return <Badge variant="outline" className="border-white/10 text-muted-foreground">Not Open</Badge>;
    }
  };

  return (
    <div className="space-y-6 outline-none">
      <Card className="glass border-white/10">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Participants</CardTitle>
              <CardDescription>Manage entries, search players, filter status, and complete check-ins.</CardDescription>
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
          {/* Search & Filter Toolbar */}
          <div className="grid gap-3 md:grid-cols-[1.5fr,1fr,1fr,auto] items-center p-3 rounded-xl border border-white/10 bg-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search player, team, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-white/10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div>
              <select
                value={registrationFilter}
                onChange={(e) => setRegistrationFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm"
              >
                <option value="ALL">All Registration Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <select
                value={checkInFilter}
                onChange={(e) => setCheckInFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-white/10 bg-background/50 px-3 py-2 text-sm"
              >
                <option value="ALL">All Check-In Statuses</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="PENDING">Pending Check-In</option>
                <option value="NOT_OPEN">Check-In Not Open</option>
                <option value="MISSED">Check-In Missed</option>
              </select>
            </div>

            {(searchQuery || registrationFilter !== "ALL" || checkInFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setRegistrationFilter("ALL");
                  setCheckInFilter("ALL");
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filters
              </Button>
            )}
          </div>

          {/* Seeding & Bulk Operations Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-white/10 bg-background/40">
            <div className="flex flex-wrap items-center gap-3">
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
                Auto Assign Seeds
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {bulkUpdateCheckIn && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyTournamentId === tournament.id || entries.length === 0}
                  onClick={handleBulkCheckInAll}
                  className="gap-1.5"
                >
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  {filteredEntries.length < entries.length ? `Check In Filtered (${filteredEntries.length})` : "Check In All"}
                </Button>
              )}
              {bulkLockRosters && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyTournamentId === tournament.id || entries.length === 0}
                  onClick={handleBulkLockRostersAll}
                  className="border-white/10 gap-1.5"
                >
                  <LockKeyhole className="w-4 h-4 text-amber-400" />
                  {filteredEntries.length < entries.length ? `Lock Filtered Rosters (${filteredEntries.length})` : "Lock All Rosters"}
                </Button>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <span className="font-semibold text-foreground">{filteredEntries.length}</span> of {entries.length} participants
              {filteredEntries.length < entries.length && " (filtered)"}
            </span>
            <div className="flex items-center gap-3">
              <span>
                <strong className="text-emerald-400">{entries.filter((e) => e.checkInStatus === "CHECKED_IN").length}</strong> Checked In
              </span>
              <span>•</span>
              <span>
                <strong className="text-foreground">{entries.filter((e) => Boolean(e.rosterLockedAt)).length}</strong> Rosters Locked
              </span>
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No teams registered yet.</p>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-white/10 bg-white/5 space-y-2">
              <p className="text-sm font-semibold">No participants match your search or filter.</p>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10"
                onClick={() => {
                  setSearchQuery("");
                  setRegistrationFilter("ALL");
                  setCheckInFilter("ALL");
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-3 rounded-xl border border-white/10 bg-background/30 p-4 md:grid-cols-[1.4fr,130px,140px,auto,auto,auto] md:items-end"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-base">{entry.teamName}</p>
                      {getRegistrationBadge(entry.registrationStatus)}
                      {getCheckInBadge(entry.checkInStatus)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {`Reg Order: ${registrationOrderByEntryId.get(entry.id) ?? "-"} | Roster: ${
                        entry.rosterLockedAt ? "Locked" : "Unlocked"
                      }`}
                      {entry.captainEmail && ` | ${entry.captainEmail}`}
                      {entry.captainPhone && ` | ${entry.captainPhone}`}
                    </p>
                  </div>
                  <div className="space-y-1.5">
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
                      className="bg-white/5 border-white/10 h-10"
                      disabled={busyTournamentId === tournament.id}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Check-In</Label>
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
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="border-white/10 h-10"
                      disabled={busyTournamentId === tournament.id || Boolean(entry.rosterLockedAt) || entry.checkInStatus !== "CHECKED_IN"}
                      onClick={() => lockEntryRoster(tournament.id, entry.id)}
                      title={Boolean(entry.rosterLockedAt) ? "Roster already locked" : "Lock team roster"}
                    >
                      <Lock className="w-4 h-4 mr-1.5" />
                      Lock
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/10 h-10"
                      disabled={busyTournamentId === tournament.id}
                      onClick={() => saveEntrySeed(tournament.id, entry)}
                      title="Save custom seed number"
                    >
                      <Save className="w-4 h-4 mr-1.5" />
                      Save
                    </Button>
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      className="border-white/10 h-10 w-full"
                      disabled={busyTournamentId === tournament.id || entry.checkInStatus === "CHECKED_IN"}
                      onClick={() => updateEntryCheckIn(tournament.id, entry.id, "CHECKED_IN")}
                    >
                      <ClipboardCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
                      Check In
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    disabled={busyTournamentId === tournament.id}
                    onClick={() => deleteEntry(tournament.id, entry.id)}
                    title="Remove entry"
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
