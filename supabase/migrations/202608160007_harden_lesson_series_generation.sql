-- Idempotent rolling lesson generation that respects tutor timezone and occurrence exceptions.

create or replace function public.generate_lesson_series_range(
  p_series_id uuid,
  p_from_date date,
  p_to_date date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_series public.lesson_series%rowtype;
  v_timezone text;
  v_first_date date;
  v_last_date date;
  v_occurrence_date date;
  v_end_time time without time zone;
begin
  select * into v_series from public.lesson_series
  where id = p_series_id and is_active and deleted_at is null;
  if not found then return; end if;

  select coalesce(settings.timezone, 'Europe/Moscow') into v_timezone
  from public.tutors tutor
  left join public.tutor_settings settings on settings.tutor_id = tutor.id
  where tutor.id = v_series.tutor_id;

  v_first_date := greatest(p_from_date, v_series.start_date);
  v_last_date := least(p_to_date, coalesce(v_series.end_date, p_to_date));
  if v_last_date < v_first_date then return; end if;

  v_first_date := v_first_date + ((v_series.weekday - extract(isodow from v_first_date)::integer + 7) % 7);
  v_end_time := coalesce(v_series.end_time, v_series.start_time + make_interval(mins => v_series.duration));
  v_occurrence_date := v_first_date;

  while v_occurrence_date <= v_last_date loop
    insert into public.lessons (
      tutor_id, student_id, group_id, lesson_series_id, series_occurrence_date,
      start_at, end_at, price, status
    ) values (
      v_series.tutor_id, v_series.student_id, v_series.group_id, v_series.id, v_occurrence_date,
      (v_occurrence_date + v_series.start_time) at time zone v_timezone,
      (v_occurrence_date + v_end_time) at time zone v_timezone,
      v_series.price, 'scheduled'
    )
    on conflict (lesson_series_id, series_occurrence_date)
      where lesson_series_id is not null and series_occurrence_date is not null
    do nothing;
    v_occurrence_date := v_occurrence_date + 7;
  end loop;
end;
$$;

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
  v_timezone text;
  v_today date;
  v_from_date date;
  v_to_date date;
  v_first_date date;
  v_occurrence_date date;
  v_end_time time without time zone;
begin
  select * into v_series from public.lesson_series
  where id = p_series_id and deleted_at is null;
  if not found or not v_series.is_active then return; end if;

  select coalesce(settings.timezone, 'Europe/Moscow') into v_timezone
  from public.tutors tutor
  left join public.tutor_settings settings on settings.tutor_id = tutor.id
  where tutor.id = v_series.tutor_id;

  v_today := (now() at time zone v_timezone)::date;
  v_from_date := greatest(coalesce(p_from_date, v_today), v_today, v_series.start_date);
  v_to_date := least(coalesce(v_series.end_date, v_from_date + 84), v_from_date + 84);
  v_first_date := v_from_date + ((v_series.weekday - extract(isodow from v_from_date)::integer + 7) % 7);
  v_end_time := coalesce(v_series.end_time, v_series.start_time + make_interval(mins => v_series.duration));

  update public.lessons
  set status = 'cancelled'
  where lesson_series_id = v_series.id
    and status <> 'completed'
    and coalesce(series_occurrence_date, (start_at at time zone v_timezone)::date) >= v_from_date
    and (
      extract(isodow from coalesce(series_occurrence_date, (start_at at time zone v_timezone)::date))::integer <> v_series.weekday
      or coalesce(series_occurrence_date, (start_at at time zone v_timezone)::date) < v_series.start_date
      or (v_series.end_date is not null and coalesce(series_occurrence_date, (start_at at time zone v_timezone)::date) > v_series.end_date)
    );

  v_occurrence_date := v_first_date;
  while v_occurrence_date <= v_to_date loop
    insert into public.lessons (
      tutor_id, student_id, group_id, lesson_series_id, series_occurrence_date,
      start_at, end_at, price, status
    ) values (
      v_series.tutor_id, v_series.student_id, v_series.group_id, v_series.id, v_occurrence_date,
      (v_occurrence_date + v_series.start_time) at time zone v_timezone,
      (v_occurrence_date + v_end_time) at time zone v_timezone,
      v_series.price, 'scheduled'
    )
    on conflict (lesson_series_id, series_occurrence_date)
      where lesson_series_id is not null and series_occurrence_date is not null
    do update set
      student_id = excluded.student_id,
      group_id = excluded.group_id,
      start_at = excluded.start_at,
      end_at = excluded.end_at,
      price = excluded.price
    where lessons.status <> 'completed';
    v_occurrence_date := v_occurrence_date + 7;
  end loop;
end;
$$;

create or replace function public.generate_lessons_after_series_insert()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  v_timezone text;
  v_today date;
begin
  if new.is_active and new.deleted_at is null then
    select coalesce(timezone, 'Europe/Moscow') into v_timezone
    from public.tutor_settings where tutor_id = new.tutor_id;
    v_today := (now() at time zone coalesce(v_timezone, 'Europe/Moscow'))::date;
    perform public.generate_lesson_series_range(new.id, greatest(new.start_date, v_today), greatest(new.start_date, v_today) + 84);
  end if;
  return new;
end;
$$;

create or replace function public.generate_active_lesson_series_range(
  p_from_date date,
  p_to_date date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare v_series_id uuid;
begin
  if p_to_date < p_from_date or p_to_date > p_from_date + 370 then
    raise exception 'Invalid calendar generation range';
  end if;
  for v_series_id in
    select id from public.lesson_series
    where tutor_id = public.current_tutor_id() and is_active and deleted_at is null
      and start_date <= p_to_date and (end_date is null or end_date >= p_from_date)
  loop
    perform public.generate_lesson_series_range(v_series_id, p_from_date, p_to_date);
  end loop;
end;
$$;

revoke all on function public.generate_lesson_series_range(uuid, date, date) from public, anon;
revoke all on function public.generate_active_lesson_series_range(date, date) from public, anon;
grant execute on function public.generate_lesson_series_range(uuid, date, date) to authenticated;
grant execute on function public.generate_active_lesson_series_range(date, date) to authenticated;
