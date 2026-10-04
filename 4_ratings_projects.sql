-- Campus Skill update: sample projects, star ratings + public reviews, no duplicate emails.
-- Run the whole file in Supabase -> SQL Editor. Safe to re-run. (Run 5_storage_projects.sql afterwards, as its own query.)

-- ===== 1. No duplicate registrations (also catches Gmail dots and +tags: a.b+x@gmail.com == ab@gmail.com) =====
create or replace function public.normalize_email(e text) returns text language sql immutable as $$
  select case when lower(split_part(e, '@', 2)) in ('gmail.com', 'googlemail.com')
    then replace(split_part(lower(split_part(e, '@', 1)), '+', 1), '.', '') || '@gmail.com'
    else lower(e) end $$;

alter table public.profiles add column if not exists email_norm text generated always as (public.normalize_email(email)) stored;

do $$ begin
  if exists (select 1 from public.profiles group by email_norm having count(*) > 1) then
    raise notice 'Duplicate emails already exist in profiles, so the unique index was NOT created. Delete the extra rows (see 6_check.sql), then re-run this file.';
  else
    create unique index if not exists profiles_email_norm_key on public.profiles (email_norm);
  end if;
end $$;

-- Lets the register form ask "is this email already taken?" before an OTP is sent (returns only true/false).
create or replace function public.email_registered(p_email text) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where email_norm = public.normalize_email(p_email)) $$;
grant execute on function public.email_registered(text) to anon, authenticated;

-- ===== 2. Sample projects (GitHub link, images, video) =====
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, description text,
  github_url text check (github_url is null or github_url ~* '^https://(www\.)?github\.com/'),
  video_url text check (video_url is null or video_url ~* '^https?://'),
  images text,                                   -- comma-separated public image URLs
  created_at timestamptz default now()
);
alter table public.projects enable row level security;
drop policy if exists "projects read" on public.projects;
drop policy if exists "projects insert" on public.projects;
drop policy if exists "projects update" on public.projects;
drop policy if exists "projects delete" on public.projects;
create policy "projects read"   on public.projects for select using (true);
create policy "projects insert" on public.projects for insert to authenticated with check (auth.uid() = user_id);
create policy "projects update" on public.projects for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects delete" on public.projects for delete to authenticated using (auth.uid() = user_id);

-- ===== 3. Star ratings + public reviews (one review per person per skill; you cannot review your own skill) =====
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  reviewer_id uuid not null,
  reviewer_name text,
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or length(comment) <= 1000),
  created_at timestamptz default now(),
  unique (skill_id, reviewer_id)
);
-- The reviewer id and display name always come from the logged-in user, never from the browser.
create or replace function public.set_reviewer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.reviewer_id := auth.uid();
  select full_name into new.reviewer_name from public.profiles where id = auth.uid();
  new.reviewer_name := coalesce(new.reviewer_name, 'Student');
  return new;
end $$;
drop trigger if exists reviews_set_reviewer on public.reviews;
create trigger reviews_set_reviewer before insert or update on public.reviews for each row execute function public.set_reviewer();

alter table public.reviews enable row level security;
drop policy if exists "reviews read" on public.reviews;
drop policy if exists "reviews insert" on public.reviews;
drop policy if exists "reviews update" on public.reviews;
drop policy if exists "reviews delete" on public.reviews;
create policy "reviews read" on public.reviews for select using (true);
create policy "reviews insert" on public.reviews for insert to authenticated
  with check (reviewer_id = auth.uid() and not exists (select 1 from public.skills s where s.id = skill_id and s.user_id = auth.uid()));
create policy "reviews update" on public.reviews for update to authenticated
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid() and not exists (select 1 from public.skills s where s.id = skill_id and s.user_id = auth.uid()));
create policy "reviews delete" on public.reviews for delete to authenticated using (reviewer_id = auth.uid());

create or replace view public.skill_ratings as
  select skill_id, round(avg(rating)::numeric, 2) as avg_rating, count(*)::int as review_count from public.reviews group by skill_id;
grant select on public.skill_ratings to anon, authenticated;

notify pgrst, 'reload schema';
