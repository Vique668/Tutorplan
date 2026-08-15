-- Add an optional contact phone to parent records.

alter table public.parents
  add column phone text;
