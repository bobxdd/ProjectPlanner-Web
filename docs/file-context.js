'use strict';
// File operations use the existing PlannerCloud API so shared cloud state stays durable.
let fileMenuId='',fileMenuMode='main',fileMenuReturnFocus=null;
const fileRenameModal=(()=>{const d=document.createElement('dialog');d.id='file-rename-dialog';d.className='modal-shell file-rename-modal';document.body.append(d);return d})();
const fileMenu=(()=>{const el=document.createElement('div');el.id='file-context-menu';el.className='file-context-menu';el.setAttribute('role','menu');el.setAttribute('aria-label','Dateiaktionen');el.hidden=true;return el})();
function fileMenuHide(restore=false){if(fileMenu.hidden)return;fileMenu.hidden=true;fileMenuId='';fileMenuMode='main';if(restore&&fileMenuReturnFocus?.isConnected)fileMenuReturnFocus.focus({preventScroll:true});}
function fileMenuPosition(x,y){fileMenu.style.left='0';fileMenu.style.top='0';fileMenu.hidden=false;const r=fileMenu.getBoundingClientRect();const left=Math.max(8,Math.min(x,innerWidth-r.width-10)),top=Math.max(8,Math.min(y,innerHeight-r.height-10));fileMenu.style.left=left+'px';fileMenu.style.top=top+'px'}
function fileMenuRender(x,y){const d=DB.documents.find(d=>d.id===fileMenuId);if(!d){fileMenuHide();return}const parent=document.querySelector('dialog[open]')||document.body;if(fileMenu.parentElement!==parent)parent.append(fileMenu);
 const p=getProject(d.projectId),projects=sort(DB.projects);const menuButton=(cmd,title,glyph='',hint='')=>`<button type="button" role="menuitem" data-file-command="${cmd}">${glyph?icon(glyph):''}<span>${title}</span>${hint?`<small>${hint}</small>`:''}</button>`;
 if(fileMenuMode==='main'){
  fileMenu.innerHTML=`<div class="file-menu-title"><span class="file-menu-name">${esc(d.name)}</span><small>${esc(p?.name||'Datei-Eingang')} · ${esc(bytes(d.size))}</small></div><div class="file-menu-items">
  ${menuButton('new-tab','In neuem Tab öffnen','file')}${menuButton('open','Im Vollbild öffnen','file')}${menuButton('download','Herunterladen','download')}${menuButton('annotate','Anmerkungsebene öffnen','edit')}
  <div class="file-menu-separator"></div>
  ${menuButton('move-targets','In anderen Bereich verschieben','arrow','›')}${menuButton('copy-targets','In anderen Bereich kopieren','layers','›')}
  ${menuButton('rename','Umbenennen','edit')}${DB.tasks.some(t=>t.projectId===d.projectId)?menuButton('task-targets','Aufgabe zuordnen','clipboard','›'):''}${d.taskId?menuButton('detach','Von Aufgabe lösen','x'):''}${menuButton('details','Eigenschaften','list')}
  <div class="file-menu-separator"></div>${menuButton('delete','Datei löschen','trash')}</div><p class="file-menu-help">Rechtsklick · Pfeiltasten · Esc zum Schließen</p>`;
 } else {
  const copy=fileMenuMode==='copy',assign=fileMenuMode==='task';const available=assign?sort(DB.tasks.filter(t=>t.projectId===d.projectId)):projects.filter(t=>copy||t.id!==d.projectId);
  fileMenu.innerHTML=`<div class="file-menu-title file-menu-subtitle"><button type="button" class="file-menu-back" data-file-command="back" aria-label="Zurück">${icon('chevron')}</button><div><strong>${assign?'Aufgabe zuordnen':copy?'Kopieren nach':'Verschieben nach'}</strong><small>Bereich auswählen</small></div></div><div class="file-menu-targets" role="group" aria-label="Zielbereiche">${available.map(t=>`<button type="button" role="menuitem" ${assign?`data-file-task-target="${esc(t.id)}"`:`data-file-target="${esc(t.id)}"`}><i style="--file-target:${esc(assign?getStatus(t.status)?.color||'#a7acb3':projectColor(t))}"></i><span>${esc(assign?t.title:t.name)}</span>${(assign?t.id===d.taskId:t.id===d.projectId)?`<small>${assign?'Verknüpft':'Aktueller Bereich'}</small>`:''}</button>`).join('')||(assign?'<div class="file-menu-empty">Keine Aufgaben in diesem Bereich vorhanden.</div>':'<div class="file-menu-empty">Kein anderer Bereich vorhanden.</div>')}</div>`;
 }
 fileMenuPosition(x,y);fileMenu.querySelector('[role="menuitem"],.file-menu-back')?.focus({preventScroll:true});}
function fileMenuShow(fileId,x,y,trigger){if(!DB?.documents?.some(d=>d.id===fileId))return;fileMenuId=fileId;fileMenuMode='main';fileMenuReturnFocus=trigger||document.activeElement;fileMenuRender(x,y)}
async function fileMenuSubmit(payload,feedback){fileMenuHide();await flushSave();await request('/api/file-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});await getState();if(searchModal.open)updateSearch();if(modal.open){const taskForm=modal.querySelector('#task-form');if(taskForm){const section=[...taskForm.querySelectorAll('.dialog-section')].find(x=>x.querySelector('h3')?.textContent==='Dateianhänge');if(section){section.querySelectorAll('.file-mini').forEach(x=>x.remove());section.querySelector('h3')?.insertAdjacentHTML('afterend',taskDocumentRows(taskForm.dataset.edit));}}}toast(feedback)}
function fileMenuRename(d){
 fileMenuHide();const ext=d.name.includes('.')?d.name.slice(d.name.lastIndexOf('.')):'';
 const base=ext?d.name.slice(0,-ext.length):d.name;
 fileRenameModal.innerHTML=`<div class="modal-head"><div><h2>Datei umbenennen</h2><p>Die Dateiendung bleibt erhalten.</p></div><button class="icon-btn" type="button" data-file-rename-cancel aria-label="Schließen">${icon('x')}</button></div><div class="modal-content"><form id="file-rename-form" data-file-rename-id="${esc(d.id)}"><label class="form-field"><span>Dateiname</span><div class="file-rename-field"><input name="basename" class="text-field" value="${esc(base)}" maxlength="${240-ext.length}" required autocomplete="off"><span>${esc(ext)}</span></div></label><div class="modal-footer"><div class="right"><button type="button" class="btn ghost" data-file-rename-cancel>Abbrechen</button><button type="submit" class="btn primary">Umbenennen</button></div></div></form></div>`;
 fileRenameModal.showModal();const input=fileRenameModal.querySelector('input[name=basename]');input?.focus();input?.select();
}
function fileMenuProperties(d){fileMenuHide();const p=getProject(d.projectId);dialog('Dateieigenschaften','',`<div class="file-properties"><div><span>Name</span><strong>${esc(d.name)}</strong></div><div><span>Typ</span><strong>${esc(d.mime||'Unbekannt')}</strong></div><div><span>Größe</span><strong>${esc(bytes(d.size))}</strong></div><div><span>Bereich</span><strong>${esc(p?.name||'—')}</strong></div><div><span>Aufgabe</span><strong>${esc(getTask(d.taskId)?.title||'Keine')}</strong></div><div><span>Hinzugefügt</span><strong>${esc(d.createdAt?new Date(d.createdAt).toLocaleString('de-DE'):'—')}</strong></div></div><div class="modal-footer"><div class="right"><button class="btn" data-action="close-modal">Schließen</button></div></div>`)}
document.addEventListener('contextmenu',e=>{
 const target=e.target.closest('[data-file-id],[data-file-viewer],[data-search-type="file"]');if(!target)return;const fid=target.dataset.fileId||target.dataset.fileViewer||(target.dataset.searchType==='file'?target.dataset.searchId:'');if(!fid)return;
 e.preventDefault();e.stopImmediatePropagation();fileMenuShow(fid,e.clientX,e.clientY,target);
},true);
document.addEventListener('click',e=>{const cancel=e.target.closest('[data-file-rename-cancel]');if(cancel){e.preventDefault();e.stopImmediatePropagation();fileRenameModal.close();return}const button=e.target.closest('[data-file-menu]');if(button){e.preventDefault();e.stopImmediatePropagation();const r=button.getBoundingClientRect();fileMenuShow(button.dataset.fileMenu,r.left,r.bottom+5,button);return}
 if(!fileMenu.hidden&&!e.target.closest('#file-context-menu'))fileMenuHide();
},true);
document.addEventListener('click',async e=>{
 const cmd=e.target.closest('[data-file-command],[data-file-target],[data-file-task-target]');if(!cmd||!fileMenu.contains(cmd))return;
 e.preventDefault();e.stopImmediatePropagation();const d=DB.documents.find(d=>d.id===fileMenuId);if(!d)return;
 if(cmd.dataset.fileTaskTarget){const task=getTask(cmd.dataset.fileTaskTarget);if(!task)return;try{await fileMenuSubmit({id:d.id,action:'move',projectId:d.projectId,taskId:task.id},'Datei mit Aufgabe „'+task.title+'“ verknüpft.')}catch(err){toast('Verknüpfen fehlgeschlagen: '+err.message)}return}
 if(cmd.dataset.fileTarget){const target=getProject(cmd.dataset.fileTarget);if(!target)return;const mode=fileMenuMode;try{await fileMenuSubmit({id:d.id,action:mode==='copy'?'copy':'move',projectId:target.id,taskId:''},mode==='copy'?'Datei nach „'+target.name+'“ kopiert.':'Datei nach „'+target.name+'“ verschoben.')}catch(err){toast('Dateiaktion fehlgeschlagen: '+err.message)}return}
 const action=cmd.dataset.fileCommand;
 if(action==='copy-targets'||action==='move-targets'||action==='task-targets'||action==='back'){fileMenuMode=action==='back'?'main':action==='copy-targets'?'copy':action==='task-targets'?'task':'move';const r=fileMenu.getBoundingClientRect();fileMenuRender(r.left,r.top);return}
 if(action==='annotate'){fileMenuHide();window.ppOpenFileOverlay?.(d.id).catch(err=>toast(err.message));return}
 if(action==='rename'){fileMenuRename(d);return}
 if(action==='details'){fileMenuProperties(d);return}
 if(action==='delete'){const rect=cmd.getBoundingClientRect();fileMenuHide();try{await deleteFile(d.id,{getBoundingClientRect:()=>rect})}catch(err){toast(err.message)}return}
 if(action==='open'){fileMenuHide();window.PPFileViewer?.open(d.id).catch(err=>toast(err.message));return}
 if(action==='new-tab'){fileMenuHide();window.PPFileViewer?.openNewTab(d.id);return}
 if(action==='download'){fileMenuHide();window.PPFileViewer?.download(d.id).catch(err=>toast('Herunterladen fehlgeschlagen: '+err.message));return}
 if(action==='detach'){try{await fileMenuSubmit({id:d.id,action:'detach'},'Datei von Aufgabe gelöst.')}catch(err){toast(err.message)}return}
},true);
document.addEventListener('keydown',e=>{
 if((e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10'))&&fileMenu.hidden){const t=document.activeElement?.closest('[data-file-id],[data-search-type="file"]');if(t){e.preventDefault();const id=t.dataset.fileId||t.dataset.searchId,r=t.getBoundingClientRect();fileMenuShow(id,r.left+18,r.top+18,t)}return}
 if(fileMenu.hidden)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();fileMenuHide(true)}
 else if(e.key==='Tab'){fileMenuHide();return}
 else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
  e.preventDefault();e.stopImmediatePropagation();const items=[...fileMenu.querySelectorAll('button:not([disabled])')];if(!items.length)return;const i=items.indexOf(document.activeElement);const next=e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next].focus();
 } else if(e.key==='ArrowLeft'&&fileMenuMode!=='main'){e.preventDefault();const r=fileMenu.getBoundingClientRect();fileMenuMode='main';fileMenuRender(r.left,r.top)}
},true);
// The rename form lives in the standard dialog but uses the same guarded file API.
document.addEventListener('submit',async e=>{if(e.target.id!=='file-rename-form')return;e.preventDefault();e.stopImmediatePropagation();const doc=DB.documents.find(d=>d.id===e.target.dataset.fileRenameId);if(!doc)return;const suffix=doc.name.includes('.')?doc.name.slice(doc.name.lastIndexOf('.')):'';const base=String(new FormData(e.target).get('basename')||'').trim();if(!base){toast('Bitte einen Dateinamen eingeben.');return}
 try{await fileMenuSubmit({id:doc.id,action:'rename',name:base+suffix},'Datei umbenannt.');if(fileRenameModal.open)fileRenameModal.close()}catch(err){toast('Umbenennen fehlgeschlagen: '+err.message)}
},true);
window.addEventListener('blur',()=>fileMenuHide());
