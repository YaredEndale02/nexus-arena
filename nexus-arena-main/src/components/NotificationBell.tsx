import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, Swords, Trophy, Clock, ExternalLink, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "MATCH_CALL" | "CHECK_IN" | "ANNOUNCEMENT" | "DISPUTE" | "SYSTEM";
  read: boolean;
  link?: string;
  createdAt: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user || !supabase) return;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (!error && data) {
          setNotifications(
            data.map((row: any) => ({
              id: row.id,
              title: row.title || "Notification",
              message: row.message || "",
              type: row.type || "SYSTEM",
              read: row.read ?? false,
              link: row.link,
              createdAt: row.created_at || new Date().toISOString(),
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();

    // Subscribe to realtime notification changes if logged in
    const channel = supabase
      .channel(`user-notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          setNotifications((prev) => [
            {
              id: newRow.id,
              title: newRow.title || "Notification",
              message: newRow.message || "",
              type: newRow.type || "SYSTEM",
              read: false,
              link: newRow.link,
              createdAt: newRow.created_at || new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  if (!user) return null;

  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "MATCH_CALL":
        return <Swords className="w-4 h-4 text-primary" />;
      case "CHECK_IN":
        return <Clock className="w-4 h-4 text-amber-400" />;
      case "DISPUTE":
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      default:
        return <Trophy className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/80 hover:text-white hover:bg-white/10 rounded-full w-9 h-9"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 glass border-white/10 p-0 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h4 className="font-heading text-sm font-bold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                {unreadCount} new
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-[11px] text-muted-foreground hover:text-foreground h-7 px-2"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {/* Notification Feed List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => markAsRead(item.id)}
                className={cn(
                  "p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-white/5",
                  !item.read && "bg-primary/5"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-xs font-bold truncate", !item.read ? "text-foreground" : "text-muted-foreground")}>
                      {item.title}
                    </p>
                    <span className="text-[9px] text-muted-foreground shrink-0 font-mono">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>

                  {item.link && (
                    <a
                      href={item.link}
                      className="inline-flex items-center text-[10px] font-bold text-primary hover:underline mt-1.5"
                    >
                      View Details <ExternalLink className="w-2.5 h-2.5 ml-1" />
                    </a>
                  )}
                </div>

                {!item.read && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
