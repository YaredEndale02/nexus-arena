import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Bracket from "@/pages/Bracket";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "player-1",
      name: "Test Player",
      email: "player@test.com",
      role: "PLAYER",
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
    getTournament: vi.fn().mockResolvedValue({
      id: "tourney-1",
      title: "Championship Bracket",
      gameTitle: "Valorant",
      format: "TEAM",
      tournamentType: "ONLINE",
      bracketType: "SINGLE_ELIMINATION",
      startDate: "2026-05-01T12:00:00.000Z",
      maxTeams: 8,
      minPlayersPerTeam: 5,
      entryFee: 0,
      prizePool: 1000,
      waitlistEnabled: false,
      visibility: "PUBLIC",
      status: "LIVE",
      displayStatus: "Live",
    }),
    getTournamentMatches: vi.fn().mockResolvedValue([
      {
        id: "m1",
        tournamentId: "tourney-1",
        roundLabel: "Final",
        roundNumber: 1,
        positionInRound: 1,
        team1Name: "Alpha Squad",
        team2Name: "Omega Titans",
        team1Score: 2,
        team2Score: 1,
        status: "COMPLETED",
        winnerName: "Alpha Squad",
      },
    ]),
    subscribeToMatches: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  },
}));

describe("Bracket Page", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/tournaments/tourney-1/bracket"]}>
          <Routes>
            <Route path="/tournaments/:id/bracket" element={<Bracket />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it("renders match nodes with team names", async () => {
    renderPage();
    expect(await screen.findByText("Alpha Squad")).toBeInTheDocument();
    expect(await screen.findByText("Omega Titans")).toBeInTheDocument();
  });
});
