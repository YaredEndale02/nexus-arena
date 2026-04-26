const fs = require('fs');
let content = fs.readFileSync('src/pages/Bracket.tsx', 'utf-8');
content = content.replace(/\r\n/g, '\n');

// 1. Update BracketNode
content = content.replace(
`  winner: string | null;
  status: "Upcoming" | "Live" | "Completed";
  scheduledTime: string;`,
`  winner: string | null;
  status: "Upcoming" | "Live" | "Completed";
  scheduledTime: string;
  bracketSide: string;`
);

// 2. Update mapMatchToNode
content = content.replace(
`    winner: match.winnerName ?? null,
    status,
    scheduledTime: match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : "TBD",
  };
}`,
`    winner: match.winnerName ?? null,
    status,
    scheduledTime: match.scheduledAt ? new Date(match.scheduledAt).toLocaleString() : "TBD",
    bracketSide: match.bracketSide ?? "UPPER",
  };
}`
);

// 3. Update grouping logic
const oldGrouping = `  const rounds = useMemo(() => {
    const grouped = new Map<number, BracketNode[]>();
    matches.forEach((match) => {
      const roundMatches = grouped.get(match.round) ?? [];
      roundMatches.push(match);
      grouped.set(match.round, roundMatches);
    });
    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, roundMatches]) => ({
        round,
        label: roundMatches[0]?.roundLabel ?? \`Round \${round}\`,
        matches: roundMatches.sort((a, b) => a.position - b.position),
      }));
  }, [matches]);`;

const newGrouping = `  const getGroupedRounds = (filterSide: string) => {
    const grouped = new Map<number, BracketNode[]>();
    matches.filter(m => m.bracketSide === filterSide || (filterSide === 'UPPER' && !m.bracketSide)).forEach((match) => {
      const roundMatches = grouped.get(match.round) ?? [];
      roundMatches.push(match);
      grouped.set(match.round, roundMatches);
    });
    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, roundMatches]) => ({
        round,
        label: roundMatches[0]?.roundLabel ?? \`Round \${round}\`,
        matches: roundMatches.sort((a, b) => a.position - b.position),
      }));
  };

  const upperRounds = useMemo(() => getGroupedRounds('UPPER'), [matches]);
  const lowerRounds = useMemo(() => getGroupedRounds('LOWER'), [matches]);
  const grandFinalRounds = useMemo(() => getGroupedRounds('GRAND_FINAL'), [matches]);

  const hasMatches = upperRounds.length > 0 || lowerRounds.length > 0;`;

content = content.replace(oldGrouping, newGrouping);

// 4. Update Rendering logic
const oldRender = `          ) : rounds.length === 0 ? (
            <div className="glass p-6 rounded-xl text-center text-muted-foreground">
              No generated bracket yet. Create registrations, then generate the bracket from Tournament Control.
            </div>
          ) : (
            <div className="flex items-start gap-8 min-w-[900px]">
              {rounds.map((roundGroup, roundIndex) => (
                <div
                  key={roundGroup.round}
                  className="flex flex-col gap-6"
                  style={{ marginTop: \`\${roundIndex * 48}px\` }}
                >
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{roundGroup.label}</span>
                  {roundGroup.matches.map((match, index) => (
                    <div key={match.id} className="animate-fade-in" style={{ animationDelay: \`\${index * 100}ms\` }}>
                      <MatchNode
                        match={match}
                        isFinal={roundIndex === rounds.length - 1}
                        onClick={() => setSelectedMatch(match)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )`;

const newRender = `          ) : !hasMatches ? (
            <div className="glass p-6 rounded-xl text-center text-muted-foreground">
              No generated bracket yet. Create registrations, then generate the bracket from Tournament Control.
            </div>
          ) : (
            <div className="space-y-12 pb-12">
              <div className="flex items-start gap-8 min-w-[900px]">
                {upperRounds.map((roundGroup, roundIndex) => (
                  <div
                    key={\`upper-\${roundGroup.round}\`}
                    className="flex flex-col gap-6"
                    style={{ marginTop: \`\${roundIndex * 48}px\` }}
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{roundGroup.label}</span>
                    {roundGroup.matches.map((match, index) => (
                      <div key={match.id} className="animate-fade-in" style={{ animationDelay: \`\${index * 100}ms\` }}>
                        <MatchNode
                          match={match}
                          isFinal={roundIndex === upperRounds.length - 1 && grandFinalRounds.length === 0}
                          onClick={() => setSelectedMatch(match)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
                
                {grandFinalRounds.map((roundGroup) => (
                  <div key="grand-final" className="flex flex-col gap-6" style={{ marginTop: \`\${Math.max(0, upperRounds.length - 1) * 48}px\` }}>
                    <span className="text-[10px] text-gold uppercase tracking-wider mb-2">Grand Finals</span>
                    {roundGroup.matches.map((match, index) => (
                      <div key={match.id} className="animate-fade-in">
                        <MatchNode match={match} isFinal={true} onClick={() => setSelectedMatch(match)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {lowerRounds.length > 0 && (
                <div className="pt-8 border-t border-white/10">
                  <h3 className="font-heading text-lg font-bold text-muted-foreground mb-4">Lower Bracket</h3>
                  <div className="flex items-start gap-8 min-w-[900px]">
                    {lowerRounds.map((roundGroup, roundIndex) => (
                      <div
                        key={\`lower-\${roundGroup.round}\`}
                        className="flex flex-col gap-6"
                      >
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{roundGroup.label}</span>
                        {roundGroup.matches.map((match, index) => (
                          <div key={match.id} className="animate-fade-in" style={{ animationDelay: \`\${index * 50}ms\` }}>
                            <MatchNode
                              match={match}
                              onClick={() => setSelectedMatch(match)}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )`;

content = content.replace(oldRender, newRender);

if (content.includes('bracketSide: match.bracketSide ?? "UPPER"')) {
    console.log("Replaced node structure");
} else { console.log('Failed node map'); }

fs.writeFileSync('src/pages/Bracket.tsx', content, 'utf-8');
console.log('Done mapping bracket UI');
