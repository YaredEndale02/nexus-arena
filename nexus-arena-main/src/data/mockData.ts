export interface Tournament {
  id: string;
  title: string;
  gameTitle: string;
  prizePool: number;
  maxTeams: number;
  registeredTeams: number;
  startDate: string;
  status: "Live" | "Registration Open" | "Upcoming" | "Completed";
  entryFee: number;
  gradient: string;
}

export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  team1: { name: string; logo: string; score: number } | null;
  team2: { name: string; logo: string; score: number } | null;
  winner: string | null;
  status: "Upcoming" | "Live" | "Completed";
  scheduledTime: string;
  maps?: string[];
}

export interface LeaderboardEntry {
  rank: number;
  team: string;
  logo: string;
  wins: number;
  losses: number;
  points: number;
  streak: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  avatar: string;
  message: string;
  time: string;
  badge?: string;
}

export const tournaments: Tournament[] = [
  {
    id: "1",
    title: "Valorant Champions Series",
    gameTitle: "Valorant",
    prizePool: 50000,
    maxTeams: 32,
    registeredTeams: 28,
    startDate: "2026-04-15",
    status: "Registration Open",
    entryFee: 0,
    gradient: "from-red-600/80 via-red-900/60 to-transparent",
  },
  {
    id: "2",
    title: "League of Legends World Cup",
    gameTitle: "League of Legends",
    prizePool: 100000,
    maxTeams: 16,
    registeredTeams: 16,
    startDate: "2026-04-10",
    status: "Live",
    entryFee: 50,
    gradient: "from-blue-600/80 via-blue-900/60 to-transparent",
  },
  {
    id: "3",
    title: "CS2 Major Qualifier",
    gameTitle: "Counter-Strike 2",
    prizePool: 75000,
    maxTeams: 64,
    registeredTeams: 45,
    startDate: "2026-04-20",
    status: "Registration Open",
    entryFee: 25,
    gradient: "from-amber-600/80 via-amber-900/60 to-transparent",
  },
  {
    id: "4",
    title: "Apex Legends Invitational",
    gameTitle: "Apex Legends",
    prizePool: 30000,
    maxTeams: 20,
    registeredTeams: 20,
    startDate: "2026-04-08",
    status: "Live",
    entryFee: 0,
    gradient: "from-rose-600/80 via-rose-900/60 to-transparent",
  },
  {
    id: "5",
    title: "Overwatch 2 Open",
    gameTitle: "Overwatch 2",
    prizePool: 25000,
    maxTeams: 24,
    registeredTeams: 12,
    startDate: "2026-05-01",
    status: "Upcoming",
    entryFee: 15,
    gradient: "from-orange-500/80 via-orange-900/60 to-transparent",
  },
  {
    id: "6",
    title: "Rocket League Championship",
    gameTitle: "Rocket League",
    prizePool: 40000,
    maxTeams: 32,
    registeredTeams: 30,
    startDate: "2026-04-12",
    status: "Registration Open",
    entryFee: 10,
    gradient: "from-cyan-500/80 via-cyan-900/60 to-transparent",
  },
  {
    id: "7",
    title: "Dota 2 International Qualifier",
    gameTitle: "Dota 2",
    prizePool: 200000,
    maxTeams: 16,
    registeredTeams: 8,
    startDate: "2026-05-15",
    status: "Upcoming",
    entryFee: 100,
    gradient: "from-emerald-600/80 via-emerald-900/60 to-transparent",
  },
  {
    id: "8",
    title: "Fortnite Friday Clash",
    gameTitle: "Fortnite",
    prizePool: 15000,
    maxTeams: 50,
    registeredTeams: 50,
    startDate: "2026-04-06",
    status: "Completed",
    entryFee: 0,
    gradient: "from-purple-500/80 via-purple-900/60 to-transparent",
  },
];

const teamNames = [
  "Shadow Wolves", "Neon Vipers", "Frost Giants", "Thunder Hawks",
  "Dark Phoenix", "Iron Titans", "Storm Raiders", "Cyber Samurai",
];

const teamLogos = ["🐺", "🐍", "🏔️", "🦅", "🔥", "⚔️", "⛈️", "🤖"];

export const bracketMatches: BracketMatch[] = [
  // Winners Round 1
  { id: "w1", round: 1, position: 1, team1: { name: teamNames[0], logo: teamLogos[0], score: 2 }, team2: { name: teamNames[1], logo: teamLogos[1], score: 0 }, winner: teamNames[0], status: "Completed", scheduledTime: "14:00", maps: ["Haven", "Bind"] },
  { id: "w2", round: 1, position: 2, team1: { name: teamNames[2], logo: teamLogos[2], score: 2 }, team2: { name: teamNames[3], logo: teamLogos[3], score: 1 }, winner: teamNames[2], status: "Completed", scheduledTime: "14:30", maps: ["Ascent", "Split", "Icebox"] },
  { id: "w3", round: 1, position: 3, team1: { name: teamNames[4], logo: teamLogos[4], score: 1 }, team2: { name: teamNames[5], logo: teamLogos[5], score: 2 }, winner: teamNames[5], status: "Completed", scheduledTime: "15:00", maps: ["Lotus", "Breeze"] },
  { id: "w4", round: 1, position: 4, team1: { name: teamNames[6], logo: teamLogos[6], score: 0 }, team2: { name: teamNames[7], logo: teamLogos[7], score: 2 }, winner: teamNames[7], status: "Completed", scheduledTime: "15:30", maps: ["Fracture", "Pearl"] },
  // Winners Semi
  { id: "w5", round: 2, position: 1, team1: { name: teamNames[0], logo: teamLogos[0], score: 2 }, team2: { name: teamNames[2], logo: teamLogos[2], score: 1 }, winner: teamNames[0], status: "Completed", scheduledTime: "17:00", maps: ["Haven", "Bind", "Ascent"] },
  { id: "w6", round: 2, position: 2, team1: { name: teamNames[5], logo: teamLogos[5], score: 1 }, team2: { name: teamNames[7], logo: teamLogos[7], score: 2 }, winner: teamNames[7], status: "Completed", scheduledTime: "17:30" },
  // Winners Final
  { id: "w7", round: 3, position: 1, team1: { name: teamNames[0], logo: teamLogos[0], score: 1 }, team2: { name: teamNames[7], logo: teamLogos[7], score: 0 }, winner: null, status: "Live", scheduledTime: "20:00" },
  // Losers Round 1
  { id: "l1", round: 1, position: 5, team1: { name: teamNames[1], logo: teamLogos[1], score: 2 }, team2: { name: teamNames[3], logo: teamLogos[3], score: 0 }, winner: teamNames[1], status: "Completed", scheduledTime: "16:00" },
  { id: "l2", round: 1, position: 6, team1: { name: teamNames[4], logo: teamLogos[4], score: 2 }, team2: { name: teamNames[6], logo: teamLogos[6], score: 1 }, winner: teamNames[4], status: "Completed", scheduledTime: "16:30" },
  // Losers Round 2
  { id: "l3", round: 2, position: 3, team1: { name: teamNames[1], logo: teamLogos[1], score: 0 }, team2: { name: teamNames[4], logo: teamLogos[4], score: 0 }, winner: null, status: "Upcoming", scheduledTime: "19:00" },
  // Grand Finals
  { id: "gf", round: 4, position: 1, team1: null, team2: null, winner: null, status: "Upcoming", scheduledTime: "21:00" },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, team: "Shadow Wolves", logo: "🐺", wins: 15, losses: 2, points: 4500, streak: "W5" },
  { rank: 2, team: "Cyber Samurai", logo: "🤖", wins: 14, losses: 3, points: 4200, streak: "W3" },
  { rank: 3, team: "Iron Titans", logo: "⚔️", wins: 12, losses: 4, points: 3800, streak: "L1" },
  { rank: 4, team: "Frost Giants", logo: "🏔️", wins: 11, losses: 5, points: 3500, streak: "W2" },
  { rank: 5, team: "Dark Phoenix", logo: "🔥", wins: 10, losses: 6, points: 3200, streak: "W1" },
  { rank: 6, team: "Neon Vipers", logo: "🐍", wins: 9, losses: 7, points: 2900, streak: "L2" },
  { rank: 7, team: "Thunder Hawks", logo: "🦅", wins: 8, losses: 8, points: 2600, streak: "L1" },
  { rank: 8, team: "Storm Raiders", logo: "⛈️", wins: 7, losses: 9, points: 2300, streak: "W1" },
  { rank: 9, team: "Digital Dragons", logo: "🐉", wins: 5, losses: 10, points: 1800, streak: "L3" },
  { rank: 10, team: "Pixel Phantoms", logo: "👻", wins: 3, losses: 12, points: 1200, streak: "L5" },
];

export const chatMessages: ChatMessage[] = [
  { id: "1", user: "FragMaster99", avatar: "🎮", message: "Shadow Wolves looking INSANE today!", time: "2m ago", badge: "VIP" },
  { id: "2", user: "EsportsEnthusiast", avatar: "⚡", message: "That clutch round was unreal 🔥", time: "2m ago" },
  { id: "3", user: "ProWatcher", avatar: "👀", message: "GG! Who else thinks Cyber Samurai can still pull this back?", time: "3m ago" },
  { id: "4", user: "TourneyAdmin", avatar: "🛡️", message: "Next match starts in 10 minutes!", time: "3m ago", badge: "MOD" },
  { id: "5", user: "xXNoScopeXx", avatar: "🎯", message: "Let's gooo!! Shadow Wolves all the way!", time: "4m ago" },
  { id: "6", user: "AnalystPrime", avatar: "📊", message: "Iron Titans need to fix their eco if they want to win", time: "4m ago", badge: "VIP" },
  { id: "7", user: "CasualViewer", avatar: "🍿", message: "First time watching esports. This is HYPE", time: "5m ago" },
  { id: "8", user: "BetMaster", avatar: "💰", message: "Called it! Shadow Wolves 2-0 easy", time: "5m ago" },
  { id: "9", user: "GGWellPlayed", avatar: "🤝", message: "Respect to both teams, great match", time: "6m ago" },
  { id: "10", user: "StreamerFan", avatar: "📺", message: "This production quality is top tier 👏", time: "6m ago" },
  { id: "11", user: "CoachWhisper", avatar: "🧠", message: "They should switch to Op on defense", time: "7m ago" },
  { id: "12", user: "NightOwl", avatar: "🦉", message: "Staying up late for this, worth it!", time: "7m ago" },
  { id: "13", user: "PixelPunisher", avatar: "💥", message: "WHAT A PLAY! Did you see that ace?!", time: "8m ago" },
  { id: "14", user: "TeamCaptain_X", avatar: "🏆", message: "Our team is playing next round, wish us luck!", time: "8m ago", badge: "PLAYER" },
  { id: "15", user: "StatNerd", avatar: "📈", message: "ACS of 287 this game. Absolutely cracked.", time: "9m ago" },
  { id: "16", user: "HypeMan", avatar: "🔊", message: "LET'S GOOOOO 🚀🚀🚀", time: "9m ago" },
  { id: "17", user: "ChillVibes", avatar: "😎", message: "Great tournament so far, loving the bracket format", time: "10m ago" },
  { id: "18", user: "DebugDave", avatar: "🐛", message: "Is the observer going to switch to the clutch player?", time: "10m ago" },
  { id: "19", user: "FanGirl2026", avatar: "💜", message: "Shadow Wolves merch when??", time: "11m ago" },
  { id: "20", user: "RetiredPro", avatar: "🎖️", message: "Back in my day we didn't have prize pools this big", time: "12m ago", badge: "VIP" },
];

export const matchStats = {
  team1: { name: "Shadow Wolves", logo: "🐺", kills: 45, deaths: 32, assists: 78, roundsWon: 13, economy: 48500, rating: 1.32 },
  team2: { name: "Cyber Samurai", logo: "🤖", kills: 32, deaths: 45, assists: 61, roundsWon: 9, economy: 41200, rating: 0.98 },
};
