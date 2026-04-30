import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, ExternalLink, Share2, Tv2, MessageSquare, Send } from "lucide-react";
import { Tournament } from "@/lib/api";

export function TournamentBroadcastTab({ tournament }: { tournament: Tournament }) {
  const broadcastUrl = `${window.location.origin}/broadcast/${tournament.id}`;
  const bracketUrl = `${window.location.origin}/bracket?tournament=${tournament.id}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("URL copied to clipboard!");
  };

  return (
    <div className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-6 md:grid-cols-2">
        {/* OBS Stream Overlay Card */}
        <Card className="glass border-white/10 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Tv2 className="w-24 h-24 rotate-12" />
          </div>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Radio className="w-4 h-4 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Live Production</span>
            </div>
            <CardTitle>OBS Broadcast Overlay</CardTitle>
            <CardDescription>
              Premium transparent lower-third for streaming. Add this as a "Browser Source" in OBS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black/40 rounded-xl border border-white/10 p-4 font-mono text-xs break-all relative group/url">
              {broadcastUrl}
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute right-2 top-2 h-8 opacity-0 group-hover/url:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(broadcastUrl)}
              >
                Copy
              </Button>
            </div>
            <div className="flex gap-2">
              <Button asChild className="flex-1 gap-2">
                <a href={broadcastUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4" />
                  Preview Overlay
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Public Bracket Card */}
        <Card className="glass border-white/10 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Share2 className="w-24 h-24 -rotate-12" />
          </div>
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest">Audience View</span>
            </div>
            <CardTitle>Public Bracket Link</CardTitle>
            <CardDescription>
              Share this link with your players and audience to follow the live progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black/40 rounded-xl border border-white/10 p-4 font-mono text-xs break-all relative group/url">
              {bracketUrl}
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute right-2 top-2 h-8 opacity-0 group-hover/url:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(bracketUrl)}
              >
                Copy
              </Button>
            </div>
            <Button variant="outline" className="w-full gap-2 border-white/10" asChild>
              <a href={bracketUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4" />
                View Bracket
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Future Expansion Card */}
      <Card className="glass border-white/10 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Social & Automated Broadcasts
          </CardTitle>
          <CardDescription>
            Upcoming features for automated tournament announcements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 opacity-60">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <Send className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="font-bold mb-1 text-sm">Telegram Bot</h4>
              <p className="text-xs text-muted-foreground">Auto-post match results and bracket updates to your channel.</p>
              <div className="mt-4 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-white/10 text-white/40 uppercase">Coming Soon</div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 opacity-60">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-pink-400" />
              </div>
              <h4 className="font-bold mb-1 text-sm">Social Media Ticker</h4>
              <p className="text-xs text-muted-foreground">Generate automated score graphics for Twitter and Instagram.</p>
              <div className="mt-4 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-white/10 text-white/40 uppercase">Planned</div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 opacity-60">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <Tv2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="font-bold mb-1 text-sm">Multi-Scene Support</h4>
              <p className="text-xs text-muted-foreground">Special overlays for "Starting Soon" and "Intermission" scenes.</p>
              <div className="mt-4 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-white/10 text-white/40 uppercase">Planned</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
