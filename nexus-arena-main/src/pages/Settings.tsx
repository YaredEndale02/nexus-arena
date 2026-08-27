import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Send, Bell, Shield, User, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [riotId, setRiotId] = useState(user?.riotId || "");
  const [telegramId, setTelegramId] = useState(user?.telegramChatId || "");

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await updateProfile({
        name,
        phoneNumber,
        riotId,
        telegramChatId: telegramId,
      });
      toast({
        title: "Profile updated",
        description: "Your gamer profile and contact details have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile settings",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTestNotification = async () => {
    if (!telegramId) return;
    try {
      await api.sendTelegramNotification(
        telegramId,
        `<b>ADWA ARENA Integration Test</b>\n\nHello ${user?.name}! Your Telegram is now successfully linked to ADWA ARENA. 🚀`
      );
      toast({
        title: "Test sent!",
        description: "Check your Telegram app for the message.",
      });
    } catch (err) {
      toast({
        title: "Test failed",
        description: "Make sure you have messaged the bot first.",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-10 px-6">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Settings & Gamer Profile</h1>
          <p className="text-muted-foreground">Manage your phone number, game tags, and alert preferences.</p>
        </div>

        <div className="grid gap-6">
          {/* Gamer Profile Card */}
          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Gamer Identity & Contact Profile
              </CardTitle>
              <CardDescription>
                Update your display name, phone number, and game tags used for tournament registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prof-name">Display Name / Gamer Tag</Label>
                  <Input
                    id="prof-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prof-phone">Primary Phone Number</Label>
                  <Input
                    id="prof-phone"
                    placeholder="e.g. 0911223344"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prof-riot">Riot ID / In-Game Handle</Label>
                  <Input
                    id="prof-riot"
                    placeholder="e.g. Player#1234"
                    value={riotId}
                    onChange={(e) => setRiotId(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prof-role">Account Role</Label>
                  <Input
                    id="prof-role"
                    value={user?.role ?? "PLAYER"}
                    disabled
                    className="bg-white/5 border-white/10 text-muted-foreground uppercase"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={isUpdating}
                className="w-full font-bold bg-primary text-primary-foreground mt-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Profile Changes
              </Button>
            </CardContent>
          </Card>
          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Telegram Notifications
              </CardTitle>
              <CardDescription>
                Get real-time updates for matches, brackets, and team invites.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</div>
                  <div className="text-sm">
                    <p className="font-bold">Message our Bot</p>
                    <p className="text-muted-foreground">Search for our bot on Telegram or click the link below to start a chat.</p>
                    <Button variant="link" className="text-primary p-0 h-auto mt-1" asChild>
                      <a href="https://t.me/ArenaEsportBot" target="_blank" rel="noreferrer">
                        Open Bot in Telegram <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">2</div>
                  <div className="text-sm">
                    <p className="font-bold">Get your Chat ID</p>
                    <p className="text-muted-foreground">Type <code className="bg-white/10 px-1 rounded">/start</code> or <code className="bg-white/10 px-1 rounded">/myid</code> to get your unique Chat ID.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chatId">Your Telegram Chat ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="chatId"
                      placeholder="e.g. 123456789"
                      value={telegramId}
                      onChange={(e) => setTelegramId(e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                    <Button onClick={handleSaveProfile} disabled={isUpdating}>
                      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </div>

                {user?.telegramChatId && (
                  <Button variant="outline" className="w-full border-primary/20 bg-primary/5" onClick={handleTestNotification}>
                    <Bell className="w-4 h-4 mr-2" />
                    Send Test Notification
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences Matrix */}
          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notification Channels & Alert Types
              </CardTitle>
              <CardDescription>
                Customize which live updates trigger instant push and Telegram notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  {
                    id: "match-calls",
                    label: "Match Calls & Station Assignments",
                    desc: "Receive instant alerts when your match is called and assigned to a LAN station or server lobby.",
                    enabled: true,
                  },
                  {
                    id: "check-in",
                    label: "Check-In & Registration Open Reminders",
                    desc: "Get notified as soon as tournament check-in opens so your team doesn't lose its spot.",
                    enabled: true,
                  },
                  {
                    id: "announcements",
                    label: "Tournament Announcements & Results",
                    desc: "Recieve stage advancement updates, winner callouts, and broadcast stream links.",
                    enabled: true,
                  },
                  {
                    id: "disputes",
                    label: "Referee Score Conflict Alerts (Organizers Only)",
                    desc: "Receive instant alerts when opposing teams submit conflicting match scores.",
                    enabled: user?.role === "ADMIN" || user?.role === "ORGANIZER",
                  },
                ].map((pref) => (
                  <div
                    key={pref.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-white/5"
                  >
                    <div className="space-y-0.5 max-w-lg">
                      <p className="text-sm font-bold text-foreground">{pref.label}</p>
                      <p className="text-xs text-muted-foreground">{pref.desc}</p>
                    </div>

                    <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/10 opacity-50 pointer-events-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Account Security
              </CardTitle>
              <CardDescription>Update your password and security settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Security settings are managed by your identity provider.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
