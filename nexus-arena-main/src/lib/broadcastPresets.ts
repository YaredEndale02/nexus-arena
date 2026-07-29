import type { Tournament } from "./api";

export interface BroadcastSceneConfig {
  id: string;
  label: string;
  description: string;
  category: "TACTICAL" | "BATTLE_ROYALE" | "SPORTS" | "GENERAL";
  recommendedGames: string[];
  sceneParam?: string;
  obsWidth: number;
  obsHeight: number;
  obsFps: number;
  defaultPrimaryColor: string;
  defaultBgColor: string;
}

export const ALL_BROADCAST_SCENES: BroadcastSceneConfig[] = [
  {
    id: "live",
    label: "Live Scorebar Overlay",
    description: "Transparent lower-third scorebar showing live match scores, team logos, and scrolling ticker. Ideal for Valorant, FC 25, CS2, Rocket League.",
    category: "TACTICAL",
    recommendedGames: ["VALORANT", "COUNTER-STRIKE", "CS2", "CS:GO", "EA SPORTS FC", "FIFA", "ROCKET LEAGUE", "LEAGUE OF LEGENDS"],
    obsWidth: 1920,
    obsHeight: 1080,
    obsFps: 60,
    defaultPrimaryColor: "00e5ff",
    defaultBgColor: "050505",
  },
  {
    id: "starting",
    label: "Starting Soon Scene",
    description: "Full-screen countdown scene with live timer and tournament info to show before the broadcast begins.",
    category: "GENERAL",
    recommendedGames: [],
    sceneParam: "starting",
    obsWidth: 1920,
    obsHeight: 1080,
    obsFps: 60,
    defaultPrimaryColor: "d2ff0d",
    defaultBgColor: "050505",
  },
  {
    id: "intermission",
    label: "Intermission & Up Next",
    description: "Full-screen 'Be Right Back' break scene with live upcoming match preview.",
    category: "GENERAL",
    recommendedGames: [],
    sceneParam: "intermission",
    obsWidth: 1920,
    obsHeight: 1080,
    obsFps: 60,
    defaultPrimaryColor: "ff9900",
    defaultBgColor: "0a0510",
  },
  {
    id: "table",
    label: "Live Standings Table",
    description: "Full-screen standings table showing team wins, losses, score diff, and points. Perfect for Round Robin & Swiss formats.",
    category: "GENERAL",
    recommendedGames: [],
    sceneParam: "table",
    obsWidth: 1920,
    obsHeight: 1080,
    obsFps: 60,
    defaultPrimaryColor: "10b981",
    defaultBgColor: "050505",
  },
  {
    id: "pubg",
    label: "Battle Royale Leaderboard",
    description: "Full-screen 16-team leaderboard featuring WWCD, Place, Kills, and Total points for PUBG Mobile, Apex, Fortnite.",
    category: "BATTLE_ROYALE",
    recommendedGames: ["PUBG", "PUBG MOBILE", "APEX LEGENDS", "WARZONE", "FORTNITE", "FREE FIRE"],
    sceneParam: "pubg",
    obsWidth: 1920,
    obsHeight: 1080,
    obsFps: 60,
    defaultPrimaryColor: "e62429",
    defaultBgColor: "0a0a0c",
  },
  {
    id: "pubg-live",
    label: "Battle Royale Live Sidebar",
    description: "Transparent left-aligned HUD sidebar showing alive teams count, remaining players, and live kill count.",
    category: "BATTLE_ROYALE",
    recommendedGames: ["PUBG", "PUBG MOBILE", "APEX LEGENDS", "WARZONE", "FORTNITE", "FREE FIRE"],
    sceneParam: "pubg-live",
    obsWidth: 1920,
    obsHeight: 1080,
    obsFps: 60,
    defaultPrimaryColor: "e62429",
    defaultBgColor: "000000",
  },
];

export interface GamePresetRecommendation {
  primaryScene: BroadcastSceneConfig;
  recommendedScenes: BroadcastSceneConfig[];
  presetThemeHex: string;
  presetBgHex: string;
  badgeLabel: string;
  reason: string;
}

/**
 * Recommends the optimal broadcast overlay package based on the tournament's game title and format.
 */
export function getRecommendedBroadcastPreset(
  gameTitle: string,
  bracketType?: Tournament["bracketType"],
): GamePresetRecommendation {
  const normalizedGame = (gameTitle || "").toUpperCase().trim();

  // Battle Royale Detection
  const isBattleRoyale = ["PUBG", "APEX", "WARZONE", "FORTNITE", "FREE FIRE"].some((br) =>
    normalizedGame.includes(br),
  );

  if (isBattleRoyale) {
    const pubgLive = ALL_BROADCAST_SCENES.find((s) => s.id === "pubg-live")!;
    return {
      primaryScene: pubgLive,
      recommendedScenes: ALL_BROADCAST_SCENES.filter((s) => s.category === "BATTLE_ROYALE" || s.id === "starting"),
      presetThemeHex: "e62429",
      presetBgHex: "0a0a0c",
      badgeLabel: "Battle Royale Package",
      reason: "Detected Battle Royale game. Pre-configured with HUD Alive Teams Sidebar and 16-Team Overall Standings.",
    };
  }

  // Sports & Fighting Detection
  const isSports = ["FC", "FIFA", "ROCKET", "NBA", "STREET FIGHTER", "TEKKEN"].some((sp) =>
    normalizedGame.includes(sp),
  );

  if (isSports) {
    const liveScorebar = ALL_BROADCAST_SCENES.find((s) => s.id === "live")!;
    return {
      primaryScene: liveScorebar,
      recommendedScenes: ALL_BROADCAST_SCENES.filter((s) => s.id === "live" || s.id === "intermission" || s.id === "starting"),
      presetThemeHex: "d2ff0d",
      presetBgHex: "050505",
      badgeLabel: "Sports & 1v1 Package",
      reason: "Detected Sports/Fighting game. Pre-configured with high-visibility lower-third scorebar and intermission scenes.",
    };
  }

  // Round Robin / Swiss Standings Focus
  if (bracketType === "ROUND_ROBIN" || bracketType === "SWISS") {
    const tableScene = ALL_BROADCAST_SCENES.find((s) => s.id === "table")!;
    return {
      primaryScene: tableScene,
      recommendedScenes: ALL_BROADCAST_SCENES.filter((s) => s.id === "table" || s.id === "live" || s.id === "starting"),
      presetThemeHex: "10b981",
      presetBgHex: "050505",
      badgeLabel: "Group Standings Package",
      reason: `${bracketType === "ROUND_ROBIN" ? "Round Robin" : "Swiss"} format detected. Pre-configured with auto-updating live points table.`,
    };
  }

  // Default Tactical FPS / General Esports
  const defaultLive = ALL_BROADCAST_SCENES.find((s) => s.id === "live")!;
  return {
    primaryScene: defaultLive,
    recommendedScenes: ALL_BROADCAST_SCENES.filter((s) => s.id === "live" || s.id === "starting" || s.id === "intermission"),
    presetThemeHex: "00e5ff",
    presetBgHex: "050505",
    badgeLabel: "Pro Esports Package",
    reason: "Standard 1920×1080 lower-third overlay with score updates and intermissions.",
  };
}

/**
 * Returns ONLY relevant scenes for the specified game and tournament format,
 * filtering out incompatible or unnecessary overlays (e.g. hiding PUBG HUDs for Valorant/FC 25).
 */
export function getFilteredScenesForGame(
  gameTitle: string,
  bracketType?: Tournament["bracketType"],
): BroadcastSceneConfig[] {
  const normalizedGame = (gameTitle || "").toUpperCase().trim();

  const isBattleRoyale = ["PUBG", "APEX", "WARZONE", "FORTNITE", "FREE FIRE"].some((br) =>
    normalizedGame.includes(br),
  );

  if (isBattleRoyale) {
    // Battle Royale events only need Battle Royale HUD overlays, starting soon, and intermission
    return ALL_BROADCAST_SCENES.filter((s) => s.category === "BATTLE_ROYALE" || s.id === "starting" || s.id === "intermission");
  }

  // Non-Battle Royale events (Valorant, FC 25, CS2, etc.) DO NOT need Battle Royale HUD overlays
  const nonBrScenes = ALL_BROADCAST_SCENES.filter((s) => s.category !== "BATTLE_ROYALE");

  // If elimination format, hide group standings table scene by default
  if (bracketType === "SINGLE_ELIMINATION" || bracketType === "DOUBLE_ELIMINATION") {
    return nonBrScenes.filter((s) => s.id !== "table");
  }

  return nonBrScenes;
}
