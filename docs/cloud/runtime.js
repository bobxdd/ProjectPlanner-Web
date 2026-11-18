/* Private browser data adapter for the original Project Planner UI.
   Requires server-only RPCs in supabase/001_username_accounts.sql.
   NOT the legacy Windows TCP/peer sync backend. */
import { getClient, configured, configError } from './client.js';
import { plannerRpc } from './rpc.js';
import {readSession,clearSession} from './session.js';
import {makeStorage} from './storage.js';
const root = new URL('../', import.meta.url);
const blank = () => ({ version:2, revision:1,
  categories:[{id:'general',name:'Allgemein',color:'#ad9df7',icon:'layers',order:0}],
  projects:[], stages:[], tasks:[], documents:[], notes:[],
  statuses:[{id:'open',label:'Offen',color:'#94a3b8',order:0},{id:'doing',label:'In Arbeit',color:'#d6acfb',order:1},{id:'done',label:'Erledigt',color:'#7cdec1',isDone:true,order:2}],
  dashboard:[{id:'focus',kind:'focus',visible:true,wide:true,order:0},{id:'projects',kind:'projects',visible:true,wide:false,order:1},{id:'progress',kind:'progress',visible:true,wide:false,order:2},{id:'due',kind:'due',visible:true,wide:true,order:3},{id:'categories',kind:'categories',visible:true,wide:false,order:4},{id:'documents',kind:'documents',visible:true,wide:false,order:5}],
  prefs:{reduceMotion:false,compact:false},trash:[],updatedAt:new Date().toISOString() });
const clone=obj=>structuredClone(obj);
const response=(data,status=200,headers={}) => new Response(typeof data==='string'?data:JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const fail=(msg,status=400)=>response({error:msg},status);
const newId=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
const now=()=>new Date().toISOString();
const localError= e => e?.message||'Unbekannter Fehler';
const arrays=['categories','projects','stages','tasks','documents','notes','statuses','dashboard','trash'];
const signed=new Map();
let zipLib;
async function getZipLib(){if(!zipLib){const m=await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');zipLib=m.default;}return zipLib;}
async function hashHex(bytes){const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
const safeDocID=id=>/^[a-f0-9]{24}$/i.test(id);
let sb,user,session;
async function activeUser(){
 if(!session){throw Error('Sitzung fehlt');}
 const {data,error}=await sb.rpc('planner_whoami',{p_token:session.token});
 if(error||!data?.id||data.id!==user.id)throw Error('Anmeldung abgelaufen.');
 return user;
}
async function getRow(){
 const {data,error}=await sb.rpc('planner_state_get',{p_token:session.token});if(error)throw Error(error.message);
 if(data)return data;
 const initial=blank();const init=await sb.rpc('planner_state_init',{p_token:session.token,p_payload:initial});if(init.error)throw Error(init.error.message);
 const retry=await sb.rpc('planner_state_get',{p_token:session.token});if(retry.error||!retry.data)throw Error('Arbeitsbereich konnte nicht erstellt werden.');return retry.data;
}
function shape(payload){return payload&&typeof payload==='object'&&!Array.isArray(payload)&&arrays.every(k=>Array.isArray(payload[k]))&&payload.prefs&&typeof payload.prefs==='object'&&payload.version===2;}
async function readState(){const row=await getRow();if(!shape(row.payload))throw Error('Dein gespeicherter Projektstand hat ein unbekanntes Format. Er wird nicht überschrieben.');return {...row.payload,revision:row.revision};}
function trashRemoved(old,next){const entries=[];const gone=(key)=>new Set(next[key].map(x=>x.id));const projectIDs=gone('projects');const removed={categories:gone('categories'),projects:projectIDs,stages:gone('stages'),tasks:gone('tasks'),notes:gone('notes'),documents:gone('documents'),statuses:gone('statuses'),dashboard:gone('dashboard')};
 const entry=(type,name,fields)=>entries.push({id:newId(),type,name,deletedAt:now(),...fields});
 for(const p of old.projects)if(!projectIDs.has(p.id))entry('project',p.name,{project:p,stages:old.stages.filter(x=>x.projectId===p.id),tasks:old.tasks.filter(x=>x.projectId===p.id),notes:old.notes.filter(x=>x.projectId===p.id),documents:old.documents.filter(x=>x.projectId===p.id)});
 for(const c of old.categories)if(!removed.categories.has(c.id))entry('category',c.name,{category:c});
 for(const s of old.stages)if(projectIDs.has(s.projectId)&&!removed.stages.has(s.id))entry('stage',s.title,{stage:s,taskLinks:old.tasks.filter(t=>t.stageId===s.id).map(t=>t.id)});
 for(const t of old.tasks)if(projectIDs.has(t.projectId)&&!removed.tasks.has(t.id))entry('task',t.title,{task:t,noteLinks:old.notes.filter(n=>n.taskId===t.id).map(n=>n.id),fileLinks:old.documents.filter(d=>d.taskId===t.id).map(d=>d.id)});
 for(const n of old.notes)if(projectIDs.has(n.projectId)&&!removed.notes.has(n.id))entry('note',n.title,{note:n});
 for(const d of old.documents)if(!removed.documents.has(d.id)&&(!d.projectId||projectIDs.has(d.projectId)))entry('file',d.name,{documents:[d]});
 for(const s of old.statuses)if(!removed.statuses.has(s.id))entry('status',s.label,{status:s,taskLinks:old.tasks.filter(t=>t.status===s.id).map(t=>t.id)});
 for(const w of old.dashboard)if(!removed.dashboard.has(w.id))entry('widget',w.title||w.kind,{widget:w});
 return entries;
}
function validate(next){if(!shape(next))throw Error('Ungültiges Projektformat');const size=new TextEncoder().encode(JSON.stringify(next)).length;if(size>9*1024*1024)throw Error('Die Projektmetadaten überschreiten das Größenlimit.');
 for(const key of arrays){if(next[key].length>50000)throw Error('Zu viele '+key);}
 const projectIDs=new Set(next.projects.map(x=>x.id));if(next.tasks.some(t=>!projectIDs.has(t.projectId)))throw Error('Eine Aufgabe gehört zu keinem bestehenden Bereich.');}
async function compareSave(next,expected){const current=await getRow();if(current.revision!==expected)return fail('Daten wurden zwischenzeitlich geändert. Bitte neu laden.',409);
 const copy=clone(next);copy.documents=current.payload.documents||[];copy.trash=[...(current.payload.trash||[]),...trashRemoved(current.payload,copy)];copy.revision=expected+1;copy.updatedAt=now();validate(copy);
 const {data,error}=await sb.rpc('planner_state_put',{p_token:session.token,p_revision:expected,p_payload:copy});
 if(error)throw Error(error.message);if(!data)return fail('Daten wurden zwischenzeitlich geändert. Bitte neu laden.',409);
 return response({revision:copy.revision,updatedAt:copy.updatedAt,trash:copy.trash});}
async function commit(next,expected){
 validate(next);const {data,error}=await sb.rpc('planner_state_put',{p_token:session.token,p_revision:expected,p_payload:next});
 if(error)throw Error(error.message);return data!==null;
}
const supportedMime=new Set(['image/png','image/jpeg','image/gif','image/webp','image/heic','application/pdf','text/plain','text/csv','application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation']);
const filePath=id=>`00000000-0000-4000-8000-000000000001/${id}.bin`;
async function uploadFiles(form){const projectId=String(form.get('projectId')||''), taskId=String(form.get('taskId')||'');const files=form.getAll('files').filter(f=>f instanceof File);
 if(files.length===0)return fail('Keine Dateien ausgewählt');if(files.length>25)return fail('Maximal 25 Dateien pro Upload');const current=await readState();if(projectId&&!current.projects.some(p=>p.id===projectId))return fail('Bereich nicht gefunden');if(taskId&&!current.tasks.some(t=>t.id===taskId&&t.projectId===projectId))return fail('Aufgabe nicht gefunden');
 const uploaded=[];try{for(const file of files){if(file.size>50*1024*1024)throw Error('Datei ist größer als 50 MB');const ext=(file.name.split('.').pop()||'').toLowerCase();if(['html','htm','svg','js','mjs','exe','bat','cmd','ps1'].includes(ext))throw Error('Aktiver Dateityp ist aus Sicherheitsgründen gesperrt');const id=newId(),type=supportedMime.has(file.type)?file.type:'application/octet-stream';const {error}=await sb.storage.from('planner-files').upload(filePath(id),file,{upsert:false,contentType:type,cacheControl:'0'});if(error)throw Error(error.message);uploaded.push({id,projectId,taskId,name:file.name.split(/[\\/]/).pop().slice(0,240)||'Datei',size:file.size,mime:type,createdAt:now()});}
 const state=await readState();state.documents.push(...uploaded);state.revision++;
 if(!await commit(state,state.revision-1))throw Error('Projekt inzwischen geändert. Upload erneut versuchen.');
 signed.clear();return response({uploaded,revision:state.revision});
 }catch(e){if(uploaded.length)await sb.storage.from('planner-files').remove(uploaded.map(x=>filePath(x.id)));return fail('Dateiübertragung nicht abgeschlossen: '+localError(e),409)}}
async function storedFile(id){const state=await readState();if(!state.documents.some(d=>d.id===id)&&!state.trash.some(t=>(t.documents||[]).some(d=>d.id===id)))return fail('Datei gehört nicht zu deinem Projekt',404);
 const {data,error}=await sb.storage.from('planner-files').download(filePath(id));if(error)return fail(error.message,404);return new Response(data,{headers:{'Cache-Control':'no-store','Content-Type':'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Disposition':'attachment'}});}
async function fileAction(options){const cmd=JSON.parse(options.body||'{}');const state=await readState(), idx=state.documents.findIndex(x=>x.id===cmd.id);if(idx<0)return fail('Datei nicht gefunden',404);const doc=state.documents[idx];let newIdValue='';
 if(cmd.action==='rename'){const s=String(cmd.name||'').trim();if(!s||/[\\/\x00\r\n]/.test(s)||s.split('.').pop().toLowerCase()!==doc.name.split('.').pop().toLowerCase())return fail('Ungültiger Dateiname');doc.name=s.slice(0,240)}
 else if(cmd.action==='move'||cmd.action==='copy'){if(!state.projects.some(x=>x.id===cmd.projectId))return fail('Zielbereich nicht gefunden');if(cmd.taskId&&!state.tasks.some(x=>x.id===cmd.taskId&&x.projectId===cmd.projectId))return fail('Zielaufgabe ungültig');if(cmd.action==='move'){doc.projectId=cmd.projectId;doc.taskId=cmd.taskId||'';}else{const {data,error}=await sb.storage.from('planner-files').download(filePath(doc.id));if(error)return fail('Originaldatei fehlt');newIdValue=newId();const {error:putError}=await sb.storage.from('planner-files').upload(filePath(newIdValue),data,{upsert:false,contentType:doc.mime});if(putError)return fail('Kopieren fehlgeschlagen');state.documents.push({...doc,id:newIdValue,projectId:cmd.projectId,taskId:cmd.taskId||'',createdAt:now()});}}
 else if(cmd.action==='detach')doc.taskId='';else return fail('Unbekannte Dateiaktion');
 const oldRev=state.revision;state.revision++;if(!await commit(state,oldRev)){if(newIdValue)await sb.storage.from('planner-files').remove([filePath(newIdValue)]);return fail('Projekt währenddessen geändert',409)}return response({ok:true,revision:state.revision,newId:newIdValue||undefined});}
async function deleteFile(id){const state=await readState(),doc=state.documents.find(x=>x.id===id);if(!doc)return fail('Datei nicht vorhanden',404);state.documents=state.documents.filter(x=>x.id!==id);state.trash.push({id:newId(),type:'file',name:doc.name,deletedAt:now(),documents:[doc]});const rev=state.revision;state.revision++;if(!await commit(state,rev))return fail('Projekt währenddessen geändert',409);return response({ok:true});}
function restoreItem(state,item){const pushUnique=(key,obj)=>{if(obj&&!state[key].some(x=>x.id===obj.id))state[key].push(obj)};const pushMany=(key,items)=>{for(const x of items||[])pushUnique(key,x)};
 if(item.category)pushUnique('categories',item.category);if(item.project)pushUnique('projects',item.project);if(item.stage)pushUnique('stages',item.stage);if(item.task)pushUnique('tasks',item.task);if(item.note)pushUnique('notes',item.note);if(item.status)pushUnique('statuses',item.status);if(item.widget)pushUnique('dashboard',item.widget);
 pushMany('stages',item.stages);pushMany('tasks',item.tasks);pushMany('notes',item.notes);pushMany('documents',item.documents);
 if(item.taskLinks){for(const t of state.tasks)if(item.taskLinks.includes(t.id))t.stageId=item.stage?.id||t.stageId;}
 if(item.noteLinks){for(const n of state.notes)if(item.noteLinks.includes(n.id))n.taskId=item.task?.id||n.taskId;}
 if(item.fileLinks){for(const d of state.documents)if(item.fileLinks.includes(d.id))d.taskId=item.task?.id||d.taskId;}
}
async function trashAction(options){const {action,id}=JSON.parse(options.body||'{}');const state=await readState(), oldTrash=clone(state.trash), item=state.trash.find(x=>x.id===id);if(action!=='empty'&&!item)return fail('Eintrag nicht gefunden',404);
 if(action==='restore')restoreItem(state,item);
 if(action==='empty')state.trash=[];else state.trash=state.trash.filter(x=>x.id!==id);
 const oldRev=state.revision;state.revision++;if(!await commit(state,oldRev))return fail('Projekt wurde inzwischen geändert',409);
 if(action==='purge'||action==='empty'){const referenced=new Set([...state.documents,...state.trash.flatMap(t=>t.documents||[])].map(d=>d.id));const oldFiles=(action==='empty'? oldTrash :[item]).flatMap(t=>t.documents||[]).filter(d=>!referenced.has(d.id));if(oldFiles.length)await sb.storage.from('planner-files').remove(oldFiles.map(d=>filePath(d.id)));}
 return response({ok:true,revision:state.revision});}
async function refreshUrls(docs){const pending=(docs||[]).filter(d=>!signed.has(d.id)||signed.get(d.id).expires<Date.now()+60000);for(let i=0;i<pending.length;i+=50){const chunk=pending.slice(i,i+50);const {data,error}=await sb.storage.from('planner-files').createSignedUrls(chunk.map(d=>filePath(d.id)),900);if(error)continue;data?.forEach((x,j)=>{if(x.signedUrl)signed.set(chunk[j].id,{url:x.signedUrl,expires:Date.now()+280000})});}}
function fileUrl(doc){return signed.get(doc.id)?.url || new URL('cloud/download.html?id='+encodeURIComponent(doc.id),root).href;}
async function fileBlob(doc){const r=await storedFile(doc.id);if(!r.ok)throw Error('Datei nicht verfügbar');return r.blob();}

/* Verified ZIP import/export matching the original Desktop backup layout.
   Import is conservative: no previous file in this account may have an ID collision.
   Do not silently overwrite existing file bytes. */
async function exportBackup(){
 const state=await readState();const Zip=await getZipLib();const zip=new Zip();
 const raw=new TextEncoder().encode(JSON.stringify(state));
 const records=[{path:'project-planner.json',size:raw.length,sha256:await hashHex(raw)}];
 zip.file('project-planner.json',raw);
 const docs=[...state.documents,...state.trash.flatMap(t=>t.documents||[])];
 const seen=new Set();let total=raw.length;
 for(const doc of docs){
   if(seen.has(doc.id))continue;seen.add(doc.id);
   if(!safeDocID(doc.id))throw Error('Ungültige Dateikennung in Sicherung: '+doc.id);
   const content=await storedFile(doc.id);if(!content.ok)throw Error('Anhang fehlt: '+doc.name);
   const bytes=await content.arrayBuffer();total+=bytes.byteLength;
   if(total>200*1024*1024)throw Error('Die Web-Sicherung überschreitet 200 MB; bitte Anhänge separat sichern.');
   const name='files/'+doc.id+'.bin';zip.file(name,bytes);
   records.push({path:name,size:bytes.byteLength,sha256:await hashHex(bytes)});
 }
 const manifest={format:2,createdAt:now(),revision:state.revision,algorithm:'SHA-256',entries:records};
 zip.file('backup-manifest.json',JSON.stringify(manifest,null,2));
 const data=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
 return new Response(data,{status:200,headers:{'Content-Type':'application/zip','Cache-Control':'no-store','Content-Disposition':'attachment; filename="Project-Planner-Backup.zip"'}});
}
async function importBackup(file){
 if(!(file instanceof Blob))return fail('Keine Sicherungsdatei erhalten',400);
 if(file.size>210*1024*1024)return fail('Sicherung ist für den Webimport zu groß (maximal 210 MB)',413);
 const Zip=await getZipLib();const zip=await Zip.loadAsync(await file.arrayBuffer(),{checkCRC32:true});
 const names=Object.keys(zip.files);
 if(names.some(n=>n.includes('..')||n.startsWith('/')||n.includes('\\')))throw Error('Ungültige ZIP-Pfade.');
 const estimate=Object.values(zip.files).reduce((sum,e)=>sum+(e._data?.uncompressedSize||0),0);
 if(estimate>210*1024*1024)throw Error('Entpackte Sicherung zu groß.');
 if(names.length>1000)throw Error('Sicherung enthält zu viele Dateien.');
 const stateEntry=zip.file('project-planner.json'),manifestEntry=zip.file('backup-manifest.json');
 if(!stateEntry||!manifestEntry)throw Error('Es wird eine Desktop-Sicherung mit SHA-256-Manifest benötigt.');
 const meta=JSON.parse(await manifestEntry.async('string'));
 if(meta.format!==2||meta.algorithm!=='SHA-256'||!Array.isArray(meta.entries))throw Error('Unbekanntes Sicherungsformat.');
 const expected=new Map(meta.entries.map(e=>[e.path,e]));
 if(expected.size!==meta.entries.length||expected.size+1!==names.filter(n=>!zip.files[n].dir).length)throw Error('Unerwartete oder doppelte ZIP-Einträge.');
 const raw=await stateEntry.async('uint8array');if(raw.byteLength>10*1024*1024)throw Error('Projektzustand ist zu groß.');
 const saved=JSON.parse(new TextDecoder().decode(raw));validate(saved);
 const fileIds=new Set([...saved.documents,...saved.trash.flatMap(t=>t.documents||[])].map(d=>d.id));
 for(const id of fileIds)if(!safeDocID(id))throw Error('Ungültige Dateikennung im Archiv.');
 const expectedFiles=new Set(['project-planner.json',...Array.from(fileIds,id=>'files/'+id+'.bin')]);
 if(expectedFiles.size!==expected.size||[...expectedFiles].some(x=>!expected.has(x)))throw Error('Sicherung enthält fehlende oder unerwartete Dateien.');
 const uploads=[];let total=0;
 const check=(path,bytes)=>{const record=expected.get(path);if(!record||record.size!==bytes.byteLength)throw Error('Sicherungsgröße stimmt nicht: '+path);return record;};
 check('project-planner.json',raw);if(await hashHex(raw)!==expected.get('project-planner.json').sha256)throw Error('Projekt-Prüfsumme stimmt nicht.');
 // Do not overwrite a live account's files; verified imports should be made into a new, empty account.
 const old=await readState();if(old.documents.length||old.projects.length||old.notes.length||old.trash.length)throw Error('Aus Sicherheitsgründen nur in einem noch leeren Webkonto importieren. Bestehende Daten bleiben unverändert.');
 try{
  for(const id of fileIds){const path='files/'+id+'.bin', entry=zip.file(path);if(!entry)throw Error('Datei fehlt: '+path);
    const bytes=await entry.async('uint8array');total+=bytes.length;if(total>200*1024*1024)throw Error('Anhangsmenge zu groß.');
    check(path,bytes);if(await hashHex(bytes)!==expected.get(path).sha256)throw Error('Datei-Prüfsumme stimmt nicht: '+path);
    const {error}=await sb.storage.from('planner-files').upload(filePath(id),new Blob([bytes]),{upsert:false,contentType:'application/octet-stream'});
    if(error)throw Error('Anhang nicht importiert: '+error.message);
    uploads.push(filePath(id));
  }
  saved.revision=old.revision+1;saved.updatedAt=now();
  if(!await commit(saved,old.revision))throw Error('Arbeitsbereich wurde während des Imports geändert.');
  signed.clear();return response({ok:true,legacy:false,revision:saved.revision});
 }catch(error){if(uploads.length)await sb.storage.from('planner-files').remove(uploads);throw error;}
}

async function handleAPI(url,options={}){try{await activeUser();}catch(e){location.replace('./index.html');return fail('Sitzung ungültig. Bitte erneut anmelden.',401);}const method=(options.method||'GET').toUpperCase(),path=new URL(url,location.href).pathname;
 try{
  if(path==='/api/state'&&method==='GET'){const s=await readState();await refreshUrls(s.documents);return response(s)}
  if(path==='/api/revision'){const r=await getRow();return response({revision:r.revision})}
  if(path==='/api/state'&&method==='PUT'){const next=JSON.parse(options.body||'{}');return await compareSave(next,next.revision)}
  if(path==='/api/upload'&&method==='POST')return await uploadFiles(options.body);
  if(path.startsWith('/api/files/')&&method==='GET')return await storedFile(decodeURIComponent(path.slice(11)));
  if(path.startsWith('/api/delete/')&&method==='DELETE')return await deleteFile(decodeURIComponent(path.slice(12)));
  if(path==='/api/file-action'&&method==='POST')return await fileAction(options);
  if(path==='/api/trash/action'&&method==='POST')return await trashAction(options);
  if(path==='/api/quit'&&method==='POST'){location.assign('./index.html');return response({ok:true})}
  if(path==='/api/session')return response({key:'authenticated-username-account'});
  if(path==='/api/window-open'||path==='/api/window-closed')return response({ok:true});
  if(path==='/api/backup'&&method==='GET')return await exportBackup();
  if(path==='/api/import'&&method==='POST')return await importBackup(options.body);
  if(path==='/api/diagnostics')return response({events:[]});
  return fail('Diese Funktion benötigt den lokalen Windows-Server und steht in der Webversion noch nicht zur Verfügung.',501);
 }catch(e){console.error('Cloud data operation failed:',e);return fail(localError(e),500)}
}
async function init(){
 const banner=document.getElementById('cloud-gate');
 try{
  if(!configured)throw Error(configError);
  session=readSession();if(!session){location.replace('./index.html');return;}
  const publicClient=await getClient();
  sb={rpc:plannerRpc,storage:makeStorage(publicClient,session),auth:{signOut:async()=>{try{await plannerRpc('planner_logout',{p_token:session.token});}finally{clearSession();}return {error:null};}}};
  const {data,error}=await sb.rpc('planner_whoami',{p_token:session.token});
  if(error||!data?.id||data.id!==session.user_id){clearSession();location.replace('./index.html');return;}
  user={id:data.id,username:data.username};await getRow();
  const accountTag=document.getElementById('cloud-email');accountTag.textContent=user.username;accountTag.title=user.username;
  document.getElementById('cloud-logout').addEventListener('click',async()=>{
    try{await sb.auth.signOut();}catch{}location.replace('./index.html');
  });
  banner?.remove();document.body.classList.remove('cloud-pending');
  window.PlannerCloud={request:handleAPI,refreshUrls,fileUrl,fileBlob,user,client:sb};
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,options={})=>{const value=typeof input==='string'?input:input?.url;
    if(value){const path=new URL(value,location.href);if(path.origin===location.origin&&path.pathname.startsWith('/api/'))return handleAPI(value,options);}
    return nativeFetch(input,options);
  };
  window.__cloudReadyResolve?.();
 }catch(e){const msg=document.getElementById('cloud-gate-message');if(msg)msg.textContent='Dein Projekt konnte nicht geladen werden: '+e.message+' Bitte die Verbindung prüfen und die Seite neu laden.';}
}
init();
