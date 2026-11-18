import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

function node(){
 const handlers=new Map();const classes=new Set();
 return {id:'',value:'',textContent:'',hidden:false,disabled:false,required:false,autocomplete:'',
  classList:{add(x){classes.add(x)},remove(x){classes.delete(x)},toggle(x,on){if(on)classes.add(x);else classes.delete(x)}},
  addEventListener(event,fn){handlers.set(event,fn)},
  async fire(event){assert.ok(handlers.has(event),'missing '+event);return handlers.get(event)({preventDefault(){}})},
  querySelectorAll(){return[]}};
}
async function harness({configured=true,loginError=false}={}){
 const ids=['auth-form','submit','username','password','confirm','recovery-code','notice','tab-login','tab-signup','confirm-label','recovery-label','form-title','form-description','reset-link','cancel-recovery','recovery-instruction','recovery-output','recovery-output-code','recovery-output-message','enter-planner','return-login','copy-recovery'];
 const nodes=new Map(ids.map(id=>[id,Object.assign(node(),{id})]));
 nodes.get('auth-form').querySelectorAll=()=>['username','password','confirm','recovery-code','submit'].map(id=>nodes.get(id));
 const events={rpc:[],redirects:[],saved:[],clipboard:[]};
 const old=Object.fromEntries(['document','location','navigator','__webMock','sessionStorage'].map(k=>[k,globalThis[k]]));
 const client={rpc:async(fn,args)=>{
   events.rpc.push({fn,args});
   if(fn==='planner_whoami')return {data:null,error:null};
   if(fn==='planner_register')return {data:{user_id:'u-123',username:args.p_username,token:'a'.repeat(64),recovery_code:'b'.repeat(48)},error:null};
   if(fn==='planner_login')return loginError?{data:null,error:{message:'invalid_login'}}:{data:{user_id:'u-123',username:args.p_username,token:'a'.repeat(64)},error:null};
   if(fn==='planner_recover')return {data:{recovery_code:'c'.repeat(48)},error:null};
   throw Error('unknown function '+fn);
 }};
 globalThis.document={querySelector(q){const n=nodes.get(q.replace('#',''));assert.ok(n,q);return n}};
 globalThis.location={href:'https://bobxdd.github.io/ProjectPlanner-Web/index.html',replace(url){events.redirects.push(url)}};
 Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async text=>{events.clipboard.push(text)}}},configurable:true,writable:true});
 const storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 globalThis.__webMock={client,configured,events,readSession:()=>null,saveSession:r=>events.saved.push(r)};
 const source=await readFile(new URL('../docs/cloud/auth.js',import.meta.url),'utf8');
 const policyUrl=new URL('../docs/cloud/auth-policy.mjs',import.meta.url).href;
 const adapted=source.replace("import {configured, configError} from './client.js';","const configured=globalThis.__webMock.configured;const configError='Supabase ist nicht eingerichtet';")
  .replace("import {plannerRpc} from './rpc.js';","const plannerRpc=(fn,args)=>globalThis.__webMock.client.rpc(fn,args);")
  .replace("from './auth-policy.mjs';",`from '${policyUrl}';`)
  .replace("import {readSession,saveSession,clearSession} from './session.js';","const readSession=globalThis.__webMock.readSession;const saveSession=globalThis.__webMock.saveSession;const clearSession=()=>{};");
 await import('data:text/javascript;base64,'+Buffer.from(adapted).toString('base64')+'#'+Math.random());
 return {get:id=>nodes.get(id),events,async close(){for(const [k,v]of Object.entries(old)){if(k==='navigator')Object.defineProperty(globalThis,'navigator',{value:v,configurable:true,writable:true});else globalThis[k]=v}}};
}
test('username-only signup: no email used, 192-bit recovery code shown, session saved',async()=>{
 const h=await harness();try{
  await h.get('tab-signup').fire('click');
  h.get('username').value=' ALPHA_42 ';h.get('password').value='secretPassphrase123!';h.get('confirm').value='secretPassphrase123!';
  await h.get('auth-form').fire('submit');
  assert.deepEqual(h.events.rpc.map(x=>x.fn),['planner_register']);
  assert.deepEqual(h.events.rpc[0].args,{p_username:'alpha_42',p_password:'secretPassphrase123!'});
  assert.equal(h.events.saved[0].username,'alpha_42');
  assert.equal(h.get('recovery-output-code').textContent,'b'.repeat(48));
  assert.equal(h.get('recovery-output').hidden,false);
  assert.equal(h.get('enter-planner').hidden,false);
  assert.equal(h.events.redirects.length,0);
 }finally{await h.close()}
});
test('login with user name and password redirects to original Planner',async()=>{
 const h=await harness();try{
  h.get('username').value='tester';h.get('password').value='secretPassphrase123!';
  await h.get('auth-form').fire('submit');
  assert.equal(h.events.rpc[0].fn,'planner_login');
  assert.equal(h.events.saved.length,1);
  assert.equal(h.events.redirects[0],'https://bobxdd.github.io/ProjectPlanner-Web/planner.html');
 }finally{await h.close()}
});
test('invalid login remains on login screen without leaking details',async()=>{
 const h=await harness({loginError:true});try{
  h.get('username').value='tester';h.get('password').value='wrong-passphrase';
  await h.get('auth-form').fire('submit');
  assert.match(h.get('notice').textContent,/falsch/);
  assert.equal(h.events.saved.length,0);
  assert.equal(h.events.redirects.length,0);
 }finally{await h.close()}
});
test('password recovery requires recovery code and rotates it',async()=>{
 const h=await harness();try{
  await h.get('reset-link').fire('click');
  h.get('username').value='tester';h.get('password').value='newSecretPassphrase123!';h.get('confirm').value='newSecretPassphrase123!';h.get('recovery-code').value='b'.repeat(48);
  await h.get('auth-form').fire('submit');
  assert.equal(h.events.rpc[0].fn,'planner_recover');
  assert.equal(h.events.rpc[0].args.p_recovery_code,'b'.repeat(48));
  assert.equal(h.get('recovery-output-code').textContent,'c'.repeat(48));
  assert.equal(h.get('enter-planner').hidden,true);
  assert.equal(h.events.saved.length,0);
 }finally{await h.close()}
});
test('invalid code prevents any recovery network request',async()=>{
 const h=await harness();try{
  await h.get('reset-link').fire('click');
  h.get('username').value='tester';h.get('password').value='newSecretPassphrase123!';h.get('confirm').value='newSecretPassphrase123!';h.get('recovery-code').value='1234';
  await h.get('auth-form').fire('submit');
  assert.equal(h.events.rpc.length,0);
  assert.match(h.get('notice').textContent,/48-stelligen/);
 }finally{await h.close()}
});
test('without Supabase config do not allow signup or login',async()=>{
 const h=await harness({configured:false});try{
  assert.equal(h.get('submit').disabled,true);
  assert.match(h.get('notice').textContent,/nicht eingerichtet/);
 }finally{await h.close()}
});
