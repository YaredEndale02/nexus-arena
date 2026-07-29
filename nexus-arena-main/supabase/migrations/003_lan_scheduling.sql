-- Migration: 003_lan_scheduling.sql
-- Adds LAN-specific scheduling columns to tournaments for station management,
-- match duration estimates, and rest gap enforcement.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS station_count integer,
  ADD COLUMN IF NOT EXISTS match_duration_minutes integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS rest_gap_minutes integer DEFAULT 10;

COMMENT ON COLUMN public.tournaments.station_count IS 'Number of parallel play stations at LAN venue';
COMMENT ON COLUMN public.tournaments.match_duration_minutes IS 'Default match duration for scheduling (minutes)';
COMMENT ON COLUMN public.tournaments.rest_gap_minutes IS 'Minimum rest between consecutive matches for the same team (minutes)';
