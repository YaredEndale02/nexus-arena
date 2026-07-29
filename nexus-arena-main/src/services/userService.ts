import { requireSupabase } from "./helpers";

export const userService = {
  async updateUserProfile(userId: string, data: any) {
    const client = requireSupabase();
    const { data: updated, error } = await client
      .from("users")
      .update(data)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  },

  async searchUsers(query: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from("users")
      .select("id, name, email, riot_id, username")
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,riot_id.ilike.%${query}%`)
      .limit(10);
    if (error) throw error;
    return data;
  },
};
