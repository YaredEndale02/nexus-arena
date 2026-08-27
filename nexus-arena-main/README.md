# ADWA ARENA

This project now uses:

- React + Vite for the frontend
- Supabase Data API via `@supabase/supabase-js`
- Supabase Auth for sign-in and sign-up
- A SQL bootstrap file for the MVP schema, auth trigger, and RLS policies

## Supabase Setup

1. Create a `.env` file in the repo root from [.env.example](C:\Users\HP\Downloads\nexus-arena-main\nexus-arena-main\.env.example).
2. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project.
3. In Supabase Authentication, enable Email provider if it is not already enabled.
4. In Supabase SQL Editor, run [supabase/schema.sql](C:\Users\HP\Downloads\nexus-arena-main\nexus-arena-main\supabase\schema.sql).
5. Start the frontend:

```powershell
npm run dev
```

## How Auth Works

- Users sign up with email and password through the app.
- Supabase Auth stores the identity in `auth.users`.
- The trigger in [supabase/schema.sql](C:\Users\HP\Downloads\nexus-arena-main\nexus-arena-main\supabase\schema.sql) mirrors the auth user into `public.users`.
- Row-level security policies use the signed-in Supabase user to control team, tournament, and match access.

## Current Scope

- Public users can browse tournaments and matches.
- Signed-in players can create teams, manage their roster if they are captain, and register for tournaments.
- Organizers can create and manage their own tournaments and related matches.
- Admin support still exists in the schema and role model, but admin accounts should be assigned directly in Supabase data for now.
