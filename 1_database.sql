-- Campus Skill, STEP 1 of 2: database. Works from your current state (tables profiles + skills only).
-- Paste ALL of it in Supabase -> SQL Editor -> Run. Safe to re-run.

-- ===== Tables =====
create table if not exists public.profiles (
  id uuid primary key, email text not null, full_name text not null,
  phone text, enrollment_no text, college text, address text, avatar_url text,
  created_at timestamptz default now()
);
-- Remove the old link to auth.users (so demo students can be imported); the trigger below keeps ids in sync.
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'f' loop
    execute format('alter table public.profiles drop constraint %I', c);
  end loop;
end $$;
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists portfolio text;

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null, title text not null, description text not null,
  created_at timestamptz default now()
);
alter table public.skills add column if not exists tags text;
alter table public.skills add column if not exists price text;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null, to_user uuid not null,
  from_name text, from_email text, body text not null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

-- ===== Profile is created automatically when a user signs up =====
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, enrollment_no, college, address)
  values (new.id, coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(coalesce(new.email,'student'),'@',1)),
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

-- Backfill: accounts that already exist but have no profile row
insert into public.profiles (id, email, full_name, phone, enrollment_no, college, address)
select u.id, u.email, coalesce(nullif(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1)),
  u.raw_user_meta_data->>'phone', u.raw_user_meta_data->>'enrollment_no', u.raw_user_meta_data->>'college', u.raw_user_meta_data->>'address'
from auth.users u where u.email is not null and not exists (select 1 from public.profiles p where p.id = u.id);

-- ===== Public marketplace view: safe columns only =====
create or replace view public.students as
  select id, full_name, college, department, headline, bio, avatar_url, portfolio from public.profiles;
grant select on public.students to anon, authenticated;

-- ===== Row level security =====
alter table public.profiles enable row level security;
alter table public.skills   enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles insert"   on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update"   on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "skills read" on public.skills;
drop policy if exists "skills insert" on public.skills;
drop policy if exists "skills update" on public.skills;
drop policy if exists "skills delete" on public.skills;
create policy "skills read"   on public.skills for select using (true);
create policy "skills insert" on public.skills for insert to authenticated with check (auth.uid() = user_id);
create policy "skills update" on public.skills for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "skills delete" on public.skills for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "messages read own" on public.messages;
drop policy if exists "messages mark read" on public.messages;
create policy "messages read own"  on public.messages for select to authenticated using (auth.uid() in (from_user, to_user));
create policy "messages mark read" on public.messages for update to authenticated using (auth.uid() = to_user) with check (auth.uid() = to_user);
revoke update on public.messages from authenticated;
grant update (is_read) on public.messages to authenticated;   -- recipients can only flip the read flag

notify pgrst, 'reload schema';
