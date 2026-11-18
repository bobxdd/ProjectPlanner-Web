// Deploy with `supabase functions deploy planner-files --no-verify-jwt`.
// Service-role key is an Edge Function secret supplied by Supabase, NEVER a
// GitHub Pages asset. Opaque tokens are verified via planner_session_account RPC.
import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.119.1';
const endpoint=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SECRET_KEY')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(endpoint,secret,{auth:{autoRefreshToken:false,persistSession:false}});
const allowedOrigin=Deno.env.get('PLANNER_ALLOWED_ORIGIN')||'https://bobxdd.github.io';
const cors={'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
const result=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','X-Content-Type-Options':'nosniff'}});
const ID=/^[a-f0-9]{24}$/i;
serve(async req=>{
 if(req.headers.get('Origin')!==allowedOrigin)return result({error:'Origin nicht erlaubt'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return result({error:'Methode nicht erlaubt'},405);
 const bearer=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.get('Authorization')||'');
 if(!bearer)return result({error:'Anmeldung erforderlich'},401);
 try{
  const {data:account,error:authErr}=await admin.rpc('planner_session_account',{p_token:bearer[1]});
  if(authErr||!account)return result({error:'Anmeldung abgelaufen'},401);
  const raw=await req.text();if(raw.length>10000)return result({error:'Anfrage zu groß'},413);
  const input=JSON.parse(raw);const ids=input.ids;
  if(!Array.isArray(ids)||ids.length<1||ids.length>50||!ids.every((s:unknown)=>typeof s==='string'&&ID.test(s)))return result({error:'Ungültige Dateiliste'},400);
  const paths=ids.map((id:string)=>`00000000-0000-4000-8000-000000000001/${id.toLowerCase()}.bin`);
  const bucket=admin.storage.from('planner-files');
  if(input.action==='sign-upload'){
    if(ids.length!==1)return result({error:'Nur eine Upload-Freigabe je Anfrage'},400);
    const {data,error}=await bucket.createSignedUploadUrl(paths[0],{upsert:false});
    if(error||!data)return result({error:'Upload-Freigabe fehlgeschlagen'},500);
    return result({tokens:[data.token]});
  }
  if(input.action==='sign-download'){
    const {data,error}=await bucket.createSignedUrls(paths,300);
    if(error||!data)return result({error:'Dateifreigabe fehlgeschlagen'},500);
    return result({urls:data.map(x=>x.signedUrl||'')});
  }
  if(input.action==='remove'){
    const {error}=await bucket.remove(paths);if(error)return result({error:'Löschen fehlgeschlagen'},500);
    return result({ok:true});
  }
  return result({error:'Unbekannte Aktion'},400);
 }catch(_error){return result({error:'Dateidienst derzeit nicht verfügbar'},500)}
});
