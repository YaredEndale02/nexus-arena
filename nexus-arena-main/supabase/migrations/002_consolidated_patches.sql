-- Migration: 002_consolidated_patches.sql
-- Consolidates administrative user fixes, RLS policy adjustments, and bracket structure constraints.

-- 1. Ensure streams & broadcast URL fields on tournaments
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS stream_url TEXT;

-- 2. Ensure Telegram chat ID on users and entries
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE public.tournament_entries ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- 3. Ensure index on matches for fast query throughput during live events
CREATE INDEX IF NOT EXISTS idx_matches_tournament_status ON public.matches(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament ON public.tournament_entries(tournament_id);

-- 4. Enable RLS on audit_logs if not enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
