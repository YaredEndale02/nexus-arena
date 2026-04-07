

# Esports Tournament Management Platform — MVP Dashboard UI

## Design System
- **Dark mode** with deep charcoal backgrounds (`#0D1117`, `#161B22`), electric blue accents (`#00D4FF`), neon purple glows (`#7C3AED`), and gold highlights (`#FFD700`) for prize pools
- **Glassmorphism** panels with `backdrop-blur` and subtle borders
- **Font**: Rajdhani (headings) + Inter (body) — both from Google Fonts
- Rounded corners, smooth transitions, pulse/glow animations on active elements

## Pages & Components

### 1. Home Dashboard (`/`)
- **Top nav bar**: Logo, nav links (Dashboard, Tournaments, Teams, Leaderboard), user avatar placeholder
- **Hero stats bar**: Total tournaments, active players, prize pool distributed — animated counters
- **Active Tournaments grid**: Rich cards with:
  - Game background art (gradient overlays for Valorant, LoL, CS2, etc.)
  - Prize pool in gold text
  - Player count / max teams indicator
  - Status badges (Live, Registration Open, Upcoming)
  - Pulsing "REGISTER NOW" button with electric blue gradient
- **Sidebar**: Quick links, upcoming matches, recent activity feed

### 2. Live Bracket Page (`/bracket`)
- **Double Elimination bracket** visualization:
  - Winners bracket (upper) and Losers bracket (lower)
  - Connected match nodes with animated connector lines that light up when next match is determined
  - Team logos, scores, match status (Upcoming, Live, Completed)
  - Grand Finals node with golden pulse effect on the winner
- **Match detail panel**: Click a match to see team rosters, map picks, scheduled time
- All bracket data is mock/hardcoded for now

### 3. Broadcast/Viewer Hub (`/live`)
- **Embedded video placeholder**: 16:9 aspect ratio with Twitch-style overlay (play button, stream info)
- **Real-time leaderboard widget**: Team rankings with animated position changes
- **Match Stats widget**: KDA, rounds won, economy — displayed in sleek stat cards
- **Chat interface**: Mock live chat with scrolling messages, input field, emoji support

### 4. Shared Layout & Navigation
- Persistent sidebar or top nav across all pages
- Smooth page transitions with fade-in animations
- Responsive: works on desktop (primary) and tablets

## Animations & Effects
- Tournament cards: hover scale + glow border effect
- Register button: infinite pulse animation with blue gradient
- Bracket lines: CSS animated dash/glow when match is determined
- Winner node: slow golden pulse keyframe
- Stats: count-up animations on load
- Glassmorphism: `bg-white/5 backdrop-blur-xl border border-white/10`

## Mock Data
- 6-8 tournament cards with varied games and statuses
- 8-team double elimination bracket (pre-filled results)
- Leaderboard with 10 teams
- 20+ mock chat messages

