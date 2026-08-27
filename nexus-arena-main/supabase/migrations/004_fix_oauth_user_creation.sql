-- Migration: 004_fix_oauth_user_creation.sql
-- Fixes Google OAuth / OAuth registration errors: "Database error saving new user"
-- and "duplicate key value violates unique constraint 'users_email_key'"

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

-- 2. Create or replace the handle_new_auth_user function with robust email conflict resolution
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
  v_existing_id text;
BEGIN
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

  -- Case A: Check if a user already exists with this exact auth UID
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id::text) THEN
    UPDATE public.users
    SET
      email = COALESCE(v_email, public.users.email),
      name = COALESCE(NULLIF(v_name, 'Arena Player'), public.users.name),
      role = COALESCE(public.users.role, v_role),
      avatar_url = COALESCE(v_avatar, public.users.avatar_url),
      phone_number = COALESCE(v_phone, public.users.phone_number),
      riot_id = COALESCE(v_riot_id, public.users.riot_id),
      updated_at = NOW()
    WHERE id = NEW.id::text;
    RETURN NEW;
  END IF;

  -- Case B: Check if a user already exists with this EMAIL under an older ID
  IF v_email IS NOT NULL AND v_email <> '' THEN
    SELECT id INTO v_existing_id FROM public.users WHERE email = v_email LIMIT 1;
    
    IF v_existing_id IS NOT NULL AND v_existing_id <> NEW.id::text THEN
      -- Re-link existing foreign key references to the new auth user ID
      BEGIN
        UPDATE public.team_members SET user_id = NEW.id::text WHERE user_id = v_existing_id;
        UPDATE public.tournament_entries SET user_id = NEW.id::text WHERE user_id = v_existing_id;
        UPDATE public.teams SET captain_id = NEW.id::text WHERE captain_id = v_existing_id;
        UPDATE public.teams SET created_by = NEW.id::text WHERE created_by = v_existing_id;
        UPDATE public.tournaments SET organizer_id = NEW.id::text WHERE organizer_id = v_existing_id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      -- Update the existing profile record with the new ID and latest info
      UPDATE public.users
      SET
        id = NEW.id::text,
        name = COALESCE(NULLIF(v_name, 'Arena Player'), public.users.name),
        role = COALESCE(public.users.role, v_role),
        avatar_url = COALESCE(v_avatar, public.users.avatar_url),
        phone_number = COALESCE(v_phone, public.users.phone_number),
        riot_id = COALESCE(v_riot_id, public.users.riot_id),
        updated_at = NOW()
      WHERE id = v_existing_id;

      RETURN NEW;
    END IF;
  END IF;

  -- Case C: Completely new user profile
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
  -- Never crash auth transactions
  RAISE WARNING 'handle_new_auth_user caught error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- 4. Row Level Security policies
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
