# TutorPlan database

All database changes are additive SQL migrations in [`migrations`](./migrations). The application never resets, truncates, or automatically migrates a remote database.

## Domain model

- `profiles` — application identity linked one-to-one to `auth.users`; roles are `tutor`, `student`, and `parent`.
- `tutors` — tenant root linked to the tutor's Auth user.
- `tutor_settings` — timezone, working hours, defaults, reminder preferences, payment text, income goal, and appearance mode.
- `students` — tutor-owned students, including contact details, defaults, notes, and archive state.
- `parents` / `parent_students` — optional contact people and their many-to-many student links. Parent surname, phone, and email remain nullable.
- `groups` / `group_students` — tutor-owned groups and membership.
- `lesson_series` — weekly recurring templates with an individual or group target. `deleted_at` provides history-safe soft deletion.
- `lessons` — concrete calendar occurrences. Exactly one of `student_id` or `group_id` is set.
- `other_events` — non-lesson calendar events.
- `finance_transactions` — immutable-style ledger. Amount is always a positive magnitude; transaction type determines direction. A partial unique index prevents duplicate lesson charges.
- `tasks` — personal tutor tasks.
- `account_invitations` — secure invitation metadata for future student/parent portals; delivery by email is not implemented.

## Authentication and isolation

Migration `202608160004_add_auth_profiles_and_rls.sql`:

- creates tutor profiles when Supabase Auth creates a public tutor account;
- links legacy tutors by matching email without changing their IDs;
- derives the active tenant with `current_tutor_id()`;
- assigns `tutor_id` in database triggers rather than trusting browser input;
- enables RLS on every private table and revokes anonymous CRUD.

Later module migrations add equivalent RLS to settings, finances, tasks, and invitations. Junction policies require both related records to belong to the current tutor.

## Recurring lessons

The schedule board stores rules in `lesson_series`; the calendar reads only `lessons`. Generation is rolling and idempotent:

- `(lesson_series_id, series_occurrence_date)` is unique;
- normal calendar navigation only inserts missing occurrences and does not overwrite individually edited lessons;
- explicit “future lessons” updates never modify completed lessons;
- indefinite schedules generate a bounded rolling range, not infinite years.

## Finance convention

- `payment` and `adjustment` add student credit.
- `lesson_charge` and `refund` reduce student credit.
- `expense` affects tutor profit but not student balance.
- Completing a paid lesson creates or updates one idempotent `lesson_charge`.
- Changing a completed lesson back to another status voids its charge instead of deleting history.

## Apply to Supabase

The workspace currently has only public client credentials, so migrations were not applied remotely. Choose one safe method:

### Supabase CLI

1. Install and authenticate the Supabase CLI.
2. From the project root run `supabase link --project-ref <your-project-ref>`.
3. Review pending SQL with `supabase migration list`.
4. Apply with `supabase db push`.

### Supabase Dashboard

Open SQL Editor and execute the migration files in filename order, starting with the first file not already applied. Do not rerun an already-applied migration.

Afterward configure Auth URL settings:

- Site URL: your production URL (or `http://localhost:3000` for local-only testing).
- Redirect URLs: add `http://localhost:3000/auth/callback` and the production `/auth/callback` URL.
- Decide whether email confirmation is required for your environment.

No service-role key belongs in `.env.local` or browser code.
