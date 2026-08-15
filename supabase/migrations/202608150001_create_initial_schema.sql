-- Initial multi-tenant scheduling schema for TutorPlan.
-- This migration creates schema objects only. It contains no destructive statements.

create extension if not exists pgcrypto with schema extensions;

create table public.tutors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  constraint tutors_name_not_blank check (btrim(name) <> ''),
  constraint tutors_email_not_blank check (btrim(email) <> '')
);

create unique index tutors_email_unique_idx on public.tutors (lower(email));

create table public.students (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  lesson_price numeric(12, 2) not null default 0,
  lesson_duration integer not null default 60,
  notes text,
  status text not null default 'active',
  constraint students_id_tutor_key unique (id, tutor_id),
  constraint students_first_name_not_blank check (btrim(first_name) <> ''),
  constraint students_last_name_not_blank check (btrim(last_name) <> ''),
  constraint students_lesson_price_nonnegative check (lesson_price >= 0),
  constraint students_lesson_duration_positive check (lesson_duration > 0),
  constraint students_status_valid check (status in ('active', 'archived'))
);

create index students_tutor_status_idx on public.students (tutor_id, status);
create index students_tutor_name_idx on public.students (tutor_id, last_name, first_name);
create index students_tutor_email_idx on public.students (tutor_id, email)
  where email is not null;

create table public.parents (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  email text not null,
  constraint parents_first_name_not_blank check (btrim(first_name) <> ''),
  constraint parents_last_name_not_blank check (btrim(last_name) <> ''),
  constraint parents_email_not_blank check (btrim(email) <> '')
);

create index parents_tutor_name_idx on public.parents (tutor_id, last_name, first_name);
create index parents_tutor_email_idx on public.parents (tutor_id, email);

create table public.parent_students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint parent_students_parent_student_key unique (parent_id, student_id)
);

create index parent_students_parent_id_idx on public.parent_students (parent_id);
create index parent_students_student_id_idx on public.parent_students (student_id);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  lesson_price numeric(12, 2) not null default 0,
  lesson_duration integer not null default 60,
  notes text,
  status text not null default 'active',
  constraint groups_id_tutor_key unique (id, tutor_id),
  constraint groups_name_not_blank check (btrim(name) <> ''),
  constraint groups_lesson_price_nonnegative check (lesson_price >= 0),
  constraint groups_lesson_duration_positive check (lesson_duration > 0),
  constraint groups_status_valid check (status in ('active', 'archived'))
);

create index groups_tutor_status_idx on public.groups (tutor_id, status);
create index groups_tutor_name_idx on public.groups (tutor_id, name);

create table public.group_students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint group_students_group_student_key unique (group_id, student_id)
);

create index group_students_group_id_idx on public.group_students (group_id);
create index group_students_student_id_idx on public.group_students (student_id);

create table public.lesson_series (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  student_id uuid,
  group_id uuid,
  weekday smallint not null,
  start_time time without time zone not null,
  duration integer not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint lesson_series_id_tutor_key unique (id, tutor_id),
  constraint lesson_series_exactly_one_target check (num_nonnulls(student_id, group_id) = 1),
  constraint lesson_series_weekday_valid check (weekday between 1 and 7),
  constraint lesson_series_duration_positive check (duration > 0),
  constraint lesson_series_date_range_valid check (end_date >= start_date),
  constraint lesson_series_student_tenant_fk
    foreign key (student_id, tutor_id)
    references public.students (id, tutor_id)
    on delete restrict,
  constraint lesson_series_group_tenant_fk
    foreign key (group_id, tutor_id)
    references public.groups (id, tutor_id)
    on delete restrict
);

comment on column public.lesson_series.weekday is
  'ISO weekday number: 1 is Monday and 7 is Sunday.';

create index lesson_series_tutor_dates_idx
  on public.lesson_series (tutor_id, start_date, end_date);
create index lesson_series_student_id_idx
  on public.lesson_series (student_id) where student_id is not null;
create index lesson_series_group_id_idx
  on public.lesson_series (group_id) where group_id is not null;

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  student_id uuid,
  group_id uuid,
  lesson_series_id uuid,
  start_at timestamptz not null,
  end_at timestamptz not null,
  price numeric(12, 2) not null default 0,
  status text not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  constraint lessons_exactly_one_target check (num_nonnulls(student_id, group_id) = 1),
  constraint lessons_time_range_valid check (end_at > start_at),
  constraint lessons_price_nonnegative check (price >= 0),
  constraint lessons_status_valid check (
    status in ('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show')
  ),
  constraint lessons_student_tenant_fk
    foreign key (student_id, tutor_id)
    references public.students (id, tutor_id)
    on delete restrict,
  constraint lessons_group_tenant_fk
    foreign key (group_id, tutor_id)
    references public.groups (id, tutor_id)
    on delete restrict,
  constraint lessons_series_tenant_fk
    foreign key (lesson_series_id, tutor_id)
    references public.lesson_series (id, tutor_id)
    on delete restrict
);

create index lessons_tutor_start_at_idx on public.lessons (tutor_id, start_at);
create index lessons_tutor_status_start_at_idx
  on public.lessons (tutor_id, status, start_at);
create index lessons_student_start_at_idx
  on public.lessons (student_id, start_at) where student_id is not null;
create index lessons_group_start_at_idx
  on public.lessons (group_id, start_at) where group_id is not null;
create index lessons_series_id_idx
  on public.lessons (lesson_series_id) where lesson_series_id is not null;

-- Junction tables intentionally keep the requested compact field set. These
-- triggers prevent cross-tenant parent/student and group/student associations.

create or replace function public.ensure_parent_student_same_tutor()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  parent_tutor_id uuid;
  student_tutor_id uuid;
begin
  select tutor_id into parent_tutor_id
  from public.parents
  where id = new.parent_id;

  select tutor_id into student_tutor_id
  from public.students
  where id = new.student_id;

  if parent_tutor_id is distinct from student_tutor_id then
    raise exception 'Parent and student must belong to the same tutor';
  end if;

  return new;
end;
$$;

create trigger parent_students_check_tutor
before insert or update on public.parent_students
for each row execute function public.ensure_parent_student_same_tutor();

create or replace function public.ensure_group_student_same_tutor()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  group_tutor_id uuid;
  student_tutor_id uuid;
begin
  select tutor_id into group_tutor_id
  from public.groups
  where id = new.group_id;

  select tutor_id into student_tutor_id
  from public.students
  where id = new.student_id;

  if group_tutor_id is distinct from student_tutor_id then
    raise exception 'Group and student must belong to the same tutor';
  end if;

  return new;
end;
$$;

create trigger group_students_check_tutor
before insert or update on public.group_students
for each row execute function public.ensure_group_student_same_tutor();

comment on table public.tutors is 'Root tenant records for independent tutors.';
comment on table public.students is 'Students owned by a single tutor tenant.';
comment on table public.parents is 'Parents or guardians owned by a single tutor tenant.';
comment on table public.parent_students is 'Many-to-many links between parents and students.';
comment on table public.groups is 'Teaching groups owned by a single tutor tenant.';
comment on table public.group_students is 'Many-to-many membership between groups and students.';
comment on table public.lesson_series is 'Weekly recurring lesson configurations.';
comment on table public.lessons is 'Concrete individual or group lesson occurrences.';
