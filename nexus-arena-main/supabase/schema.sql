create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
as $$
begin
  return exists (
    select 1
    from public.users
    where id = auth.uid()::text
      and role = 'ADMIN'
  );
end;
$$;

create or replace function public.is_organizer()
returns boolean
language plpgsql
stable
as $$
begin
  return exists (
    select 1
    from public.users
    where id = auth.uid()::text
      and role in ('ADMIN', 'ORGANIZER')
  );
end;
$$;

create or replace function public.is_team_captain(target_team_id uuid)
returns boolean
language plpgsql
stable
as $$
begin
  return exists (
    select 1
    from public.teams
    where id = target_team_id
      and captain_id = auth.uid()::text
  );
end;
$$;

create or replace function public.can_manage_tournament(target_tournament_id uuid)
returns boolean
language plpgsql
stable
as $$
begin
  return exists (
    select 1
    from public.tournaments
    where id = target_tournament_id
      and (
        organizer_id = auth.uid()::text
        or public.is_admin()
      )
  );
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    name,
    username,
    role,
    riot_id,
    timezone
  )
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'role', 'PLAYER'),
    nullif(new.raw_user_meta_data->>'riot_id', ''),
    nullif(new.raw_user_meta_data->>'timezone', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    username = coalesce(excluded.username, public.users.username),
    role = excluded.role,
    riot_id = excluded.riot_id,
    timezone = coalesce(excluded.timezone, public.users.timezone);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create table if not exists public.users (
  id text primary key,
  email text unique,
  name text not null,
  username text unique,
  role text not null default 'PLAYER' check (role in ('ADMIN', 'ORGANIZER', 'PLAYER', 'MODERATOR', 'REFEREE')),
  riot_id text,
  discord_handle text,
  avatar_url text,
  bio text,
  country_code text,
  timezone text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  website_url text,
  owner_id text references public.users(id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('OWNER', 'ADMIN', 'STAFF', 'MEMBER')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  publisher text,
  genre text,
  platform text,
  team_size integer,
  min_team_size integer,
  max_team_size integer,
  supports_maps boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_game_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  provider text not null,
  account_handle text not null,
  account_tag text,
  region text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  slug text unique,
  tag text,
  logo_url text,
  banner_url text,
  description text,
  captain_id text not null references public.users(id) on delete restrict,
  created_by text references public.users(id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'DISBANDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('CAPTAIN', 'COACH', 'MANAGER', 'SUBSTITUTE', 'MEMBER')),
  status text not null default 'ACTIVE' check (status in ('PENDING', 'ACTIVE', 'REMOVED')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text,
  invited_user_id text references public.users(id) on delete set null,
  invited_by text not null references public.users(id) on delete cascade,
  invite_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  role text not null default 'MEMBER' check (role in ('COACH', 'MANAGER', 'SUBSTITUTE', 'MEMBER')),
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  game_id uuid references public.games(id) on delete set null,
  organizer_id text references public.users(id) on delete set null,
  title text not null,
  slug text unique,
  game_title text not null,
  short_description text,
  description text,
  rules text,
  format text not null default 'TEAM' check (format in ('TEAM', 'SOLO', 'DUO')),
  tournament_type text not null default 'ONLINE' check (tournament_type in ('ONLINE', 'LAN', 'HYBRID')),
  bracket_type text not null default 'SINGLE_ELIMINATION' check (bracket_type in ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS', 'GROUP_STAGE')),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'CHECK_IN', 'LIVE', 'COMPLETED', 'CANCELLED')),
  visibility text not null default 'PUBLIC' check (visibility in ('PUBLIC', 'UNLISTED', 'PRIVATE')),
  region text,
  venue_name text,
  venue_address text,
  start_date timestamptz not null,
  end_date timestamptz,
  registration_open_at timestamptz,
  registration_close_at timestamptz,
  check_in_open_at timestamptz,
  check_in_close_at timestamptz,
  max_teams integer not null,
  min_teams integer not null default 2,
  min_players_per_team integer not null default 1,
  max_players_per_team integer,
  waitlist_enabled boolean not null default false,
  entry_fee integer not null default 0,
  currency_code text not null default 'USD',
  prize_pool integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournament_admins (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  role text not null default 'STAFF' check (role in ('OWNER', 'ADMIN', 'REFEREE', 'STAFF')),
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create table if not exists public.tournament_stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  stage_order integer not null default 1,
  stage_type text not null default 'MAIN' check (stage_type in ('QUALIFIER', 'GROUP', 'PLAYOFF', 'MAIN', 'FINAL')),
  format text not null default 'SINGLE_ELIMINATION' check (format in ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS', 'GROUP_STAGE')),
  best_of integer not null default 1,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tournament_id, stage_order)
);

create table if not exists public.tournament_stage_seeds (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.tournament_stages(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  seed_number integer not null,
  group_label text,
  created_at timestamptz not null default now(),
  unique (stage_id, team_id),
  unique (stage_id, seed_number)
);

create table if not exists public.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  registration_status text not null default 'PENDING' check (registration_status in ('PENDING', 'APPROVED', 'WAITLISTED', 'REJECTED', 'CANCELLED')),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'WAIVED')),
  check_in_status text not null default 'NOT_OPEN' check (check_in_status in ('NOT_OPEN', 'PENDING', 'CHECKED_IN', 'MISSED')),
  seed_number integer,
  notes text,
  approved_by text references public.users(id) on delete set null,
  approved_at timestamptz,
  checked_in_at timestamptz,
  roster_locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, tournament_id)
);

create table if not exists public.tournament_entry_members (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.tournament_entries(id) on delete cascade,
  team_member_id uuid references public.team_members(id) on delete set null,
  user_id text references public.users(id) on delete set null,
  display_name text not null,
  role text not null default 'MEMBER',
  game_account_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id uuid references public.tournament_stages(id) on delete set null,
  round_label text not null,
  round_number integer,
  position_in_round integer,
  bracket_side text check (bracket_side in ('UPPER', 'LOWER', 'GRAND_FINAL', 'GROUP')),
  best_of integer not null default 1,
  team1_id uuid references public.teams(id) on delete set null,
  team2_id uuid references public.teams(id) on delete set null,
  team1_name text not null,
  team2_name text not null,
  team1_score integer not null default 0,
  team2_score integer not null default 0,
  winner_team_id uuid references public.teams(id) on delete set null,
  loser_team_id uuid references public.teams(id) on delete set null,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  stream_url text,
  vod_url text,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED')),
  winner_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  game_number integer not null,
  map_name text,
  team1_score integer not null default 0,
  team2_score integer not null default 0,
  winner_team_id uuid references public.teams(id) on delete set null,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'VOID')),
  reported_at timestamptz,
  created_at timestamptz not null default now(),
  unique (match_id, game_number)
);

create table if not exists public.match_reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  submitted_by text references public.users(id) on delete set null,
  source text not null default 'ADMIN' check (source in ('ADMIN', 'TEAM_ONE', 'TEAM_TWO', 'REFEREE', 'AUTOMATION')),
  report_payload jsonb not null default '{}'::jsonb,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'CONFIRMED', 'REJECTED')),
  created_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  reported_by text references public.users(id) on delete set null,
  title text not null,
  description text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
  resolution_summary text,
  resolved_by text references public.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.penalties (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  user_id text references public.users(id) on delete set null,
  dispute_id uuid references public.disputes(id) on delete set null,
  penalty_type text not null check (penalty_type in ('WARNING', 'GAME_LOSS', 'MATCH_LOSS', 'DISQUALIFICATION', 'BAN')),
  reason text not null,
  issued_by text references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tournament_entry_id uuid references public.tournament_entries(id) on delete set null,
  payer_user_id text references public.users(id) on delete set null,
  provider text not null default 'MANUAL',
  provider_reference text,
  amount integer not null,
  currency_code text not null default 'USD',
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  recipient_team_id uuid references public.teams(id) on delete set null,
  recipient_user_id text references public.users(id) on delete set null,
  placement integer,
  amount integer not null,
  currency_code text not null default 'USD',
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'PAID', 'FAILED', 'CANCELLED')),
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  author_id text references public.users(id) on delete set null,
  title text not null,
  body text not null,
  visibility text not null default 'PUBLIC' check (visibility in ('PUBLIC', 'PARTICIPANTS', 'STAFF')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id text not null references public.users(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('IN_APP', 'EMAIL', 'DISCORD', 'SMS', 'WEBHOOK')),
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'FAILED', 'DELIVERED')),
  provider_reference text,
  attempted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.live_streams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  platform text not null,
  stream_url text not null,
  title text,
  is_primary boolean not null default false,
  went_live_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  user_id text references public.users(id) on delete set null,
  message text not null,
  badge text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text references public.users(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists email text;
alter table public.users add column if not exists username text;
alter table public.users add column if not exists discord_handle text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists country_code text;
alter table public.users add column if not exists timezone text;
alter table public.users add column if not exists status text not null default 'ACTIVE';
alter table public.users add column if not exists updated_at timestamptz not null default now();

alter table public.teams add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.teams add column if not exists slug text;
alter table public.teams add column if not exists tag text;
alter table public.teams add column if not exists banner_url text;
alter table public.teams add column if not exists description text;
alter table public.teams add column if not exists created_by text references public.users(id) on delete set null;
alter table public.teams add column if not exists status text not null default 'ACTIVE';
alter table public.teams add column if not exists updated_at timestamptz not null default now();

alter table public.team_members add column if not exists status text not null default 'ACTIVE';
alter table public.team_members add column if not exists joined_at timestamptz not null default now();
alter table public.team_members add column if not exists left_at timestamptz;

alter table public.tournaments add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.tournaments add column if not exists game_id uuid references public.games(id) on delete set null;
alter table public.tournaments add column if not exists slug text;
alter table public.tournaments add column if not exists short_description text;
alter table public.tournaments add column if not exists description text;
alter table public.tournaments add column if not exists rules text;
alter table public.tournaments add column if not exists format text not null default 'TEAM';
alter table public.tournaments add column if not exists tournament_type text not null default 'ONLINE';
alter table public.tournaments add column if not exists bracket_type text not null default 'SINGLE_ELIMINATION';
alter table public.tournaments add column if not exists visibility text not null default 'PUBLIC';
alter table public.tournaments add column if not exists region text;
alter table public.tournaments add column if not exists venue_name text;
alter table public.tournaments add column if not exists venue_address text;
alter table public.tournaments add column if not exists end_date timestamptz;
alter table public.tournaments add column if not exists registration_open_at timestamptz;
alter table public.tournaments add column if not exists registration_close_at timestamptz;
alter table public.tournaments add column if not exists check_in_open_at timestamptz;
alter table public.tournaments add column if not exists check_in_close_at timestamptz;
alter table public.tournaments add column if not exists min_teams integer not null default 2;
alter table public.tournaments add column if not exists min_players_per_team integer not null default 1;
alter table public.tournaments add column if not exists max_players_per_team integer;
alter table public.tournaments add column if not exists waitlist_enabled boolean not null default false;
alter table public.tournaments add column if not exists currency_code text not null default 'USD';
alter table public.tournaments add column if not exists published_at timestamptz;
alter table public.tournaments add column if not exists updated_at timestamptz not null default now();

alter table public.tournament_entries add column if not exists registration_status text not null default 'PENDING';
alter table public.tournament_entries add column if not exists check_in_status text not null default 'NOT_OPEN';
alter table public.tournament_entries add column if not exists seed_number integer;
alter table public.tournament_entries add column if not exists notes text;
alter table public.tournament_entries add column if not exists approved_by text references public.users(id) on delete set null;
alter table public.tournament_entries add column if not exists approved_at timestamptz;
alter table public.tournament_entries add column if not exists checked_in_at timestamptz;
alter table public.tournament_entries add column if not exists roster_locked_at timestamptz;
alter table public.tournament_entries add column if not exists updated_at timestamptz not null default now();

alter table public.matches add column if not exists stage_id uuid references public.tournament_stages(id) on delete set null;
alter table public.matches add column if not exists round_number integer;
alter table public.matches add column if not exists position_in_round integer;
alter table public.matches add column if not exists bracket_side text;
alter table public.matches add column if not exists best_of integer not null default 1;
alter table public.matches add column if not exists team1_id uuid references public.teams(id) on delete set null;
alter table public.matches add column if not exists team2_id uuid references public.teams(id) on delete set null;
alter table public.matches add column if not exists winner_team_id uuid references public.teams(id) on delete set null;
alter table public.matches add column if not exists loser_team_id uuid references public.teams(id) on delete set null;
alter table public.matches add column if not exists started_at timestamptz;
alter table public.matches add column if not exists completed_at timestamptz;
alter table public.matches add column if not exists stream_url text;
alter table public.matches add column if not exists vod_url text;
alter table public.matches add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_users_username_unique on public.users (username) where username is not null;
create unique index if not exists idx_teams_slug_unique on public.teams (slug) where slug is not null;
create unique index if not exists idx_tournaments_slug_unique on public.tournaments (slug) where slug is not null;
create unique index if not exists idx_player_game_accounts_provider_handle_tag_unique on public.player_game_accounts (provider, account_handle, coalesce(account_tag, ''));

create index if not exists idx_teams_captain_id on public.teams (captain_id);
create index if not exists idx_team_members_team_id on public.team_members (team_id);
create index if not exists idx_team_members_user_id on public.team_members (user_id);
create index if not exists idx_tournaments_organizer_id on public.tournaments (organizer_id);
create index if not exists idx_tournaments_status_start_date on public.tournaments (status, start_date);
create index if not exists idx_tournament_entries_tournament_id on public.tournament_entries (tournament_id);
create index if not exists idx_tournament_entries_team_id on public.tournament_entries (team_id);
create index if not exists idx_matches_tournament_id on public.matches (tournament_id);
create index if not exists idx_matches_stage_id on public.matches (stage_id);
create index if not exists idx_notifications_recipient_user_id on public.notifications (recipient_user_id, read_at);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_games_updated_at on public.games;
create trigger set_games_updated_at
  before update on public.games
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
  before update on public.teams
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_tournaments_updated_at on public.tournaments;
create trigger set_tournaments_updated_at
  before update on public.tournaments
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_tournament_entries_updated_at on public.tournament_entries;
create trigger set_tournament_entries_updated_at
  before update on public.tournament_entries
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_matches_updated_at on public.matches;
create trigger set_matches_updated_at
  before update on public.matches
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_disputes_updated_at on public.disputes;
create trigger set_disputes_updated_at
  before update on public.disputes
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
  before update on public.payments
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_payouts_updated_at on public.payouts;
create trigger set_payouts_updated_at
  before update on public.payouts
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at
  before update on public.announcements
  for each row execute procedure public.set_updated_at();

alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.games enable row level security;
alter table public.player_game_accounts enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_admins enable row level security;
alter table public.tournament_stages enable row level security;
alter table public.tournament_stage_seeds enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_entry_members enable row level security;
alter table public.matches enable row level security;
alter table public.match_games enable row level security;
alter table public.match_reports enable row level security;
alter table public.disputes enable row level security;
alter table public.penalties enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.live_streams enable row level security;
alter table public.chat_messages enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "users select authenticated" on public.users;
create policy "users select authenticated"
on public.users for select
to authenticated
using (true);

drop policy if exists "users insert self" on public.users;
create policy "users insert self"
on public.users for insert
to authenticated
with check (id = auth.uid()::text or public.is_admin());

drop policy if exists "users update self" on public.users;
create policy "users update self"
on public.users for update
to authenticated
using (id = auth.uid()::text or public.is_admin())
with check (id = auth.uid()::text or public.is_admin());

drop policy if exists "games public read" on public.games;
create policy "games public read"
on public.games for select
to anon, authenticated
using (true);

drop policy if exists "player accounts own read" on public.player_game_accounts;
create policy "player accounts own read"
on public.player_game_accounts for select
to authenticated
using (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "player accounts own write" on public.player_game_accounts;
create policy "player accounts own write"
on public.player_game_accounts for all
to authenticated
using (user_id = auth.uid()::text or public.is_admin())
with check (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "teams auth read" on public.teams;
create policy "teams auth read"
on public.teams for select
to authenticated
using (true);

drop policy if exists "teams captain create" on public.teams;
create policy "teams captain create"
on public.teams for insert
to authenticated
with check (captain_id = auth.uid()::text or public.is_admin());

drop policy if exists "teams captain update" on public.teams;
create policy "teams captain update"
on public.teams for update
to authenticated
using (captain_id = auth.uid()::text or public.is_admin())
with check (captain_id = auth.uid()::text or public.is_admin());

drop policy if exists "team members auth read" on public.team_members;
create policy "team members auth read"
on public.team_members for select
to authenticated
using (true);

drop policy if exists "team members captain manage" on public.team_members;
create policy "team members captain manage"
on public.team_members for all
to authenticated
using (public.is_team_captain(team_id) or public.is_admin())
with check (public.is_team_captain(team_id) or public.is_admin());

drop policy if exists "team invites captain manage" on public.team_invites;
create policy "team invites captain manage"
on public.team_invites for all
to authenticated
using (public.is_team_captain(team_id) or public.is_admin())
with check (public.is_team_captain(team_id) or public.is_admin());

drop policy if exists "tournaments public read" on public.tournaments;
create policy "tournaments public read"
on public.tournaments for select
to anon, authenticated
using (visibility <> 'PRIVATE' or public.can_manage_tournament(id) or public.is_admin());

drop policy if exists "tournaments organizer create" on public.tournaments;
create policy "tournaments organizer create"
on public.tournaments for insert
to authenticated
with check (organizer_id = auth.uid()::text and public.is_organizer());

drop policy if exists "tournaments organizer update" on public.tournaments;
create policy "tournaments organizer update"
on public.tournaments for update
to authenticated
using (public.can_manage_tournament(id))
with check (public.can_manage_tournament(id));

drop policy if exists "tournaments organizer delete" on public.tournaments;
create policy "tournaments organizer delete"
on public.tournaments for delete
to authenticated
using (public.can_manage_tournament(id));

drop policy if exists "tournament admin manage" on public.tournament_admins;
create policy "tournament admin manage"
on public.tournament_admins for all
to authenticated
using (public.can_manage_tournament(tournament_id))
with check (public.can_manage_tournament(tournament_id));

drop policy if exists "stages public read" on public.tournament_stages;
create policy "stages public read"
on public.tournament_stages for select
to anon, authenticated
using (true);

drop policy if exists "stages organizer manage" on public.tournament_stages;
create policy "stages organizer manage"
on public.tournament_stages for all
to authenticated
using (public.can_manage_tournament(tournament_id))
with check (public.can_manage_tournament(tournament_id));

drop policy if exists "stage seeds public read" on public.tournament_stage_seeds;
create policy "stage seeds public read"
on public.tournament_stage_seeds for select
to anon, authenticated
using (true);

drop policy if exists "stage seeds organizer manage" on public.tournament_stage_seeds;
create policy "stage seeds organizer manage"
on public.tournament_stage_seeds for all
to authenticated
using (
  exists (
    select 1
    from public.tournament_stages
    where id = tournament_stage_seeds.stage_id
      and public.can_manage_tournament(tournament_stages.tournament_id)
  )
)
with check (
  exists (
    select 1
    from public.tournament_stages
    where id = tournament_stage_seeds.stage_id
      and public.can_manage_tournament(tournament_stages.tournament_id)
  )
);

drop policy if exists "entries auth read" on public.tournament_entries;
create policy "entries auth read"
on public.tournament_entries for select
to authenticated
using (true);

drop policy if exists "entries captain create" on public.tournament_entries;
create policy "entries captain create"
on public.tournament_entries for insert
to authenticated
with check (public.is_team_captain(team_id) or public.is_admin());

drop policy if exists "entries organizer update" on public.tournament_entries;
create policy "entries organizer update"
on public.tournament_entries for update
to authenticated
using (
  public.can_manage_tournament(tournament_id)
  or public.is_team_captain(team_id)
  or public.is_admin()
)
with check (
  public.can_manage_tournament(tournament_id)
  or public.is_team_captain(team_id)
  or public.is_admin()
);

drop policy if exists "entry members auth read" on public.tournament_entry_members;
create policy "entry members auth read"
on public.tournament_entry_members for select
to authenticated
using (true);

drop policy if exists "entry members organizer manage" on public.tournament_entry_members;
create policy "entry members organizer manage"
on public.tournament_entry_members for all
to authenticated
using (
  exists (
    select 1
    from public.tournament_entries
    where id = tournament_entry_members.entry_id
      and (
        public.can_manage_tournament(tournament_entries.tournament_id)
        or public.is_team_captain(tournament_entries.team_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.tournament_entries
    where id = tournament_entry_members.entry_id
      and (
        public.can_manage_tournament(tournament_entries.tournament_id)
        or public.is_team_captain(tournament_entries.team_id)
      )
  )
);

drop policy if exists "matches public read" on public.matches;
create policy "matches public read"
on public.matches for select
to anon, authenticated
using (true);

drop policy if exists "matches organizer manage" on public.matches;
create policy "matches organizer manage"
on public.matches for all
to authenticated
using (public.can_manage_tournament(tournament_id))
with check (public.can_manage_tournament(tournament_id));

drop policy if exists "match games public read" on public.match_games;
create policy "match games public read"
on public.match_games for select
to anon, authenticated
using (true);

drop policy if exists "match games organizer manage" on public.match_games;
create policy "match games organizer manage"
on public.match_games for all
to authenticated
using (
  exists (
    select 1
    from public.matches
    where id = match_games.match_id
      and public.can_manage_tournament(matches.tournament_id)
  )
)
with check (
  exists (
    select 1
    from public.matches
    where id = match_games.match_id
      and public.can_manage_tournament(matches.tournament_id)
  )
);

drop policy if exists "match reports read auth" on public.match_reports;
create policy "match reports read auth"
on public.match_reports for select
to authenticated
using (true);

drop policy if exists "match reports submit auth" on public.match_reports;
create policy "match reports submit auth"
on public.match_reports for insert
to authenticated
with check (submitted_by = auth.uid()::text or public.is_admin());

drop policy if exists "disputes auth read" on public.disputes;
create policy "disputes auth read"
on public.disputes for select
to authenticated
using (true);

drop policy if exists "disputes auth create" on public.disputes;
create policy "disputes auth create"
on public.disputes for insert
to authenticated
with check (reported_by = auth.uid()::text or public.is_admin());

drop policy if exists "disputes organizer update" on public.disputes;
create policy "disputes organizer update"
on public.disputes for update
to authenticated
using (public.can_manage_tournament(tournament_id) or public.is_admin())
with check (public.can_manage_tournament(tournament_id) or public.is_admin());

drop policy if exists "penalties auth read" on public.penalties;
create policy "penalties auth read"
on public.penalties for select
to authenticated
using (true);

drop policy if exists "penalties organizer manage" on public.penalties;
create policy "penalties organizer manage"
on public.penalties for all
to authenticated
using (public.can_manage_tournament(tournament_id) or public.is_admin())
with check (public.can_manage_tournament(tournament_id) or public.is_admin());

drop policy if exists "announcements public read" on public.announcements;
create policy "announcements public read"
on public.announcements for select
to anon, authenticated
using (visibility in ('PUBLIC', 'PARTICIPANTS') or public.is_admin());

drop policy if exists "announcements organizer manage" on public.announcements;
create policy "announcements organizer manage"
on public.announcements for all
to authenticated
using (
  tournament_id is null
  or public.can_manage_tournament(tournament_id)
  or public.is_admin()
)
with check (
  tournament_id is null
  or public.can_manage_tournament(tournament_id)
  or public.is_admin()
);

drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read"
on public.notifications for select
to authenticated
using (recipient_user_id = auth.uid()::text or public.is_admin());

drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update"
on public.notifications for update
to authenticated
using (recipient_user_id = auth.uid()::text or public.is_admin())
with check (recipient_user_id = auth.uid()::text or public.is_admin());

drop policy if exists "streams public read" on public.live_streams;
create policy "streams public read"
on public.live_streams for select
to anon, authenticated
using (true);

drop policy if exists "streams organizer manage" on public.live_streams;
create policy "streams organizer manage"
on public.live_streams for all
to authenticated
using (public.can_manage_tournament(tournament_id))
with check (public.can_manage_tournament(tournament_id));

drop policy if exists "chat public read" on public.chat_messages;
create policy "chat public read"
on public.chat_messages for select
to anon, authenticated
using (true);

drop policy if exists "chat auth create" on public.chat_messages;
create policy "chat auth create"
on public.chat_messages for insert
to authenticated
with check (user_id = auth.uid()::text or public.is_admin());

drop policy if exists "audit admin read" on public.audit_logs;
create policy "audit admin read"
on public.audit_logs for select
to authenticated
using (public.is_admin());
