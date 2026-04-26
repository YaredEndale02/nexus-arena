import sys

with open('src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''export interface AppUserPayload {
  id: string;
  name: string;
  role: "ADMIN" | "ORGANIZER" | "PLAYER";
  riotId?: string;
}''',
'''export interface AppUserPayload {
  id: string;
  name: string;
  role: "ADMIN" | "ORGANIZER" | "PLAYER";
  riotId?: string;
  email?: string;
  phoneNumber?: string;
}'''
)

content = content.replace(
'''async function ensureUser(client: ReturnType<typeof requireSupabase>, user: AppUserPayload) {
  const payload: SupabaseUserRow = {
    id: user.id,
    name: user.name,
    role: user.role,
    riot_id: user.riotId ?? null,
  };

  const { error } = await client.from("users").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}''',
'''async function ensureUser(client: ReturnType<typeof requireSupabase>, user: AppUserPayload) {
  const payload: SupabaseUserRow = {
    id: user.id,
    name: user.name,
    role: user.role,
    riot_id: user.riotId ?? null,
    ...(user.email ? { email: user.email } : {}),
    ...(user.phoneNumber ? { phone_number: user.phoneNumber } : {}),
  };

  const { error } = await client.from("users").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}'''
)

new_functions = '''  async removeTeamMember(teamId: string, userId: string, requester: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, requester);
    await assertTeamRosterUnlocked(client, teamId);

    const { error } = await client.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
    if (error) throw error;
  },

  async searchUsers(query: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from("users")
      .select("id, name, email, riot_id")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);
    if (error) throw error;
    return data;
  },

  async registerSolo(
    tournamentId: string,
    userAuth: AppUserPayload & { email: string; phoneNumber: string }
  ) {
    const client = requireSupabase();

    const { data: tournament, error: tournamentError } = await client
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();
    if (tournamentError) throw tournamentError;

    if (tournament.status !== "REGISTRATION_OPEN") {
      throw new Error("Tournament is not open for registration");
    }

    const { count, error: countError } = await client
      .from("tournament_entries")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);
    if (countError) throw countError;
    if ((count ?? 0) >= tournament.max_teams) {
      throw new Error("Tournament is full");
    }

    // Check if phone number is already used in this tournament
    const { data: phoneCheckData, error: phoneCheckError } = await client
      .from("tournament_entries")
      .select("team_id, tournament_id")
      .eq("tournament_id", tournamentId);

    if (phoneCheckError) throw phoneCheckError;

    if (phoneCheckData && phoneCheckData.length > 0) {
      const teamIds = phoneCheckData.map((en) => en.team_id);
      const { data: membersCheck, error: membersError } = await client
        .from("team_members")
        .select("user_id")
        .in("team_id", teamIds);
      if (membersError) throw membersError;
      
      const userIds = membersCheck.map((m) => m.user_id);
      const { data: usersData, error: usersError } = await client
        .from("users")
        .select("id, phone_number")
        .in("id", userIds)
        .eq("phone_number", userAuth.phoneNumber);
      
      if (usersError) throw usersError;
      if (usersData && usersData.length > 0) {
        throw new Error("This phone number has already been registered for this tournament.");
      }
    }

    await ensureUser(client, userAuth);

    const { data: createdTeam, error: teamError } = await client
      .from("teams")
      .insert({
        name: `${userAuth.name} (Solo)`,
        captain_id: userAuth.id,
      })
      .select("*")
      .single();
    if (teamError) throw teamError;

    const { error: memberError } = await client.from("team_members").insert({
      team_id: createdTeam.id,
      user_id: userAuth.id,
      role: "CAPTAIN",
    });
    if (memberError) throw memberError;

    const { error: regError } = await client.from("tournament_entries").insert({
      team_id: createdTeam.id,
      tournament_id: tournamentId,
      registration_status: "APPROVED",
      check_in_status: "NOT_OPEN",
      payment_status: tournament.entry_fee > 0 ? "PENDING" : "PAID",
    });
    if (regError) throw regError;
  },
};'''

content = content.replace(
'''  async removeTeamMember(teamId: string, userId: string, requester: AppUserPayload) {
    const client = requireSupabase();
    await ensureUser(client, requester);
    await assertTeamRosterUnlocked(client, teamId);

    const { error } = await client.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
    if (error) throw error;
  },
};''',
new_functions
)

with open('src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied")
