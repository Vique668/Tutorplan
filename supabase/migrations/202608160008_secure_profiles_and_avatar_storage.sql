-- Tutor avatar storage and immutable account roles.

create or replace function public.prevent_profile_role_change()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'Profile role cannot be changed by the account owner';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_change
before update of role on public.profiles
for each row execute function public.prevent_profile_role_change();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy avatars_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
