-- Run after steps 1 and 2. Copy the whole result table and send it to me if anything still fails.
select 'columns' as kind, table_name as name, string_agg(column_name, ', ' order by ordinal_position) as detail
  from information_schema.columns where table_schema = 'public' and table_name in ('profiles','skills','messages','students') group by table_name
union all select 'trigger', tgname, tgrelid::regclass::text from pg_trigger where not tgisinternal and tgrelid = 'auth.users'::regclass
union all select 'policy', tablename || ': ' || policyname, cmd from pg_policies
  where (schemaname = 'public' and tablename in ('profiles','skills','messages')) or (schemaname = 'storage' and (policyname like 'avatars%' or policyname like 'portfolio%'))
union all select 'bucket', id, 'public=' || public::text from storage.buckets
union all select 'rows', 'auth.users', count(*)::text from auth.users
union all select 'rows', 'profiles', count(*)::text from public.profiles
union all select 'rows', 'skills', count(*)::text from public.skills;
