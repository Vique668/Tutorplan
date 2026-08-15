-- Existing lesson occurrences remain untouched when a template is disabled.
-- New occurrences linked to a series are accepted only while that series is
-- active. The row lock serializes generation with concurrent deactivation.

create or replace function public.require_active_lesson_series()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_is_active boolean;
begin
  if new.lesson_series_id is null then
    return new;
  end if;

  select series.is_active and series.deleted_at is null
  into v_is_active
  from public.lesson_series as series
  where series.id = new.lesson_series_id
    and series.tutor_id = new.tutor_id
  for share;

  if not coalesce(v_is_active, false) then
    raise exception 'Cannot create a lesson occurrence for an inactive lesson series';
  end if;

  return new;
end;
$$;

drop trigger if exists lessons_require_active_series_before_insert on public.lessons;
create trigger lessons_require_active_series_before_insert
before insert on public.lessons
for each row
when (new.lesson_series_id is not null)
execute function public.require_active_lesson_series();

revoke all on function public.require_active_lesson_series() from public, anon;

notify pgrst, 'reload schema';
