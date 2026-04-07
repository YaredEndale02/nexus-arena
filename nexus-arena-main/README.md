# Nexus Arena

This project uses:

- React + Vite for the frontend
- Express for the API layer
- Prisma for database access
- PostgreSQL, now prepared for Supabase

## Supabase Setup

The backend has been prepared to use Supabase Postgres without replacing the current Express + Prisma architecture.

1. Open `server/.env.example`.
2. Copy it to `server/.env` if needed.
3. Replace `DATABASE_URL` with your Supabase Prisma pooled connection string if you want to keep it for reference.
4. Replace `DIRECT_URL` with your Supabase direct Postgres connection string. The current Prisma setup prefers `DIRECT_URL`.
5. Run the database setup commands from the `server` folder:

```powershell
npm run prisma:generate
npm run db:push
npm run db:seed
```

6. Start the backend:

```powershell
npm run dev
```

The frontend already talks to the API layer. If your frontend runs separately, set `VITE_API_BASE_URL` to your backend URL.
