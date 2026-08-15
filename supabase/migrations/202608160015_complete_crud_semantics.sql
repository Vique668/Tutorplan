-- Complete application CRUD semantics without removing lesson or finance
-- history. Students use explicit soft deletion; parent contacts are removed
-- when their fields are cleared and they have no remaining student links.

alter table public.students
  add column if not exists deleted_at timestamptz;

create index if not exists students_tutor_not_deleted_idx
  on public.students (tutor_id, created_at desc)
  where deleted_at is null;

create or replace function public.save_student_with_parent(
  p_student_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_date_of_birth date,
  p_address text,
  p_lesson_price numeric,
  p_lesson_duration integer,
  p_notes text,
  p_parent_first_name text,
  p_parent_last_name text,
  p_parent_phone text,
  p_parent_email text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_student_id uuid;
  v_parent_id uuid;
  v_has_parent boolean := coalesce(btrim(p_parent_first_name), '') <> ''
    or coalesce(btrim(p_parent_last_name), '') <> ''
    or coalesce(btrim(p_parent_phone), '') <> ''
    or coalesce(btrim(p_parent_email), '') <> '';
begin
  if btrim(coalesce(p_first_name, '')) = '' or btrim(coalesce(p_last_name, '')) = '' then
    raise exception 'Student first and last name are required';
  end if;

  if p_student_id is null then
    insert into public.students (first_name, last_name, phone, email, date_of_birth, address, lesson_price, lesson_duration, notes, status)
    values (btrim(p_first_name), btrim(p_last_name), nullif(btrim(p_phone), ''), nullif(btrim(p_email), ''), p_date_of_birth,
      nullif(btrim(p_address), ''), p_lesson_price, p_lesson_duration, nullif(btrim(p_notes), ''), 'active')
    returning id into v_student_id;
  else
    update public.students set first_name = btrim(p_first_name), last_name = btrim(p_last_name), phone = nullif(btrim(p_phone), ''),
      email = nullif(btrim(p_email), ''), date_of_birth = p_date_of_birth, address = nullif(btrim(p_address), ''),
      lesson_price = p_lesson_price, lesson_duration = p_lesson_duration, notes = nullif(btrim(p_notes), '')
    where id = p_student_id
      and tutor_id = public.current_tutor_id()
      and deleted_at is null
    returning id into v_student_id;
    if v_student_id is null then raise exception 'Student not found'; end if;
  end if;

  select parent.id into v_parent_id
  from public.parent_students link
  join public.parents parent on parent.id = link.parent_id
  where link.student_id = v_student_id
    and parent.tutor_id = public.current_tutor_id()
  order by link.created_at
  limit 1;

  if v_has_parent then
    if btrim(coalesce(p_parent_first_name, '')) = '' then raise exception 'Parent first name is required when contact data is provided'; end if;
    if v_parent_id is null then
      insert into public.parents (first_name, last_name, phone, email)
      values (btrim(p_parent_first_name), nullif(btrim(p_parent_last_name), ''), nullif(btrim(p_parent_phone), ''), nullif(btrim(p_parent_email), ''))
      returning id into v_parent_id;
      insert into public.parent_students (parent_id, student_id) values (v_parent_id, v_student_id);
    else
      update public.parents set first_name = btrim(p_parent_first_name), last_name = nullif(btrim(p_parent_last_name), ''),
        phone = nullif(btrim(p_parent_phone), ''), email = nullif(btrim(p_parent_email), '')
      where id = v_parent_id and tutor_id = public.current_tutor_id();
    end if;
  elsif v_parent_id is not null then
    delete from public.parent_students
    where parent_id = v_parent_id and student_id = v_student_id;

    if not exists (select 1 from public.parent_students where parent_id = v_parent_id) then
      delete from public.parents
      where id = v_parent_id and tutor_id = public.current_tutor_id();
    end if;
  end if;

  return v_student_id;
end;
$$;

create or replace function public.soft_delete_student(p_student_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_student_id uuid;
begin
  update public.students
  set deleted_at = now(), status = 'archived'
  where id = p_student_id
    and tutor_id = public.current_tutor_id()
    and deleted_at is null
  returning id into v_student_id;

  if v_student_id is null then
    raise exception 'Student not found';
  end if;

  update public.lesson_series
  set is_active = false
  where student_id = v_student_id
    and tutor_id = public.current_tutor_id()
    and deleted_at is null;

  delete from public.group_students where student_id = v_student_id;
  return v_student_id;
end;
$$;

revoke all on function public.soft_delete_student(uuid) from public, anon;
grant execute on function public.soft_delete_student(uuid) to authenticated;

notify pgrst, 'reload schema';
