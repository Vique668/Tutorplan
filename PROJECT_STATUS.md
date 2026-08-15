# TutorPlan MVP — progress

Last updated: 2026-08-16

## Audit completed

- Existing Next.js App Router application and seasonal UI are preserved.
- Supabase browser/server clients already use the publishable environment key.
- Students, parents, lessons, other events, and lesson series already have partial Supabase data layers.
- Calendar day/week/month views and weekly schedule board already exist.
- Existing database shape was reviewed from every migration in `supabase/migrations`.
- Direct remote schema introspection is unavailable with the current unauthenticated publishable session; repository migrations are therefore the authoritative schema source until migrations are applied and an authenticated session exists.

## Confirmed gaps

- No Supabase Auth UI, route protection, profile linkage, or logout flow.
- Remote migrations still need to be applied by a Supabase project administrator.
- Live end-to-end and cross-tenant tests require two real Auth accounts after migration application.

## Implementation stages

- [x] Authentication, profile/tutor linkage, route protection, RLS, remove hardcoded tutor id
- [x] Supabase-backed groups and group lesson targets
- [x] Schedule/calendar generation hardening, actions, and collision warnings
- [x] Finance ledger and student finance summaries
- [x] Tasks and real statistics
- [x] Persistent profile/work/notification/payment/appearance/security settings
- [x] Static multi-tenant/security audit and project checks
- [ ] Apply migrations and perform live two-account verification in the target Supabase project

## Manual Supabase work expected

Migration files can be created locally, but this workspace currently has no Supabase CLI project link, database password, or service-role/server administration credential. No destructive or remote database command will be attempted. The final report will list the exact safe migration application steps.
