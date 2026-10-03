-- Campus Skill: run in Supabase -> SQL Editor. Safe to re-run on a project that used the first version.

-- ===== Tables =====
create table if not exists public.profiles (
  id uuid primary key,                 -- = auth user id for real users (no FK so demo students can be imported)
  email text not null,
  full_name text not null,
  phone text, enrollment_no text, college text, address text, avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists headline text;   -- e.g. "UI/UX & Graphic Designer"
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists portfolio text;  -- comma-separated image URLs (optional)

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null, title text not null, description text not null,
  created_at timestamptz default now()
);
alter table public.skills add column if not exists tags text;    -- comma-separated, optional
alter table public.skills add column if not exists price text;   -- optional, e.g. "₹300"

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null, to_user uuid not null,
  body text not null, created_at timestamptz default now()
);

alter table public.messages add column if not exists from_name text;
alter table public.messages add column if not exists from_email text;
alter table public.messages add column if not exists is_read boolean not null default false;

-- ===== Auto-create the profile when a user signs up (uses data sent with the OTP request) =====
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, enrollment_no, college, address)
  values (new.id, new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'enrollment_no',
    new.raw_user_meta_data->>'college', new.raw_user_meta_data->>'address')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_user_deleted() returns trigger
language plpgsql security definer set search_path = public as $$
begin delete from public.profiles where id = old.id; return old; end $$;
drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted after delete on auth.users for each row execute function public.handle_user_deleted();

-- Backfill: users who signed up before this trigger existed
insert into public.profiles (id, email, full_name)
select u.id, u.email, split_part(u.email,'@',1) from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ===== Public marketplace view: safe columns only (no email, phone, enrollment no, address) =====
create or replace view public.students as
  select id, full_name, college, department, headline, bio, avatar_url, portfolio from public.profiles;
grant select on public.students to anon, authenticated;

-- ===== Row level security =====
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.messages enable row level security;
drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles insert"   on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update"   on public.profiles for update to authenticated using (auth.uid() = id);
drop policy if exists "skills read" on public.skills;
drop policy if exists "skills insert" on public.skills;
drop policy if exists "skills update" on public.skills;
drop policy if exists "skills delete" on public.skills;
create policy "skills read"   on public.skills for select using (true);
create policy "skills insert" on public.skills for insert to authenticated with check (auth.uid() = user_id);
create policy "skills update" on public.skills for update to authenticated using (auth.uid() = user_id);
create policy "skills delete" on public.skills for delete to authenticated using (auth.uid() = user_id);
drop policy if exists "messages read own" on public.messages;   -- inserts happen only via the send-message function
create policy "messages read own" on public.messages for select to authenticated using (auth.uid() in (from_user, to_user));

-- ===== Profile photos =====
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
drop policy if exists "avatars read" on storage.objects;
drop policy if exists "avatars insert" on storage.objects;
drop policy if exists "avatars update" on storage.objects;
create policy "avatars read"   on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== Inbox + portfolio (added in this version) =====
alter table public.messages add column if not exists from_name text;
alter table public.messages add column if not exists from_email text;
alter table public.messages add column if not exists is_read boolean default false;
revoke update on public.messages from authenticated;
grant update (is_read) on public.messages to authenticated;          -- recipients can only flip the read flag
drop policy if exists "messages mark read" on public.messages;
create policy "messages mark read" on public.messages for update to authenticated
  using (auth.uid() = to_user) with check (auth.uid() = to_user);

insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true) on conflict do nothing;
drop policy if exists "portfolio read" on storage.objects;
drop policy if exists "portfolio insert" on storage.objects;
drop policy if exists "portfolio delete" on storage.objects;
create policy "portfolio read"   on storage.objects for select using (bucket_id = 'portfolio');
create policy "portfolio insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio delete" on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== Portfolio images (public read, owner can add/remove inside their own folder) =====
insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true) on conflict do nothing;
drop policy if exists "portfolio read" on storage.objects;
drop policy if exists "portfolio insert" on storage.objects;
drop policy if exists "portfolio delete" on storage.objects;
create policy "portfolio read"   on storage.objects for select using (bucket_id = 'portfolio');
create policy "portfolio insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio delete" on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

-- Recipients may mark their messages as read (only that column is updatable)
drop policy if exists "messages mark read" on public.messages;
create policy "messages mark read" on public.messages for update to authenticated using (auth.uid() = to_user) with check (auth.uid() = to_user);
revoke update on public.messages from authenticated;
grant update (is_read) on public.messages to authenticated;
