-- Project Planner: one shared private workspace, exactly two invitation-only accounts.
-- Apply AFTER 001_username_accounts.sql to a fresh, empty project.
-- Never store invitation codes, passwords or service-role keys in Git.
create table if not exists public.planner_invites (
  code_digest text primary key,
  used_by uuid unique references public.planner_accounts(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.planner_invites enable row level security;
revoke all on public.planner_invites from public,anon,authenticated;

create table if not exists public.planner_shared_state (
 workspace_id uuid primary key check (workspace_id='00000000-0000-4000-8000-000000000001'::uuid),
 revision bigint not null default 1 check (revision > 0),
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.planner_shared_state enable row level security;
revoke all on public.planner_shared_state from public,anon,authenticated;

-- Database-level guard: concurrent inserts cannot create a third account.
create or replace function public.planner_enforce_two_accounts()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public as $$
begin
 perform pg_advisory_xact_lock(40260427);
 if (select count(*) from public.planner_accounts)>=2 then
   raise exception 'registration_closed' using errcode='22023';
 end if;
 return new;
end; $$;
revoke all on function public.planner_enforce_two_accounts() from public,anon,authenticated;
drop trigger if exists planner_two_accounts on public.planner_accounts;
create trigger planner_two_accounts before insert on public.planner_accounts
for each row execute function public.planner_enforce_two_accounts();

-- One of the two one-time, 192-bit invitation codes is necessary to register.
create or replace function public.planner_register(
 p_username text,p_password text,p_invite_code text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,extensions,public as $$
declare
 v_name text := lower(btrim(p_username));
 v_account uuid;
 v_digest text;
 v_recovery text := encode(gen_random_bytes(24),'hex');
 v_token text := encode(gen_random_bytes(32),'hex');
begin
 if v_name !~ '^[a-z][a-z0-9_]{2,23}$' then
   raise exception 'username_invalid' using errcode='22023';
 end if;
 if length(p_password)<12 or octet_length(p_password)>72 then
   raise exception 'password_invalid' using errcode='22023';
 end if;
 if p_invite_code !~ '^[a-f0-9]{48}$' then
   raise exception 'invitation_invalid' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(40260427);
 if (select count(*) from public.planner_accounts)>=2 then
   raise exception 'registration_closed' using errcode='22023';
 end if;
 v_digest:=encode(digest(p_invite_code,'sha256'),'hex');
 perform 1 from public.planner_invites
 where code_digest=v_digest and used_by is null for update;
 if not found then raise exception 'invitation_invalid' using errcode='22023'; end if;
 insert into public.planner_accounts(username,password_hash,recovery_hash)
 values(v_name,crypt(p_password,gen_salt('bf',12)),encode(digest(v_recovery,'sha256'),'hex'))
 returning id into v_account;
 update public.planner_invites set used_by=v_account where code_digest=v_digest;
 insert into public.planner_sessions(token_digest,account_id,expires_at)
 values(encode(digest(v_token,'sha256'),'hex'),v_account,now()+interval '7 days');
 return jsonb_build_object('token',v_token,'user_id',v_account,'username',v_name,'recovery_code',v_recovery);
exception when unique_violation then
 raise exception 'username_taken' using errcode='23505';
end; $$;
-- Delete the old unauthenticated two-argument signature completely!
drop function if exists public.planner_register(text,text);
revoke all on function public.planner_register(text,text,text) from public,anon,authenticated;
grant execute on function public.planner_register(text,text,text) to service_role;

-- The two accounts read and update the SAME row, guarded by a revision CAS.
create or replace function public.planner_state_get(p_token text)
returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,extensions,public as $$
declare v_record public.planner_shared_state%rowtype;
begin
 if public.planner_session_account(p_token) is null then
  raise exception 'session_expired' using errcode='22023';
 end if;
 select * into v_record from public.planner_shared_state
 where workspace_id='00000000-0000-4000-8000-000000000001'::uuid;
 if not found then return null; end if;
 return jsonb_build_object('revision',v_record.revision,'payload',v_record.payload,'updated_at',v_record.updated_at);
end; $$;

create or replace function public.planner_state_init(p_token text,p_payload jsonb)
returns boolean language plpgsql security definer
set search_path=pg_catalog,extensions,public as $$
begin
 if public.planner_session_account(p_token) is null then
  raise exception 'session_expired' using errcode='22023';
 end if;
 if octet_length(p_payload::text)>10485760 or p_payload->>'version'!='2' then
  raise exception 'state_invalid' using errcode='22023';
 end if;
 insert into public.planner_shared_state(workspace_id,revision,payload)
 values('00000000-0000-4000-8000-000000000001'::uuid,1,p_payload)
 on conflict(workspace_id) do nothing;
 return true;
end; $$;

create or replace function public.planner_state_put(
 p_token text,p_revision bigint,p_payload jsonb
) returns bigint language plpgsql security definer
set search_path=pg_catalog,extensions,public as $$
declare v_next bigint;
begin
 if public.planner_session_account(p_token) is null then
  raise exception 'session_expired' using errcode='22023';
 end if;
 if p_revision<1 or octet_length(p_payload::text)>10485760 or p_payload->>'version'!='2' then
  raise exception 'state_invalid' using errcode='22023';
 end if;
 update public.planner_shared_state
 set payload=p_payload,revision=p_revision+1,updated_at=now()
 where workspace_id='00000000-0000-4000-8000-000000000001'::uuid
   and revision=p_revision
 returning revision into v_next;
 return v_next; -- null -> stale edit, send 409 to client
end; $$;
revoke all on function public.planner_state_get(text),public.planner_state_init(text,jsonb),public.planner_state_put(text,bigint,jsonb)
 from public,anon,authenticated;
grant execute on function public.planner_state_get(text),public.planner_state_init(text,jsonb),public.planner_state_put(text,bigint,jsonb)
 to service_role;

-- No direct browser reads/writes of project data, passwords or invitations.
revoke all on public.planner_accounts,public.planner_sessions,
 public.planner_user_states,public.planner_shared_state,public.planner_invites
 from public,anon,authenticated;
