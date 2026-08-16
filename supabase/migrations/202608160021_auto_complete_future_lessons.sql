-- Automatically complete lessons that finish after this feature is enabled.
-- Lessons that had already ended before the migration are intentionally left unchanged.

create extension if not exists pg_cron;

create or replace function public.complete_elapsed_lessons(
  p_enabled_at timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed_count integer;
begin
  with completed as (
    update public.lessons
    set status = 'completed'
    where status in ('scheduled', 'rescheduled')
      and end_at >= p_enabled_at
      and end_at <= now()
    returning id
  )
  select count(*)::integer
  into v_completed_count
  from completed;

  return v_completed_count;
end;
$$;

revoke all on function public.complete_elapsed_lessons(timestamptz)
from public, anon, authenticated;

do $$
declare
  v_enabled_at timestamptz := clock_timestamp();
  v_command text;
begin
  v_command := format(
    'select public.complete_elapsed_lessons(%L::timestamptz);',
    v_enabled_at
  );

  perform cron.schedule(
    'tutorplan-complete-elapsed-lessons',
    '* * * * *',
    v_command
  );
end;
$$;

