// File capabilities are obtained from an Edge Function that verifies the
// opaque session and signs only paths under this account's private prefix.
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
const SHARED='00000000-0000-4000-8000-000000000001';
const LIMIT=50*1024*1024; // Supabase free-project maximum.
export function makeStorage(client,session){
 const validatePath=p=>{const m=String(p).match(/^([0-9a-f-]{36})\/([0-9a-f]{24})\.bin$/i);if(!m||m[1]!==SHARED)throw Error('Ungültiger Dateipfad');return m[2].toLowerCase();};
 const authCall=async(action,ids)=>{
  const res=await fetch(`${SUPABASE_URL.replace(/\/$/,'')}/functions/v1/planner-files`,{
   method:'POST',headers:{'content-type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'authorization':`Bearer ${session.token}`},
   body:JSON.stringify({action,ids})
  });let data;try{data=await res.json()}catch{throw Error('Dateidienst antwortet ungültig')}
  if(!res.ok||data.error)throw Error(data.error||'Dateizugriff fehlgeschlagen');return data;
 };
 const wrapped={
  async upload(path,file,opts={}){try{const id=validatePath(path);if(file.size>LIMIT)throw Error('Maximal 50 MB pro Datei bei Supabase Free');
    if(opts.upsert)throw Error('Überschreiben von Dateien ist untersagt');
    const signed=await authCall('sign-upload',[id]);
    const {data,error}=await client.storage.from('planner-files').uploadToSignedUrl(path,signed.tokens[0],file,{contentType:opts.contentType||file.type||'application/octet-stream'});
    return {data,error};
   }catch(error){return {data:null,error}}
  },
  async download(path){try{const id=validatePath(path);const signed=await authCall('sign-download',[id]);const r=await fetch(signed.urls[0],{cache:'no-store'});if(!r.ok)throw Error('Anhang fehlt');return {data:await r.blob(),error:null}}
   catch(error){return {data:null,error}}},
  async createSignedUrls(paths){try{const ids=paths.map(validatePath);const signed=await authCall('sign-download',ids);return {data:signed.urls.map(signedUrl=>({signedUrl})),error:null}}
   catch(error){return {data:null,error}}},
  async remove(paths){try{const ids=paths.map(validatePath);const result=await authCall('remove',ids);return {data:result,error:null}}
   catch(error){return {data:null,error}}}
 };
 return {from(bucket){if(bucket!=='planner-files')throw Error('Ungültiger Dateispeicher');return wrapped}};
}
