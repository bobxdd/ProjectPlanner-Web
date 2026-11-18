import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/001_username_accounts.sql',import.meta.url),'utf8');
const edge=readFileSync(new URL('../supabase/functions/planner-auth/index.ts',import.meta.url),'utf8');
const client=readFileSync(new URL('../docs/cloud/rpc.js',import.meta.url),'utf8');
test('privileged database functions are never granted to anon or authenticated',()=>{
 assert.doesNotMatch(sql,/grant execute on function .* to anon/i);
 assert.match(sql,/grant execute on function public\.planner_session_account\(text\) to service_role;/);
});
test('private tables use RLS and browser role grant revocations',()=>{
 assert.match(sql,/alter table public\.planner_accounts enable row level security;/);
 assert.match(sql,/revoke all on public\.planner_accounts/);
 assert.match(sql,/revoke all on public\.planner_auth_limits/);
});
test('Edge auth allow-lists operations and uses server-side secret',()=>{
 assert.match(edge,/const actions=\{/);
 assert.match(edge,/SUPABASE_SECRET_KEY/);
 assert.match(edge,/planner_auth_throttle/);
 assert.doesNotMatch(edge,/console\.log\([^)]*p_password/);
});
test('browser calls only Edge endpoint for account RPC',()=>{
 assert.match(client,/\/functions\/v1\/planner-auth/);
 assert.doesNotMatch(client,/\.rpc\(/);
});
