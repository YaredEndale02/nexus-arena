import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function CreateTournamentModal({ user, onSuccess }: { user: any, onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    title: "",
    gameTitle: "",
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
        bracketType: "SINGLE_ELIMINATION",
        tournamentType: "ONLINE",
        rules: "",
        startDate: new Date(Date.now() + 86400000).toISOString(),
        registrationOpenAt: new Date().toISOString(),
        registrationCloseAt: new Date(Date.now() + 86400000).toISOString(),
        maxTeams: 16,
        minPlayersPerTeam: 1,
        maxPlayersPerTeam: 5,
        entryFee: 0,
        prizePool: 0,
        visibility: "PUBLIC",
        waitlistEnabled: false,
      }, user);
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
      <DialogContent className="sm:max-w-[425px] glass border-white/10">
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
              value={form.gameTitle} 
              onChange={e => setForm({...form, gameTitle: e.target.value})} 
              placeholder="e.g. Valorant, League of Legends" 
              className="bg-white/5 border-white/10"
              required 
            />
          </div>
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
