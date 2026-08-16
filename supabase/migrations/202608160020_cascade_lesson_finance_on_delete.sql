-- A lesson charge exists only because its lesson exists. Deleting a lesson
-- removes that linked charge, while standalone payments and expenses remain.

alter table public.finance_transactions
  drop constraint if exists finance_lesson_tenant_fk;

alter table public.finance_transactions
  add constraint finance_lesson_tenant_fk
  foreign key (lesson_id, tutor_id)
  references public.lessons (id, tutor_id)
  on delete cascade;

notify pgrst, 'reload schema';
