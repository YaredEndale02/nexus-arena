import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Trophy, Users, DollarSign, Target } from "lucide-react";

export default function AdminTournaments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    gameTitle: "",
    startDate: "",
    maxTeams: 16,
    entryFee: 0,
    prizePool: 0,
    creatorId: user?.id || "",
  });

  useEffect(() => {
    if (user && !formData.creatorId) {
      setFormData(prev => ({ ...prev, creatorId: user.id }));
    }
  }, [user, formData.creatorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createTournament(formData);
      toast({
        title: "Success",
        description: "Tournament created successfully!",
      });
      setFormData({
        title: "",
        gameTitle: "",
        startDate: "",
        maxTeams: 16,
        entryFee: 0,
        prizePool: 0,
        creatorId: user?.id || "",
      });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || (user.role !== "ORGANIZER" && user.role !== "ADMIN")) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-20 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="font-heading text-3xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground italic">
            "Only the champions of organization may forge new arenas."
          </p>
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-left">
            <p className="font-bold mb-1">Requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-xs opacity-70">
              <li>Role: TOURNAMENT_ORGANIZER</li>
              <li>Verification Level: PLATINUM</li>
            </ul>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">Return to Safety</Button>
          <Button variant="link" className="text-primary">Want to become an Organizer?</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-10">
        <div className="mb-8 items-center flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Admin: Create Tournament</h1>
            <p className="text-muted-foreground">Set up a new competitive event for the community.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="font-heading italic">Tournament Details</CardTitle>
              <CardDescription>All fields are required to launch a valid tournament.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Tournament Title</Label>
                <div className="relative">
                  <Input 
                    id="title" 
                    placeholder="e.g. Valorant Pro League Season 1" 
                    className="pl-10 h-12 bg-white/5 border-white/10"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                  <Trophy className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gameTitle">Game Title</Label>
                  <div className="relative">
                    <Input 
                      id="gameTitle" 
                      placeholder="e.g. Valorant" 
                      className="pl-10 h-12 bg-white/5 border-white/10"
                      value={formData.gameTitle}
                      onChange={(e) => setFormData({ ...formData, gameTitle: e.target.value })}
                      required
                    />
                    <Target className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <div className="relative">
                    <Input 
                      id="startDate" 
                      type="date" 
                      className="pl-10 h-12 bg-white/5 border-white/10"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                    <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxTeams">Max Teams</Label>
                  <div className="relative">
                    <Input 
                      id="maxTeams" 
                      type="number" 
                      className="pl-10 h-12 bg-white/5 border-white/10"
                      value={formData.maxTeams}
                      onChange={(e) => setFormData({ ...formData, maxTeams: parseInt(e.target.value) })}
                      required
                    />
                    <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entryFee">Entry Fee ($)</Label>
                  <div className="relative">
                    <Input 
                      id="entryFee" 
                      type="number" 
                      className="pl-10 h-12 bg-white/5 border-white/10"
                      value={formData.entryFee}
                      onChange={(e) => setFormData({ ...formData, entryFee: parseInt(e.target.value) })}
                      required
                    />
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prizePool">Prize Pool ($)</Label>
                  <div className="relative">
                    <Input 
                      id="prizePool" 
                      type="number" 
                      className="pl-10 h-12 bg-white/5 border-white/10"
                      value={formData.prizePool}
                      onChange={(e) => setFormData({ ...formData, prizePool: parseInt(e.target.value) })}
                      required
                    />
                    <Trophy className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-heading tracking-wider bg-gradient-to-r from-primary to-neon-purple hover:neon-glow-blue transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? "INITIATING..." : "PUBLISH TOURNAMENT"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
