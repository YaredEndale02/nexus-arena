export interface SupabaseUserRow {
  id: string;
  name: string | null;
  role: string;
  riot_id: string | null;
  created_at?: string;
}

export interface SupabaseTournamentRow {
  id: string;
  title: string;
  game_title: string;
  start_date: string;
  max_teams: number;
  entry_fee: number;
  prize_pool: number;
  status: string;
  organizer_id: string | null;
  created_at?: string;
}

export interface SupabaseTeamRow {
  id: string;
  name: string;
  logo_url: string | null;
  captain_id: string;
  created_at?: string;
}

export interface SupabaseTeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  created_at?: string;
}

export interface SupabaseTournamentEntryRow {
  id: string;
  team_id: string;
  tournament_id: string;
  payment_status: string;
  created_at?: string;
}

export interface SupabaseMatchRow {
  id: string;
  tournament_id: string;
  round_label: string;
  team1_name: string;
  team2_name: string;
  team1_score: number;
  team2_score: number;
  scheduled_at: string | null;
  status: string;
  winner_name: string | null;
  created_at?: string;
}
