/* Project Planner 3.1: safe three-way conflict handling for desktop edits.
   The UI never forces an overwritten server revision and never silently
   throws away either the local or incoming project changes. */
'use strict';
let pp31Base = null;
function pp31Equal(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function pp31Plain(v){return v!==null&&typeof v==='object'&&!Array.isArray(v)}
function pp31Merge(base,local,remote,path='',conflicts=[]){
 if(pp31Equal(local,base))return structuredClone(remote);
 if(pp31Equal(remote,base)||pp31Equal(local,remote))return structuredClone(local);
 if(pp31Plain(local)&&pp31Plain(remote)&&(pp31Plain(base)||base===undefined)){
  const out={};for(const key of new Set([...Object.keys(base||{}),...Object.keys(local),...Object.keys(remote)])){
   const val=pp31Merge(base?.[key],local[key],remote[key],path+'/'+key,conflicts);
   if(val!==undefined)out[key]=val;
  }return out;
 }
 const ids=a=>Array.isArray(a)&&a.every(x=>pp31Plain(x)&&typeof x.id==='string');
 if(ids(base)&&ids(local)&&ids(remote)&&[base,local,remote].some(a=>a.length)){
  const bm=new Map(base.map(x=>[x.id,x])),lm=new Map(local.map(x=>[x.id,x])),rm=new Map(remote.map(x=>[x.id,x]));
  const out=[];
  for(const id of new Set([...bm.keys(),...lm.keys(),...rm.keys()])){
   const value=pp31Merge(bm.get(id),lm.get(id),rm.get(id),path+'/'+id,conflicts);
   if(value!==undefined)out.push(value);
  }return out;
 }
 conflicts.push(path||'Projekt');return structuredClone(local);
}
// The existing getState() UI helper reloads every entity. Never allow that to
// silently overwrite unsaved local changes (for instance after a mobile upload).
const pp31OriginalGetState=getState;
getState=async function(){
 if(DB&&qualityDirty>qualitySaved)await flushSave();
 await pp31OriginalGetState();
 pp31Base=structuredClone(DB);
};
runSave=function(){
 const snapshot=structuredClone(DB),seq=qualityDirty;
 saveQueue=saveQueue.catch(()=>{}).then(async()=>{
  qualitySaving=true;qualitySaveState();
  let toStore=structuredClone(snapshot);toStore.revision=persistRevision;
  let res;
  try{
   res=await request('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(toStore)});
  }catch(error){
   // The server supports revision-based optimistic concurrency. Only conflicts
   // are handled here; validation and network errors remain visible failures.
   if(!/zwischenzeitlich geändert|409|Revision/i.test(error.message))throw error;
   if(!pp31Base)throw Error('Konflikt: kein sicherer Ausgangsstand vorhanden. Ungespeicherte Änderungen behalten.');
   const server=await (await request('/api/state')).json();
   const conflicts=[];
   toStore=pp31Merge(pp31Base,snapshot,server,'',conflicts);
   if(conflicts.length){
    const names=conflicts.slice(0,5).join(', ');
    const accept=window.confirm('Andere Änderungen wurden inzwischen gespeichert. '+conflicts.length+' Feld(er) betreffen dieselben Inhalte ('+names+').\n\nOK: Deine Änderungen haben NUR bei diesen Konflikten Vorrang. Alle übrigen Serveränderungen werden übernommen.\nAbbrechen: Nichts wird überschrieben, deine Eingaben bleiben erhalten.');
    if(!accept)throw Error('Speicherkonflikt nicht bestätigt. Lokale Änderungen bleiben geöffnet.');
   }
   toStore.revision=server.revision;toStore.updatedAt=server.updatedAt;
   res=await request('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(toStore)});
   toast('Änderungen mit dem aktuellen Datenstand abgeglichen.');
  }
  const result=await res.json();
  persistRevision=result.revision;
  const persisted=structuredClone(toStore);persisted.revision=result.revision;if(result.updatedAt)persisted.updatedAt=result.updatedAt;
  if(Array.isArray(result.trash))persisted.trash=result.trash;
  pp31Base=structuredClone(persisted);
  if(qualityDirty===seq){
   DB=persisted;syncPrefs();render();
  }else{
   // Further edits may have been made while the request was in flight.
   const collisions=[];
   DB=pp31Merge(snapshot,DB,persisted,'',collisions);DB.revision=persistRevision;
   queueSave();
  }
  qualitySaved=Math.max(qualitySaved,seq);
  qualitySaveError='';window.updateTrashBadge?.();
 }).catch(err=>{
   qualitySaveError=err.message||'Unbekannter Speicherfehler';
   toast('Änderungen nicht gespeichert: '+qualitySaveError);
   throw err;
 }).finally(()=>{qualitySaving=false;qualitySaveState()});
 return saveQueue;
};
