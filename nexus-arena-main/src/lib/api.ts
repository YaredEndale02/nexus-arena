const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001/api";

export interface Tournament {
  id: string;
  title: string;
  gameTitle: string;
  startDate: string;
  maxTeams: number;
  entryFee: number;
  prizePool: number;
  status: string;
  gradient?: string; // For UI
  _count?: {
    entries: number;
  };
  registeredTeams?: number; // Helper for mock/processed data
}

export interface Team {
  id: string;
  name: string;
  captainId: string;
  members: { user: { id: string; name: string; riotId?: string } }[];
}

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const error = (await res.json()) as { error?: string; message?: string };
    return error.error || error.message || fallback;
  } catch {
    return fallback;
  }
}

export const api = {
  async getTournaments(): Promise<Tournament[]> {
    const res = await fetch(`${API_BASE_URL}/tournaments`);
    if (!res.ok) throw new Error("Failed to fetch tournaments");
    return res.json();
  },

  async createTournament(data: Partial<Tournament>) {
    const res = await fetch(`${API_BASE_URL}/tournaments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to create tournament"));
    return res.json();
  },

  async registerTeam(tournamentId: string, teamId: string, initiatorUserId: string) {
    const res = await fetch(`${API_BASE_URL}/tournaments/${tournamentId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, initiatorUserId }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res, "Registration failed"));
    return res.json();
  },

  async getMyTeams(userId: string): Promise<Team[]> {
    const res = await fetch(`${API_BASE_URL}/teams/captain/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch teams");
    return res.json();
  },

  async createTeam(data: { name: string; captainId: string; logoUrl?: string }): Promise<Team> {
    const res = await fetch(`${API_BASE_URL}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res, "Failed to create team"));
    return res.json();
  },
};
