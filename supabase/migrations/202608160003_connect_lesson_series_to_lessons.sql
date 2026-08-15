alter table public.lessons
  add column series_occurrence_date date;

comment on column public.lessons.series_occurrence_date is
  'The planned local date of an occurrence generated from lesson_series.';

create unique index lessons_series_occurrence_unique_idx
  on public.lessons (lesson_series_id, series_occurrence_date)
  where lesson_series_id is not null and series_occurrence_date is not null;

create or replace function public.sync_lesson_series_future(
  p_series_id uuid,
  p_from_date date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_series public.lesson_series%rowtype;
  v_today date := (now() at time zone 'Europe/Moscow')::date;
  v_cutoff_date date;
  v_first_date date;
  v_last_date date;
  v_occurrence_date date;
  v_end_time time without time zone;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_existing_count integer;
begin
  select * into v_series
  from public.lesson_series
  where id = p_series_id;

  if not found or not v_series.is_active then
    return;
  end if;

  v_cutoff_date := greatest(coalesce(p_from_date, v_today), v_today);
  v_first_date := greatest(v_cutoff_date, v_series.start_date);
  v_last_date := coalesce(
    v_series.end_date,
    greatest(v_today, v_series.start_date) + 180
  );

  if v_last_date < v_first_date then
    return;
  end if;

  v_first_date := v_first_date
    + ((v_series.weekday - extract(isodow from v_first_date)::integer + 7) % 7);

  v_end_time := coalesce(
    v_series.end_time,
    v_series.start_time + make_interval(mins => v_series.duration)
  );

  -- Keep history: obsolete future occurrences are cancelled, never deleted.
  -- Completed lessons are excluded from every mutation in this function.
  update public.lessons
  set status = 'cancelled'
  where lesson_series_id = v_series.id
    and tutor_id = v_series.tutor_id
    and status <> 'completed'
    and coalesce(
      series_occurrence_date,
      (start_at at time zone 'Europe/Moscow')::date
    ) >= v_cutoff_date
    and (
      coalesce(series_occurrence_date, (start_at at time zone 'Europe/Moscow')::date) < v_first_date
      or coalesce(series_occurrence_date, (start_at at time zone 'Europe/Moscow')::date) > v_last_date
      or extract(isodow from coalesce(series_occurrence_date, (start_at at time zone 'Europe/Moscow')::date))::integer <> v_series.weekday
    );

  v_occurrence_date := v_first_date;
  while v_occurrence_date <= v_last_date loop
    v_start_at := (v_occurrence_date + v_series.start_time) at time zone 'Europe/Moscow';
    v_end_at := (v_occurrence_date + v_end_time) at time zone 'Europe/Moscow';

    select count(*) into v_existing_count
    from public.lessons
    where lesson_series_id = v_series.id
      and tutor_id = v_series.tutor_id
      and coalesce(
        series_occurrence_date,
        (start_at at time zone 'Europe/Moscow')::date
      ) = v_occurrence_date;

    if v_existing_count = 0 then
      insert into public.lessons (
        tutor_id,
        student_id,
        group_id,
        lesson_series_id,
        series_occurrence_date,
        start_at,
        end_at,
        price,
        status
      ) values (
        v_series.tutor_id,
        v_series.student_id,
        v_series.group_id,
        v_series.id,
        v_occurrence_date,
        v_start_at,
        v_end_at,
        v_series.price,
        'scheduled'
      );
    else
      update public.lessons
      set student_id = v_series.student_id,
          group_id = v_series.group_id,
          series_occurrence_date = v_occurrence_date,
          start_at = v_start_at,
          end_at = v_end_at,
          price = v_series.price
      where lesson_series_id = v_series.id
        and tutor_id = v_series.tutor_id
        and status <> 'completed'
        and coalesce(
          series_occurrence_date,
          (start_at at time zone 'Europe/Moscow')::date
        ) = v_occurrence_date;
    end if;

    v_occurrence_date := v_occurrence_date + 7;
  end loop;
end;
$$;

create or replace function public.generate_lessons_after_series_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.is_active then
    perform public.sync_lesson_series_future(new.id, new.start_date);
  end if;
  return new;
end;
$$;

create trigger lesson_series_generate_lessons_after_insert
after insert on public.lesson_series
for each row
execute function public.generate_lessons_after_series_insert();

create trigger lesson_series_generate_lessons_after_enable
after update of is_active on public.lesson_series
for each row
when (new.is_active and not old.is_active)
execute function public.generate_lessons_after_series_insert();

grant execute on function public.sync_lesson_series_future(uuid, date) to anon, authenticated;
