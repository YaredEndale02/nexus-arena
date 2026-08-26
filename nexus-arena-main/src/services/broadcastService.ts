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

  async sendInAppNotification(userId: string, title: string, message: string, type: "MATCH_CALL" | "CHECK_IN" | "ANNOUNCEMENT" | "DISPUTE" | "SYSTEM" = "SYSTEM", link?: string) {
    const client = requireSupabase();
    try {
      await client.from("notifications").insert({
        user_id: userId,
        title,
        message,
        type,
        link,
      });
    } catch (err) {
      console.error("Failed to insert in-app notification:", err);
    }
  },

  async sendTelegramNotification(chatId: string, message: string) {
    // Proxy through the Express server so the bot token is never in the client bundle.
    const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
    try {
      await fetch(`${base}/api/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message }),
      });
    } catch (err) {
      console.error("Telegram delivery failed:", err);
    }
  },

  async broadcastTournamentNotification(tournament: Tournament) {
    const client = requireSupabase();
    const { data: users, error } = await client
      .from("users")
      .select("id, telegram_chat_id");

    if (error || !users) {
      console.error("Failed to fetch users for broadcast:", error);
      return;
    }

    const baseUrl = window.location.origin;
    const tournamentUrl = `${baseUrl}/tournaments/${tournament.id}`;
    const telegramMessage = `🏆 <b>New Tournament Alert!</b>\n\n<b>${tournament.title}</b> is now open for registration! Check it out and secure your spot.\n\n<a href="${tournamentUrl}">View Tournament Details</a>`;

    const tasks = users.map(async (u) => {
      // 1. In-App Notification Bell
      await this.sendInAppNotification(
        u.id,
        "New Tournament Alert",
        `${tournament.title} is now open for registration!`,
        "ANNOUNCEMENT",
        `/tournaments/${tournament.id}`
      );

      // 2. Telegram Bot Notification
      if (u.telegram_chat_id) {
        await this.sendTelegramNotification(u.telegram_chat_id, telegramMessage);
      }
    });

    await Promise.allSettled(tasks);
  },

  async notifyTournamentOrganizers(tournamentId: string, message: string) {
    const client = requireSupabase();
    try {
      const { data: admins, error } = await client
        .from("tournament_admins")
        .select("user_id, users(id, telegram_chat_id)")
        .eq("tournament_id", tournamentId);

      if (error) throw error;

      const userRecords: Array<{ id: string; telegramChatId?: string }> = (admins || []).map((a: any) => {
        const u = Array.isArray(a.users) ? a.users[0] : a.users;
        return { id: u?.id || a.user_id, telegramChatId: u?.telegram_chat_id };
      });

      const { data: tournament } = await client
        .from("tournaments")
        .select("organizer_id, users!organizer_id(id, telegram_chat_id)")
        .eq("id", tournamentId)
        .single();

      const organizerUser = Array.isArray(tournament?.users) ? tournament.users[0] : tournament?.users;
      if (organizerUser?.id) {
        userRecords.push({ id: organizerUser.id, telegramChatId: organizerUser.telegram_chat_id });
      }

      const uniqueUsers = Array.from(new Map(userRecords.map((item) => [item.id, item])).values());

      const tasks = uniqueUsers.map(async (u) => {
        // 1. In-App Notification Bell
        await this.sendInAppNotification(u.id, "Organizer Alert", message.replace(/<[^>]*>?/gm, ""), "SYSTEM", `/admin/tournaments`);

        // 2. Telegram Bot Notification
        if (u.telegramChatId) {
          await this.sendTelegramNotification(u.telegramChatId, `📢 <b>Organizer Alert</b>\n\n${message}`);
        }
      });

      await Promise.allSettled(tasks);
    } catch (err) {
      console.error("Failed to notify organizers:", err);
    }
  },

  async notifyMatchCallout(match: any, tournamentTitle: string) {
    const message = `⚔️ <b>Match Callout: ${tournamentTitle}</b>\n\n<b>${match.team1Name || "Team 1"}</b> vs <b>${match.team2Name || "Team 2"}</b>\nRound: <b>${match.roundLabel || "Match"}</b>\n\nPlease prepare for your upcoming match!`;
    await this.notifyTournamentOrganizers(match.tournamentId || match.tournament_id, message);
  },
};
