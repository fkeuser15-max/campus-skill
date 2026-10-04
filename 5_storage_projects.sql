-- Run the WHOLE file as its own query in Supabase -> SQL Editor. Creates the "projects" bucket (project pictures + videos).
-- The last line shows the buckets that exist: you should see avatars, portfolio and projects.

-- 1) The bucket itself
insert into storage.buckets (id, name, public) values ('projects', 'projects', true)
on conflict (id) do update set public = true;

-- 2) Size and type limits (optional: skipped with a notice if your project does not allow it)
do $$ begin
  update storage.buckets set file_size_limit = 20971520, allowed_mime_types = array['image/*', 'video/mp4', 'video/webm'] where id = 'projects';
exception when others then raise notice 'Limits skipped: %', sqlerrm;
end $$;

-- 3) Who may upload / read / delete (each person only inside their own folder)
drop policy if exists "projects files read" on storage.objects;
drop policy if exists "projects files insert" on storage.objects;
drop policy if exists "projects files delete" on storage.objects;
create policy "projects files read"   on storage.objects for select using (bucket_id = 'projects');
create policy "projects files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'projects' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "projects files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'projects' and (storage.foldername(name))[1] = auth.uid()::text);

select id, public, file_size_limit from storage.buckets order by id;
