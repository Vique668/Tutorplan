# TutorPlan database schema

This directory contains additive PostgreSQL migrations for the future Supabase-backed version of TutorPlan. The current frontend still uses local mock data; these migrations are not executed by the application.

## Migration order

1. `migrations/202608150001_create_core_schema.sql` creates identities, tutor tenants, students, parents, groups, junction tables, and the shared `updated_at` trigger.
2. `migrations/202608150002_create_scheduling_schema.sql` creates recurring lesson configurations and concrete lesson occurrences.

No finance tables, authentication UI, seed data, destructive statements, or automatic migration commands are included.

## Tables

### `profiles`

Application-level identity for a Supabase Auth user. Its primary key is the matching `auth.users.id`. The `role` enum accepts `tutor`, `student`, or `parent`; basic display and contact fields live here.

### `tutors`

The root record for one tenant. Each tutor links one-to-one to a profile and owns students, groups, lesson series, and lessons. It also stores timezone and currency defaults.

### `students`

A student inside one tutor's tenant. A student can exist without an application account and may later link to a `profiles` row. Default lesson price, duration, notes, contact data, and active/archive state are stored here.

The `(id, tutor_id)` unique constraint supports tenant-safe composite foreign keys from groups and scheduling tables.

### `parents`

A parent or guardian account linked one-to-one to a parent profile. Parents are not owned by one tutor, allowing the same parent account to be related to students taught by different tutors.

### `parent_students`

Many-to-many relationship between parents and students. It can store a relationship label and identify the primary contact.

### `groups`

A tutor-owned teaching group with default price, duration, notes, and active/archive state.

### `group_students`

Many-to-many membership between groups and students. It includes `tutor_id` and uses composite foreign keys so a group cannot contain a student belonging to another tutor.

### `lesson_series`

Configuration for a recurring weekly lesson. It stores:

- the tutor and exactly one target: a student or a group;
- start and end dates;
- local start time, duration, and timezone;
- repeat interval, default price, status, and notes.

Series are kept separate from occurrences. This allows a series to be split when the user chooses “this and following lessons.”

### `lessons`

A concrete scheduled occurrence. Each lesson belongs to one tutor and exactly one student or group. It stores timezone-aware start/end timestamps, the price snapshot, lesson status, and notes.

For recurring lessons:

- `lesson_series_id` links to the template;
- `series_occurrence_date` stores the original planned date and remains stable if one lesson is moved;
- `is_series_exception` marks an occurrence edited independently.

The unique partial index on `(lesson_series_id, series_occurrence_date)` prevents duplicate occurrences for one series date.

## Multi-tenant integrity

Every tutor-owned domain table carries `tutor_id`. Composite foreign keys enforce tenant consistency for:

- students inside groups;
- lesson targets;
- recurring-series targets;
- lessons linked to recurring series.

This protects relational integrity, but it does not replace Row Level Security. Before exposing these tables through the Supabase Data API, add and test RLS policies for tutors, students, and parents. RLS is intentionally deferred because access rules and authentication flows have not been implemented yet.

## Status values

Lesson status is a PostgreSQL enum with the values already used by the frontend:

- `scheduled`
- `completed`
- `cancelled`
- `rescheduled`
- `no_show`

## Applying later

Review the SQL and configure a Supabase project before applying migrations. No migration has been executed automatically as part of this change.
