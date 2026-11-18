import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeUsername,validateSignup,validateRecoveryCode,authErrorMessage} from '../docs/cloud/auth-policy.mjs';
import {isPublicSupabaseKey} from '../docs/cloud/client.js';

test('username validation and normalization',()=>{
 assert.equal(normalizeUsername('  Alpha_42 '),'alpha_42');
 assert.equal(validateSignup({username:'Beta_3',password:'a very long password',confirmation:'a very long password'}),'');
 for(const username of ['a','1name','a-b','a@b.com','ab','a'.repeat(30),'äbc'])
  assert.match(validateSignup({username,password:'a very long password',confirmation:'a very long password'}),/Benutzername/);
});
test('strict password policy and matching confirmation',()=>{
 const base={username:'test_user',password:'123456789012',confirmation:'123456789012'};
 assert.equal(validateSignup(base),'');
 assert.match(validateSignup({...base,password:'1234'}),/12/);
 assert.match(validateSignup({...base,confirmation:'different'}),/überein/);
 assert.match(validateSignup({...base,password:'x'.repeat(257),confirmation:'x'.repeat(257)}),/256/);
});
test('256-bit session tokens must be random-looking hex; recovery code 192 bits',()=>{
 assert.equal(validateRecoveryCode('a'.repeat(48)),true);
 assert.equal(validateRecoveryCode('a'.repeat(47)),false);
 assert.equal(validateRecoveryCode('a'.repeat(49)),false);
 assert.equal(validateRecoveryCode('g'.repeat(48)),false);
});
test('public key only, never secret key on GitHub Pages',()=>{
 assert.equal(isPublicSupabaseKey('sb_publishable_abcDEF123_-'),true);
 assert.equal(isPublicSupabaseKey('sb_secret_super_secret'),false);
 const jwt=role=>`eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
 assert.equal(isPublicSupabaseKey(jwt('anon')),true);
 assert.equal(isPublicSupabaseKey(jwt('service_role')),false);
});
test('mapped errors do not expose SQL details',()=>{
 assert.match(authErrorMessage({message:'username_taken'}),/vergeben/);
 assert.match(authErrorMessage({message:'invalid_login'}),/falsch/);
 assert.match(authErrorMessage({message:'recovery_invalid'}),/falsch/);
 assert.match(authErrorMessage({message:'recovery_limited'}),/15 Minuten/);
 assert.doesNotMatch(authErrorMessage({message:'SELECT FROM public.password_hash ...'}),/password_hash/);
});
test('no fabricated email addresses or non-public credentials in frontend auth logic',async()=>{
 const policy=await readFile(new URL('../docs/cloud/auth-policy.mjs',import.meta.url),'utf8');
 const ui=await readFile(new URL('../docs/cloud/auth.js',import.meta.url),'utf8');
 const entry=await readFile(new URL('../docs/index.html',import.meta.url),'utf8');
 assert.doesNotMatch(policy+ui+entry,/@(gmail|example|invalid|yahoo)\./i);
 assert.doesNotMatch(ui,/signInWithPassword|auth\.signUp|service_role/);
 assert.match(ui,/planner_register/);
 assert.match(ui,/planner_login/);
 assert.match(ui,/planner_recover/);
 assert.match(entry,/Wiederherstellungscode/);
});
test('original Planner canvas and modules preserved, QR omitted',async()=>{
 const html=await readFile(new URL('../docs/planner.html',import.meta.url),'utf8');
 for(const feature of ['experience.css','orbit.js','annotation-layer.js','file-context.js','quality-v28.js','notification-center.js'])
  assert.ok(html.includes(feature),feature);
 assert.doesNotMatch(html,/qr-generator/);
});
test('critical account database operations always require opaque token',async()=>{
 const sql=await readFile(new URL('../supabase/001_username_accounts.sql',import.meta.url),'utf8');
 for(const op of ['planner_state_get','planner_state_put','planner_state_init','planner_whoami','planner_logout']){
   const section=sql.split(`function public.${op}(`)[1]?.split('end; $$;')[0] || '';
   assert.match(section,/p_token text/,op);
   if(op==='planner_logout')assert.match(section,/token_digest=encode\(digest\(p_token,'sha256'\),'hex'\)/,op);
   else assert.match(section,/planner_session_account\(p_token\)/,op);
 }
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.planner_accounts/);
 assert.match(sql,/crypt\(p_password,gen_salt\('bf',12\)\)/);
});
test('private files need verified session in Edge Function; never service key in pages',async()=>{
 const edge=await readFile(new URL('../supabase/functions/planner-files/index.ts',import.meta.url),'utf8');
 assert.match(edge,/planner_session_account/);
 assert.match(edge,/Bearer \(\[a-f0-9\]\{64\}\)/);
 assert.match(edge,/SUPABASE_SERVICE_ROLE_KEY/);
 const client=await readFile(new URL('../docs/cloud/storage.js',import.meta.url),'utf8');
 assert.doesNotMatch(client,/SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
});
