-- Reconcile the manually-created remote baseline with the local schema.
-- The remote inspection confirmed there are no NULL price values, so this
-- constraint can be restored without rewriting existing lesson series.

alter table public.lesson_series
  alter column price set default 0,
  alter column price set not null;

notify pgrst, 'reload schema';
