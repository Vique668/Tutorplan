-- Add optional profile details to existing students without changing current rows.

alter table public.students
  add column date_of_birth date,
  add column address text;
