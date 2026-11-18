'use strict';
/* Desktop adapter: the overlay is a versioned Note attached to the exact
   document ID. SQLite/state backups and task associations already persist it. */
(function(){
 const a=()=>window.PPAnnotationLayer;
 async function openFileOverlay(id){
  const doc=DB.documents.find(d=>d.id===id);
  if(!doc)throw Error('Datei nicht gefunden');
  if(!doc.projectId)throw Error('Bitte Datei zuerst einem Bereich zuordnen');
  await flushSave();
  await a().open({doc,
   load:async d=>{const response=await fetch(fileURL(d),{cache:'no-store'});if(!response.ok)throw Error('Originaldatei konnte nicht geladen werden (HTTP '+response.status+')');return response.blob()},
   read:async d=>DB.notes.find(n=>n.id===a().noteId(d.id))?.body||null,
   save:async content=>{
    // Fetch fresh state before editing; the existing desktop conflict guard
    // must remain active. Never replace arbitrary state on version conflict.
    await flushSave();if(typeof liveDesktopConflict!=='undefined'&&liveDesktopConflict)throw Error('PC-Datenkonflikt zuerst lösen');
    const existing=DB.notes.find(n=>n.id===a().noteId(doc.id));
    if(existing){mutate(()=>{existing.body=content;existing.updatedAt=new Date().toISOString()})}
    else{mutate(()=>DB.notes.push({id:a().noteId(doc.id),projectId:doc.projectId,taskId:doc.taskId||'',title:'PP-OVERLAY-V1:'+doc.id,body:content,order:0,updatedAt:new Date().toISOString()}))}
    await flushSave();
    if(typeof liveDesktopConflict!=='undefined'&&liveDesktopConflict)throw Error('Versionskonflikt beim Speichern. Anmerkungsebene bitte erneut sichern.');
   }
  });
 }
 window.ppOpenFileOverlay=openFileOverlay;
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-annotate-file]');if(!button)return;
  e.preventDefault();e.stopImmediatePropagation();openFileOverlay(button.dataset.annotateFile).catch(err=>{if(typeof toast==='function')toast('Anmerkungen: '+err.message);else alert(err.message)});
 },true);
})();
