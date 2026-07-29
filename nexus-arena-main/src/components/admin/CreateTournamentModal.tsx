import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_GAMES } from "@/lib/games";

export function CreateTournamentModal({ user, onSuccess }: { user: any, onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    title: "",
    gameTitle: "",
    bracketType: "SINGLE_ELIMINATION" as "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN" | "SWISS" | "GROUP_STAGE",
    tournamentType: "ONLINE" as "ONLINE" | "LAN" | "HYBRID",
    maxTeams: 16,
    stationCount: 4,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.gameTitle) return;
    setLoading(true);
    try {
      await api.createTournament({
        title: form.title,
        gameTitle: form.gameTitle,
        format: "TEAM",
        bracketType: form.bracketType,
        tournamentType: form.tournamentType,
        stationCount: ["LAN", "HYBRID"].includes(form.tournamentType) ? form.stationCount : undefined,
        rules: "",
        startDate: new Date(Date.now() + 86400000).toISOString(),
        registrationOpenAt: new Date().toISOString(),
        registrationCloseAt: new Date(Date.now() + 86400000).toISOString(),
        maxTeams: form.maxTeams,
        minPlayersPerTeam: 1,
        maxPlayersPerTeam: 5,
        entryFee: 0,
        prizePool: 0,
        visibility: "PUBLIC",
        waitlistEnabled: false,
        creator: user,
      });
      toast({ title: "Success", description: "Tournament created." });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Create Tournament
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] glass border-white/10">
        <DialogHeader>
          <DialogTitle>Create New Tournament</DialogTitle>
          <DialogDescription>
            Enter the basic details for your new event. You can configure advanced settings later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tournament Title</Label>
            <Input 
              id="title" 
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})} 
              placeholder="e.g. Nexus Arena Winter Cup" 
              className="bg-white/5 border-white/10"
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="game">Game Title</Label>
            <Input 
              id="game" 
              list="default-games"
              value={form.gameTitle} 
              onChange={e => setForm({...form, gameTitle: e.target.value})} 
              placeholder="Select or type game name" 
              className="bg-white/5 border-white/10"
              required 
            />
            <datalist id="default-games">
              {DEFAULT_GAMES.map(game => (
                <option key={game} value={game} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bracket Format</Label>
              <select
                value={form.bracketType}
                onChange={e => setForm({...form, bracketType: e.target.value as any})}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <option value="SINGLE_ELIMINATION">Single Elimination</option>
                <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                <option value="ROUND_ROBIN">Round Robin</option>
                <option value="SWISS">Swiss System</option>
                <option value="GROUP_STAGE">Group Stage + Knockout</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Event Type</Label>
              <select
                value={form.tournamentType}
                onChange={e => setForm({...form, tournamentType: e.target.value as any})}
                className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <option value="ONLINE">Online</option>
                <option value="LAN">LAN Event</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>
          {["LAN", "HYBRID"].includes(form.tournamentType) && (
            <div className="space-y-2">
              <Label>Stations / PC Setups</Label>
              <Input
                type="number"
                value={form.stationCount}
                onChange={e => setForm({...form, stationCount: Number(e.target.value)})}
                placeholder="Number of parallel setups"
                className="bg-white/5 border-white/10"
              />
            </div>
          )}
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" className="border-white/10" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !form.title || !form.gameTitle}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
