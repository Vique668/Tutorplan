-- Physically remove students that have no history. Keep a tombstone when
-- lessons, finance records, or a linked student account must be preserved.

create or replace function public.delete_student(p_student_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_has_history boolean;
  v_parent_ids uuid[];
begin
  select * into v_student
  from public.students
  where id = p_student_id
    and tutor_id = public.current_tutor_id()
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Student not found';
  end if;

  select
    v_student.profile_id is not null
    or exists (select 1 from public.lessons where student_id = p_student_id)
    or exists (select 1 from public.finance_transactions where student_id = p_student_id)
  into v_has_history;

  update public.lesson_series
  set is_active = false
  where student_id = p_student_id
    and tutor_id = public.current_tutor_id()
    and deleted_at is null;

  delete from public.group_students where student_id = p_student_id;

  if v_has_history then
    update public.students
    set deleted_at = now(), status = 'archived'
    where id = p_student_id;
    return 'soft';
  end if;

  select coalesce(array_agg(parent_id), array[]::uuid[])
  into v_parent_ids
  from public.parent_students
  where student_id = p_student_id;

  delete from public.lesson_series
  where student_id = p_student_id
    and tutor_id = public.current_tutor_id();

  delete from public.students
  where id = p_student_id
    and tutor_id = public.current_tutor_id();

  delete from public.parents
  where id = any(v_parent_ids)
    and tutor_id = public.current_tutor_id()
    and profile_id is null
    and not exists (
      select 1 from public.parent_students link where link.parent_id = parents.id
    );

  return 'hard';
end;
$$;

revoke all on function public.delete_student(uuid) from public, anon;
grant execute on function public.delete_student(uuid) to authenticated;

-- Reconcile prior soft deletions with the new rule. Only rows that are already
-- deleted and have no lesson, finance, or account history are eligible.
create temporary table hard_delete_student_candidates on commit drop as
select student.id
from public.students student
where student.deleted_at is not null
  and student.profile_id is null
  and not exists (select 1 from public.lessons lesson where lesson.student_id = student.id)
  and not exists (select 1 from public.finance_transactions finance where finance.student_id = student.id);

create temporary table hard_delete_parent_candidates on commit drop as
select distinct link.parent_id as id
from public.parent_students link
join hard_delete_student_candidates candidate on candidate.id = link.student_id;

delete from public.lesson_series series
using hard_delete_student_candidates candidate
where series.student_id = candidate.id;

delete from public.group_students membership
using hard_delete_student_candidates candidate
where membership.student_id = candidate.id;

delete from public.students student
using hard_delete_student_candidates candidate
where student.id = candidate.id;

delete from public.parents parent
using hard_delete_parent_candidates candidate
where parent.id = candidate.id
  and parent.profile_id is null
  and not exists (
    select 1 from public.parent_students link where link.parent_id = parent.id
  );

notify pgrst, 'reload schema';
