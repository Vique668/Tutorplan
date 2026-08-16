-- Deleting a weekly template removes only its future generated occurrences.
-- Past lessons, completed/no-show history, and financially linked lessons stay.

create or replace function public.delete_lesson_series(p_series_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_series_id uuid;
  v_deleted_count integer;
begin
  update public.lesson_series
  set is_active = false,
      deleted_at = now()
  where id = p_series_id
    and tutor_id = public.current_tutor_id()
    and deleted_at is null
  returning id into v_series_id;

  if v_series_id is null then
    raise exception 'Schedule template not found';
  end if;

  delete from public.lessons lesson
  where lesson.lesson_series_id = v_series_id
    and lesson.tutor_id = public.current_tutor_id()
    and lesson.start_at > now()
    and lesson.status not in ('completed', 'no_show')
    and not exists (
      select 1
      from public.finance_transactions finance
      where finance.lesson_id = lesson.id
    );

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

revoke all on function public.delete_lesson_series(uuid) from public, anon;
grant execute on function public.delete_lesson_series(uuid) to authenticated;

-- Reconcile templates that were deleted before this behavior was introduced.
delete from public.lessons lesson
using public.lesson_series series
where lesson.lesson_series_id = series.id
  and series.deleted_at is not null
  and lesson.start_at > now()
  and lesson.status not in ('completed', 'no_show')
  and not exists (
    select 1
    from public.finance_transactions finance
    where finance.lesson_id = lesson.id
  );

notify pgrst, 'reload schema';
