import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const sql = read('supabase/003_two_person_workspace.sql');
const auth = read('supabase/functions/planner-auth/index.ts');
const files = read('supabase/functions/planner-files/index.ts');
const storage = read('docs/cloud/storage.js');
const runtime = read('docs/cloud/runtime.js');
const html = read('docs/index.html');
const client = read('docs/cloud/auth.js');

test('backend limits accounts with a database trigger and transaction lock', () => {
 assert.match(sql,/create trigger planner_two_accounts/);
 assert.match(sql,/count\(\*\) from public\.planner_accounts\)\s*>=\s*2/);
 assert.match(sql,/pg_advisory_xact_lock/);
});
test('registration requires a single-use invitation and removes old open registration RPC', () => {
 assert.match(sql,/p_invite_code text/);
 assert.match(sql,/used_by is null/);
 assert.match(sql,/drop function if exists public\.planner_register\(text,text\)/);
 assert.match(auth,/planner_register:\['p_username','p_password','p_invite_code'\]/);
 assert.match(client,/p_invite_code:invite/);
 assert.match(html,/id="invite-code"/);
});
test('project state is shared with compare-and-swap revisions', () => {
 assert.match(sql,/create table if not exists public\.planner_shared_state/);
 assert.match(sql,/revision=p_revision/);
 assert.match(sql,/planner_session_account\(p_token\)/);
 assert.match(runtime,/planner_state_put/);
});
test('documents use a single common storage prefix for both accounts', () => {
 const prefix='00000000-0000-4000-8000-000000000001';
 assert.ok(files.includes(prefix));
 assert.ok(storage.includes(prefix));
 assert.ok(runtime.includes(prefix));
 assert.match(sql,/revoke all on public\.planner_shared_state from public,anon,authenticated/);
});
