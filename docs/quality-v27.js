/* Project Planner 2.7 – focused Windows-style entity actions and explicit save status.
   The stored v2 schema and all user-defined project/category colors stay untouched. */
'use strict';
const qualitySaveIndicator=document.getElementById('save-indicator');
let qualityDirty=0,qualitySaved=0,qualitySaveError='',qualitySaving=false,qualityGuardActive=false;
function qualityUnloadGuard(e){if(qualityDirty>qualitySaved){e.preventDefault();e.returnValue='';}}
function qualitySaveState(){
 if(!qualitySaveIndicator)return;
 const mode=qualitySaveError?'error':qualitySaving?'saving':qualityDirty>qualitySaved?'pending':'saved';
 qualitySaveIndicator.dataset.mode=mode;
 qualitySaveIndicator.textContent=mode==='error'?'Speichern fehlgeschlagen · Erneut versuchen':mode==='saving'?'Speichere …':mode==='pending'?'Änderungen ausstehend':'Gespeichert';
 qualitySaveIndicator.title=mode==='error'?'Änderungen sind noch nicht gesichert. Klicken zum erneuten Versuch.':'Lokaler Speicherstatus';
 qualitySaveIndicator.setAttribute('aria-label',qualitySaveIndicator.textContent);
 const pending=qualityDirty>qualitySaved;
 if(pending&&!qualityGuardActive){window.addEventListener('beforeunload',qualityUnloadGuard);qualityGuardActive=true;}
 else if(!pending&&qualityGuardActive){window.removeEventListener('beforeunload',qualityUnloadGuard);qualityGuardActive=false;}
}
const qualityOriginalMutate=mutate;
mutate=function(fn){const result=qualityOriginalMutate(fn);qualityDirty++;qualitySaveError='';qualitySaveState();return result;};
// A rejected write must not be silently treated as a successful flush. Keep local
// edits intact, surface the failure, and allow an explicit retry.
runSave=function(){
 const snapshot=structuredClone(DB),seq=qualityDirty;
 saveQueue=saveQueue.catch(()=>{}).then(async()=>{
  qualitySaving=true;qualitySaveState();snapshot.revision=persistRevision;
  const response=await request('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)});
  const result=await response.json();persistRevision=result.revision;DB.revision=result.revision;
  qualitySaved=Math.max(qualitySaved,seq);qualitySaveError='';if(Array.isArray(result.trash)){DB.trash=result.trash;window.updateTrashBadge?.();}
 }).catch(err=>{qualitySaveError=err.message||'Unbekannter Speicherfehler';toast('Änderungen nicht gespeichert: '+qualitySaveError);throw err;})
 .finally(()=>{qualitySaving=false;qualitySaveState()});
 return saveQueue;
};
queueSave=function(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{saveTimer=null;runSave().catch(()=>{});},180);};
flushSave=async function(){
 if(saveTimer){clearTimeout(saveTimer);saveTimer=null;runSave();}
 await saveQueue;
 if(qualitySaveError)throw Error('Speichern fehlgeschlagen: '+qualitySaveError);
};
qualitySaveIndicator?.addEventListener('click',()=>{
 if(qualitySaveError){runSave().then(()=>toast('Änderungen gespeichert.')).catch(()=>{});}
});
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden'&&qualityDirty>qualitySaved&&!qualitySaveError){
  if(saveTimer){clearTimeout(saveTimer);saveTimer=null;}
  runSave().catch(()=>{});
 }
});
document.addEventListener('keydown',event=>{
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){
  event.preventDefault();flushSave().then(()=>toast('Änderungen gespeichert.')).catch(err=>toast(err.message));
 }
},true);

let entityMenuKey='',entityMenuFocus=null;
const entityMenu=document.createElement('div');entityMenu.id='entity-context-menu';entityMenu.className='entity-context-menu';entityMenu.hidden=true;entityMenu.setAttribute('role','menu');entityMenu.setAttribute('aria-label','Aktionen zum Element');document.body.appendChild(entityMenu);
function qualityTarget(el){
 if(!el?.closest||el.closest('[data-file-id],[data-file-menu],[data-search-type="file"],#file-context-menu,#entity-context-menu'))return null;
 const search=el.closest('[data-search-type]');if(search&&['project','task','note'].includes(search.dataset.searchType))return [search.dataset.searchType,search.dataset.searchId];
 const n=el.closest('.note-card');if(n){const id=n.querySelector('[data-action="edit-note"]')?.dataset.id;if(id)return ['note',id]}
 const task=el.closest('[data-task]');if(task?.dataset.task)return ['task',task.dataset.task];
 const taskContainer=el.closest('.roadmap-task,.task-table-row,.kanban-item,.detail-task,.topic-task,.stage-task-row');if(taskContainer){const id=taskContainer.querySelector('[data-task]')?.dataset.task||taskContainer.dataset.drag?.replace(/^task:/,'');if(id&&getTask(id))return ['task',id]}
 const stage=el.closest('.roadmap-stage,[data-drag^="stage:"]');if(stage){const id=stage.dataset.drag?.slice(6);if(id)return ['stage',id]}
 const category=el.closest('.editable-category-row,[data-category]');if(category){const id=category.dataset.drag?.replace(/^category:/,'')||category.dataset.category;if(id&&id!=='all')return ['category',id]}
 const project=el.closest('[data-topic-card],[data-roadmap-area],.topic-detail-hero');if(project){const id=project.dataset.topicCard||project.dataset.roadmapArea||ui.project;if(id)return ['project',id]}
 return null;
}
function qualityEntity(type,id){return type==='project'?getProject(id):type==='category'?getCat(id):type==='task'?getTask(id):type==='stage'?getStage(id):type==='note'?(DB.notes||[]).find(n=>n.id===id):null}
function qualityMenuHide(restore=false){if(entityMenu.hidden)return;entityMenu.hidden=true;entityMenuKey='';if(restore&&entityMenuFocus?.isConnected)entityMenuFocus.focus({preventScroll:true});}
function qualityActions(type,entity){
 const name={project:'Bereich',category:'Kategorie',task:'Aufgabe',stage:'Phase',note:'Notiz'}[type]||'Element';const common=[['edit',name+' bearbeiten','edit']];
 if(type==='project')return [['open','Bereich öffnen','folder'],...common,['duplicate','Als leeren Bereich duplizieren','layers'],['delete','Bereich löschen','trash',true]];
 if(type==='category')return [['open','Kategorie anzeigen','grid'],...common,['delete','Kategorie löschen','trash',true]];
 if(type==='task')return [['open','Aufgabe öffnen','list'],...common,['duplicate','Ohne Anhänge duplizieren','layers'],['toggle-done',isDone(entity)?'Als offen markieren':'Als erledigt markieren','check'],['delete','Aufgabe löschen','trash',true]];
 if(type==='stage')return [...common,['duplicate','Leere Phase duplizieren','layers'],['delete','Phase löschen','trash',true]];
 if(type==='note')return [...common,['duplicate','Notiz duplizieren','layers'],['delete','Notiz löschen','trash',true]];
 return [];
}
function qualityMenuShow(type,id,x,y,trigger){
 const obj=qualityEntity(type,id);if(!obj)return;
 if(typeof fileMenuHide==='function')fileMenuHide();entityMenuKey=type+':'+id;entityMenuFocus=trigger||document.activeElement;
 const parent=document.querySelector('dialog[open]')||document.body;
 if(entityMenu.parentElement!==parent)parent.appendChild(entityMenu);
 const name=obj.name||obj.title||obj.label||'Element';
 entityMenu.innerHTML=`<div class="menu-heading" title="${esc(name)}">${esc(name)}</div>${qualityActions(type,obj).map(([action,label,glyph,danger])=>`${danger?'<div class="menu-rule"></div>':''}<button type="button" role="menuitem" data-entity-command="${action}" class="${danger?'is-danger':''}">${icon(glyph)}<span>${esc(label)}</span></button>`).join('')}<div class="menu-hint">Rechtsklick · Pfeiltasten · Esc</div>`;
 entityMenu.hidden=false;entityMenu.style.left='0px';entityMenu.style.top='0px';
 const r=entityMenu.getBoundingClientRect();entityMenu.style.left=Math.max(8,Math.min(x,innerWidth-r.width-8))+'px';entityMenu.style.top=Math.max(8,Math.min(y,innerHeight-r.height-8))+'px';
 entityMenu.querySelector('[role="menuitem"]')?.focus({preventScroll:true});
}
function qualityDuplicate(type,obj){
 const stamp=new Date().toISOString();let resultName='';
 if(type==='project'){
  const copy={...structuredClone(obj),id:id(),name:obj.name+' (Kopie)',order:DB.projects.length,createdAt:stamp};
  mutate(()=>DB.projects.push(copy));resultName='Leerer Bereich erstellt.';
 }else if(type==='task'){
  const copy={...structuredClone(obj),id:id(),title:obj.title+' (Kopie)',order:DB.tasks.length,status:DB.statuses.find(x=>!x.isDone)?.id||obj.status,createdAt:stamp,updatedAt:stamp,checklist:(obj.checklist||[]).map(x=>({...x,id:id(),done:false}))};
  mutate(()=>DB.tasks.push(copy));resultName='Aufgabe ohne Dateien kopiert.';
 }else if(type==='stage'){
  const copy={...structuredClone(obj),id:id(),title:obj.title+' (Kopie)',order:DB.stages.filter(x=>x.projectId===obj.projectId).length};
  mutate(()=>DB.stages.push(copy));resultName='Leere Phase erstellt.';
 }else if(type==='note'){
  const copy={...structuredClone(obj),id:id(),title:obj.title+' (Kopie)',taskId:'',order:DB.notes.length,updatedAt:stamp};
  mutate(()=>DB.notes.push(copy));resultName='Notiz kopiert.';
 }
 if(resultName)toast(resultName);
}
async function qualityExecute(action){
 const rect=entityMenu.querySelector('[data-entity-command="delete"]')?.getBoundingClientRect();
 const anchor=rect?{getBoundingClientRect:()=>rect}:entityMenuFocus;
 const [type,idValue]=entityMenuKey.split(':'),obj=qualityEntity(type,idValue);qualityMenuHide();if(!obj)return;
 if(action==='edit'){
  if(type==='category')openCategory(idValue);else if(type==='project')openProject(idValue);else if(type==='task')openTask(idValue);else if(type==='stage')openStage(idValue);else if(type==='note')openNote(idValue);return;
 }
 if(action==='open'){
  if(type==='category')selectCategory(idValue);else if(type==='project')selectProject(idValue);else if(type==='task')openTask(idValue);return;
 }
 if(action==='duplicate'){qualityDuplicate(type,obj);return;}
 if(action==='toggle-done'&&type==='task'){
  const target=DB.statuses.find(s=>s.isDone)||DB.statuses[0];const undone=DB.statuses.find(s=>!s.isDone)||DB.statuses[0];
  mutate(()=>{obj.status=isDone(obj)?undone.id:target.id;obj.updatedAt=new Date().toISOString();});return;
 }
 if(action==='delete'){
  if(type==='note'){
   if(!await confirmDelete('Notiz „'+obj.title+'“ in den Papierkorb verschieben?',anchor))return;
   mutate(()=>DB.notes=DB.notes.filter(n=>n.id!==idValue));
   if(modal.open)modal.close();toast('Notiz gelöscht.');return;
  }
  await onClickAction({dataset:{action:'delete-'+type,id:idValue},getBoundingClientRect:()=>rect||anchor?.getBoundingClientRect?.()});
 }
}
document.addEventListener('contextmenu',event=>{
 const target=qualityTarget(event.target);if(!target)return;
 event.preventDefault();event.stopImmediatePropagation();qualityMenuShow(...target,event.clientX,event.clientY,event.target);
},true);
document.addEventListener('click',event=>{
 const more=event.target.closest('[data-entity-more]');if(more){event.preventDefault();event.stopImmediatePropagation();const [type,idValue]=more.dataset.entityMore.split(':'),r=more.getBoundingClientRect();qualityMenuShow(type,idValue,r.left,r.bottom+6,more);return;}
 const cmd=event.target.closest('[data-entity-command]');if(cmd&&entityMenu.contains(cmd)){event.preventDefault();event.stopImmediatePropagation();qualityExecute(cmd.dataset.entityCommand).catch(err=>toast(err.message));return;}
 if(!entityMenu.hidden&&!event.target.closest('#entity-context-menu'))qualityMenuHide();
},true);
document.addEventListener('keydown',event=>{
 if((event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10'))&&entityMenu.hidden){const found=qualityTarget(document.activeElement);if(found){event.preventDefault();event.stopImmediatePropagation();const r=document.activeElement.getBoundingClientRect();qualityMenuShow(...found,r.left+15,r.bottom+5,document.activeElement);}return;}
 if(entityMenu.hidden)return;
 if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();qualityMenuHide(true);}
 else if(event.key==='Tab'){qualityMenuHide();}
 else if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
  event.preventDefault();event.stopImmediatePropagation();const buttons=[...entityMenu.querySelectorAll('button')];if(!buttons.length)return;
  const i=buttons.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();
 }
},true);
window.addEventListener('blur',()=>qualityMenuHide());
// The 2.8 navigation stack owns Alt+Arrow keys (including the 3D archive).
// Do not handle Alt+Left twice: it used to skip the orbit overview.
qualitySaveState();
