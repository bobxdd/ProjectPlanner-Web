-- Project Planner V3: username + password, no email, private state.
-- SETUP: run in a new dedicated Supabase project (not an already live V2 schema).
-- Browser access to tables and SECURITY DEFINER RPCs is revoked.
-- Only an allow-listed Edge Function can invoke those RPCs with a server-only key.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
revoke create on schema public from public;

create table if not exists public.planner_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z][a-z0-9_]{2,23}$'),
  password_hash text not null,
  recovery_hash text not null,
  failed_login int not null default 0,
  blocked_until timestamptz,
  failed_recovery int not null default 0,
  recovery_blocked_until timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.planner_sessions (
  token_digest text primary key,
  account_id uuid not null references public.planner_accounts(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists planner_sessions_account_idx on public.planner_sessions(account_id);
create table if not exists public.planner_user_states (
  user_id uuid primary key references public.planner_accounts(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_accounts enable row level security;
alter table public.planner_sessions enable row level security;
alter table public.planner_user_states enable row level security;
revoke all on public.planner_accounts, public.planner_sessions, public.planner_user_states from public, anon, authenticated;


-- Fixed-window server-side throttling. The Edge Function supplies only a SHA-256 key.
-- This is baseline protection; it is NOT a substitute for CAPTCHA or network limits.
create table if not exists public.planner_auth_limits(
  limit_key text primary key,
  window_opened timestamptz not null default now(),
  hits int not null default 0
);
alter table public.planner_auth_limits enable row level security;
revoke all on public.planner_auth_limits from public,anon,authenticated;

create or replace function public.planner_auth_throttle(
  p_key text,p_max int,p_window_seconds int
) returns boolean language plpgsql security definer
set search_path=pg_catalog, public as $$
declare v_hits int;
begin
  if p_key !~ '^[a-f0-9]{64}$' or p_max not between 1 and 1000
     or p_window_seconds not between 10 and 86400 then
    raise exception 'throttle_invalid' using errcode='22023';
  end if;
  insert into public.planner_auth_limits(limit_key,window_opened,hits)
    values (p_key,now(),1)
  on conflict(limit_key) do update
    set hits=case
      when public.planner_auth_limits.window_opened < now()-make_interval(secs=>p_window_seconds)
      then 1 else public.planner_auth_limits.hits+1 end,
      window_opened=case
      when public.planner_auth_limits.window_opened < now()-make_interval(secs=>p_window_seconds)
      then now() else public.planner_auth_limits.window_opened end
  returning hits into v_hits;
  return v_hits<=p_max;
end; $$;
revoke all on function public.planner_auth_throttle(text,int,int) from public,anon,authenticated;
grant execute on function public.planner_auth_throttle(text,int,int) to service_role;

-- The functions run as their owner (SQL-editor database administrator) and never
-- return password hashes, recovery digests or other users' private data.
create or replace function public.planner_session_account(p_token text)
returns uuid language sql stable security definer
set search_path = pg_catalog, extensions, public
as $$
  select s.account_id from public.planner_sessions s
  where s.token_digest = encode(digest(p_token, 'sha256'),'hex')
    and length(p_token) = 64 and s.expires_at > now() limit 1;
$$;
revoke all on function public.planner_session_account(text) from public, anon, authenticated;
-- Only a server-side Edge Function can invoke this RPC with a secret key. A token is
-- 256-bit random; exposing its associated ID does not grant a usable login.
grant execute on function public.planner_session_account(text) to service_role;

create or replace function public.planner_register(p_username text, p_password text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_name text := lower(btrim(p_username));
  v_account uuid;
  v_recovery text := encode(gen_random_bytes(24),'hex');
  v_token text := encode(gen_random_bytes(32),'hex');
begin
  if v_name !~ '^[a-z][a-z0-9_]{2,23}$' then
    raise exception 'username_invalid' using errcode='22023';
  end if;
  if length(p_password) < 12 or octet_length(p_password) > 72 then
    raise exception 'password_invalid' using errcode='22023';
  end if;
  insert into public.planner_accounts(username,password_hash,recovery_hash)
  values (v_name,crypt(p_password,gen_salt('bf',12)),encode(digest(v_recovery,'sha256'),'hex'))
  returning id into v_account;
  insert into public.planner_sessions(token_digest,account_id,expires_at)
  values (encode(digest(v_token,'sha256'),'hex'),v_account,now()+interval '7 days');
  return jsonb_build_object('token',v_token,'user_id',v_account,'username',v_name,'recovery_code',v_recovery);
exception when unique_violation then
  raise exception 'username_taken' using errcode='23505';
end; $$;

create or replace function public.planner_login(p_username text, p_password text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  v_name text := lower(btrim(p_username));
  v_account public.planner_accounts%rowtype;
  v_token text := encode(gen_random_bytes(32),'hex');
begin
  if octet_length(p_password)>72 then return jsonb_build_object('error','invalid_login'); end if;
  select * into v_account from public.planner_accounts where username=v_name for update;
  if not found then
    perform pg_sleep(0.12);
    return jsonb_build_object('error','invalid_login');
  end if;
  if v_account.blocked_until is not null then
    if v_account.blocked_until > now() then return jsonb_build_object('error','login_limited'); end if;
    update public.planner_accounts set failed_login=0,blocked_until=null where id=v_account.id;
    v_account.failed_login:=0;
  end if;
  if v_account.password_hash != crypt(p_password, v_account.password_hash) then
    update public.planner_accounts set failed_login=failed_login+1,
       blocked_until=case when failed_login >= 4 then now()+interval '15 minutes' else null end
      where id=v_account.id;
    return jsonb_build_object('error','invalid_login');
  end if;
  update public.planner_accounts set failed_login=0,blocked_until=null where id=v_account.id;
  insert into public.planner_sessions(token_digest,account_id,expires_at)
  values (encode(digest(v_token,'sha256'),'hex'),v_account.id,now()+interval '7 days');
  return jsonb_build_object('token',v_token,'user_id',v_account.id,'username',v_account.username);
end; $$;

create or replace function public.planner_whoami(p_token text)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, extensions, public
as $$
declare v_id uuid; v_name text;
begin
  v_id := public.planner_session_account(p_token);
  if v_id is null then return null; end if;
  select username into v_name from public.planner_accounts where id=v_id;
  return jsonb_build_object('id',v_id,'username',v_name);
end; $$;

create or replace function public.planner_logout(p_token text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
begin
  delete from public.planner_sessions where token_digest=encode(digest(p_token,'sha256'),'hex');
  return true;
end; $$;

create or replace function public.planner_recover(p_username text,p_recovery_code text,p_new_password text)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare v_account public.planner_accounts%rowtype; v_code text := encode(gen_random_bytes(24),'hex');
begin
  if length(p_new_password)<12 or octet_length(p_new_password)>72 then
    raise exception 'password_invalid' using errcode='22023';
  end if;
  select * into v_account from public.planner_accounts where username=lower(btrim(p_username)) for update;
  if not found then perform pg_sleep(0.12); return jsonb_build_object('error','recovery_invalid'); end if;
  if v_account.recovery_blocked_until is not null then
    if v_account.recovery_blocked_until>now() then return jsonb_build_object('error','recovery_limited'); end if;
    update public.planner_accounts set failed_recovery=0,recovery_blocked_until=null where id=v_account.id;
  end if;
  if length(p_recovery_code) != 48 or v_account.recovery_hash != encode(digest(lower(p_recovery_code),'sha256'),'hex') then
    update public.planner_accounts set failed_recovery=failed_recovery+1,
      recovery_blocked_until=case when failed_recovery >= 4 then now()+interval '15 minutes' else null end
      where id=v_account.id;
    return jsonb_build_object('error','recovery_invalid');
  end if;
  update public.planner_accounts set
    password_hash=crypt(p_new_password,gen_salt('bf',12)), recovery_hash=encode(digest(v_code,'sha256'),'hex'),
    failed_login=0,blocked_until=null,failed_recovery=0,recovery_blocked_until=null
    where id=v_account.id;
  delete from public.planner_sessions where account_id=v_account.id;
  return jsonb_build_object('recovery_code',v_code);
end; $$;

create or replace function public.planner_change_password(p_token text,p_old_password text,p_new_password text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare v_id uuid; v_hash text;
begin
  v_id:=public.planner_session_account(p_token);
  if v_id is null then raise exception 'session_expired' using errcode='22023'; end if;
  if length(p_new_password)<12 or octet_length(p_new_password)>72 then raise exception 'password_invalid' using errcode='22023'; end if;
  select password_hash into v_hash from public.planner_accounts where id=v_id for update;
  if v_hash != crypt(p_old_password,v_hash) then raise exception 'invalid_login' using errcode='22023'; end if;
  update public.planner_accounts set password_hash=crypt(p_new_password,gen_salt('bf',12)) where id=v_id;
  delete from public.planner_sessions where account_id=v_id and token_digest<>encode(digest(p_token,'sha256'),'hex');
  return true;
end; $$;

create or replace function public.planner_state_get(p_token text)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, extensions, public
as $$
declare v_id uuid; v_state public.planner_user_states%rowtype;
begin
  v_id:=public.planner_session_account(p_token);
  if v_id is null then raise exception 'session_expired' using errcode='22023'; end if;
  select * into v_state from public.planner_user_states where user_id=v_id;
  if not found then return null; end if;
  return jsonb_build_object('revision',v_state.revision,'payload',v_state.payload,'updated_at',v_state.updated_at);
end; $$;

create or replace function public.planner_state_init(p_token text,p_payload jsonb)
returns boolean language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare v_id uuid;
begin
  v_id:=public.planner_session_account(p_token);
  if v_id is null then raise exception 'session_expired' using errcode='22023'; end if;
  if octet_length(p_payload::text)>10485760 or p_payload->>'version'!='2' then
    raise exception 'state_invalid' using errcode='22023'; end if;
  insert into public.planner_user_states (user_id,revision,payload) values(v_id,1,p_payload)
    on conflict(user_id) do nothing;
  return true;
end; $$;

create or replace function public.planner_state_put(p_token text,p_revision bigint,p_payload jsonb)
returns bigint language plpgsql security definer
set search_path = pg_catalog, extensions, public
as $$
declare v_id uuid; v_new bigint;
begin
  v_id:=public.planner_session_account(p_token);
  if v_id is null then raise exception 'session_expired' using errcode='22023'; end if;
  if p_revision < 1 or octet_length(p_payload::text)>10485760 or p_payload->>'version'!='2' then
    raise exception 'state_invalid' using errcode='22023'; end if;
  update public.planner_user_states set payload=p_payload,revision=p_revision+1,updated_at=now()
    where user_id=v_id and revision=p_revision returning revision into v_new;
  return v_new; -- null means concurrent update, not a silent overwrite.
end; $$;

-- Server-side Edge RPCs only; tables and privileged functions are not directly callable by browsers.
do $$ declare x record; begin
  for x in select p.oid::regprocedure::text as name from pg_proc p
      join pg_namespace n on p.pronamespace=n.oid
    where n.nspname='public' and p.proname in (
      'planner_register','planner_login','planner_whoami','planner_logout',
      'planner_recover','planner_change_password','planner_state_get','planner_state_init','planner_state_put')
  loop
    execute 'revoke all on function ' || x.name || ' from public';
    execute 'grant execute on function ' || x.name || ' to service_role';
  end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit)
values ('planner-files','planner-files',false,52428800)
on conflict(id) do update set public=false,file_size_limit=52428800;
-- No direct client storage access. Edge Function issues scoped signed URLs.
drop policy if exists "planner_file_read" on storage.objects;
drop policy if exists "planner_file_insert" on storage.objects;
drop policy if exists "planner_file_delete" on storage.objects;
