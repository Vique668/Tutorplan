-- Allow parent contacts without a last name or email address.

alter table public.parents
  drop constraint if exists parents_last_name_not_blank,
  drop constraint if exists parents_email_not_blank,
  alter column last_name drop not null,
  alter column email drop not null;
