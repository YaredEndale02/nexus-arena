export type Language = "en" | "am";

export const translations = {
  en: {
    // Brand (Strictly unchanged)
    brandName: "ADWA ARENA",

    // Navigation
    navTournaments: "Tournaments",
    navBrackets: "Brackets",
    navLive: "Live",
    navTeams: "Teams",
    navMyRegistrations: "My Registrations",
    navAdmin: "Admin",
    navSignIn: "Sign In",
    navSignOut: "Sign Out",
    navProfile: "Profile",

    // Home / Hero
    heroTitle: "Competitive Esports Arena",
    heroSubtitle: "Register teams, follow real-time brackets, and broadcast live matches.",
    activeTournaments: "Active Tournaments",
    filterAll: "ALL",
    filterLive: "LIVE",
    filterOpen: "OPEN",
    filterUpcoming: "UPCOMING",
    tournamentSearch: "Search tournaments...",
    noTournamentsFound: "No tournaments found matching your filter.",

    // Stats Bar
    statActiveTournaments: "Active Tournaments",
    statRegisteredTeams: "Registered Teams",
    statTotalPrizePool: "Total Prize Pool",
    statTotalMatches: "Total Matches",

    // Tournament Card & Actions
    btnRegisterNow: "REGISTER NOW",
    btnTeamCheckIn: "TEAM CHECK-IN",
    btnWatchLive: "WATCH LIVE",
    btnViewDetails: "VIEW DETAILS",
    btnViewResults: "VIEW RESULTS",
    btnComingSoon: "COMING SOON",
    btnTournamentInfo: "TOURNAMENT INFO",
    btnJoinWaitlist: "JOIN WAITLIST",
    btnRegFull: "REGISTRATION FULL",
    btnViewMyMatch: "VIEW MY MATCH",
    freeEntry: "FREE ENTRY",
    entryFee: "ENTRY",
    prizePool: "PRIZE POOL",
    teamsRegistered: "Teams",
    rules: "Tournament Rules",

    // Statuses
    statusLive: "Live",
    statusRegistrationOpen: "Registration Open",
    statusRegistrationClosed: "Registration Closed",
    statusCheckIn: "Check-In",
    statusPublished: "Published",
    statusUpcoming: "Upcoming",
    statusCompleted: "Completed",
    statusDraft: "Draft",
    statusCancelled: "Cancelled",

    // My Registrations
    regTitle: "My Tournament Registrations",
    regSubtitle: "Track your tournament entries, check-in status, and upcoming matches.",
    regCheckInTeam: "Check In Team",
    regViewBracket: "View Bracket",
    regOpenTournament: "Open Tournament",
    regWithdraw: "Withdraw",
    nextMatch: "Your Next Match",
    nextMatchPending: "Bracket not generated yet — check back after registration closes.",
    matchesCompleted: "All your matches are complete 🏆",

    // FAQ Section
    faqTitle: "Frequently Asked Questions",
    faqSubtitle: "Everything you need to know about competing on ADWA ARENA."
  },
  am: {
    // Brand (Strictly unchanged per brand requirements)
    brandName: "ADWA ARENA",

    // Navigation
    navTournaments: "ውድድሮች",
    navBrackets: "የውድድር ዛፍ",
    navLive: "ቀጥታ ስርጭት",
    navTeams: "ቡድኖች",
    navMyRegistrations: "የእኔ ምዝገባዎች",
    navAdmin: "አስተዳዳሪ",
    navSignIn: "ግባ / ተመዝገብ",
    navSignOut: "ውጣ",
    navProfile: "መገለጫ",

    // Home / Hero
    heroTitle: "የኢ-ስፖርት ውድድር መድረክ",
    heroSubtitle: "ቡድንዎን ይመዝግቡ፣ የቀጥታ የውድድር ውጤቶችን ይከታተሉ፣ ጨዋታዎችን በቀጥታ ስርጭት ይመልከቱ።",
    activeTournaments: "ንቁ ውድድሮች",
    filterAll: "ሁሉም",
    filterLive: "ቀጥታ",
    filterOpen: "ክፍት",
    filterUpcoming: "መጪ",
    tournamentSearch: "ውድድሮችን ፈልግ...",
    noTournamentsFound: "ምንም የሚስማማ ውድድር አልተገኘም።",

    // Stats Bar
    statActiveTournaments: "ንቁ ውድድሮች",
    statRegisteredTeams: "የተመዘገቡ ቡድኖች",
    statTotalPrizePool: "ጠቅላላ የሽልማት ፈንድ",
    statTotalMatches: "ጠቅላላ ጨዋታዎች",

    // Tournament Card & Actions
    btnRegisterNow: "አሁኑኑ ይመዝገቡ",
    btnTeamCheckIn: "የቡድን ማረጋገጫ (ቼክ-ኢን)",
    btnWatchLive: "ቀጥታ ይመልከቱ",
    btnViewDetails: "ዝርዝር ይመልከቱ",
    btnViewResults: "ውጤቶችን ይመልከቱ",
    btnComingSoon: "በቅርቡ ይጀምራል",
    btnTournamentInfo: "የውድድር መረጃ",
    btnJoinWaitlist: "ተጠባባቂ ዝርዝር ይግቡ",
    btnRegFull: "ምዝገባ ሞልቷል",
    btnViewMyMatch: "ጨዋታዬን እይ",
    freeEntry: "ነፃ ምዝገባ",
    entryFee: "መግቢያ",
    prizePool: "የሽልማት ፈንድ",
    teamsRegistered: "ቡድኖች",
    rules: "የውድድር ደንቦች",

    // Statuses
    statusLive: "ቀጥታ በሂደት ላይ",
    statusRegistrationOpen: "ምዝገባ ተከፍቷል",
    statusRegistrationClosed: "ምዝገባ ተዘግቷል",
    statusCheckIn: "ቼክ-ኢን (ማረጋገጫ)",
    statusPublished: "የታወጀ",
    statusUpcoming: "መጪ",
    statusCompleted: "የተጠናቀቀ",
    statusDraft: "ረቂቅ",
    statusCancelled: "የተሰረዘ",

    // My Registrations
    regTitle: "የእኔ የውድድር ምዝገባዎች",
    regSubtitle: "የተመዘገቡባቸውን ውድድሮች፣ የቼክ-ኢን ሁኔታዎን እና መጪ ጨዋታዎችን ይከታተሉ።",
    regCheckInTeam: "ቡድኑን ቼክ-ኢን አድርግ",
    regViewBracket: "የውድድር ዛፍ ይመልከቱ",
    regOpenTournament: "ውድድሩን ክፈት",
    regWithdraw: "ምዝገባ ሰርዝ",
    nextMatch: "የሚቀጥለው ጨዋታዎ",
    nextMatchPending: "የውድድር ዛፍ ገና አልተዘጋጀም — ምዝገባ ሲጠናቀቅ ይመለሱ።",
    matchesCompleted: "ሁሉም ጨዋታዎችዎ ተጠናቀዋል 🏆",

    // FAQ Section
    faqTitle: "ተደጋግመው የሚጠየቁ ጥያቄዎች",
    faqSubtitle: "በADWA ARENA ላይ ስለመወዳደር ማወቅ ያለብዎት ጠቃሚ መረጃዎች።"
  }
};

export type TranslationKey = keyof typeof translations.en;
