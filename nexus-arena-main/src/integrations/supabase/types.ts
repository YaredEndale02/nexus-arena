export type AppRole = "ADMIN" | "ORGANIZER" | "PLAYER" | "MODERATOR" | "REFEREE";

export type TournamentStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "CHECK_IN"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED";

export type TournamentFormat = "TEAM" | "SOLO" | "DUO";
export type TournamentType = "ONLINE" | "LAN" | "HYBRID";
export type BracketType =
  | "SINGLE_ELIMINATION"
  | "DOUBLE_ELIMINATION"
  | "ROUND_ROBIN"
  | "SWISS"
  | "GROUP_STAGE";

export interface SupabaseUserRow {
  id: string;
  email?: string | null;
  name: string | null;
  username?: string | null;
  role: AppRole | string;
  riot_id: string | null;
  discord_handle?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  country_code?: string | null;
  timezone?: string | null;
  status?: string;
  phone_number?: string | null;
  telegram_chat_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseOrganizationRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  owner_id: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseOrganizationMemberRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at?: string;
}

export interface SupabaseGameRow {
  id: string;
  title: string;
  slug: string;
  publisher: string | null;
  genre: string | null;
  platform: string | null;
  team_size: number | null;
  min_team_size: number | null;
  max_team_size: number | null;
  supports_maps: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupabasePlayerGameAccountRow {
  id: string;
  user_id: string;
  game_id: string | null;
  provider: string;
  account_handle: string;
  account_tag: string | null;
  region: string | null;
  verified_at: string | null;
  created_at?: string;
}

export interface SupabaseTournamentRow {
  id: string;
  organization_id?: string | null;
  game_id?: string | null;
  title: string;
  slug?: string | null;
  game_title: string;
  short_description?: string | null;
  description?: string | null;
  rules?: string | null;
  format?: TournamentFormat | string;
  tournament_type?: TournamentType | string;
  bracket_type?: BracketType | string;
  status: TournamentStatus | string;
  visibility?: string;
  region?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  start_date: string;
  end_date?: string | null;
  registration_open_at?: string | null;
  registration_close_at?: string | null;
  check_in_open_at?: string | null;
  check_in_close_at?: string | null;
  max_teams: number;
  min_teams?: number;
  min_players_per_team?: number;
  max_players_per_team?: number | null;
  waitlist_enabled?: boolean;
  entry_fee: number;
  currency_code?: string;
  prize_pool: number;
  station_count?: number | null;
  match_duration_minutes?: number | null;
  rest_gap_minutes?: number | null;
  organizer_id: string | null;
  published_at?: string | null;
  stream_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseTeamRow {
  id: string;
  organization_id?: string | null;
  name: string;
  slug?: string | null;
  tag?: string | null;
  logo_url: string | null;
  banner_url?: string | null;
  description?: string | null;
  captain_id: string;
  created_by?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseTeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  status?: string;
  joined_at?: string;
  left_at?: string | null;
  created_at?: string;
}

export interface SupabaseTeamInviteRow {
  id: string;
  team_id: string;
  email: string | null;
  invited_user_id: string | null;
  invited_by: string;
  invite_token: string;
  role: string;
  status: string;
  expires_at: string | null;
  created_at?: string;
}

export interface SupabaseTournamentAdminRow {
  id: string;
  tournament_id: string;
  user_id: string;
  role: string;
  created_at?: string;
}

export interface SupabaseTournamentStageRow {
  id: string;
  tournament_id: string;
  name: string;
  stage_order: number;
  stage_type: string;
  format: BracketType | string;
  best_of: number;
  settings: Record<string, unknown>;
  created_at?: string;
}

export interface SupabaseTournamentStageSeedRow {
  id: string;
  stage_id: string;
  team_id: string;
  seed_number: number;
  group_label: string | null;
  created_at?: string;
}

export interface SupabaseTournamentEntryRow {
  id: string;
  team_id: string;
  tournament_id: string;
  registration_status?: string;
  payment_status: string;
  check_in_status?: string;
  seed_number?: number | null;
  notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  checked_in_at?: string | null;
  roster_locked_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseTournamentEntryMemberRow {
  id: string;
  entry_id: string;
  team_member_id: string | null;
  user_id: string | null;
  display_name: string;
  role: string;
  game_account_snapshot: Record<string, unknown>;
  created_at?: string;
}

export interface SupabaseMatchRow {
  id: string;
  tournament_id: string;
  stage_id?: string | null;
  round_label: string;
  round_number?: number | null;
  position_in_round?: number | null;
  bracket_side?: string | null;
  best_of?: number;
  team1_id?: string | null;
  team2_id?: string | null;
  team1_name: string;
  team2_name: string;
  team1_score: number;
  team2_score: number;
  winner_team_id?: string | null;
  loser_team_id?: string | null;
  scheduled_at: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  stream_url?: string | null;
  vod_url?: string | null;
  status: string;
  winner_name: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseMatchGameRow {
  id: string;
  match_id: string;
  game_number: number;
  map_name: string | null;
  team1_score: number;
  team2_score: number;
  winner_team_id: string | null;
  status: string;
  reported_at: string | null;
  created_at?: string;
}

export interface SupabaseMatchReportRow {
  id: string;
  match_id: string;
  submitted_by: string | null;
  source: string;
  report_payload: Record<string, unknown>;
  status: string;
  created_at?: string;
}

export interface SupabaseDisputeRow {
  id: string;
  tournament_id: string;
  match_id: string | null;
  reported_by: string | null;
  title: string;
  description: string;
  status: string;
  resolution_summary: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabasePenaltyRow {
  id: string;
  tournament_id: string;
  team_id: string | null;
  user_id: string | null;
  dispute_id: string | null;
  penalty_type: string;
  reason: string;
  issued_by: string | null;
  created_at?: string;
}

export interface SupabasePaymentRow {
  id: string;
  tournament_entry_id: string | null;
  payer_user_id: string | null;
  provider: string;
  provider_reference: string | null;
  amount: number;
  currency_code: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface SupabasePayoutRow {
  id: string;
  tournament_id: string;
  recipient_team_id: string | null;
  recipient_user_id: string | null;
  placement: number | null;
  amount: number;
  currency_code: string;
  status: string;
  provider_reference: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseAnnouncementRow {
  id: string;
  tournament_id: string | null;
  author_id: string | null;
  title: string;
  body: string;
  visibility: string;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseNotificationRow {
  id: string;
  recipient_user_id: string;
  tournament_id: string | null;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at?: string;
}

export interface SupabaseNotificationDeliveryRow {
  id: string;
  notification_id: string;
  channel: string;
  status: string;
  provider_reference: string | null;
  attempted_at: string | null;
  created_at?: string;
}

export interface SupabaseLiveStreamRow {
  id: string;
  tournament_id: string;
  match_id: string | null;
  platform: string;
  stream_url: string;
  title: string | null;
  is_primary: boolean;
  went_live_at: string | null;
  created_at?: string;
}

export interface SupabaseChatMessageRow {
  id: string;
  tournament_id: string | null;
  match_id: string | null;
  user_id: string | null;
  message: string;
  badge: string | null;
  created_at?: string;
}

export interface SupabaseAuditLogRow {
  id: string;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  payload: Record<string, unknown>;
  created_at?: string;
}
