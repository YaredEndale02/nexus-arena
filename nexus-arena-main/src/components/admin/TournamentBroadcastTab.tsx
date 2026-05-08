import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, ExternalLink, Share2, Tv2, Clock, Coffee, Check, Copy, Clapperboard, BarChart2 } from "lucide-react";
import { Tournament } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SceneCard {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  glowColor: string;
  hint: string;
  sceneParam?: string;
}

const scenes: SceneCard[] = [
  {
    id: "live",
    label: "Live Scorebar",
    description: "Transparent lower-third overlay showing live match scores and a scrolling results ticker. Add as a Browser Source in OBS.",
    icon: Radio,
    color: "text-red-400",
    glowColor: "bg-red-500/10 border-red-500/20",
    hint: "No ?scene= parameter needed — this is the default view.",
  },
  {
    id: "starting",
    label: "Starting Soon",
    description: "Full-screen countdown scene shown before the tournament begins. Displays a live timer counting down to your scheduled start date.",
    icon: Clock,
    color: "text-primary",
    glowColor: "bg-primary/10 border-primary/20",
    hint: "Uses the tournament's Start Date as the countdown target.",
    sceneParam: "starting",
  },
  {
    id: "intermission",
    label: "Intermission / BRB",
    description: "Full-screen 'Be Right Back' scene with an Up Next match preview. Show this during breaks between matches.",
    icon: Coffee,
    color: "text-amber-400",
    glowColor: "bg-amber-500/10 border-amber-500/20",
    hint: "Automatically detects the next scheduled match from the database.",
    sceneParam: "intermission",
  },
  {
    id: "table",
    label: "Group Stage Table",
    description: "Full-screen live standings table showing P / W / D / L / GD / GF / PTS for all teams. Auto-updates from Supabase as matches complete.",
    icon: BarChart2,
    color: "text-emerald-400",
    glowColor: "bg-emerald-500/10 border-emerald-500/20",
    hint: "Standings are computed from all COMPLETED matches. Shows leader badge for the top team.",
    sceneParam: "table",
  },
];

export function TournamentBroadcastTab({ tournament }: { tournament: Tournament }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("d2ff0d");
  const [bgColor, setBgColor] = useState("050505");
  
  const origin = window.location.origin;
  const bracketUrl = `${origin}/bracket?tournament=${tournament.id}`;

  const getSceneUrl = (sceneParam?: string) => {
    const params = new URLSearchParams();
    if (sceneParam) params.append("scene", sceneParam);
    if (primaryColor !== "d2ff0d") params.append("primary", primaryColor);
    if (bgColor !== "050505") params.append("bg", bgColor);
    const queryString = params.toString();
    return `${origin}/broadcast/${tournament.id}${queryString ? `?${queryString}` : ""}`;
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Clapperboard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-lg text-foreground">Broadcast Scene Control</h2>
          <p className="text-xs text-muted-foreground">Copy each URL into OBS as a separate Browser Source (1920×1080).</p>
        </div>
      </div>

      {/* Theme Customization */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
        <h3 className="font-heading font-bold text-sm text-foreground mb-3 flex items-center gap-2">
          🎨 Theme Customization
        </h3>
        <p className="text-xs text-white/50 mb-4">Customize the FC Esports overlay colors to match your brand. URLs below will update automatically.</p>
        
        <div className="flex flex-wrap gap-4 items-center">
          {/* Preset Themes */}
          <div className="flex gap-2 mr-4 border-r border-white/10 pr-4">
            <button onClick={() => { setPrimaryColor("d2ff0d"); setBgColor("050505"); }} className={cn("w-8 h-8 rounded-full border-2 transition-all", primaryColor === "d2ff0d" ? "border-white scale-110" : "border-transparent opacity-50")} style={{ background: "linear-gradient(135deg, #d2ff0d 50%, #050505 50%)" }} title="Volt Green (FC Default)" />
            <button onClick={() => { setPrimaryColor("ff0055"); setBgColor("0a0510"); }} className={cn("w-8 h-8 rounded-full border-2 transition-all", primaryColor === "ff0055" ? "border-white scale-110" : "border-transparent opacity-50")} style={{ background: "linear-gradient(135deg, #ff0055 50%, #0a0510 50%)" }} title="Neon Pink" />
            <button onClick={() => { setPrimaryColor("00e5ff"); setBgColor("000a14"); }} className={cn("w-8 h-8 rounded-full border-2 transition-all", primaryColor === "00e5ff" ? "border-white scale-110" : "border-transparent opacity-50")} style={{ background: "linear-gradient(135deg, #00e5ff 50%, #000a14 50%)" }} title="Cyber Blue" />
            <button onClick={() => { setPrimaryColor("ffffff"); setBgColor("111111"); }} className={cn("w-8 h-8 rounded-full border-2 transition-all", primaryColor === "ffffff" ? "border-white scale-110" : "border-transparent opacity-50")} style={{ background: "linear-gradient(135deg, #ffffff 50%, #111111 50%)" }} title="Monochrome" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/40">Primary (Hex)</label>
            <div className="flex items-center bg-black/50 border border-white/10 rounded px-2">
              <span className="text-white/40 text-xs">#</span>
              <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value.replace('#', ''))} className="w-16 bg-transparent text-xs text-white p-1 outline-none font-mono" maxLength={6} />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/40">Background (Hex)</label>
            <div className="flex items-center bg-black/50 border border-white/10 rounded px-2">
              <span className="text-white/40 text-xs">#</span>
              <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value.replace('#', ''))} className="w-16 bg-transparent text-xs text-white p-1 outline-none font-mono" maxLength={6} />
            </div>
          </div>
        </div>
      </div>

      {/* Scene URL Cards */}
      <div className="space-y-4">
        {scenes.map((scene) => {
          const url = getSceneUrl(scene.sceneParam);
          const copyKey = `scene-${scene.id}`;
          const isCopied = copied === copyKey;

          return (
            <div
              key={scene.id}
              className={cn(
                "rounded-2xl border p-5 transition-all duration-300 hover:border-white/20",
                scene.glowColor
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-xl bg-black/30 flex items-center justify-center shrink-0", scene.color)}>
                    <scene.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-sm text-foreground">{scene.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{scene.description}</p>
                  </div>
                </div>
              </div>

              {/* URL row */}
              <div className="bg-black/40 rounded-xl border border-white/10 px-4 py-3 font-mono text-xs text-white/60 break-all mb-3 select-all">
                {url}
              </div>

              {/* Hint */}
              <p className="text-[10px] text-white/30 italic mb-3">{scene.hint}</p>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-white/10 text-xs"
                  onClick={() => copyToClipboard(url, copyKey)}
                >
                  {isCopied ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy URL</>
                  )}
                </Button>
                <Button size="sm" className="gap-2 text-xs" asChild>
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Preview
                  </a>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* OBS Setup Guide */}
      <Card className="glass border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Tv2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">OBS Setup Guide</span>
          </div>
          <CardTitle className="text-base">How to Add to OBS</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-none">
            {[
              "In OBS, create a new Scene for each overlay (e.g. \"Live Scorebar\", \"Starting Soon\").",
              "Inside each scene, click the + button under Sources and choose Browser.",
              "Paste the corresponding URL from above. Set Width: 1920, Height: 1080.",
              "Check \"Shutdown source when not visible\" to save performance.",
              "Switch between scenes in OBS to control what your audience sees.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Bracket + Social links */}
      <Card className="glass border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <Share2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Audience Links</span>
          </div>
          <CardTitle className="text-base">Public Bracket</CardTitle>
          <CardDescription>Share this with players and viewers to follow the live progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-black/40 rounded-xl border border-white/10 px-4 py-3 font-mono text-xs text-white/60 break-all mb-3">
            {bracketUrl}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-white/10 text-xs"
              onClick={() => copyToClipboard(bracketUrl, "bracket")}
            >
              {copied === "bracket" ? (
                <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copy URL</>
              )}
            </Button>
            <Button size="sm" variant="outline" className="gap-2 border-white/10 text-xs" asChild>
              <a href={bracketUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                Open Bracket
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
