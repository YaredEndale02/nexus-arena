
let mockTeams: any[] = [];
let mockEntries: any[] = [];
let mockTeamMembers: any[] = [];

const mockSupabase = {
  from: (table: string) => ({
    select: (columns: string) => {
      let currentTable = table;
      let filters: any = {};
      
      const obj: any = {
        eq: (col: string, val: any) => {
          filters[col] = val;
          return obj;
        },
        in: (col: string, vals: any[]) => {
          filters[col] = vals;
          return obj;
        },
        or: (cond: string) => {
            return obj;
        },
        maybeSingle: async () => {
          if (currentTable === 'users') return { data: { id: filters.id || 'user-1' }, error: null };
          if (currentTable === 'team_members') {
            const filtered = mockTeamMembers.filter(tm => !filters.user_id || tm.user_id === filters.user_id);
            return { data: filtered, error: null };
          }
          if (currentTable === 'tournament_entries') {
            const found = mockEntries.find(e => 
                (!filters.tournament_id || e.tournament_id === filters.tournament_id) &&
                (!filters.team_id || (filters.team_id && filters.team_id.includes(e.team_id)))
            );
            return { data: found || null, error: null };
          }
          return { data: null, error: null };
        },
        // handle the case where we don't call maybeSingle but just expect data from the select
        then: (cb: any) => {
            if (currentTable === 'team_members') {
                const filtered = mockTeamMembers.filter(tm => !filters.user_id || tm.user_id === filters.user_id);
                return cb({ data: filtered, error: null });
            }
            return cb({ data: [], error: null });
        }
      };
      return obj;
    }
  })
};

async function adminAddUsers(tournamentId: string, players: any[], actor: any) {
  const client = mockSupabase as any;
  for (const player of players) {
    console.log(`Processing ${player.name}...`);
    // Mock user lookup
    const existingUser = { id: 'user-' + player.name }; 
    
    if (existingUser) {
      // NEW FIXED LOGIC
      const { data: userTeams } = await client
        .from("team_members")
        .select("team_id")
        .eq("user_id", existingUser.id);
      
      if (userTeams && userTeams.length > 0) {
        const teamIds = userTeams.map((t: any) => t.team_id);
        const { data: existingEntry } = await client
          .from("tournament_entries")
          .select("id")
          .eq("tournament_id", tournamentId)
          .in("team_id", teamIds)
          .maybeSingle();

        if (existingEntry) {
          console.log(`  Skipped "${player.name}" — already registered.`);
          continue;
        }
      }
    }
    
    const teamId = 'team-' + Math.random();
    // Simulate team creation and registration
    mockTeams.push({ id: teamId, captain_id: actor.id });
    mockTeamMembers.push({ team_id: teamId, user_id: existingUser.id });
    mockEntries.push({ team_id: teamId, tournament_id: tournamentId });
    console.log(`  Added "${player.name}"`);
  }
}

const actor = { id: 'organizer-1' };
const players = [
  { name: 'Player 1', email: 'p1@test.com' },
  { name: 'Player 2', email: 'p2@test.com' },
  { name: 'Player 1', email: 'p1@test.com' } // Duplicate to test skip
];

console.log("Starting test with FIXED logic...");
adminAddUsers('tourney-1', players, actor).then(() => {
    console.log("\nFinal state:");
    console.log("Mock Teams:", mockTeams.length);
    console.log("Mock Entries:", mockEntries.length);
});
