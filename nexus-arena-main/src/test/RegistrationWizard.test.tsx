import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegistrationWizard } from "@/components/RegistrationWizard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Tournament } from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      name: "Test Captain",
      email: "captain@test.com",
      role: "PLAYER",
    },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getMyTeams: vi.fn().mockResolvedValue([
      { id: "team-1", name: "Team Alpha", captainId: "user-1", members: [] },
    ]),
    getMyTournamentEntries: vi.fn().mockResolvedValue([]),
    registerTeam: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockTournament: Tournament = {
  id: "tourney-1",
  title: "Valorant Masters",
  gameTitle: "VALORANT",
  format: "TEAM",
  tournamentType: "ONLINE",
  bracketType: "SINGLE_ELIMINATION",
  startDate: "2026-05-01T12:00:00.000Z",
  maxTeams: 16,
  minPlayersPerTeam: 5,
  entryFee: 0,
  prizePool: 500,
  waitlistEnabled: false,
  visibility: "PUBLIC",
  status: "REGISTRATION_OPEN",
};

describe("RegistrationWizard", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const renderComponent = (isOpen = true) =>
    render(
      <QueryClientProvider client={queryClient}>
        <RegistrationWizard
          tournament={mockTournament}
          isOpen={isOpen}
          onClose={vi.fn()}
        />
      </QueryClientProvider>
    );

  it("renders tournament title and registration wizard step 1 when open", () => {
    renderComponent(true);
    expect(screen.getByText("Valorant Masters")).toBeInTheDocument();
  });

  it("does not render modal content when closed", () => {
    renderComponent(false);
    expect(screen.queryByText("Valorant Masters")).not.toBeInTheDocument();
  });
});
