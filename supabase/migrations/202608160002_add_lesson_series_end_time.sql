alter table public.lesson_series
  add column end_time time without time zone;

comment on column public.lesson_series.end_time is
  'Explicit local end time. Null is supported for legacy rows, which fall back to start_time plus duration.';
