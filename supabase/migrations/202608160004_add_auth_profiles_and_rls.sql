-- Link TutorPlan tenants to Supabase Auth and enforce tenant isolation in PostgreSQL.
-- Safe for existing data: legacy tutor rows remain intact and can be linked by email.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'tutor',
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  avatar_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_valid check (role in ('tutor', 'student', 'parent'))
);

alter table public.tutors
  add column user_id uuid unique references auth.users (id) on delete cascade,
  add column updated_at timestamptz not null default now();

alter table public.students
  add column profile_id uuid unique references public.profiles (id) on delete set null,
  add column updated_at timestamptz not null default now();

alter table public.parents
  add column profile_id uuid unique references public.profiles (id) on delete set null,
  add column updated_at timestamptz not null default now();

alter table public.groups
  add column updated_at timestamptz not null default now();

alter table public.lesson_series
  add column updated_at timestamptz not null default now();

alter table public.lessons
  add column updated_at timestamptz not null default now();

alter table public.other_events
  add column updated_at timestamptz not null default now();

create index tutors_user_id_idx on public.tutors (user_id) where user_id is not null;
create index students_profile_id_idx on public.students (profile_id) where profile_id is not null;
create index parents_profile_id_idx on public.parents (profile_id) where profile_id is not null;

-- Link already-created Auth users to matching legacy tutor rows without changing IDs.
insert into public.profiles (id, role, first_name, last_name)
select
  users.id,
  'tutor',
  coalesce(users.raw_user_meta_data ->> 'first_name', ''),
  coalesce(users.raw_user_meta_data ->> 'last_name', '')
from auth.users as users
on conflict (id) do nothing;

update public.tutors as tutors
set user_id = users.id
from auth.users as users
where tutors.user_id is null
  and users.email is not null
  and lower(tutors.email) = lower(users.email)
  and not exists (
    select 1 from public.tutors as linked where linked.user_id = users.id
  );

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger tutors_set_updated_at before update on public.tutors
for each row execute function public.set_updated_at();
create trigger students_set_updated_at before update on public.students
for each row execute function public.set_updated_at();
create trigger parents_set_updated_at before update on public.parents
for each row execute function public.set_updated_at();
create trigger groups_set_updated_at before update on public.groups
for each row execute function public.set_updated_at();
create trigger lesson_series_set_updated_at before update on public.lesson_series
for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons
for each row execute function public.set_updated_at();
create trigger other_events_set_updated_at before update on public.other_events
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_first_name text := coalesce(new.raw_user_meta_data ->> 'first_name', '');
  v_last_name text := coalesce(new.raw_user_meta_data ->> 'last_name', '');
  v_tutor_name text;
begin
  insert into public.profiles (id, role, first_name, last_name)
  values (new.id, 'tutor', v_first_name, v_last_name)
  on conflict (id) do nothing;

  v_tutor_name := nullif(btrim(concat_ws(' ', v_first_name, v_last_name)), '');
  v_tutor_name := coalesce(v_tutor_name, split_part(coalesce(new.email, 'Репетитор'), '@', 1));

  update public.tutors
  set user_id = new.id,
      name = v_tutor_name,
      email = coalesce(new.email, email)
  where user_id is null
    and new.email is not null
    and lower(email) = lower(new.email);

  if not found then
    insert into public.tutors (user_id, name, email)
    values (new.id, v_tutor_name, coalesce(new.email, new.id::text || '@pending.local'));
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.current_tutor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.tutors where user_id = auth.uid() limit 1
$$;

revoke all on function public.current_tutor_id() from public, anon;
grant execute on function public.current_tutor_id() to authenticated;

create or replace function public.assign_authenticated_tutor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tutor_id uuid := public.current_tutor_id();
begin
  if auth.uid() is null then
    if new.tutor_id is null then
      raise exception 'Tutor id is required for trusted server operations';
    end if;
    return new;
  end if;
  if v_tutor_id is null then
    raise exception 'Authenticated user is not linked to a tutor';
  end if;
  new.tutor_id = v_tutor_id;
  return new;
end;
$$;

create trigger students_assign_tutor before insert or update of tutor_id on public.students
for each row execute function public.assign_authenticated_tutor();
create trigger parents_assign_tutor before insert or update of tutor_id on public.parents
for each row execute function public.assign_authenticated_tutor();
create trigger groups_assign_tutor before insert or update of tutor_id on public.groups
for each row execute function public.assign_authenticated_tutor();
create trigger lesson_series_assign_tutor before insert or update of tutor_id on public.lesson_series
for each row execute function public.assign_authenticated_tutor();
create trigger lessons_assign_tutor before insert or update of tutor_id on public.lessons
for each row execute function public.assign_authenticated_tutor();
create trigger other_events_assign_tutor before insert or update of tutor_id on public.other_events
for each row execute function public.assign_authenticated_tutor();

alter table public.profiles enable row level security;
alter table public.tutors enable row level security;
alter table public.students enable row level security;
alter table public.parents enable row level security;
alter table public.parent_students enable row level security;
alter table public.groups enable row level security;
alter table public.group_students enable row level security;
alter table public.lesson_series enable row level security;
alter table public.lessons enable row level security;
alter table public.other_events enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy tutors_select_own on public.tutors for select to authenticated
using (user_id = auth.uid());
create policy tutors_update_own on public.tutors for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy students_tutor_all on public.students for all to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());
create policy parents_tutor_all on public.parents for all to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());
create policy groups_tutor_all on public.groups for all to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());
create policy lesson_series_tutor_all on public.lesson_series for all to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());
create policy lessons_tutor_all on public.lessons for all to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());
create policy other_events_tutor_all on public.other_events for all to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());

create policy parent_students_tutor_all on public.parent_students for all to authenticated
using (
  exists (
    select 1 from public.parents p
    where p.id = parent_students.parent_id and p.tutor_id = public.current_tutor_id()
  )
  and exists (
    select 1 from public.students s
    where s.id = parent_students.student_id and s.tutor_id = public.current_tutor_id()
  )
)
with check (
  exists (
    select 1 from public.parents p
    where p.id = parent_students.parent_id and p.tutor_id = public.current_tutor_id()
  )
  and exists (
    select 1 from public.students s
    where s.id = parent_students.student_id and s.tutor_id = public.current_tutor_id()
  )
);

create policy group_students_tutor_all on public.group_students for all to authenticated
using (
  exists (
    select 1 from public.groups g
    where g.id = group_students.group_id and g.tutor_id = public.current_tutor_id()
  )
  and exists (
    select 1 from public.students s
    where s.id = group_students.student_id and s.tutor_id = public.current_tutor_id()
  )
)
with check (
  exists (
    select 1 from public.groups g
    where g.id = group_students.group_id and g.tutor_id = public.current_tutor_id()
  )
  and exists (
    select 1 from public.students s
    where s.id = group_students.student_id and s.tutor_id = public.current_tutor_id()
  )
);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, update on public.tutors to authenticated;
grant select, insert, update, delete on public.students, public.parents, public.parent_students,
  public.groups, public.group_students, public.lesson_series, public.lessons, public.other_events
  to authenticated;

revoke all on public.profiles, public.tutors, public.students, public.parents, public.parent_students,
  public.groups, public.group_students, public.lesson_series, public.lessons, public.other_events
  from anon;
revoke execute on function public.sync_lesson_series_future(uuid, date) from anon;

comment on table public.profiles is 'Application identity and role linked one-to-one to auth.users.';
comment on column public.tutors.user_id is 'Supabase Auth user that owns this tutor tenant.';
