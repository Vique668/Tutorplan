-- Snapshot group members for each lesson so attendance and per-student prices
-- remain stable even when the group membership changes later.

create table public.lesson_attendance (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  lesson_id uuid not null,
  student_id uuid not null,
  attended boolean not null default true,
  price numeric(12, 2) not null default 0,
  absence_reason text,
  absence_fee numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_attendance_price_nonnegative check (price >= 0),
  constraint lesson_attendance_absence_fee_nonnegative check (absence_fee >= 0),
  constraint lesson_attendance_absence_reason_valid check (
    absence_reason is null
    or absence_reason in ('illness', 'absence', 'holiday', 'other')
  ),
  constraint lesson_attendance_lesson_student_key unique (lesson_id, student_id),
  constraint lesson_attendance_lesson_tenant_fk
    foreign key (lesson_id, tutor_id)
    references public.lessons (id, tutor_id)
    on delete cascade,
  constraint lesson_attendance_student_tenant_fk
    foreign key (student_id, tutor_id)
    references public.students (id, tutor_id)
    on delete restrict
);

create index lesson_attendance_tutor_lesson_idx
  on public.lesson_attendance (tutor_id, lesson_id);
create index lesson_attendance_student_idx
  on public.lesson_attendance (student_id, lesson_id);

create trigger lesson_attendance_set_updated_at
before update on public.lesson_attendance
for each row execute function public.set_updated_at();

create or replace function public.seed_group_lesson_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.group_id is distinct from old.group_id then
    delete from public.lesson_attendance where lesson_id = new.id;
  end if;

  if new.group_id is null then
    delete from public.lesson_attendance where lesson_id = new.id;
    return new;
  end if;

  insert into public.lesson_attendance (
    tutor_id, lesson_id, student_id, attended, price, absence_reason, absence_fee
  )
  select
    new.tutor_id, new.id, membership.student_id, true, new.price, null, 0
  from public.group_students membership
  where membership.group_id = new.group_id
  on conflict (lesson_id, student_id) do nothing;

  return new;
end;
$$;

drop trigger if exists lessons_00_seed_group_attendance on public.lessons;
create trigger lessons_00_seed_group_attendance
after insert or update of group_id on public.lessons
for each row execute function public.seed_group_lesson_attendance();

insert into public.lesson_attendance (
  tutor_id, lesson_id, student_id, attended, price, absence_reason, absence_fee
)
select
  lesson.tutor_id, lesson.id, membership.student_id, true, lesson.price, null, 0
from public.lessons lesson
join public.group_students membership on membership.group_id = lesson.group_id
where lesson.group_id is not null
on conflict (lesson_id, student_id) do nothing;

drop index if exists public.finance_lesson_charge_unique_idx;
create unique index finance_lesson_student_charge_unique_idx
  on public.finance_transactions (lesson_id, student_id)
  where type = 'lesson_charge' and student_id is not null;
create unique index finance_lesson_unassigned_charge_unique_idx
  on public.finance_transactions (lesson_id)
  where type = 'lesson_charge' and student_id is null;

create or replace function public.rebuild_lesson_charge(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons%rowtype;
  v_timezone text;
  v_amount numeric(12, 2);
  v_category text;
  v_description text;
begin
  select * into v_lesson
  from public.lessons
  where id = p_lesson_id;

  if not found then
    return;
  end if;

  select coalesce(timezone, 'Europe/Moscow') into v_timezone
  from public.tutor_settings where tutor_id = v_lesson.tutor_id;

  update public.finance_transactions
  set status = 'void'
  where lesson_id = v_lesson.id and type = 'lesson_charge';

  if v_lesson.status = 'completed' then
    v_category := 'Занятие';
    v_description := 'Начисление за проведённое групповое занятие';
  elsif v_lesson.status = 'cancelled' and v_lesson.cancellation_fee > 0 then
    v_category := 'Отмена урока';
    v_description := case v_lesson.cancellation_reason
      when 'tutor_cancelled' then 'Штраф за отмену: отмена репетитором'
      when 'illness' then 'Штраф за отмену: болезнь'
      when 'absence' then 'Штраф за отмену: пропуск'
      when 'holiday' then 'Штраф за отмену: праздник'
      else 'Штраф за отменённое занятие'
    end;
  else
    return;
  end if;

  if v_lesson.student_id is not null then
    v_amount := case
      when v_lesson.status = 'completed' then v_lesson.price
      else v_lesson.cancellation_fee
    end;

    if v_amount <= 0 then return; end if;

    insert into public.finance_transactions (
      tutor_id, student_id, group_id, lesson_id, type, category, amount,
      transaction_date, status, description
    ) values (
      v_lesson.tutor_id, v_lesson.student_id, null, v_lesson.id,
      'lesson_charge', v_category, v_amount,
      (v_lesson.start_at at time zone coalesce(v_timezone, 'Europe/Moscow'))::date,
      'posted', replace(v_description, ' групповое', '')
    )
    on conflict (lesson_id, student_id)
      where type = 'lesson_charge' and student_id is not null
    do update set
      amount = excluded.amount,
      group_id = null,
      transaction_date = excluded.transaction_date,
      status = 'posted',
      category = excluded.category,
      description = excluded.description;
    return;
  end if;

  insert into public.finance_transactions (
    tutor_id, student_id, group_id, lesson_id, type, category, amount,
    transaction_date, status, description
  )
  select
    v_lesson.tutor_id,
    attendance.student_id,
    v_lesson.group_id,
    v_lesson.id,
    'lesson_charge',
    case
      when v_lesson.status = 'completed' and attendance.attended then 'Занятие'
      when v_lesson.status = 'completed' then 'Неявка'
      else v_category
    end,
    case
      when v_lesson.status = 'completed' and attendance.attended then attendance.price
      when v_lesson.status = 'completed' then attendance.absence_fee
      else v_lesson.cancellation_fee
    end,
    (v_lesson.start_at at time zone coalesce(v_timezone, 'Europe/Moscow'))::date,
    'posted',
    case
      when v_lesson.status = 'completed' and attendance.attended
        then 'Начисление за проведённое групповое занятие'
      when v_lesson.status = 'completed' and attendance.absence_reason = 'illness'
        then 'Штраф за отсутствие: болезнь'
      when v_lesson.status = 'completed' and attendance.absence_reason = 'absence'
        then 'Штраф за отсутствие: пропуск'
      when v_lesson.status = 'completed' and attendance.absence_reason = 'holiday'
        then 'Штраф за отсутствие: праздник'
      when v_lesson.status = 'completed'
        then 'Штраф за отсутствие на групповом занятии'
      else v_description
    end
  from public.lesson_attendance attendance
  where attendance.lesson_id = v_lesson.id
    and case
      when v_lesson.status = 'completed' and attendance.attended then attendance.price > 0
      when v_lesson.status = 'completed' then attendance.absence_fee > 0
      else v_lesson.cancellation_fee > 0
    end
  on conflict (lesson_id, student_id)
    where type = 'lesson_charge' and student_id is not null
  do update set
    amount = excluded.amount,
    group_id = excluded.group_id,
    transaction_date = excluded.transaction_date,
    status = 'posted',
    category = excluded.category,
    description = excluded.description;
end;
$$;

create or replace function public.sync_lesson_charge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.rebuild_lesson_charge(new.id);
  return new;
end;
$$;

create or replace function public.sync_attendance_charge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.rebuild_lesson_charge(old.lesson_id);
    return old;
  end if;

  perform public.rebuild_lesson_charge(new.lesson_id);
  return new;
end;
$$;

drop trigger if exists lesson_attendance_sync_charge on public.lesson_attendance;
create trigger lesson_attendance_sync_charge
after insert or update of attended, price, absence_reason, absence_fee or delete on public.lesson_attendance
for each row execute function public.sync_attendance_charge();

create or replace function public.save_group_lesson_attendance(
  p_lesson_id uuid,
  p_entries jsonb
)
returns setof public.lesson_attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons%rowtype;
  v_entry record;
begin
  select * into v_lesson
  from public.lessons
  where id = p_lesson_id
    and tutor_id = public.current_tutor_id()
    and group_id is not null;

  if not found then
    raise exception 'Group lesson not found';
  end if;

  for v_entry in
    select * from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb))
      as entry(
        student_id uuid,
        attended boolean,
        price numeric,
        absence_reason text,
        absence_fee numeric
      )
  loop
    if v_entry.price is null or v_entry.price < 0 then
      raise exception 'Attendance price must be non-negative';
    end if;

    if coalesce(v_entry.absence_fee, 0) < 0 then
      raise exception 'Absence fee must be non-negative';
    end if;

    if v_entry.absence_reason is not null
      and v_entry.absence_reason not in ('illness', 'absence', 'holiday', 'other') then
      raise exception 'Invalid absence reason';
    end if;

    if not exists (
      select 1 from public.students student
      where student.id = v_entry.student_id
        and student.tutor_id = v_lesson.tutor_id
    ) then
      raise exception 'Student does not belong to this tutor';
    end if;

    insert into public.lesson_attendance (
      tutor_id, lesson_id, student_id, attended, price, absence_reason, absence_fee
    ) values (
      v_lesson.tutor_id,
      v_lesson.id,
      v_entry.student_id,
      coalesce(v_entry.attended, true),
      v_entry.price,
      case when coalesce(v_entry.attended, true) then null else v_entry.absence_reason end,
      case when coalesce(v_entry.attended, true) then 0 else coalesce(v_entry.absence_fee, 0) end
    )
    on conflict (lesson_id, student_id)
    do update set
      attended = excluded.attended,
      price = excluded.price,
      absence_reason = excluded.absence_reason,
      absence_fee = excluded.absence_fee;
  end loop;

  return query
  select attendance.*
  from public.lesson_attendance attendance
  where attendance.lesson_id = v_lesson.id
  order by attendance.created_at, attendance.student_id;
end;
$$;

alter table public.lesson_attendance enable row level security;

create policy lesson_attendance_select_own
on public.lesson_attendance for select to authenticated
using (tutor_id = public.current_tutor_id());

create policy lesson_attendance_insert_own
on public.lesson_attendance for insert to authenticated
with check (tutor_id = public.current_tutor_id());

create policy lesson_attendance_update_own
on public.lesson_attendance for update to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());

create policy lesson_attendance_delete_own
on public.lesson_attendance for delete to authenticated
using (tutor_id = public.current_tutor_id());

grant select, insert, update, delete on public.lesson_attendance to authenticated;
revoke all on public.lesson_attendance from anon;
revoke all on function public.rebuild_lesson_charge(uuid) from public, anon, authenticated;
revoke all on function public.save_group_lesson_attendance(uuid, jsonb) from public, anon;
grant execute on function public.save_group_lesson_attendance(uuid, jsonb) to authenticated;

-- Rebuild existing completed group lessons using per-student charges.
select public.rebuild_lesson_charge(lesson.id)
from public.lessons lesson
where lesson.group_id is not null
  and lesson.status in ('completed', 'cancelled');

notify pgrst, 'reload schema';
