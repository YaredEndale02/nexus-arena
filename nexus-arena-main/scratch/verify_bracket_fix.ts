// Updated verify_bracket_fix.ts
function deduplicate(entryRows: any[]) {
  return Array.from(
    entryRows.reduce((map, entry) => {
      const existing = map.get(entry.team_id);
      if (!existing || (entry.seed_number && !existing.seed_number)) {
        map.set(entry.team_id, entry);
      }
      return map;
    }, new Map<string, any>()).values()
  );
}

const entries = [
  { team_id: 'team-1', name: 'Team A', seed_number: null },
  { team_id: 'team-1', name: 'Team A (duplicate)', seed_number: 5 },
  { team_id: 'team-2', name: 'Team B', seed_number: null }
];

console.log("Original entries:", entries.length);
const unique = deduplicate(entries);
console.log("Unique entries:", unique.length);

// Use a variable to make it cleaner and safer
const team1Entry = unique.find(e => (e as any).team_id === 'team-1') as any;

if (unique.length === 2 && team1Entry?.seed_number === 5) {
  console.log("SUCCESS: Deduplication worked and picked the seeded entry.");
} else {
  console.log("FAILURE: Deduplication logic incorrect.");
}
