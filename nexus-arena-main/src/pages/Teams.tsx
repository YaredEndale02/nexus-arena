import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, Team } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Loader2, Shield } from "lucide-react";

export default function Teams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  const loadTeams = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const myTeams = await api.getMyTeams(user.id);
      setTeams(myTeams);
    } catch (error) {
      console.error("Failed to load teams", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadTeamsForUser = async () => {
      if (!user) {
        setTeams([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const myTeams = await api.getMyTeams(user.id);
        setTeams(myTeams);
      } catch (error) {
        console.error("Failed to load teams", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadTeamsForUser();
  }, [user]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTeamName) return;
    setIsCreating(true);
    try {
      await api.createTeam({
        name: newTeamName,
        captainId: user.id,
      });

      toast({
        title: "Success",
        description: "Team created successfully!",
      });
      setNewTeamName("");
      await loadTeams();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create team",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-10 px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">My Teams</h1>
              <p className="text-muted-foreground">Manage your rosters and represent your squad.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Create Team Form */}
          <div className="md:col-span-1">
            <Card className="glass border-white/10 sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Create New Team</CardTitle>
                <CardDescription>Assemble your squad for the next tournament.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Team Name</Label>
                    <Input 
                      id="teamName" 
                      placeholder="e.g. Neon Vipers" 
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="bg-white/5 border-white/10"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary" disabled={isCreating}>
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Create Team
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Teams List */}
          <div className="md:col-span-2 space-y-4">
            {isLoading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
            ) : teams.length > 0 ? (
              <div className="grid gap-4">
                {teams.map(team => (
                  <Card key={team.id} className="glass border-white/10 hover:border-primary/30 transition-colors">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-neon-purple/20 flex items-center justify-center text-xl font-bold border border-white/10 text-primary">
                          {team.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-heading text-xl font-bold">{team.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" /> {team.members.length} members
                            </span>
                            <span className="text-xs text-primary flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Captain
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" className="border-white/10">Manage Roster</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">No Teams Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">Create your first team to start participating in upcoming tournaments.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
