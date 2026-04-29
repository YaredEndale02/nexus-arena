import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Send, Bell, Shield, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [telegramId, setTelegramId] = useState(user?.telegramChatId || "");

  const handleUpdateTelegram = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await api.updateUserProfile(user.id, {
        telegram_chat_id: telegramId,
      });
      toast({
        title: "Settings updated",
        description: "Your Telegram ID has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update settings",
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
        `<b>ArenaX Integration Test</b>\n\nHello ${user?.name}! Your Telegram is now successfully linked to ArenaX. 🚀`
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
          <h1 className="font-heading text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and notification preferences.</p>
        </div>

        <div className="grid gap-6">
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
                    <Button onClick={handleUpdateTelegram} disabled={isUpdating}>
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
