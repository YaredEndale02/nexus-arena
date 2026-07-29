import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationBell } from "@/components/NotificationBell";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "PlayerOne", role: "PLAYER" },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () =>
              Promise.resolve({
                data: [
                  { id: "n-1", title: "Match Callout", message: "Match ready", type: "MATCH_CALL", read: false },
                  { id: "n-2", title: "Check-In Reminder", message: "Check-in open", type: "CHECK_IN", read: false },
                ],
                error: null,
              }),
          }),
        }),
      }),
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => ({
          unsubscribe: vi.fn(),
        }),
      }),
    }),
  },
}));

describe("NotificationBell", () => {
  it("renders notification bell button with unread count badge", async () => {
    render(<NotificationBell />);
    const button = screen.getByRole("button", { name: /notifications/i });
    expect(button).toBeDefined();

    // Check for unread counter badge after async fetch
    const badge = await screen.findByText("2");
    expect(badge).toBeDefined();
  });

  it("opens notification dropdown when bell button is clicked", async () => {
    render(<NotificationBell />);
    const button = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(button);

    // Check header text inside popover
    expect(screen.getByText("Notifications")).toBeDefined();
    const item1 = await screen.findByText("Match Callout");
    const item2 = await screen.findByText("Check-In Reminder");
    expect(item1).toBeDefined();
    expect(item2).toBeDefined();
  });
});
