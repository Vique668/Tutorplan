-- Transactional writes for forms that touch a main record and junction/contact rows.

create or replace function public.save_group_with_members(
  p_group_id uuid,
  p_name text,
  p_subject text,
  p_lesson_price numeric,
  p_lesson_duration integer,
  p_notes text,
  p_student_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_group_id uuid;
  v_student_id uuid;
begin
  if btrim(coalesce(p_name, '')) = '' then raise exception 'Group name is required'; end if;
  if p_lesson_price < 0 or p_lesson_duration <= 0 then raise exception 'Invalid lesson defaults'; end if;

  if p_group_id is null then
    insert into public.groups (name, subject, lesson_price, lesson_duration, notes)
    values (btrim(p_name), nullif(btrim(p_subject), ''), p_lesson_price, p_lesson_duration, nullif(btrim(p_notes), ''))
    returning id into v_group_id;
  else
    update public.groups set name = btrim(p_name), subject = nullif(btrim(p_subject), ''),
      lesson_price = p_lesson_price, lesson_duration = p_lesson_duration,
      notes = nullif(btrim(p_notes), '')
    where id = p_group_id and tutor_id = public.current_tutor_id()
    returning id into v_group_id;
    if v_group_id is null then raise exception 'Group not found'; end if;
  end if;

  delete from public.group_students where group_id = v_group_id;
  foreach v_student_id in array coalesce(p_student_ids, array[]::uuid[]) loop
    if not exists (select 1 from public.students where id = v_student_id and tutor_id = public.current_tutor_id()) then
      raise exception 'Student does not belong to the current tutor';
    end if;
    insert into public.group_students (group_id, student_id) values (v_group_id, v_student_id);
  end loop;
  return v_group_id;
end;
$$;

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
    where id = p_student_id and tutor_id = public.current_tutor_id()
    returning id into v_student_id;
    if v_student_id is null then raise exception 'Student not found'; end if;
  end if;

  if v_has_parent then
    if btrim(coalesce(p_parent_first_name, '')) = '' then raise exception 'Parent first name is required when contact data is provided'; end if;
    select parent.id into v_parent_id
    from public.parent_students link join public.parents parent on parent.id = link.parent_id
    where link.student_id = v_student_id and parent.tutor_id = public.current_tutor_id()
    order by link.created_at limit 1;
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
  end if;
  return v_student_id;
end;
$$;

revoke all on function public.save_group_with_members(uuid,text,text,numeric,integer,text,uuid[]) from public, anon;
revoke all on function public.save_student_with_parent(uuid,text,text,text,text,date,text,numeric,integer,text,text,text,text,text) from public, anon;
grant execute on function public.save_group_with_members(uuid,text,text,numeric,integer,text,uuid[]) to authenticated;
grant execute on function public.save_student_with_parent(uuid,text,text,text,text,date,text,numeric,integer,text,text,text,text,text) to authenticated;
