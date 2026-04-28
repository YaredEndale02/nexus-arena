import { useCallback, useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, Team } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Loader2, Shield, UserPlus, Save, Trash2, Search } from "lucide-react";

export default function Teams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{id: string, name: string, email: string|null, riot_id: string|null}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const myTeams = await api.getMyTeams(user.id);
      setTeams(myTeams);
      setTeamNames(
        Object.fromEntries(myTeams.map((team) => [team.id, team.name])),
      );
      if (myTeams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(myTeams[0].id);
      }
    } catch (error) {
      console.error("Failed to load teams", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeamId, user]);

  useEffect(() => {
    const loadTeamsForUser = async () => {
      if (!user) {
        setTeams([]);
        setIsLoading(false);
        return;
      }

      await loadTeams();
    };

    void loadTeamsForUser();
  }, [loadTeams, user]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTeamName) return;
    setIsCreating(true);
    try {
      await api.createTeam({
        name: newTeamName,
        captain: user,
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
        description: (error as any)?.message || "Failed to create team",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const saveTeamName = async (teamId: string) => {
    if (!user) return;
    setBusyTeamId(teamId);
    try {
      const updated = await api.updateTeam(teamId, {
        name: teamNames[teamId],
        requester: user,
      });
      setTeams((current) => current.map((team) => (team.id === teamId ? updated : team)));
      toast({
        title: "Team updated",
        description: "Team details were saved.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: (error as any)?.message || "Failed to update team",
        variant: "destructive",
      });
    } finally {
      setBusyTeamId(null);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await api.searchUsers(searchQuery);
      // Filter out existing members
      const existingIds = new Set(selectedTeam?.members.map(m => m.user.id));
      setSearchResults(results.filter(r => !existingIds.has(r.id)));
    } catch (error: any) {
      toast({ 
        title: "Search failed", 
        description: (error as any)?.message || "Search failed", 
        variant: "destructive" 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMemberBySearch = async (teamId: string, targetUser: {id: string, name: string}) => {
    if (!user) return;
    setBusyTeamId(teamId);
    try {
      const updated = await api.addTeamMember(teamId, {
        memberName: targetUser.name,
        userId: targetUser.id,
        requester: user,
      });
      setTeams((current) => current.map((team) => (team.id === teamId ? updated : team)));
      setSearchResults(current => current.filter(u => u.id !== targetUser.id));
      toast({
        title: "Roster updated",
        description: `${targetUser.name} added to the team.`,
      });
    } catch (error) {
      toast({
        title: "Add member failed",
        description: (error as any)?.message || "Failed to add member",
        variant: "destructive",
      });
    } finally {
      setBusyTeamId(null);
    }
  };

  const removeMember = async (teamId: string, memberUserId: string) => {
    if (!user) return;
    setBusyTeamId(teamId);
    try {
      await api.removeTeamMember(teamId, memberUserId, user);
      await loadTeams();
      toast({
        title: "Roster updated",
        description: "Player removed from the team.",
      });
    } catch (error) {
      toast({
        title: "Remove member failed",
        description: (error as any)?.message || "Failed to remove member",
        variant: "destructive",
      });
    } finally {
      setBusyTeamId(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-10 px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">My Teams</h1>
              <p className="text-muted-foreground">Manage rosters, update team details, and get ready for registrations.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[320px,1fr] gap-8">
          <div className="space-y-6">
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

            <Card className="glass border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Your Squads</CardTitle>
                <CardDescription>Pick a team to edit its roster.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {teams.map((team) => (
                  <Button
                    key={team.id}
                    variant={selectedTeamId === team.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTeamId(team.id)}
                  >
                    {team.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : selectedTeam ? (
              <Card className="glass border-white/10">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl">{selectedTeam.name}</CardTitle>
                  <CardDescription>Captain-controlled roster operations for this team.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-[1fr,auto]">
                    <div className="space-y-2">
                      <Label>Team Name</Label>
                      <Input
                        value={teamNames[selectedTeam.id] ?? selectedTeam.name}
                        onChange={(e) =>
                          setTeamNames((current) => ({
                            ...current,
                            [selectedTeam.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={() => void saveTeamName(selectedTeam.id)} disabled={busyTeamId === selectedTeam.id}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Team
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <h3 className="font-heading text-lg">Roster</h3>
                    </div>
                    <div className="grid gap-3">
                      {selectedTeam.members.map((member) => (
                        <div
                          key={member.user.id}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                        >
                          <div>
                            <p className="font-semibold">{member.user.name}</p>
                            <p className="text-xs text-muted-foreground">{member.user.riotId ?? "No Riot ID linked"}</p>
                          </div>
                          {member.user.id === selectedTeam.captainId ? (
                            <span className="text-xs text-primary">Captain</span>
                          ) : (
                            <Button
                              variant="outline"
                              className="border-red-500/20 text-red-300 hover:bg-red-500/10"
                              onClick={() => void removeMember(selectedTeam.id, member.user.id)}
                              disabled={busyTeamId === selectedTeam.id}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-primary" />
                      <h3 className="font-heading text-lg">Add Member</h3>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search by name, email, or Riot ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white/5 border-white/10"
                      />
                      <Button 
                        variant="outline" 
                        onClick={handleSearchUsers} 
                        disabled={!searchQuery || isSearching}
                        className="border-white/10"
                      >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2 mt-2 p-2 border border-white/10 rounded-xl bg-black/20 animate-in fade-in slide-in-from-top-2">
                        {searchResults.map(res => (
                          <div key={res.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all">
                            <div className="text-sm">
                              <p className="font-semibold">{res.name}</p>
                              <div className="flex flex-col gap-0.5">
                                {res.riot_id && (
                                  <p className="text-[10px] text-primary font-bold">{res.riot_id}</p>
                                )}
                                <p className="text-[10px] text-muted-foreground">{res.email || "No email"}</p>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => void handleAddMemberBySearch(selectedTeam.id, res)} 
                              disabled={busyTeamId === selectedTeam.id}
                              className="hover:bg-primary/20 hover:text-primary"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">No Teams Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Create your first team to start participating in upcoming tournaments.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
