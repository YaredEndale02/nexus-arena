import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, ExternalLink, Share2, Tv2, Clock, Coffee, Check, Copy, Clapperboard, BarChart2, Eye, Sparkles, Monitor, Settings2, CheckSquare, Square } from "lucide-react";
import { Tournament } from "@/lib/api";
import { cn, scrollToFocus } from "@/lib/utils";
import { getRecommendedBroadcastPreset, getFilteredScenesForGame, ALL_BROADCAST_SCENES } from "@/lib/broadcastPresets";

export function TournamentBroadcastTab({ tournament }: { tournament: Tournament }) {
  const [copied, setCopied] = useState<string | null>(null);

  const preset = useMemo(
    () => getRecommendedBroadcastPreset(tournament.gameTitle, tournament.bracketType),
    [tournament.gameTitle, tournament.bracketType]
  );

  const filteredScenes = useMemo(
    () => getFilteredScenesForGame(tournament.gameTitle, tournament.bracketType),
    [tournament.gameTitle, tournament.bracketType]
  );

  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>(() =>
    filteredScenes.map((s) => s.id)
  );

  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);

  const displayedScenes = useMemo(
    () => ALL_BROADCAST_SCENES.filter((s) => selectedSceneIds.includes(s.id)),
    [selectedSceneIds]
  );

  const [primaryColor, setPrimaryColor] = useState(preset.presetThemeHex);
  const [bgColor, setBgColor] = useState(preset.presetBgHex);
  const [previewScene, setPreviewScene] = useState<string>(preset.primaryScene.sceneParam || "live");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const origin = window.location.origin;
  const bracketUrl = `${origin}/bracket?tournament=${tournament.id}`;

  const getSceneUrl = (sceneParam?: string) => {
    const params = new URLSearchParams();
    if (sceneParam) params.append("scene", sceneParam);
    if (primaryColor !== preset.presetThemeHex) params.append("primary", primaryColor);
    if (bgColor !== preset.presetBgHex) params.append("bg", bgColor);
    const queryString = params.toString();
    return `${origin}/broadcast/${tournament.id}${queryString ? `?${queryString}` : ""}`;
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const toggleSceneSelection = (sceneId: string) => {
    setSelectedSceneIds((prev) =>
      prev.includes(sceneId) ? prev.filter((id) => id !== sceneId) : [...prev, sceneId]
    );
  };

  const applyRecommendedPreset = () => {
    setSelectedSceneIds(filteredScenes.map((s) => s.id));
    setPrimaryColor(preset.presetThemeHex);
    setBgColor(preset.presetBgHex);
    setIsSetupWizardOpen(false);
  };

  const currentPreviewUrl = getSceneUrl(previewScene === "live" ? undefined : previewScene);

  return (
    <div className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clapperboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-foreground">Broadcast & OBS Overlay Control</h2>
            <p className="text-xs text-muted-foreground">Game-aware OBS overlays auto-tuned for {tournament.gameTitle || "your tournament"}.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              const nextState = !isSetupWizardOpen;
              setIsSetupWizardOpen(nextState);
              if (nextState) {
                setTimeout(() => scrollToFocus("overlay-setup-wizard"), 50);
              }
            }}
            variant="outline"
            className="gap-2 border-white/20 hover:bg-white/10"
          >
            <Settings2 className="w-4 h-4" />
            {isSetupWizardOpen ? "Close Setup" : "Select Overlay Scenes"}
          </Button>

          <Button
            onClick={() => {
              const nextState = !showPreviewModal;
              setShowPreviewModal(nextState);
              if (nextState) {
                setTimeout(() => scrollToFocus("obs-preview-canvas"), 50);
              }
            }}
            variant="outline"
            className="gap-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
          >
            <Eye className="w-4 h-4" />
            {showPreviewModal ? "Hide Live Preview" : "Interactive OBS Preview"}
          </Button>
        </div>
      </div>

      {/* Guided Overlay Scene Selection Wizard */}
      {isSetupWizardOpen && (
        <div id="overlay-setup-wizard" className="rounded-2xl border border-primary/40 glass p-6 space-y-5 animate-in fade-in zoom-in-95 duration-300 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                🎯 Select Which Overlay Scenes You Want to Use
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check off the broadcast elements you plan to include in your OBS Studio stream for <strong className="text-foreground">{tournament.gameTitle || "this event"}</strong>.
              </p>
            </div>

            <Button
              size="sm"
              onClick={applyRecommendedPreset}
              className="gap-2 bg-primary text-primary-foreground font-bold shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Use Smart Preset for {tournament.gameTitle || "Game"}
            </Button>
          </div>

          {/* Interactive Checklist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ALL_BROADCAST_SCENES.map((scene) => {
              const isSelected = selectedSceneIds.includes(scene.id);
              const isRecommended = filteredScenes.some((s) => s.id === scene.id);

              return (
                <div
                  key={scene.id}
                  onClick={() => toggleSceneSelection(scene.id)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition-all duration-200 flex items-start gap-3 select-none",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                      : "border-white/10 bg-white/5 opacity-60 hover:opacity-100 hover:border-white/20"
                  )}
                >
                  <div className="pt-0.5 text-primary">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-foreground">{scene.label}</span>
                      {isRecommended && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/30">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scene.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-xs text-muted-foreground font-mono">
              Selected: <strong className="text-primary">{selectedSceneIds.length}</strong> of {ALL_BROADCAST_SCENES.length} scenes
            </span>

            <Button
              onClick={() => setIsSetupWizardOpen(false)}
              className="gap-2 bg-primary text-primary-foreground font-bold"
            >
              Done — Display Selected OBS URLs
            </Button>
          </div>
        </div>
      )}

      {/* Game-Aware Recommended Preset Banner */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-black text-primary uppercase tracking-widest bg-primary/20 border border-primary/30 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                {preset.badgeLabel}
              </span>
              <span className="text-xs text-muted-foreground font-mono">Game: {tournament.gameTitle}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">{preset.reason}</p>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setPrimaryColor(preset.presetThemeHex);
              setBgColor(preset.presetBgHex);
              setPreviewScene(preset.primaryScene.sceneParam || "live");
            }}
            className="gap-2 bg-primary text-primary-foreground font-bold shrink-0"
          >
            Apply Game Color Preset
          </Button>
        </div>
      </div>

      {/* In-Dashboard Interactive OBS Preview Modal / Canvas */}
      {showPreviewModal && (
        <div id="obs-preview-canvas" className="rounded-2xl border border-white/10 glass p-5 space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-bold text-sm text-foreground">Interactive OBS Stream Preview Canvas</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase">1920×1080 @ 60fps</span>
              <a
                href={currentPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Open Fullscreen <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Scene selector tabs inside previewer */}
          <div className="flex flex-wrap gap-2">
            {ALL_BROADCAST_SCENES.map((scene) => (
              <button
                key={scene.id}
                onClick={() => setPreviewScene(scene.sceneParam || "live")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                  (previewScene === (scene.sceneParam || "live"))
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                )}
              >
                {scene.label}
              </button>
            ))}
          </div>

          {/* 16:9 Ratio Interactive Preview Frame */}
          <div className="relative aspect-video w-full rounded-xl border border-white/10 bg-black overflow-hidden shadow-2xl">
            <iframe
              src={currentPreviewUrl}
              className="w-full h-full border-0"
              title="OBS Stream Overlay Preview"
            />
          </div>
        </div>
      )}

      {/* Theme Customization Controls */}
      <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
        <h3 className="font-heading font-bold text-sm text-foreground mb-3 flex items-center gap-2">
          🎨 Theme & Brand Colors
        </h3>
        <p className="text-xs text-white/50 mb-4">Customize the overlay colors to match your brand or team theme. All browser source URLs update live.</p>

        <div className="flex flex-wrap gap-4 items-center">
          {/* Preset Colors */}
          <div className="flex gap-2 mr-4 border-r border-white/10 pr-4">
            <button
              onClick={() => { setPrimaryColor("00e5ff"); setBgColor("050505"); }}
              className={cn("w-8 h-8 rounded-full border-2 transition-all", primaryColor === "00e5ff" ? "border-white scale-110" : "border-transparent opacity-50")}
              style={{ background: "linear-gradient(135deg, #00e5ff 50%, #050505 50%)" }}
              title="Cyber Blue (Tactical)"
            />
            <button
              onClick={() => { setPrimaryColor("d2ff0d"); setBgColor("050505"); }}
              className={cn("w-8 h-8 rounded-full border-2 transition-all", primaryColor === "d2ff0d" ? "border-white scale-110" : "border-transparent opacity-50")}
              style={{ background: "linear-gradient(135deg, #d2ff0d 50%, #050505 50%)" }}
              title="Volt Green (Sports/FC)"
            />
            <button
              onClick={() => { setPrimaryColor("e62429"); setBgColor("0a0a0c"); }}
              className={cn("w-8 h-8 rounded-full border-2 transition-all", primaryColor === "e62429" ? "border-white scale-110" : "border-transparent opacity-50")}
              style={{ background: "linear-gradient(135deg, #e62429 50%, #0a0a0c 50%)" }}
              title="Battle Red (PUBG/BR)"
            />
            <button
              onClick={() => { setPrimaryColor("a855f7"); setBgColor("050505"); }}
              className={cn("w-8 h-8 rounded-full border-2 transition-all", primaryColor === "a855f7" ? "border-white scale-110" : "border-transparent opacity-50")}
              style={{ background: "linear-gradient(135deg, #a855f7 50%, #050505 50%)" }}
              title="Neon Violet"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/40">Primary (Hex)</label>
            <div className="flex items-center bg-black/50 border border-white/10 rounded px-2">
              <span className="text-white/40 text-xs">#</span>
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value.replace("#", ""))}
                className="w-16 bg-transparent text-xs text-white p-1 outline-none font-mono"
                maxLength={6}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/40">Background (Hex)</label>
            <div className="flex items-center bg-black/50 border border-white/10 rounded px-2">
              <span className="text-white/40 text-xs">#</span>
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value.replace("#", ""))}
                className="w-16 bg-transparent text-xs text-white p-1 outline-none font-mono"
                maxLength={6}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scene Filter Status Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="text-xs text-muted-foreground font-mono">
          Displaying <strong className="text-primary font-bold">{displayedScenes.length}</strong> selected overlay scenes for <strong className="text-foreground">{tournament.gameTitle || "this event"}</strong> ({tournament.bracketType})
        </span>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsSetupWizardOpen(!isSetupWizardOpen)}
          className="text-xs text-primary hover:text-primary/80 h-7 gap-1"
        >
          <Settings2 className="w-3.5 h-3.5" /> Customize Selected Scenes
        </Button>
      </div>

      {/* Scene Cards Grid */}
      <div className="space-y-4">
        {displayedScenes.map((scene) => {
          const url = getSceneUrl(scene.sceneParam);
          const copyKey = `scene-${scene.id}`;
          const isCopied = copied === copyKey;
          const isRecommended = preset.recommendedScenes.some((s) => s.id === scene.id);

          return (
            <div
              key={scene.id}
              className={cn(
                "rounded-2xl border p-5 transition-all duration-300",
                isRecommended
                  ? "border-primary/40 bg-gradient-to-r from-primary/10 via-card to-card shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              )}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-black/40 flex items-center justify-center shrink-0 text-primary">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-heading font-bold text-sm text-foreground">{scene.label}</p>
                      {isRecommended && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/30">
                          Recommended for {tournament.gameTitle || "this game"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">{scene.description}</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-muted-foreground bg-black/40 border border-white/10 px-2 py-1 rounded">
                  {scene.obsWidth}×{scene.obsHeight} @ {scene.obsFps}fps
                </span>
              </div>

              {/* URL bar */}
              <div className="bg-black/50 rounded-xl border border-white/10 px-4 py-3 font-mono text-xs text-white/70 break-all mb-3 select-all">
                {url}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-white/10 text-xs"
                  onClick={() => copyToClipboard(url, copyKey)}
                >
                  {isCopied ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied OBS URL!</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> 1-Click Copy OBS Browser Source</>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setPreviewScene(scene.sceneParam || "live");
                    setShowPreviewModal(true);
                    setTimeout(() => scrollToFocus("obs-preview-canvas"), 50);
                  }}
                >
                  <Eye className="w-3.5 h-3.5" /> Preview Overlay
                </Button>

                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 ml-auto"
                >
                  Open Direct Link <ExternalLink className="w-3.5 h-3.5" />
                </a>
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
