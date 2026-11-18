// Allow-listed server-side access to username/password + private planner state.
// verify_jwt=false: account sessions are opaque and checked in Postgres RPCs.
// Never put SUPABASE_SECRET_KEY or service_role in public browser files.
import {createClient} from 'npm:@supabase/supabase-js@2.119.1';
const url=Deno.env.get('SUPABASE_URL')||'';
const secret=Deno.env.get('SUPABASE_SECRET_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const allowedOrigin=Deno.env.get('PLANNER_ALLOWED_ORIGIN')||'https://bobxdd.github.io';
const admin=secret&&url?createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const actions={
 planner_register:['p_username','p_password','p_invite_code'],
 planner_login:['p_username','p_password'],
 planner_recover:['p_username','p_recovery_code','p_new_password'],
 planner_whoami:['p_token'],
 planner_logout:['p_token'],
 planner_change_password:['p_token','p_old_password','p_new_password'],
 planner_state_get:['p_token'],
 planner_state_init:['p_token','p_payload'],
 planner_state_put:['p_token','p_revision','p_payload']
};
const perIp={planner_register:[5,3600],planner_login:[60,600],planner_recover:[10,3600]};
const expectedErrors=[
 'username_invalid','username_taken','password_invalid','invalid_login',
 'login_limited','invitation_invalid','registration_closed','recovery_invalid','recovery_limited','session_expired','state_invalid'
];
const headers={
 'Access-Control-Allow-Origin':allowedOrigin,
 'Access-Control-Allow-Headers':'apikey,authorization,content-type',
 'Access-Control-Allow-Methods':'OPTIONS,POST',
 'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'
};
function reply(data,status=200){
 return new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json'}});
}
async function digest(value){
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async req=>{
 if(req.headers.get('Origin')!==allowedOrigin)return reply({error:'forbidden_origin'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 if(!admin)return reply({error:'auth_unavailable'},503);
 let input;
 try{
  const len=Number(req.headers.get('content-length')||0);
  if(len>11*1024*1024)return reply({error:'payload_too_large'},413);
  const raw=await req.text();
  if(raw.length>11*1024*1024)return reply({error:'payload_too_large'},413);
  input=JSON.parse(raw);
 }catch{return reply({error:'invalid_request'},400);}
 const action=input?.action;
 if(typeof action!=='string'||!Object.hasOwn(actions,action))return reply({error:'invalid_request'},400);
 const required=actions[action];
 if(!input.params||typeof input.params!=='object'||Array.isArray(input.params))return reply({error:'invalid_request'},400);
 const keys=Object.keys(input.params);
 if(keys.length!==required.length||required.some(key=>!keys.includes(key)))return reply({error:'invalid_request'},400);
 if(required.includes('p_token')&&!/^[a-f0-9]{64}$/.test(input.params.p_token))return reply({error:'session_expired'},401);
 // Basic fixed-window throttling only. Forwarded IP headers may be spoofed.
 // Add CAPTCHA and gateway throttling before a public release.
 if(perIp[action]){
  const [max,seconds]=perIp[action];
  const ip=(req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,128);
  const key=await digest(action+':'+ip);
  const {data:allowed,error}=await admin.rpc('planner_auth_throttle',{
   p_key:key,p_max:max,p_window_seconds:seconds
  });
  if(error)return reply({error:'auth_unavailable'},503);
  if(allowed!==true)return reply({error:'rate_limited'},429);
 }
 const {data,error}=await admin.rpc(action,input.params);
 if(error){
  const publicError=expectedErrors.find(x=>String(error.message||'').includes(x));
  return reply({error:publicError||'auth_unavailable'},publicError?400:500);
 }
 return reply({data});
});
