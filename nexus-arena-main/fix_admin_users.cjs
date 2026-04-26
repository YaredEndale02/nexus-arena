const fs = require('fs');
let content = fs.readFileSync('src/lib/api.ts', 'utf-8');
content = content.replace(/\r\n/g, '\n');

const badFunc = `  async adminAddUsers(tournamentId: string, players: Array<{name: string, email: string, phoneNumber: string}>, actor: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, actor);
    const { data: tournament } = await client.from('tournaments').select('*').eq('id', tournamentId).single();

    for (const player of players) {
      let userId = 'pseudo-' + Math.random().toString(36).substr(2, 9);
      const { data: existingUser } = await client.from('users').select('id').or(email.eq.,phone_number.eq.).maybeSingle();
      if (existingUser) userId = existingUser.id;
      else {
        await ensureUser(client, { id: userId, name: player.name, role: 'PLAYER', email: player.email, phoneNumber: player.phoneNumber });
      }

      const { data: team } = await client.from('teams').insert({ name: player.name + ' (Manual)', captain_id: userId }).select('id').single();
      await client.from('team_members').insert({ team_id: team.id, user_id: userId, role: 'CAPTAIN' });
      await client.from('tournament_entries').insert({
        team_id: team.id,
        tournament_id: tournamentId,
        registration_status: 'APPROVED',
        check_in_status: 'NOT_OPEN',
        payment_status: 'PAID'
      });
    }
  },`;

const goodFunc = `  async adminAddUsers(
    tournamentId: string,
    players: Array<{ name: string; email: string; phoneNumber: string }>,
    actor: AppUserPayload
  ) {
    const client = requireSupabase();
    await ensureUser(client, actor);

    const errors: string[] = [];

    for (const player of players) {
      if (!player.name?.trim() || !player.email?.trim() || !player.phoneNumber?.trim()) {
        errors.push(\`Skipped: "\${player.name || "unknown"}" — Name, Email, and Phone are all required.\`);
        continue;
      }

      try {
        const { data: existingUser } = await client
          .from("users")
          .select("id")
          .or(\`email.eq.\${player.email.trim()},phone_number.eq.\${player.phoneNumber.trim()}\`)
          .maybeSingle();

        let userId: string;
        if (existingUser) {
          userId = existingUser.id;
        } else {
          userId = \`manual-\${Date.now()}-\${Math.random().toString(36).substr(2, 6)}\`;
          await ensureUser(client, {
            id: userId,
            name: player.name.trim(),
            role: "PLAYER",
            email: player.email.trim(),
            phoneNumber: player.phoneNumber.trim(),
          });
        }

        const { data: existingTeams } = await client
          .from("teams")
          .select("id")
          .eq("captain_id", userId);

        if (existingTeams && existingTeams.length > 0) {
          const teamIds = existingTeams.map((t) => t.id);
          const { data: existingEntry } = await client
            .from("tournament_entries")
            .select("id")
            .eq("tournament_id", tournamentId)
            .in("team_id", teamIds)
            .maybeSingle();
          if (existingEntry) {
            errors.push(\`Skipped: "\${player.name}" — already registered.\`);
            continue;
          }
        }

        const { data: team, error: teamError } = await client
          .from("teams")
          .insert({ name: \`\${player.name.trim()} (Manual)\`, captain_id: userId })
          .select("id")
          .single();
        if (teamError) throw teamError;

        await client.from("team_members").insert({ team_id: team.id, user_id: userId, role: "CAPTAIN" });

        const { error: entryError } = await client.from("tournament_entries").insert({
          team_id: team.id,
          tournament_id: tournamentId,
          registration_status: "APPROVED",
          check_in_status: "NOT_OPEN",
          payment_status: "PAID",
        });
        if (entryError) throw entryError;
      } catch (err) {
        errors.push(\`Failed to add "\${player.name}": \${err instanceof Error ? err.message : "Unknown error"}\`);
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join("\\n"));
    }
  },`;

if (content.includes(badFunc)) {
  content = content.replace(badFunc, goodFunc);
  fs.writeFileSync('src/lib/api.ts', content, 'utf-8');
  console.log('Fixed adminAddUsers!');
} else {
  console.log('Pattern not found, trying partial match...');
  const idx = content.indexOf('async adminAddUsers(');
  const end = content.indexOf('\n  },', idx);
  if (idx !== -1 && end !== -1) {
    content = content.slice(0, idx) + goodFunc + content.slice(end + 5);
    fs.writeFileSync('src/lib/api.ts', content, 'utf-8');
    console.log('Fixed via partial match!');
  } else {
    console.log('Could not find the function at all');
  }
}
