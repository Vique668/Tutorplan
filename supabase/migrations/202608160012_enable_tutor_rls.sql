-- Enforce per-tutor access for every table requested by the application.
-- New tenants may use auth.uid() = tutors.id directly. The user_id fallback
-- preserves access to legacy tutor rows without rewriting primary keys or FKs.

create or replace function public.current_tutor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tutor.id
  from public.tutors as tutor
  where tutor.id = auth.uid()
     or tutor.user_id = auth.uid()
  order by (tutor.id = auth.uid()) desc
  limit 1
$$;

revoke all on function public.current_tutor_id() from public, anon;
grant execute on function public.current_tutor_id() to authenticated;

alter table public.tutors enable row level security;
alter table public.students enable row level security;
alter table public.parents enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_series enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.tasks enable row level security;

-- Replace earlier combined policies with explicit CRUD policies.
drop policy if exists tutors_select_own on public.tutors;
drop policy if exists tutors_insert_own on public.tutors;
drop policy if exists tutors_update_own on public.tutors;
drop policy if exists tutors_delete_own on public.tutors;

create policy tutors_select_own
on public.tutors for select to authenticated
using (id = auth.uid() or user_id = auth.uid());

create policy tutors_insert_own
on public.tutors for insert to authenticated
with check (
  (id = auth.uid() and (user_id is null or user_id = auth.uid()))
  or user_id = auth.uid()
);

create policy tutors_update_own
on public.tutors for update to authenticated
using (id = auth.uid() or user_id = auth.uid())
with check (
  (id = auth.uid() and (user_id is null or user_id = auth.uid()))
  or user_id = auth.uid()
);

create policy tutors_delete_own
on public.tutors for delete to authenticated
using (id = auth.uid() or user_id = auth.uid());

drop policy if exists students_tutor_all on public.students;
drop policy if exists students_select_own on public.students;
drop policy if exists students_insert_own on public.students;
drop policy if exists students_update_own on public.students;
drop policy if exists students_delete_own on public.students;

create policy students_select_own
on public.students for select to authenticated
using (tutor_id = public.current_tutor_id());

create policy students_insert_own
on public.students for insert to authenticated
with check (tutor_id = public.current_tutor_id());

create policy students_update_own
on public.students for update to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());

create policy students_delete_own
on public.students for delete to authenticated
using (tutor_id = public.current_tutor_id());

drop policy if exists parents_tutor_all on public.parents;
drop policy if exists parents_select_own on public.parents;
drop policy if exists parents_insert_own on public.parents;
drop policy if exists parents_update_own on public.parents;
drop policy if exists parents_delete_own on public.parents;

create policy parents_select_own
on public.parents for select to authenticated
using (tutor_id = public.current_tutor_id());

create policy parents_insert_own
on public.parents for insert to authenticated
with check (tutor_id = public.current_tutor_id());

create policy parents_update_own
on public.parents for update to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());

create policy parents_delete_own
on public.parents for delete to authenticated
using (tutor_id = public.current_tutor_id());

drop policy if exists lessons_tutor_all on public.lessons;
drop policy if exists lessons_select_own on public.lessons;
drop policy if exists lessons_insert_own on public.lessons;
drop policy if exists lessons_update_own on public.lessons;
drop policy if exists lessons_delete_own on public.lessons;

create policy lessons_select_own
on public.lessons for select to authenticated
using (tutor_id = public.current_tutor_id());

create policy lessons_insert_own
on public.lessons for insert to authenticated
with check (tutor_id = public.current_tutor_id());

create policy lessons_update_own
on public.lessons for update to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());

create policy lessons_delete_own
on public.lessons for delete to authenticated
using (tutor_id = public.current_tutor_id());

drop policy if exists lesson_series_tutor_all on public.lesson_series;
drop policy if exists lesson_series_select_own on public.lesson_series;
drop policy if exists lesson_series_insert_own on public.lesson_series;
drop policy if exists lesson_series_update_own on public.lesson_series;
drop policy if exists lesson_series_delete_own on public.lesson_series;

create policy lesson_series_select_own
on public.lesson_series for select to authenticated
using (tutor_id = public.current_tutor_id());

create policy lesson_series_insert_own
on public.lesson_series for insert to authenticated
with check (tutor_id = public.current_tutor_id());

create policy lesson_series_update_own
on public.lesson_series for update to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());

create policy lesson_series_delete_own
on public.lesson_series for delete to authenticated
using (tutor_id = public.current_tutor_id());

drop policy if exists finance_transactions_own_all on public.finance_transactions;
drop policy if exists finance_transactions_select_own on public.finance_transactions;
drop policy if exists finance_transactions_insert_own on public.finance_transactions;
drop policy if exists finance_transactions_update_own on public.finance_transactions;
drop policy if exists finance_transactions_delete_own on public.finance_transactions;

create policy finance_transactions_select_own
on public.finance_transactions for select to authenticated
using (tutor_id = public.current_tutor_id());

create policy finance_transactions_insert_own
on public.finance_transactions for insert to authenticated
with check (tutor_id = public.current_tutor_id());

create policy finance_transactions_update_own
on public.finance_transactions for update to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());

create policy finance_transactions_delete_own
on public.finance_transactions for delete to authenticated
using (tutor_id = public.current_tutor_id());

drop policy if exists tasks_own_all on public.tasks;
drop policy if exists tasks_select_own on public.tasks;
drop policy if exists tasks_insert_own on public.tasks;
drop policy if exists tasks_update_own on public.tasks;
drop policy if exists tasks_delete_own on public.tasks;

create policy tasks_select_own
on public.tasks for select to authenticated
using (tutor_id = public.current_tutor_id());

create policy tasks_insert_own
on public.tasks for insert to authenticated
with check (tutor_id = public.current_tutor_id());

create policy tasks_update_own
on public.tasks for update to authenticated
using (tutor_id = public.current_tutor_id())
with check (tutor_id = public.current_tutor_id());

create policy tasks_delete_own
on public.tasks for delete to authenticated
using (tutor_id = public.current_tutor_id());

grant select, insert, update, delete on public.tutors to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.parents to authenticated;
grant select, insert, update, delete on public.lessons to authenticated;
grant select, insert, update, delete on public.lesson_series to authenticated;
grant select, insert, update, delete on public.finance_transactions to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

revoke all on public.tutors from anon;
revoke all on public.students from anon;
revoke all on public.parents from anon;
revoke all on public.lessons from anon;
revoke all on public.lesson_series from anon;
revoke all on public.finance_transactions from anon;
revoke all on public.tasks from anon;

notify pgrst, 'reload schema';
