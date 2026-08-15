-- Atomically mark a no-show and optionally charge it without duplicate ledger rows.
create or replace function public.mark_lesson_no_show(
  p_lesson_id uuid,
  p_charge boolean
)
returns public.lessons
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lesson public.lessons%rowtype;
  v_timezone text;
begin
  update public.lessons set status = 'no_show'
  where id = p_lesson_id and tutor_id = public.current_tutor_id()
  returning * into v_lesson;
  if not found then raise exception 'Lesson not found'; end if;

  if p_charge and v_lesson.price > 0 then
    select coalesce(timezone, 'Europe/Moscow') into v_timezone
    from public.tutor_settings where tutor_id = v_lesson.tutor_id;
    insert into public.finance_transactions (
      tutor_id, student_id, group_id, lesson_id, type, category, amount,
      transaction_date, status, description
    ) values (
      v_lesson.tutor_id, v_lesson.student_id, v_lesson.group_id, v_lesson.id,
      'lesson_charge', 'Неявка', v_lesson.price,
      (v_lesson.start_at at time zone coalesce(v_timezone, 'Europe/Moscow'))::date,
      'posted', 'Начисление за пропущенное занятие'
    )
    on conflict (lesson_id) where type = 'lesson_charge'
    do update set amount = excluded.amount, status = 'posted', category = 'Неявка',
      description = excluded.description;
  end if;
  return v_lesson;
end;
$$;

revoke all on function public.mark_lesson_no_show(uuid, boolean) from public, anon;
grant execute on function public.mark_lesson_no_show(uuid, boolean) to authenticated;
