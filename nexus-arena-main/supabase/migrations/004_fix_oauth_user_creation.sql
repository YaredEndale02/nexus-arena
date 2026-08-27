-- Migration: 004_fix_oauth_user_creation.sql
-- Fixes Google OAuth / OAuth registration errors: "Database error saving new user"
-- Ensures all columns exist on public.users, handles RLS, and makes public.handle_new_auth_user() fail-safe.

-- 1. Ensure all expected profile columns exist in public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS venue_location TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS riot_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS discord_handle TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country_code TEXT;

-- 2. Replace handle_new_auth_user with a robust, fail-safe implementation
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_email text;
  v_role text;
  v_phone text;
  v_riot_id text;
  v_avatar text;
BEGIN
  -- Extract and sanitize values safely from auth metadata
  v_email := NEW.email;
  
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'user_name'), ''),
    NULLIF(SPLIT_PART(NEW.email, '@', 1), ''),
    'Arena Player'
  );

  v_role := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''),
    'PLAYER'
  );

  v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), '');
  v_riot_id := NULLIF(TRIM(NEW.raw_user_meta_data->>'riot_id'), '');
  v_avatar := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), '')
  );

  -- Upsert into public.users safely
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    phone_number,
    riot_id,
    avatar_url,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::text,
    v_email,
    v_name,
    v_role,
    v_phone,
    v_riot_id,
    v_avatar,
    'ACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    name = COALESCE(EXCLUDED.name, public.users.name),
    role = COALESCE(public.users.role, EXCLUDED.role),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    phone_number = COALESCE(public.users.phone_number, EXCLUDED.phone_number),
    riot_id = COALESCE(public.users.riot_id, EXCLUDED.riot_id),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth user creation if profile sync encounters an unhandled error
  RAISE WARNING 'handle_new_auth_user exception: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- 4. Ensure RLS policies allow authenticated users to view and update their own profile
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
CREATE POLICY "Users can view all profiles"
  ON public.users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);
