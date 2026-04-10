# Phase 1 Manual QA

Use this checklist after `npm run dev` with a working Supabase project.

## Organizer Lifecycle

1. Sign in as an organizer or a delegated tournament staff account.
2. Open `/admin/tournaments`.
3. Create a new tournament draft with valid title, game, dates, team limits, and fees.
4. Verify invalid values are blocked:
   - blank title or game
   - registration close after start date
   - max players lower than min players
   - negative fee or prize values
5. Publish the tournament.
6. Open registration.
7. Close registration.
8. Open check-in.
9. Attempt to jump directly from `REGISTRATION_OPEN` to `LIVE` and confirm it is blocked.

## Staff Delegation

1. In Tournament Control, add another signed-in user by `public.users.id`.
2. Assign `STAFF`, `REFEREE`, or `ADMIN`.
3. Confirm the assigned user can access `/admin/tournaments`.
4. Confirm a signed-in user with no ownership or assignment sees no managed tournaments.
5. Remove delegated staff and confirm access is revoked on reload.

## Registration, Check-In, and Roster Lock

1. Sign in as a captain and register a team while the tournament is `REGISTRATION_OPEN`.
2. Return to Tournament Control.
3. Mark the entry `CHECKED_IN`.
4. Lock the team roster.
5. Try adding or removing a team member on `/teams` and confirm roster lock blocks the change.

## Bracket and Reporting

1. Attempt bracket generation before all teams are checked in and roster-locked; confirm it is blocked.
2. Complete check-in and roster lock for at least two teams.
3. Generate the bracket.
4. Attempt bracket generation a second time and confirm it is blocked.
5. Report a match with a tied score and confirm it is rejected.
6. Report a valid match result and verify the winner advances to the next round.
