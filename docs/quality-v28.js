/* Project Planner 2.8 – recoverable trash and desktop navigation.
   All project/category colors and symbols are unchanged. */
'use strict';
const trashIcon=document.getElementById('trash-open-icon');
trashIcon.innerHTML=icon('trash');
const trashCountBadge=document.getElementById('trash-badge');
function updateTrashBadge(){const count=(DB?.trash||[]).length;trashCountBadge.textContent=count>99?'99+':String(count);trashCountBadge.hidden=count===0;document.getElementById('trash-open')?.setAttribute('aria-label',`Papierkorb öffnen, ${count} Einträge`);}
window.updateTrashBadge=updateTrashBadge;
const originalGetState28=getState;
getState=async function(){await originalGetState28();if(typeof qualityDirty!=='undefined'){qualitySaved=qualityDirty;qualitySaveError='';qualitySaveState();}updateTrashBadge()};
const origRender28=render;
render=function(){origRender28();updateTrashBadge()};
const trashTypes={project:'Bereich',category:'Kategorie',stage:'Fahrplanphase',task:'Aufgabe',note:'Notiz',file:'Datei',status:'Status',widget:'Übersichtsmodul'};
const trashIcons={project:'folder',category:'layers',stage:'route',task:'check',note:'book-open',file:'file',status:'circle',widget:'grid'};
function trashContent(){const trash=[...(DB.trash||[])].sort((a,b)=>(b.deletedAt||'').localeCompare(a.deletedAt||''));return `<p class="trash-intro">Gelöschte Elemente bleiben hier erhalten, bis du sie endgültig entfernst. Beim Wiederherstellen eines Bereichs kommen auch seine Aufgaben, Phasen, Notizen und Dateien zurück.</p><div class="trash-items">${trash.length?trash.map(t=>`<article class="trash-row"><span class="trash-row-icon">${icon(trashIcons[t.type]||'archive')}</span><span class="trash-row-main"><strong>${esc(t.name||'Unbenannt')}</strong><small>${esc(trashTypes[t.type]||t.type)} · ${esc(t.deletedAt?new Date(t.deletedAt).toLocaleString('de-DE'):'')}</small>${t.type==='project'?`<small>${t.tasks?.length||0} Aufgaben · ${t.documents?.length||0} Dateien</small>`:''}</span><span class="trash-row-buttons"><button class="btn mini" data-trash-command="restore" data-trash-id="${esc(t.id)}">${icon('archive')} Wiederherstellen</button><button class="btn mini danger" data-trash-command="purge" data-trash-id="${esc(t.id)}">Endgültig löschen</button></span></article>`).join(''):'<div class="trash-empty">Der Papierkorb ist leer.</div>'}</div><div class="trash-actions"><span>${trash.length} ${trash.length===1?'Eintrag':'Einträge'} im Papierkorb</span><button class="btn mini danger" data-trash-command="empty" ${trash.length?'':'disabled'}>${icon('trash')} Papierkorb leeren</button></div>`}
function openTrash(){
 if(modal.open)modal.close();
 modal.classList.add('trash-dialog');
 dialog('Papierkorb','Wiederherstellen oder endgültig löschen.',trashContent());
}
let trashBusy=false;
function refreshTrashList(message=''){
 if(!modal.open||!modal.classList.contains('trash-dialog'))return;
 const content=modal.querySelector('.modal-content');
 const oldList=content.querySelector('.trash-items');
 const oldTop=oldList?.scrollTop||0;
 content.innerHTML=trashContent();
 const list=content.querySelector('.trash-items');
 if(list)list.scrollTop=Math.min(oldTop,Math.max(0,list.scrollHeight-list.clientHeight));
 if(message){
   const notice=document.createElement('p');notice.className='trash-operation-error';
   notice.setAttribute('role','alert');notice.textContent=message;
   content.querySelector('.trash-intro')?.after(notice);
 }
}
async function trashAction(command,id,anchor){
 if(trashBusy)return;
 const item=(DB.trash||[]).find(x=>x.id===id);
 if(command==='purge'){
   if(!item)return toast('Der Eintrag ist nicht mehr im Papierkorb.');
   if(!await deleteConfirmPopover(`„${item.name||'Element'}“ endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,anchor))return;
 }
 if(command==='empty'&&!await deleteConfirmPopover('Den gesamten Papierkorb endgültig leeren? Auch die gespeicherten Dateiinhalte werden gelöscht.',anchor))return;
 if(trashBusy)return;
 trashBusy=true;
 const controls=[...modal.querySelectorAll('[data-trash-command]')];
 for(const control of controls)control.disabled=true;
 try{
   await flushSave();
   const res=await request('/api/trash/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:command,id})});
   await res.json();
   await getState();
   refreshTrashList();
   // The activated row may have been removed; keep keyboard focus in the dialog.
   const target=modal.querySelector('.trash-items [data-trash-command]')||modal.querySelector('.trash-actions [data-trash-command]')||modal.querySelector('[data-action="close-modal"]');
   target?.focus({preventScroll:true});
   toast(command==='restore'?'Wiederhergestellt.':command==='empty'?'Papierkorb geleert.':'Endgültig gelöscht.');
 }catch(err){
   // The server might have committed the metadata before a file-cleanup error.
   // Reload and show the actual state instead of leaving a misleading old list.
   try{await getState()}catch{}
   refreshTrashList('Aktion fehlgeschlagen: '+err.message);
   toast('Papierkorb: '+err.message);
 }finally{
   trashBusy=false;
   for(const control of controls)if(control.isConnected)control.disabled=false;
 }
}
document.addEventListener('click',e=>{const open=e.target.closest('[data-action="open-trash"]');if(open){e.preventDefault();e.stopImmediatePropagation();openTrash();return}const cmd=e.target.closest('[data-trash-command]');if(cmd){e.preventDefault();e.stopImmediatePropagation();trashAction(cmd.dataset.trashCommand,cmd.dataset.trashId,cmd);return}},true);
modal.addEventListener('close',()=>{if(!modal.open)modal.classList.remove('trash-dialog')});
// More frequent autosave: 180ms debounce inherited from v2.7, plus a 10s
// watchdog for dirty changes and a best-effort flush when the window hides.
const autosaveWatchdog=setInterval(()=>{
 if(!DB||qualitySaving||saveTimer||qualityDirty<=qualitySaved)return;
 runSave().catch(()=>{});
},10000);
window.addEventListener('pagehide',()=>{if(saveTimer){clearTimeout(saveTimer);saveTimer=null;runSave().catch(()=>{})}});
// Navigation state is limited to the current app session, never stored in project data.
const navBackStack=[],navForwardStack=[];
let navReplaying=false;
function navSnapshot(){return {view:ui.view,category:ui.category,project:ui.project,fileProject:ui.fileProject,orbit:typeof orbitSelectedProject==='undefined'?null:orbitSelectedProject,fileIndex:typeof orbitActiveFile==='undefined'?0:orbitActiveFile,roadmap:typeof roadmapProjectId==='undefined'?'':roadmapProjectId}}
function navSame(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function navPush(previous){if(navReplaying)return;const current=navSnapshot();if(!navSame(previous,current)){const last=navBackStack.at(-1);if(!last||!navSame(last,previous)){navBackStack.push(previous);if(navBackStack.length>100)navBackStack.shift()}navForwardStack.length=0}}
const priorGoto28=goto;
goto=function(view){const previous=navSnapshot();const result=priorGoto28(view);navPush(previous);return result};
const priorSelectCategory28=selectCategory;
selectCategory=function(category){const previous=navSnapshot();navReplaying=true;try{priorSelectCategory28(category)}finally{navReplaying=false};navPush(previous)};
const priorSelectProject28=selectProject;
selectProject=function(pid){const previous=navSnapshot();navReplaying=true;try{priorSelectProject28(pid)}finally{navReplaying=false};navPush(previous)};
// A sphere-to-document zoom is navigation even though it stays on the Files tab.
// Capture at window level BEFORE the orbit.js document handler mutates state.
window.addEventListener('click',e=>{if(e.target.closest('[data-orbit-project],[data-orbit-back]')){
 const before=navSnapshot();queueMicrotask(()=>navPush(before));
}},true);
function navApply(s){navReplaying=true;try{ui.category=DB.categories.some(c=>c.id===s.category)?s.category:'all';ui.project=getProject(s.project)?.id||'';ui.fileProject=s.fileProject;orbitSelectedProject=s.orbit&&getProject(s.orbit)?s.orbit:null;orbitActiveFile=s.fileIndex||0;if(typeof roadmapProjectId!=='undefined')roadmapProjectId=s.roadmap;goto(s.view==='topic'&&!ui.project?'home':s.view); }finally{navReplaying=false}}
function navStep(direction){const dest=direction==='back'?navBackStack:navForwardStack;const opposite=direction==='back'?navForwardStack:navBackStack;if(!dest.length)return false;const snapshot=dest.pop();opposite.push(navSnapshot());navApply(snapshot);return true}
function navDismissLayer(){
 // A file viewer is the top-most layer; Escape must close it, not navigate out of the gallery.
 const fullscreenReader=document.getElementById('pp-file-viewer');
 if(fullscreenReader?.open){fullscreenReader.close();return true}
 if(typeof fileMenu!=='undefined'&&!fileMenu.hidden){fileMenuHide(true);return true}
 if(typeof entityMenu!=='undefined'&&!entityMenu.hidden){qualityMenuHide(true);return true}
 if(typeof fileRenameModal!=='undefined'&&fileRenameModal.open){fileRenameModal.close();return true}
 if(searchModal.open){searchModal.close();return true}
 if(modal.open){modal.close();return true}
 if(ui.view==='files'&&orbitSelectedProject){const previous=navSnapshot();orbitSelectedProject=null;orbitActiveFile=0;renderFiles();navPush(previous);return true}
 return false;
}
// Handle Escape from inner-most layer to outer-most, not as an app exit.
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!e.defaultPrevented){if(navDismissLayer()){e.preventDefault();e.stopImmediatePropagation()}else if(navBackStack.length){e.preventDefault();e.stopImmediatePropagation();navStep('back')}else if(ui.view!=='home'){e.preventDefault();e.stopImmediatePropagation();goto('home')}}
 if(e.altKey&&!e.ctrlKey&&!e.metaKey&&['ArrowLeft','ArrowRight'].includes(e.key)&&!e.defaultPrevented){
  if(e.target.closest('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]'))return;
  e.preventDefault();e.stopImmediatePropagation();navStep(e.key==='ArrowLeft'?'back':'forward');}
},true);
// Chromium/Edge normally exposes side buttons as MouseEvent.button 3/4.
// Some mouse drivers reserve these; Alt+Left/Right remains available.
document.addEventListener('mousedown',e=>{
 if(e.button!==3&&e.button!==4)return;
 if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();
 if(document.querySelector('dialog[open]'))navDismissLayer();else if(e.button===3){if(!navStep('back'))navDismissLayer()}else navStep('forward');
},true);
for(const ev of ['mouseup','auxclick'])document.addEventListener(ev,e=>{if(e.button===3||e.button===4){if(e.cancelable)e.preventDefault();e.stopImmediatePropagation()}},true);
// Initial state is loaded asynchronously by the original startup sequence.
setTimeout(updateTrashBadge,0);
