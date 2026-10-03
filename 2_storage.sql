-- Campus Skill, STEP 2 of 2: storage buckets (profile photos + portfolio). Run AFTER 1_database.sql, as its own query.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)   on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true) on conflict (id) do update set public = true;

drop policy if exists "avatars read" on storage.objects;
drop policy if exists "avatars insert" on storage.objects;
drop policy if exists "avatars update" on storage.objects;
drop policy if exists "portfolio read" on storage.objects;
drop policy if exists "portfolio insert" on storage.objects;
drop policy if exists "portfolio delete" on storage.objects;

create policy "avatars read"   on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio read"   on storage.objects for select using (bucket_id = 'portfolio');
create policy "portfolio insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio delete" on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
