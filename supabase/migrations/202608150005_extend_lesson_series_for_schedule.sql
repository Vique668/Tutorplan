alter table public.lesson_series
  add column price numeric(12, 2) not null default 0,
  add column is_active boolean not null default true,
  alter column end_date drop not null;

alter table public.lesson_series
  add constraint lesson_series_price_nonnegative check (price >= 0);
