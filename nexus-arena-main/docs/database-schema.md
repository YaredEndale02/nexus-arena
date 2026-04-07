# Database Schema

This project is now organized around a Supabase-first relational model with four major areas:

- Identity and organizations
- Team and player management
- Tournament operations
- Payments, communications, and auditability

The current frontend already uses the core operational tables:

- `users`
- `teams`
- `team_members`
- `tournaments`
- `tournament_entries`
- `matches`

The expanded schema in [supabase/schema.sql](/C:/Users/HP/Downloads/nexus-arena-main/nexus-arena-main/supabase/schema.sql) keeps those tables compatible while adding the rest of the platform structure.

## Design Principles

- Use `auth.users` as the source of truth for authentication.
- Mirror public profile data into `public.users` for joins and RLS.
- Keep tournament data normalized enough for real operations, but practical for Supabase queries.
- Snapshot roster and reporting state where auditability matters.
- Separate public-facing records from internal operations like payouts and audit logs.

## Core Domains

### Identity

`users`
- Public profile and application role.
- Joined to almost every other table.

`player_game_accounts`
- Stores linked game identities like Riot, Steam, or Epic accounts.
- Lets us verify eligibility without overloading `users`.

### Organizations

`organizations`
- Optional umbrella entity for hosts, leagues, or esports clubs.

`organization_members`
- Membership and staff roles inside an organization.

### Teams

`teams`
- The roster container used for tournament registration.

`team_members`
- Current roster membership with role and membership status.

`team_invites`
- Invitation workflow for pending roster additions.

### Tournament Hosting

`games`
- Canonical game catalog used by tournaments and player accounts.

`tournaments`
- Main event record.
- Stores visibility, status, bracket style, registration windows, venue, fees, and team-size rules.

`tournament_admins`
- Additional staff beyond the main organizer.

`tournament_stages`
- Supports qualifiers, groups, playoffs, and finals under one tournament.

`tournament_stage_seeds`
- Seed and group placement at the stage level.

`tournament_entries`
- A team's registration into a tournament.
- Tracks approval, payment, check-in, seeding, and roster lock state.

`tournament_entry_members`
- Snapshot of the submitted roster for that entry.
- Important because team rosters can change over time, but tournament rosters often lock.

### Match Operations

`matches`
- Official scheduled match between two teams.
- Supports rounds, bracket sides, start/completion times, and official winner.

`match_games`
- Child games or maps for best-of series.

`match_reports`
- Submitted score reports from admins, referees, or team captains.

`disputes`
- Formal issues raised around a match or tournament decision.

`penalties`
- Warnings, match loss, DQ, or bans tied to tournaments, teams, users, or disputes.

### Money

`payments`
- Entry fee payments and refunds.

`payouts`
- Prize distribution records.

### Communication and Live Ops

`announcements`
- Tournament or platform-wide notices.

`notifications`
- User-targeted in-app notifications.

`notification_deliveries`
- Channel delivery tracking for email, Discord, SMS, or webhook.

`live_streams`
- Broadcast links for tournaments or specific matches.

`chat_messages`
- Live event chat feed if we choose to persist it.

### Governance

`audit_logs`
- Event trail for admin actions and sensitive updates.

## Recommended Relationship Flow

1. A user signs up in Supabase Auth.
2. The auth trigger creates or updates `public.users`.
3. A captain creates a `team` and manages `team_members`.
4. An organizer creates a `tournament`.
5. The team creates a `tournament_entry`.
6. The roster is snapshotted into `tournament_entry_members`.
7. Organizers seed teams into `tournament_stage_seeds`.
8. The platform schedules `matches` and `match_games`.
9. Results arrive through `match_reports`, with disputes and penalties handled if needed.
10. Entry fees and prizes are tracked in `payments` and `payouts`.

## Table Priorities

For the current product, these are the highest-priority tables to build against first:

- `users`
- `teams`
- `team_members`
- `tournaments`
- `tournament_entries`
- `tournament_entry_members`
- `tournament_stages`
- `matches`
- `match_games`
- `announcements`
- `notifications`
- `audit_logs`

These are the next layer once monetization and moderation mature:

- `payments`
- `payouts`
- `disputes`
- `penalties`
- `team_invites`
- `player_game_accounts`
- `live_streams`

## RLS Strategy

The SQL file includes real RLS for the tables the app already uses most:

- users
- teams
- team_members
- tournaments
- tournament_entries
- matches
- announcements
- notifications

Internal or admin-heavy tables are present in the schema so the model is complete, but some of those flows will still be best handled initially through service-role functions or secure server actions once those features are built.

## Migration Notes

- The schema is backward-compatible with the current frontend fields.
- Existing MVP tables are expanded with `alter table ... add column if not exists`.
- The next app-level step is updating TypeScript Supabase row types in [types.ts](/C:/Users/HP/Downloads/nexus-arena-main/nexus-arena-main/src/integrations/supabase/types.ts) as new features start using the added tables.
