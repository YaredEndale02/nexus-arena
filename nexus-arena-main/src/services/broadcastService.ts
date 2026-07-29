import type { Tournament } from "./types";
import { requireSupabase } from "./helpers";

export const broadcastService = {
  async getChatMessages(tournamentId: string): Promise<any[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("chat_messages")
      .select("*, users(name, role)")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw error;
    return (data || []).map((msg) => ({
      id: msg.id,
      user: msg.users?.name || "Guest",
      badge: msg.badge || (msg.users?.role === "ADMIN" ? "ADMIN" : null),
      message: msg.message,
      time: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      avatar: "👤",
    }));
  },

  async sendChatMessage(tournamentId: string, userId: string, message: string) {
    const client = requireSupabase();
    const { error } = await client.from("chat_messages").insert({
      tournament_id: tournamentId,
      user_id: userId,
      message,
    });
    if (error) throw error;
  },

  async getTournamentStreams(tournamentId: string): Promise<any[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("live_streams")
      .select("*")
      .eq("tournament_id", tournamentId);
    if (error) throw error;
    return data || [];
  },

  async updateTournamentStream(tournamentId: string, url: string) {
    const client = requireSupabase();

    await client.from("live_streams").delete().eq("tournament_id", tournamentId).eq("is_primary", true);

    if (url.trim()) {
      const platform = url.includes("twitch") ? "TWITCH" : "YOUTUBE";
      const { error } = await client.from("live_streams").insert({
        tournament_id: tournamentId,
        stream_url: url,
        platform,
        is_primary: true,
        title: "Main Broadcast",
      });
      if (error) throw error;
    }
  },

  subscribeToChat(tournamentId: string, callback: (payload: any) => void) {
    const client = requireSupabase();
    return client
      .channel(`chat:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        async (payload) => {
          const { data: userData } = await client
            .from("users")
            .select("name, role")
            .eq("id", payload.new.user_id)
            .single();

          callback({
            id: payload.new.id,
            user: userData?.name || "Guest",
            badge: payload.new.badge || (userData?.role === "ADMIN" ? "ADMIN" : null),
            message: payload.new.message,
            time: new Date(payload.new.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            avatar: "👤",
          });
        }
      )
      .subscribe();
  },

  async sendTelegramNotification(chatId: string, message: string) {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn("Telegram Token missing. Skipping notification.");
      return;
    }

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      });
    } catch (err) {
      console.error("Telegram delivery failed:", err);
    }
  },

  async broadcastTournamentNotification(tournament: Tournament) {
    const client = requireSupabase();
    const { data: users, error } = await client
      .from("users")
      .select("telegram_chat_id")
      .not("telegram_chat_id", "is", null);

    if (error) {
      console.error("Failed to fetch users for broadcast:", error);
      return;
    }

    const baseUrl = window.location.origin;
    const tournamentUrl = `${baseUrl}/tournaments/${tournament.id}`;
    const message = `🏆 <b>New Tournament Alert!</b>\n\n<b>${tournament.title}</b> is now open for registration! Check it out and secure your spot.\n\n<a href="${tournamentUrl}">View Tournament Details</a>`;

    const notifications = users.map((u) =>
      this.sendTelegramNotification(u.telegram_chat_id, message)
    );

    await Promise.allSettled(notifications);
  },

  async notifyTournamentOrganizers(tournamentId: string, message: string) {
    const client = requireSupabase();
    try {
      const { data: admins, error } = await client
        .from("tournament_admins")
        .select("user_id, users(telegram_chat_id)")
        .eq("tournament_id", tournamentId);

      if (error) throw error;

      const chatIds = admins
        .map((a: any) => {
          const userData = Array.isArray(a.users) ? a.users[0] : a.users;
          return userData?.telegram_chat_id;
        })
        .filter(Boolean);

      const { data: tournament } = await client
        .from("tournaments")
        .select("organizer_id, users!organizer_id(telegram_chat_id)")
        .eq("id", tournamentId)
        .single();

      const organizerUser = Array.isArray(tournament?.users) ? tournament.users[0] : tournament?.users;
      if (organizerUser?.telegram_chat_id) {
        chatIds.push(organizerUser.telegram_chat_id);
      }

      const uniqueChatIds = [...new Set(chatIds)];

      const notifications = uniqueChatIds.map((id) =>
        this.sendTelegramNotification(id, `📢 <b>Organizer Alert</b>\n\n${message}`)
      );

      await Promise.allSettled(notifications);
    } catch (err) {
      console.error("Failed to notify organizers:", err);
    }
  },
};
