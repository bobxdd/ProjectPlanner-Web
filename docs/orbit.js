/* Project Planner 2.4 · immersive, adaptive, offline orbit file hub.
   Categories are PROJECTS, not files. Nothing here mutates saved data. */
let orbitSelectedProject=null,orbitActiveFile=0,orbitRotation=-Math.PI/2,orbitPaused=false;
let orbitAnimationFrame=0,orbitFrameTime=0,orbitDragStart=null,orbitIgnoreClickUntil=0,orbitFitPreference=null;
const orbitMotionDisabled=()=>document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
const orbitInboxID='__project_planner_inbox__';
const orbitInbox=()=>({id:orbitInboxID,name:'Datei-Eingang',icon:'archive',color:'#8bbad2'});
const orbitProjects=()=>visibleProjects().filter(p=>ui.fileProject==='all'||p.id===ui.fileProject);
const orbitFilesFor=pid=>DB.documents.filter(d=>(pid===orbitInboxID?!d.projectId:d.projectId===pid)&&matchesFile(d,ui.fileQuery||'',ui.fileType||'all'));
function orbitPreview(d,mini=false){
 const type=classifyFile(d), extension=(d.name.split('.').pop()||'DATEI').toUpperCase().slice(0,5),url=esc(fileURL(d));
 if(mini){return `<span class="sphere-mini-page ${type}">${type==='image'?`<img src="${url}" alt="" loading="lazy">`:`<span class="mini-glyph">${icon(fileIconName(type))}</span>`}<span>${esc(extension)}</span></span>`;}
 const n=esc(d.name), label=esc(FILE_KIND_LABEL[type]||'Datei');
 if(type==='image')return `<div class="orbit-paper-preview is-image"><img src="${url}" loading="lazy" alt="Vorschau: ${n}"></div>`;
 if(type==='pdf')return `<div class="orbit-paper-preview is-pdf" aria-hidden="true"><span class="pdf-fallback">${icon('file')}<b>PDF</b></span></div>`;
 const lines=type==='sheet'?`<span class="sheet-grid">${Array.from({length:28},()=>'<i></i>').join('')}</span>`:
   `<span class="page-heading-line"></span>${Array.from({length:9},(_,i)=>`<i style="width:${i%3===2?'63':'88'}%"></i>`).join('')}`;
 return `<div class="orbit-paper-preview is-${type}"><span class="paper-type">${label}</span><div class="paper-body">${lines}</div><span class="paper-mark">${icon(fileIconName(type))}</span></div>`;
}
function orbitSphere(p,i){
 const all=topicFiles(p.id),matched=orbitFilesFor(p.id),color=projectColor(p),recent=all.slice(-3).reverse();
 const muted=!!((ui.fileQuery||ui.fileType&&ui.fileType!=='all')&&!matched.length);
 return `<div class="orbit-system-node${muted?' orbit-muted':''}" data-orbit-node="${esc(p.id)}" data-orbit-order="${i}" style="--topic:${esc(color)}" role="group" aria-label="${esc(p.name)}, ${all.length} Dateien">
 <button class="orbit-world-sphere" type="button" data-orbit-project="${esc(p.id)}" title="${esc(p.name)} öffnen" aria-label="${esc(p.name)} öffnen, ${all.length} Dateien">
 <span class="sphere-atmosphere"></span><span class="sphere-shine"></span>
 <span class="sphere-inner-content">${recent.length?recent.map((d,j)=>`<span class="sphere-mini-wrap" style="--mini:${j}">${orbitPreview(d,true)}</span>`).join(''):`<span class="sphere-empty-symbol">${icon(projectIcon(p))}</span>`}</span>
 <span class="sphere-outer-ring"></span></button>
 <span class="orbit-node-label"><strong>${esc(p.name)}</strong><small>${all.length} ${all.length===1?'Datei':'Dateien'}${muted?' · kein Treffer':''}</small></span></div>`;
}
function orbitSpaceView(projects){
 const n=projects.length,rx=n===1?(innerWidth<700?132:innerWidth<1100?200:255):Math.round(Math.max(290,150+(n-1)*49)),ry=n===1?(innerWidth<700?124:innerWidth<1100?160:185):Math.round(Math.max(205,rx*.61));
 const width=Math.max(innerWidth-20,2*rx+390),height=Math.max(innerHeight-180,2*ry+330),cx=width/2,cy=height/2;
 const ring=n>0?`<svg class="orbit-course-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true"><defs><linearGradient id="orbit-stroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b7a8ff" stop-opacity=".54"/><stop offset="45%" stop-color="#3ab4b9" stop-opacity=".55"/><stop offset="100%" stop-color="#f3cfbc" stop-opacity=".35"/></linearGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="url(#orbit-stroke)" stroke-width="2.3" fill="none"/><ellipse cx="${cx}" cy="${cy}" rx="${rx+19}" ry="${ry+19}" stroke="#d5c7ff" stroke-opacity=".08" stroke-dasharray="2 12" fill="none"/><ellipse cx="${cx}" cy="${cy}" rx="${Math.max(90,rx*.46)}" ry="${Math.max(50,ry*.45)}" stroke="#ffffff" stroke-opacity=".035" fill="none"/></svg>`:'';
 return `<div class="orbit-space-caption"><span class="orbit-legend-dot"></span>${n} ${n===1?'Bereich':'Bereiche'} · ${n===1?'Ein Bereich auf seiner Umlaufbahn':'Umlaufbahn passt sich automatisch an'}</div>
 <div class="orbit-viewport" id="orbit-viewport" tabindex="0" aria-label="Umlaufbahn der Projektbereiche, zum Verschieben scrollen oder freie Fläche ziehen">
 <div class="orbit-world" id="orbit-world" data-orbit-rx="${rx}" data-orbit-ry="${ry}" data-orbit-single="${n===1}" style="width:${width}px;height:${height}px;--world-width:${width}px;--world-height:${height}px">
 ${ring}<div class="orbit-central-glow" aria-hidden="true"><span>PROJECT PLANNER</span><b>${n.toString().padStart(2,'0')}</b><small>BEREICHE</small></div>
 ${projects.map(orbitSphere).join('')}</div></div>
 <div class="orbit-scene-controls"><button type="button" data-orbit-turn="-1" title="Umlaufbahn nach links drehen">${icon('chevron')} Links</button><button type="button" data-orbit-pause="true" aria-pressed="${orbitPaused}">${icon(orbitPaused?'play':'clock')} ${orbitPaused?'Weiter':'Pause'}</button><button type="button" data-orbit-turn="1" title="Umlaufbahn nach rechts drehen">Rechts ${icon('chevron')}</button><button type="button" data-orbit-fit="true" title="Große Umlaufbahn vollständig anzeigen oder zur Originalgröße wechseln">${icon('grid')} <span id="orbit-fit-label">Ansicht einpassen</span></button><span>Mausrad oder Ziehen: Ansicht bewegen · Kugel anklicken: Bereich öffnen</span></div>`;
}
function orbitDocTransform(index,active){
 const slot=index-active,dist=Math.abs(slot),width=innerWidth<750?112:innerWidth<1100?148:210;
 const translate=slot*width,z=-dist*122,y=dist*14,rot=slot===0?0:(slot<0?15:-15);
 return `translate(-50%,-50%) translate3d(${translate}px,${y}px,${z}px) rotateY(${rot}deg) scale(${Math.max(.7,1-dist*.075)})`;
}
function orbitDocument(d,index,active){
 const slot=index-active,dist=Math.abs(slot),transform=orbitDocTransform(index,active);
 return `<button type="button" class="orbit-document-card ${slot===0?'current':''}" data-orbit-file-index="${index}" data-file-id="${esc(d.id)}" style="transform:${transform};z-index:${20-dist};--doc-type:${esc(classifyFile(d))}" aria-label="${esc(d.name)}, im Vollbild öffnen" aria-current="${slot===0?'true':'false'}">
 <span class="orbit-document-back"></span><span class="orbit-document-leaf">${orbitPreview(d)}</span><span class="orbit-document-foot"><span>${esc(d.name)}</span><small>${esc(FILE_KIND_LABEL[classifyFile(d)])} · ${esc(bytes(d.size))}</small></span></button>`;
}
function orbitGalleryView(project){
 const docs=orbitFilesFor(project.id),count=docs.length;
 orbitActiveFile=Math.min(Math.max(0,orbitActiveFile),Math.max(0,count-1));
 const selected=docs[orbitActiveFile];
 return `<div class="orbit-inner-space" style="--topic:${esc(projectColor(project))}"><div class="orbit-focus-flash" aria-hidden="true"></div>
 <div class="orbit-inner-heading"><button type="button" class="orbit-back" data-orbit-back="true">${icon('chevron')} Alle Bereiche</button><span class="orbit-inner-title">${icon(projectIcon(project))}<strong>${esc(project.name)}</strong><small>${count} ${count===1?'Datei':'Dateien'}</small></span><button type="button" class="orbit-upload" data-orbit-upload="${esc(project.id)}">${icon('plus')} Dateien hinzufügen</button></div>
 <div class="orbit-inner-halo" aria-hidden="true"></div>
 ${count?`<div class="orbit-gallery" tabindex="0" aria-label="${count===1?'Einzelne Datei, anklicken zum Öffnen':'3D-Dokumentenstapel mit Mausrad oder Pfeiltasten durchsuchen'}" id="orbit-gallery">
 <div class="orbit-gallery-ray" aria-hidden="true"></div>
 ${docs.map((d,i)=>Math.abs(i-orbitActiveFile)>4?'':orbitDocument(d,i,orbitActiveFile)).join('')}</div>
 ${count>1?`<div class="orbit-gallery-controls"><button type="button" data-orbit-file-move="-1" ${orbitActiveFile===0?'disabled':''} aria-label="Vorherige Datei">${icon('chevron')}</button><span><b>${orbitActiveFile+1}</b> / ${count}</span><button type="button" data-orbit-file-move="1" ${orbitActiveFile===count-1?'disabled':''} aria-label="Nächste Datei">${icon('chevron')}</button></div>`:''}
 <div class="orbit-selected-file" data-file-id="${esc(selected.id)}"><div><span class="file-type-chip">${esc(FILE_KIND_LABEL[classifyFile(selected)])}</span><strong title="${esc(selected.name)}">${esc(selected.name)}</strong><small>${esc(bytes(selected.size))}${selected.taskId?' · '+esc(getTask(selected.taskId)?.title||'Aufgabe'):''}</small></div><button type="button" class="orbit-open-full" data-file-viewer="${esc(selected.id)}" aria-label="Datei ${esc(selected.name)} im Vollbild öffnen">${icon('arrow')} Im Vollbild öffnen</button><button type="button" class="file-actions-more" data-file-menu="${esc(selected.id)}" aria-label="Weitere Dateiaktionen" title="Weitere Dateiaktionen">${icon('more')}</button><button type="button" data-action="delete-file" data-id="${esc(selected.id)}" aria-label="Datei löschen" title="Datei löschen">${icon('trash')}</button></div>
 ${count>1?`<div class="orbit-file-filmstrip">${docs.map((d,i)=>`<button type="button" data-orbit-file-index="${i}" data-file-id="${esc(d.id)}" class="${i===orbitActiveFile?'selected':''}" title="${esc(d.name)}"><span>${icon(fileIconName(classifyFile(d)))}</span><small>${esc(d.name)}</small></button>`).join('')}</div>`:'<div class="orbit-one-file-note">Eine Datei · für weitere Aktionen Rechtsklick oder das Menü verwenden</div>'}`:
 `<div class="orbit-no-documents"><span class="no-doc-orb">${icon(projectIcon(project))}</span><strong>${ui.fileQuery||ui.fileType&&ui.fileType!=='all'?'Keine passenden Dateien':'Noch keine Dateien in diesem Bereich'}</strong><button type="button" class="orbit-upload" data-orbit-upload="${esc(project.id)}">${icon('upload')} Dateien hinzufügen</button></div>`}
 ${count>1?'<div class="orbit-gallery-hint">Mausrad oder wischen: Dateien durchblättern · Linksklick: Vollbild · Rechtsklick: Datei-Menü</div>':''}
 </div>`;
}
// Replaces only the old file grid; existing project metadata, storage, and upload APIs remain unchanged.
renderFiles=function(){
 cancelAnimationFrame(orbitAnimationFrame);
 const pAll=visibleProjects(),projects=orbitProjects();
 if(orbitSelectedProject&&orbitSelectedProject!==orbitInboxID&&!projects.some(p=>p.id===orbitSelectedProject))orbitSelectedProject=null;
 const current=orbitSelectedProject===orbitInboxID?orbitInbox():projects.find(p=>p.id===orbitSelectedProject),query=ui.fileQuery||'',kind=ui.fileType||'all';
 const inboxCount=DB.documents.filter(d=>!d.projectId).length;
 const fileTypes=`<option value="all">Alle Dateitypen</option>${Object.entries(FILE_KIND_LABEL).map(([key,label])=>`<option value="${key}" ${kind===key?'selected':''}>${esc(label)}</option>`).join('')}`;
 const scopes=`<option value="all">Alle Bereiche</option>${pAll.map(p=>`<option value="${esc(p.id)}" ${p.id===ui.fileProject?'selected':''}>${esc(p.name)}</option>`).join('')}`;
 $('#view').innerHTML=`<section class="orbit-fullscreen" aria-label="Immersiver 3D-Datei-Hub">
 <header class="orbit-header"><div class="orbit-brand"><span class="orbit-brand-line"></span><small>PROJECT PLANNER / DATEI-HUB</small><h1>${current?'Dateien · '+esc(current.name):'Dateien'}</h1></div>
 <nav class="orbit-quick-nav" aria-label="Ansichten wechseln">${NAV.map(([key,label,glyph])=>`<button type="button" data-nav="${key}" class="orbit-quick-link ${ui.view===key?'active':''}" ${ui.view===key?'aria-current="page"':''}>${icon(glyph)}<span>${esc(label)}</span></button>`).join('')}</nav>
 <div class="orbit-header-actions"><button type="button" data-orbit-upload="${esc(current?.id||'')}" class="orbit-toolbar-primary">${icon('upload')} Dateien hinzufügen</button><button type="button" data-orbit-exit="true" title="Zur Übersicht" aria-label="Datei-Hub verlassen und zur Übersicht wechseln">${icon('chevron')} <span>Zur Übersicht</span></button></div></header>
 <div class="orbit-toolbar"><label class="file-search-box">${icon('search')}<input id="file-query" type="search" placeholder="Dateiname, PDF, Aufgabe oder Bereich suchen" value="${esc(query)}" aria-label="Dateien durchsuchen"></label><select class="field-select" id="file-kind-filter" aria-label="Dateityp">${fileTypes}</select><select class="field-select" id="file-filter" aria-label="Bereich">${scopes}</select><button type="button" class="orbit-inbox-toggle" data-orbit-inbox="true" aria-pressed="${orbitSelectedProject===orbitInboxID}">${icon('archive')} Datei-Eingang · ${inboxCount}</button><span class="orbit-counter">${projects.length} ${projects.length===1?'Kugel':'Kugeln'} / ${DB.documents.filter(d=>projects.some(p=>p.id===d.projectId)).length} zugeordnete Dateien</span></div>
 <div class="orbit-scene">${current?orbitGalleryView(current):projects.length?orbitSpaceView(projects):`<div class="orbit-empty">${icon('folder')}<h2>Keine Bereiche vorhanden</h2><p>Erstelle zuerst einen Bereich in der Übersicht. Bereits empfangene Dateien findest du im Datei-Eingang.</p><button type="button" data-orbit-inbox="true">Datei-Eingang öffnen</button><button type="button" data-orbit-exit="true">Zur Übersicht</button></div>`}</div>
 </section>`;
 if(!current&&projects.length){requestAnimationFrame(()=>{
  const viewport=document.getElementById('orbit-viewport');if(!viewport)return;
  const world=document.getElementById('orbit-world');
  applyOrbitFit();
  orbitFrameTime=0;orbitAnimationFrame=requestAnimationFrame(updateOrbitAnimation);
 });}
};
function applyOrbitFit(){
 const viewport=document.getElementById('orbit-viewport'),world=document.getElementById('orbit-world');if(!viewport||!world)return;
 const count=world.querySelectorAll('[data-orbit-node]').length,fit=orbitFitPreference===null?count>=9:orbitFitPreference;
 world.style.zoom='1';
 const width=world.getBoundingClientRect().width,height=world.getBoundingClientRect().height;
 const scale=fit?Math.max(.24,Math.min(1,(viewport.clientWidth-65)/width,(viewport.clientHeight-52)/height)):1;
 world.style.zoom=String(scale);
 const label=document.getElementById('orbit-fit-label');if(label)label.textContent=scale<.999?'Originalgröße':'Ansicht einpassen';
 viewport.scrollLeft=Math.max(0,(world.offsetWidth-viewport.clientWidth)/2);viewport.scrollTop=Math.max(0,(world.offsetHeight-viewport.clientHeight)/2);
}
function updateOrbitAnimation(timestamp){
 if(ui.view!=='files'||orbitSelectedProject||!document.getElementById('orbit-world'))return;
 const world=document.getElementById('orbit-world'),nodes=[...world.querySelectorAll('[data-orbit-node]')],rx=Number(world.dataset.orbitRx),ry=Number(world.dataset.orbitRy);
 const dt=orbitFrameTime?Math.min(42,timestamp-orbitFrameTime):0;orbitFrameTime=timestamp;
 const hovering=!!world.querySelector('.orbit-world-sphere:hover,.orbit-world-sphere:focus-visible');
 if(!orbitPaused&&!orbitMotionDisabled()&&!hovering)orbitRotation+=dt*.000055;
 nodes.forEach((node,i)=>{
  const angle=orbitRotation+(Math.PI*2*i)/nodes.length,x=rx*Math.cos(angle),y=ry*Math.sin(angle);
  const depth=(Math.sin(angle)+1)/2,sc=.80+depth*.24;
  node.style.transform=`translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), 0) scale(${sc.toFixed(4)})`;
  node.style.zIndex=String(Math.floor(depth*20)+1);
  node.style.opacity=(.68+depth*.32).toFixed(3);
 });
 orbitAnimationFrame=requestAnimationFrame(updateOrbitAnimation);
}
// Keep the native navigation synchronised; no extra saved application state.
const renderBeforeOrbit=render;
render=function(){document.body.classList.toggle('file-hub-active',ui.view==='files');if(ui.view!=='files')cancelAnimationFrame(orbitAnimationFrame);renderBeforeOrbit()};
// Reposition existing document elements in place; recreating the entire scene on
// each wheel tick caused flashing, repeatedly loaded PDF frames and stole focus.
function orbitSelectDocument(next){
 const p=orbitSelectedProject===orbitInboxID?orbitInbox():getProject(orbitSelectedProject);if(!p)return;
 const docs=orbitFilesFor(p.id),max=docs.length-1;if(max<0)return;
 const nextIndex=Math.max(0,Math.min(max,next));if(nextIndex===orbitActiveFile)return;
 orbitActiveFile=nextIndex;
 const gallery=document.getElementById('orbit-gallery');
 if(!gallery){renderFiles();return}
 for(const card of [...gallery.querySelectorAll('[data-orbit-file-index]')]){
   const i=Number(card.dataset.orbitFileIndex),dist=Math.abs(i-nextIndex);
   if(dist>4){card.remove();continue}
   card.style.transform=orbitDocTransform(i,nextIndex);
   card.style.zIndex=String(20-dist);
   card.classList.toggle('current',i===nextIndex);
   card.setAttribute('aria-current',String(i===nextIndex));
   card.setAttribute('aria-label',docs[i].name+', im Vollbild öffnen');
 }
 for(let i=Math.max(0,nextIndex-4);i<=Math.min(max,nextIndex+4);i++){
   if(!gallery.querySelector(`[data-orbit-file-index="${i}"]`))gallery.insertAdjacentHTML('beforeend',orbitDocument(docs[i],i,nextIndex));
 }
 const active=docs[nextIndex],selected=document.querySelector('.orbit-selected-file');
 if(selected){
   const info=selected.querySelector(':scope > div');
   if(info)info.innerHTML=`<span class="file-type-chip">${esc(FILE_KIND_LABEL[classifyFile(active)])}</span><strong title="${esc(active.name)}">${esc(active.name)}</strong><small>${esc(bytes(active.size))}${active.taskId?' · '+esc(getTask(active.taskId)?.title||'Aufgabe'):''}</small>`;
   const button=selected.querySelector('.orbit-open-full');if(button){button.dataset.fileViewer=active.id;button.setAttribute('aria-label','Datei '+active.name+' im Vollbild öffnen');}
   const del=selected.querySelector('[data-action="delete-file"]');if(del)del.dataset.id=active.id;
   selected.dataset.fileId=active.id;const more=selected.querySelector('[data-file-menu]');if(more)more.dataset.fileMenu=active.id;
 }
 const indicator=document.querySelector('.orbit-gallery-controls span b');if(indicator)indicator.textContent=String(nextIndex+1);
 document.querySelectorAll('[data-orbit-file-move]').forEach(b=>{const disabled=nextIndex+Number(b.dataset.orbitFileMove)<0||nextIndex+Number(b.dataset.orbitFileMove)>max;if(disabled&&document.activeElement===b)gallery.focus({preventScroll:true});b.disabled=disabled;});
 document.querySelectorAll('.orbit-file-filmstrip [data-orbit-file-index]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.orbitFileIndex)===nextIndex));
 const film=document.querySelector('.orbit-file-filmstrip .selected');film?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
}
function orbitOpenFile(index,trigger){const docs=orbitFilesFor(orbitSelectedProject),doc=docs[index];if(!doc)return;
 // Keep the carousel selection in sync, but ALWAYS open the clicked file in the in-app viewer.
 if(index!==orbitActiveFile)orbitSelectDocument(index);
 const viewer=window.PPFileViewer;
 if(!viewer?.open){toast('Vollbild-Dateiansicht nicht geladen. Bitte Seite aktualisieren.');return;}
 viewer.open(doc.id,trigger).catch(error=>toast('Datei öffnen fehlgeschlagen: '+error.message));
}
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-orbit-project],[data-orbit-inbox],[data-orbit-back],[data-orbit-exit],[data-orbit-file-move],[data-orbit-file-index],[data-orbit-pause],[data-orbit-turn],[data-orbit-upload],[data-orbit-fit]');
 if(!button||ui.view!=='files'||(e.button!==undefined&&e.button!==0))return;
 e.preventDefault();e.stopImmediatePropagation();
 if(button.hasAttribute('data-orbit-inbox')){orbitSelectedProject=orbitInboxID;orbitActiveFile=0;window.__orbitWheelAccumulator=0;renderFiles();return;}
 if(button.hasAttribute('data-orbit-project')){orbitSelectedProject=button.dataset.orbitProject;orbitActiveFile=0;window.__orbitWheelAccumulator=0;renderFiles();return;}
 if(button.hasAttribute('data-orbit-back')){orbitSelectedProject=null;orbitActiveFile=0;window.__orbitWheelAccumulator=0;renderFiles();return;}
 if(button.hasAttribute('data-orbit-exit')){orbitSelectedProject=null;goto('home');return;}
 if(button.hasAttribute('data-orbit-upload')){const pid=button.dataset.orbitUpload,previous=ui.fileProject;if(pid)ui.fileProject=pid===orbitInboxID?'inbox':pid;openUpload();ui.fileProject=previous;return;}
 if(button.hasAttribute('data-orbit-pause')){orbitPaused=!orbitPaused;button.setAttribute('aria-pressed',String(orbitPaused));button.innerHTML=icon(orbitPaused?'play':'clock')+' '+(orbitPaused?'Weiter':'Pause');return;}
 if(button.hasAttribute('data-orbit-turn')){orbitRotation+=Number(button.dataset.orbitTurn)*.36;return;}
 if(button.hasAttribute('data-orbit-fit')){const world=document.getElementById('orbit-world'),count=world?.querySelectorAll('[data-orbit-node]').length||0;orbitFitPreference=!(orbitFitPreference===null?count>=9:orbitFitPreference);applyOrbitFit();return;}
 if(button.hasAttribute('data-orbit-file-move')){orbitSelectDocument(orbitActiveFile+Number(button.dataset.orbitFileMove));return;}
 if(button.hasAttribute('data-orbit-file-index')){if(performance.now()<orbitIgnoreClickUntil)return;orbitOpenFile(Number(button.dataset.orbitFileIndex),button);return;}
},true);
document.addEventListener('wheel',e=>{
 if(ui.view!=='files'||!orbitSelectedProject||e.ctrlKey||e.metaKey)return;
 if(!e.target.closest('#orbit-gallery'))return;
 const dy=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*(e.deltaMode===1?24:e.deltaMode===2?360:1);
 if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();
 window.__orbitWheelAccumulator=(window.__orbitWheelAccumulator||0)+dy;
 if(Math.abs(window.__orbitWheelAccumulator)>=55){const d=Math.sign(window.__orbitWheelAccumulator);window.__orbitWheelAccumulator=0;orbitSelectDocument(orbitActiveFile+d);}
},{capture:true,passive:false});
document.addEventListener('keydown',e=>{
 if(ui.view!=='files'||e.target.closest('input,textarea,select')||document.getElementById('file-context-menu')?.hidden===false||document.querySelector('dialog[open]'))return;
 if(e.key==='Escape'&&orbitSelectedProject&&!document.querySelector('dialog[open]')){e.preventDefault();orbitSelectedProject=null;renderFiles()}
 if(orbitSelectedProject&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();orbitSelectDocument(orbitActiveFile+(e.key==='ArrowRight'?1:-1));}
});
document.addEventListener('pointerdown',e=>{
 if(ui.view!=='files'||!e.isPrimary)return;
 const gallery=e.target.closest('#orbit-gallery'),viewport=e.target.closest('#orbit-viewport');
 if(!gallery&&!viewport)return;
 if(viewport&&e.target.closest('[data-orbit-project]'))return;
 orbitDragStart={x:e.clientX,y:e.clientY,scrollLeft:viewport?.scrollLeft,scrollTop:viewport?.scrollTop,kind:gallery?'gallery':'world',pointerId:e.pointerId};
},true);
document.addEventListener('pointermove',e=>{
 if(!orbitDragStart||orbitDragStart.pointerId!==e.pointerId)return;
 if(orbitDragStart.kind!=='world')return;
 const viewport=document.getElementById('orbit-viewport');if(!viewport)return;
 if(Math.abs(e.clientX-orbitDragStart.x)+Math.abs(e.clientY-orbitDragStart.y)<4)return;
 viewport.scrollLeft=orbitDragStart.scrollLeft-(e.clientX-orbitDragStart.x);
 viewport.scrollTop=orbitDragStart.scrollTop-(e.clientY-orbitDragStart.y);
});
document.addEventListener('pointerup',e=>{
 if(!orbitDragStart||e.pointerId!==orbitDragStart.pointerId)return;
 if(orbitDragStart.kind==='gallery'){
  const dx=e.clientX-orbitDragStart.x;if(Math.abs(dx)>48){orbitIgnoreClickUntil=performance.now()+300;orbitSelectDocument(orbitActiveFile+(dx<0?1:-1));}
 }
 orbitDragStart=null;
});
