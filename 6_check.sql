-- Run last. Copy the whole result table and send it to me if anything still fails.
select 'columns' as kind, table_name as name, string_agg(column_name, ', ' order by ordinal_position) as detail
  from information_schema.columns where table_schema = 'public' and table_name in ('profiles','skills','messages','projects','reviews','students','skill_ratings') group by table_name
union all select 'trigger', tgname, tgrelid::regclass::text from pg_trigger where not tgisinternal and (tgrelid = 'auth.users'::regclass or tgrelid = 'public.reviews'::regclass)
union all select 'function', proname, '' from pg_proc where pronamespace = 'public'::regnamespace and proname in ('email_registered','normalize_email','set_reviewer')
union all select 'index', indexname, tablename from pg_indexes where schemaname = 'public' and indexname = 'profiles_email_norm_key'
union all select 'policy', tablename || ': ' || policyname, cmd from pg_policies
  where (schemaname = 'public' and tablename in ('profiles','skills','messages','projects','reviews')) or (schemaname = 'storage' and (policyname like 'avatars%' or policyname like 'portfolio%' or policyname like 'projects files%'))
union all select 'bucket', id, 'public=' || public::text from storage.buckets
union all select 'rows', 'auth.users', count(*)::text from auth.users
union all select 'rows', 'profiles', count(*)::text from public.profiles
union all select 'rows', 'skills', count(*)::text from public.skills
union all select 'rows', 'projects', count(*)::text from public.projects
union all select 'rows', 'reviews', count(*)::text from public.reviews
union all select 'duplicate emails', email_norm, count(*)::text from public.profiles group by email_norm having count(*) > 1;
