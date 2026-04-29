import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Save, Trash2, Edit } from "lucide-react";
import { Tournament } from "@/lib/api";
import { TournamentValidationInput } from "@/lib/tournamentLifecycle";
import { DEFAULT_GAMES } from "@/lib/games";

export function TournamentSettingsTab({
  tournament,
  isEditing,
  editingForm,
  busyTournamentId,
  setEditingForm,
  saveTournamentEdits,
  setEditingTournamentId,
  deleteTournament,
}: {
  tournament: Tournament;
  isEditing: boolean;
  editingForm: TournamentValidationInput & Partial<Tournament>;
  busyTournamentId: string | null;
  setEditingForm: React.Dispatch<React.SetStateAction<any>>;
  saveTournamentEdits: (id: string) => void;
  setEditingTournamentId: (id: string | null) => void;
  deleteTournament: (id: string) => void;
}) {
  return (
    <div className="space-y-6 outline-none">
      <Card className="glass border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tournament Settings</CardTitle>
            <CardDescription>Update tournament details and rules.</CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" className="border-white/10" onClick={() => setEditingTournamentId(tournament.id)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Settings
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={editingForm.title || ""} onChange={(e) => setEditingForm((current: any) => ({ ...current, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Game</Label>
                <Input 
                  list="default-games-settings"
                  value={editingForm.gameTitle || ""} 
                  onChange={(e) => setEditingForm((current: any) => ({ ...current, gameTitle: e.target.value }))} 
                />
                <datalist id="default-games-settings">
                  {DEFAULT_GAMES.map(game => (
                    <option key={game} value={game} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <select
                  value={editingForm.format}
                  onChange={(e) => setEditingForm((current: any) => ({ ...current, format: e.target.value as Tournament["format"] }))}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <option value="TEAM">Team</option>
                  <option value="SOLO">Solo</option>
                  <option value="DUO">Duo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Bracket Type</Label>
                <select
                  value={editingForm.bracketType}
                  onChange={(e) => setEditingForm((current: any) => ({ ...current, bracketType: e.target.value as any }))}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <option value="SINGLE_ELIMINATION">Single Elimination</option>
                  <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Tournament Type</Label>
                <select
                  value={editingForm.tournamentType}
                  onChange={(e) => setEditingForm((current: any) => ({ ...current, tournamentType: e.target.value as Tournament["tournamentType"] }))}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <option value="ONLINE">Online</option>
                  <option value="LAN">LAN</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="datetime-local" value={editingForm.startDate} onChange={(e) => setEditingForm((current: any) => ({ ...current, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Registration Opens</Label>
                <Input type="datetime-local" value={editingForm.registrationOpenAt || ""} onChange={(e) => setEditingForm((current: any) => ({ ...current, registrationOpenAt: e.target.value || null }))} />
              </div>
              <div className="space-y-2">
                <Label>Registration Closes</Label>
                <Input type="datetime-local" value={editingForm.registrationCloseAt || ""} onChange={(e) => setEditingForm((current: any) => ({ ...current, registrationCloseAt: e.target.value || null }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Teams</Label>
                <Input type="number" value={editingForm.maxTeams} onChange={(e) => setEditingForm((current: any) => ({ ...current, maxTeams: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Min Players Per Team</Label>
                <Input type="number" value={editingForm.minPlayersPerTeam} onChange={(e) => setEditingForm((current: any) => ({ ...current, minPlayersPerTeam: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Max Players Per Team</Label>
                <Input type="number" value={editingForm.maxPlayersPerTeam || ""} onChange={(e) => setEditingForm((current: any) => ({ ...current, maxPlayersPerTeam: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-2">
                <Label>Entry Fee</Label>
                <Input type="number" value={editingForm.entryFee} onChange={(e) => setEditingForm((current: any) => ({ ...current, entryFee: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Prize Pool</Label>
                <Input type="number" value={editingForm.prizePool} onChange={(e) => setEditingForm((current: any) => ({ ...current, prizePool: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <select
                  value={editingForm.visibility}
                  onChange={(e) => setEditingForm((current: any) => ({ ...current, visibility: e.target.value as Tournament["visibility"] }))}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="UNLISTED">Unlisted</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Waitlist</Label>
                <select
                  value={editingForm.waitlistEnabled ? "enabled" : "disabled"}
                  onChange={(e) => setEditingForm((current: any) => ({ ...current, waitlistEnabled: e.target.value === "enabled" }))}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                >
                  <option value="disabled">Disabled</option>
                  <option value="enabled">Enabled</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Rules</Label>
                <textarea
                  value={editingForm.rules || ""}
                  onChange={(e) => setEditingForm((current: any) => ({ ...current, rules: e.target.value }))}
                  className="min-h-24 w-full rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm"
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button onClick={() => saveTournamentEdits(tournament.id)} disabled={busyTournamentId === tournament.id}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" className="border-white/10" onClick={() => setEditingTournamentId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
              Click 'Edit Settings' to modify tournament configuration.
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-white/5 pt-4">
          <Button variant="outline" className="border-red-500/20 text-red-300 hover:bg-red-500/10 ml-auto" onClick={() => deleteTournament(tournament.id)}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete Tournament
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
