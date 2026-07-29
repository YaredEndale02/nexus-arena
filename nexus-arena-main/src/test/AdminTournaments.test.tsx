import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminTournaments from "@/pages/AdminTournaments";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      name: "Admin User",
      role: "ADMIN",
    },
    isLoading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getManagedTournaments: vi.fn().mockResolvedValue([
      {
        id: "tourney-100",
        title: "Pro CS2 Major",
        gameTitle: "Counter-Strike 2",
        format: "TEAM",
        tournamentType: "ONLINE",
        bracketType: "SINGLE_ELIMINATION",
        startDate: "2026-06-01T12:00:00.000Z",
        maxTeams: 16,
        minPlayersPerTeam: 5,
        entryFee: 50,
        prizePool: 5000,
        waitlistEnabled: false,
        visibility: "PUBLIC",
        status: "PUBLISHED",
        displayStatus: "Published",
        _count: { entries: 8, matches: 4 },
      },
    ]),
    getTournaments: vi.fn().mockResolvedValue([]),
  },
}));

describe("AdminTournaments Component", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminTournaments />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it("renders the tournament manager heading", async () => {
    renderPage();
    expect(await screen.findByText("Tournament Manager")).toBeInTheDocument();
  });

  it("displays the tournament title from the managed list", async () => {
    renderPage();
    expect(await screen.findByText("Pro CS2 Major")).toBeInTheDocument();
  });
});
