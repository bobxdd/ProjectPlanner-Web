-- Run after 001_username_accounts.sql. Structural checks only, NOT a live RLS test.
select tablename, rowsecurity from pg_tables
where schemaname='public' and tablename in ('planner_accounts','planner_sessions','planner_user_states');
select grantee, table_name, privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name in ('planner_accounts','planner_sessions','planner_user_states')
  and grantee in ('anon','authenticated','PUBLIC');
-- Above query must return ZERO rows.
select proname, prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname like 'planner_%' order by proname;
-- Every planner_* RPC with access to account tables must have prosecdef=true.
select id,public,file_size_limit from storage.buckets where id='planner-files';
-- Bucket must be private; file max 50 MiB on Supabase Free.

-- Each row must return FALSE/FALSE: no browser account may call privileged RPCs directly.
select p.proname, has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'planner_%';
