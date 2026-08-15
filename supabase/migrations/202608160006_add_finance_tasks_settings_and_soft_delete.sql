-- Operational MVP modules. All additions are non-destructive and tenant-owned.

alter table public.lesson_series add column deleted_at timestamptz;

alter table public.other_events
  add constraint other_events_time_range_valid check (end_time > start_time) not valid;

alter table public.lessons add constraint lessons_id_tutor_key unique (id, tutor_id);
alter table public.parents add constraint parents_id_tutor_key unique (id, tutor_id);

create table public.tutor_settings (
  tutor_id uuid primary key references public.tutors (id) on delete cascade,
  timezone text not null default 'Europe/Moscow',
  default_lesson_duration integer not null default 60,
  default_lesson_price numeric(12, 2),
  working_day_start time without time zone not null default '08:00',
  working_day_end time without time zone not null default '22:00',
  working_weekdays smallint[] not null default array[1,2,3,4,5,6],
  lesson_reminders_enabled boolean not null default true,
  reminder_minutes_before integer not null default 60,
  preferred_payment_method text,
  payment_instructions text,
  currency text not null default 'RUB',
  monthly_income_goal numeric(12, 2),
  appearance_mode text not null default 'auto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tutor_settings_duration_positive check (default_lesson_duration > 0),
  constraint tutor_settings_price_nonnegative check (default_lesson_price is null or default_lesson_price >= 0),
  constraint tutor_settings_work_hours_valid check (working_day_end > working_day_start),
  constraint tutor_settings_weekdays_valid check (working_weekdays <@ array[1,2,3,4,5,6,7]::smallint[]),
  constraint tutor_settings_reminder_nonnegative check (reminder_minutes_before >= 0),
  constraint tutor_settings_goal_nonnegative check (monthly_income_goal is null or monthly_income_goal >= 0),
  constraint tutor_settings_currency_valid check (currency = 'RUB'),
  constraint tutor_settings_appearance_valid check (appearance_mode in (
    'auto','late-summer','summer-autumn','golden-autumn','late-autumn','autumn-winter',
    'winter','winter-spring','spring','spring-summer','summer'
  ))
);

create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  student_id uuid,
  group_id uuid,
  lesson_id uuid,
  type text not null,
  category text,
  amount numeric(12, 2) not null,
  transaction_date date not null default current_date,
  status text not null default 'posted',
  payment_method text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_amount_positive check (amount > 0),
  constraint finance_type_valid check (type in ('payment','lesson_charge','expense','adjustment','refund')),
  constraint finance_status_valid check (status in ('posted','pending','void')),
  constraint finance_student_tenant_fk foreign key (student_id, tutor_id)
    references public.students (id, tutor_id) on delete restrict,
  constraint finance_group_tenant_fk foreign key (group_id, tutor_id)
    references public.groups (id, tutor_id) on delete restrict,
  constraint finance_lesson_tenant_fk foreign key (lesson_id, tutor_id)
    references public.lessons (id, tutor_id) on delete restrict
);

comment on column public.finance_transactions.amount is
  'Always a positive magnitude. Type determines balance direction: payments/adjustments add credit; lesson_charge/refund subtract credit; expenses affect tutor profit only.';

create unique index finance_lesson_charge_unique_idx
  on public.finance_transactions (lesson_id) where type = 'lesson_charge';
create index finance_tutor_date_idx on public.finance_transactions (tutor_id, transaction_date desc);
create index finance_tutor_type_date_idx on public.finance_transactions (tutor_id, type, transaction_date desc);
create index finance_student_date_idx on public.finance_transactions (student_id, transaction_date desc) where student_id is not null;
create index finance_group_date_idx on public.finance_transactions (group_id, transaction_date desc) where group_id is not null;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  priority text not null default 'normal',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint tasks_title_not_blank check (btrim(title) <> ''),
  constraint tasks_priority_valid check (priority in ('low','normal','high')),
  constraint tasks_completion_consistent check (
    (completed and completed_at is not null) or (not completed and completed_at is null)
  )
);

create index tasks_tutor_completed_due_idx on public.tasks (tutor_id, completed, due_at);

create table public.account_invitations (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  role text not null,
  student_id uuid,
  parent_id uuid,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint account_invitations_role_valid check (role in ('student','parent')),
  constraint account_invitations_exact_target check (
    (role = 'student' and student_id is not null and parent_id is null)
    or (role = 'parent' and parent_id is not null and student_id is null)
  ),
  constraint account_invitations_student_tenant_fk foreign key (student_id, tutor_id)
    references public.students (id, tutor_id) on delete cascade,
  constraint account_invitations_parent_tenant_fk foreign key (parent_id, tutor_id)
    references public.parents (id, tutor_id) on delete cascade
);

create index account_invitations_tutor_idx on public.account_invitations (tutor_id, created_at desc);

insert into public.tutor_settings (tutor_id)
select id from public.tutors
on conflict (tutor_id) do nothing;

create or replace function public.create_default_tutor_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.tutor_settings (tutor_id) values (new.id)
  on conflict (tutor_id) do nothing;
  return new;
end;
$$;

create trigger tutors_create_default_settings
after insert on public.tutors for each row execute function public.create_default_tutor_settings();

create trigger tutor_settings_set_updated_at before update on public.tutor_settings
for each row execute function public.set_updated_at();
create trigger finance_transactions_set_updated_at before update on public.finance_transactions
for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

insert into public.finance_transactions (
  tutor_id, student_id, group_id, lesson_id, type, category, amount,
  transaction_date, status, description
)
select
  lesson.tutor_id, lesson.student_id, lesson.group_id, lesson.id, 'lesson_charge', 'Занятие', lesson.price,
  (lesson.start_at at time zone coalesce(settings.timezone, 'Europe/Moscow'))::date,
  'posted', 'Начисление за проведённое занятие'
from public.lessons lesson
left join public.tutor_settings settings on settings.tutor_id = lesson.tutor_id
where lesson.status = 'completed' and lesson.price > 0
on conflict (lesson_id) where type = 'lesson_charge' do nothing;

create trigger finance_transactions_assign_tutor before insert or update of tutor_id on public.finance_transactions
for each row execute function public.assign_authenticated_tutor();
create trigger tasks_assign_tutor before insert or update of tutor_id on public.tasks
for each row execute function public.assign_authenticated_tutor();
create trigger account_invitations_assign_tutor before insert or update of tutor_id on public.account_invitations
for each row execute function public.assign_authenticated_tutor();

create or replace function public.sync_lesson_charge()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_timezone text;
begin
  select coalesce(timezone, 'Europe/Moscow') into v_timezone
  from public.tutor_settings where tutor_id = new.tutor_id;
  if new.status = 'completed' and new.price > 0 then
    insert into public.finance_transactions (
      tutor_id, student_id, group_id, lesson_id, type, category, amount,
      transaction_date, status, description
    ) values (
      new.tutor_id, new.student_id, new.group_id, new.id, 'lesson_charge', 'Занятие', new.price,
      (new.start_at at time zone coalesce(v_timezone, 'Europe/Moscow'))::date, 'posted', 'Начисление за проведённое занятие'
    )
    on conflict (lesson_id) where type = 'lesson_charge'
    do update set amount = excluded.amount, student_id = excluded.student_id,
      group_id = excluded.group_id, transaction_date = excluded.transaction_date, status = 'posted';
  elsif tg_op = 'UPDATE' and old.status = 'completed' and (new.status <> 'completed' or new.price = 0) then
    update public.finance_transactions set status = 'void'
    where lesson_id = new.id and type = 'lesson_charge';
  end if;
  return new;
end;
$$;

create trigger lessons_sync_charge_after_insert
after insert on public.lessons
for each row execute function public.sync_lesson_charge();

create trigger lessons_sync_charge_after_update
after update of status, price, student_id, group_id on public.lessons
for each row execute function public.sync_lesson_charge();

alter table public.tutor_settings enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.tasks enable row level security;
alter table public.account_invitations enable row level security;

create policy tutor_settings_own_all on public.tutor_settings for all to authenticated
using (tutor_id = public.current_tutor_id()) with check (tutor_id = public.current_tutor_id());
create policy finance_transactions_own_all on public.finance_transactions for all to authenticated
using (tutor_id = public.current_tutor_id()) with check (tutor_id = public.current_tutor_id());
create policy tasks_own_all on public.tasks for all to authenticated
using (tutor_id = public.current_tutor_id()) with check (tutor_id = public.current_tutor_id());
create policy account_invitations_own_all on public.account_invitations for all to authenticated
using (tutor_id = public.current_tutor_id()) with check (tutor_id = public.current_tutor_id());

grant select, update on public.tutor_settings to authenticated;
grant select, insert, update, delete on public.finance_transactions, public.tasks, public.account_invitations to authenticated;
revoke all on public.tutor_settings, public.finance_transactions, public.tasks, public.account_invitations from anon;
