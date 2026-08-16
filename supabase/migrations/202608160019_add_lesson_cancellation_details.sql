-- Store lesson cancellation context on the lesson itself and keep the existing
-- finance ledger synchronized with an optional cancellation fee.

alter table public.lessons
  add column if not exists cancellation_reason text,
  add column if not exists cancellation_fee numeric(12, 2) not null default 0,
  add column if not exists cancelled_at timestamptz;

alter table public.lessons drop constraint if exists lessons_cancellation_reason_valid;
alter table public.lessons add constraint lessons_cancellation_reason_valid check (
  cancellation_reason is null
  or cancellation_reason in ('tutor_cancelled', 'illness', 'absence', 'holiday')
);

alter table public.lessons drop constraint if exists lessons_cancellation_fee_non_negative;
alter table public.lessons add constraint lessons_cancellation_fee_non_negative
  check (cancellation_fee >= 0);

comment on column public.lessons.cancellation_reason is
  'Optional reason: tutor_cancelled, illness, absence, or holiday.';
comment on column public.lessons.cancellation_fee is
  'Amount charged when a cancelled lesson is kept in attendance and finance history.';

create or replace function public.normalize_lesson_cancellation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'cancelled' then
    new.cancelled_at := coalesce(new.cancelled_at, now());
    new.cancellation_fee := coalesce(new.cancellation_fee, 0);
  else
    new.cancellation_reason := null;
    new.cancellation_fee := 0;
    new.cancelled_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_normalize_cancellation on public.lessons;
create trigger lessons_normalize_cancellation
before insert or update of status, cancellation_reason, cancellation_fee on public.lessons
for each row execute function public.normalize_lesson_cancellation();

create or replace function public.sync_lesson_charge()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_timezone text;
  v_amount numeric(12, 2);
  v_category text;
  v_description text;
begin
  select coalesce(timezone, 'Europe/Moscow') into v_timezone
  from public.tutor_settings where tutor_id = new.tutor_id;

  if new.status = 'completed' and new.price > 0 then
    v_amount := new.price;
    v_category := 'Занятие';
    v_description := 'Начисление за проведённое занятие';
  elsif new.status = 'cancelled' and new.cancellation_fee > 0 then
    v_amount := new.cancellation_fee;
    v_category := 'Отмена урока';
    v_description := case new.cancellation_reason
      when 'tutor_cancelled' then 'Штраф за отмену: отмена репетитором'
      when 'illness' then 'Штраф за отмену: болезнь'
      when 'absence' then 'Штраф за отмену: пропуск'
      when 'holiday' then 'Штраф за отмену: праздник'
      else 'Штраф за отменённое занятие'
    end;
  else
    update public.finance_transactions
    set status = 'void'
    where lesson_id = new.id and type = 'lesson_charge';
    return new;
  end if;

  insert into public.finance_transactions (
    tutor_id, student_id, group_id, lesson_id, type, category, amount,
    transaction_date, status, description
  ) values (
    new.tutor_id, new.student_id, new.group_id, new.id, 'lesson_charge', v_category, v_amount,
    (new.start_at at time zone coalesce(v_timezone, 'Europe/Moscow'))::date,
    'posted', v_description
  )
  on conflict (lesson_id) where type = 'lesson_charge'
  do update set
    amount = excluded.amount,
    student_id = excluded.student_id,
    group_id = excluded.group_id,
    transaction_date = excluded.transaction_date,
    status = 'posted',
    category = excluded.category,
    description = excluded.description;

  return new;
end;
$$;

drop trigger if exists lessons_sync_charge_after_update on public.lessons;
create trigger lessons_sync_charge_after_update
after update of status, price, student_id, group_id, cancellation_reason, cancellation_fee on public.lessons
for each row execute function public.sync_lesson_charge();

notify pgrst, 'reload schema';
