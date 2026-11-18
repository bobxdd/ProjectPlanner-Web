/* Project Planner · Spatial workspace / 2.3
   The existing data/API layer remains authoritative. Views are derived from one state.
   No demo projects or hard-coded subject areas are created. */
let topicRailX=0, roadmapRailX=0, topicModulesOpen=false;
let roadmapMode="all",roadmapProjectId="";
const categoryFor=p=>getCat(p?.categoryId);
const projectColor=p=>p?.color||categoryFor(p)?.color||'#bba8f8';
const projectIcon=p=>p?.icon||categoryFor(p)?.icon||'layers';
const topicFiles=pid=>DB.documents.filter(d=>d.projectId===pid);
const topicNotes=pid=>sort((DB.notes||[]).filter(n=>n.projectId===pid&&!n.taskId&&!n.title?.startsWith('PP-OVERLAY-V1:')));
const topicOpenTasks=pid=>sort(projectTasks(pid).filter(t=>!isDone(t)));
const artClass=ic=>['book-open','graduation-cap','folder','archive','calendar'].includes(ic)?'pages':['code','rocket','chart','plane','gamepad','heart','star'].includes(ic)?'network':'layers';
function spatialArt(p,mini=false){
 const ic=projectIcon(p),style=artClass(ic);
 return `<div class="spatial-art ${style} ${mini?'art-mini':''}" aria-hidden="true">
 <div class="art-halo"></div><div class="art-orbit orbit-a"></div><div class="art-orbit orbit-b"></div>
 <div class="art-spark spark-a"></div><div class="art-spark spark-b"></div><div class="art-spark spark-c"></div>
 <div class="art-float">
   <div class="art-shadow"></div>
   <div class="art-geometry"><div class="geometry-edge edge-a"></div><div class="geometry-edge edge-b"></div><div class="geometry-core">${icon(ic)}</div><div class="geometry-shine"></div></div>
   <div class="art-platform"><div class="platform-inner"></div></div>
 </div></div>`
}
function topicCard(p,i){
 const color=projectColor(p),tasks=projectTasks(p.id),pending=topicOpenTasks(p.id),docs=topicFiles(p.id),notes=topicNotes(p.id),cat=categoryFor(p),count=tasks.filter(isDone).length;
 return `<article class="topic-card" style="--topic:${esc(color)}" data-drop="project:${esc(p.id)}" data-topic-card="${esc(p.id)}" tabindex="0" aria-label="Bereich ${esc(p.name)} öffnen (Enter drücken)">
  <div class="topic-cover">
   <div class="topic-cover-head"><span>${String(i+1).padStart(2,'0')} / ${esc(cat?.name||'BEREICH').toUpperCase()}</span><div class="topic-card-controls"><button type="button" class="topic-edit topic-more" data-entity-more="project:${esc(p.id)}" title="Weitere Bereichsaktionen" aria-label="Weitere Aktionen für ${esc(p.name)}" aria-haspopup="menu">${icon('more')}</button><button type="button" data-action="edit-project" data-id="${esc(p.id)}" class="topic-edit" title="Bereich bearbeiten (Name, Symbol, Farbe)" aria-label="${esc(p.name)} bearbeiten">${icon('edit')}</button><button type="button" data-action="delete-project" data-id="${esc(p.id)}" class="topic-edit topic-delete delete-inline" title="Bereich löschen" aria-label="${esc(p.name)} löschen">${icon('trash')}</button><button draggable="true" data-drag="project:${esc(p.id)}" class="drag-topic" title="Karte ziehen, um die Reihenfolge zu ändern" aria-label="Projekt verschieben">⠿</button></div></div>
   ${spatialArt(p)}
   <button type="button" class="topic-cover-title" data-project="${esc(p.id)}"><strong>${esc(p.name)}</strong><span>${esc(p.description||'')}</span></button>
  </div>
  <div class="topic-statline"><span>${count} von ${tasks.length} abgeschlossen</span><span>${docs.length} Dateien · ${notes.length} Notizen</span></div>
  <div class="topic-list-heading"><strong>Nächste Schritte</strong><small>${pending.length} offen</small></div>
  <div class="topic-tasklist">${pending.length?pending.slice(0,3).map(t=>`<div class="topic-task" style="--task:${esc(t.color||color)}"><span class="circle-track"></span><button class="topic-task-name" data-task="${esc(t.id)}"><strong>${esc(t.title)}</strong><small>${esc(getStage(t.stageId)?.title||'Ohne Phase')}</small></button><button class="topic-status-action" data-action="mark-doing" data-id="${esc(t.id)}">${esc(getStatus(t.status).label)}</button></div>`).join(''):'<div class="topic-task-empty">Noch keine offenen Aufgaben</div>'}</div>
  <div class="topic-bottom-actions"><button data-project="${esc(p.id)}" class="topic-all">Bereich öffnen ${icon('arrow')}</button><button data-action="quick-add-topic-task" data-id="${esc(p.id)}" class="topic-add" title="Aufgabe hinzufügen" aria-label="Aufgabe hinzufügen">${icon('plus')}</button></div>
 </article>`
}
function overviewTopButtons(){return `<div class="spatial-nav"><button type="button" data-action="rail-prev" data-target="topic-track" aria-label="Nach links scrollen">${icon('chevron')}</button><button type="button" data-action="rail-next" data-target="topic-track" aria-label="Nach rechts scrollen">${icon('chevron')}</button></div>`}
function renderHome(){
 const list=visibleProjects(),actions=btt(icon('plus')+'Neuer Bereich','add-project','btn primary')+btt(icon('plus')+'Aufgabe','add-task','btn');
 $('#view').innerHTML=`<section class="spatial-heading">${header('Bereiche & Arbeitsschritte','PROJEKTÜBERSICHT','',actions)}<div class="spatial-heading-row"><span>${list.length} Bereiche · ${filteredTasks().length} Aufgaben</span>${list.length?overviewTopButtons():''}</div></section>
 ${list.length?`<div class="topic-track" id="topic-track" data-horizontal-rail="true" tabindex="0" aria-label="Bereiche horizontal scrollen">${list.map(topicCard).join('')}<button class="topic-new-card" data-action="add-project"><span>${icon('plus')}</span><strong>Bereich hinzufügen</strong></button></div>`:
 `<div class="new-workspace-empty"><div class="empty-geometry">${spatialArt({icon:'layers',color:'#bba8f8'},true)}</div><h2>Noch keine Bereiche</h2>${btt(icon('plus')+'Bereich erstellen','add-project','btn primary')}</div>`}
 <div class="below-rail"><div class="below-rail-header"><span>Module</span><button class="btn mini" data-action="toggle-modules">${topicModulesOpen?'Ausblenden':'Einblenden'} ${icon(topicModulesOpen?'up':'down')}</button><button class="btn mini" data-action="widget-settings">${icon('settings')} Anpassen</button></div>${topicModulesOpen?`<div class="widget-grid">${sort(DB.dashboard.filter(w=>w.visible)).map(w=>widgetFrame(w,w.collapsed?'':widgetContent(w))).join('')||empty('Keine Module aktiviert','Module einrichten','widget-settings')}</div>`:''}</div>`;
 requestAnimationFrame(()=>{const el=$('#topic-track');if(el)el.scrollLeft=topicRailX});
}
function roadmapTaskRow(t){return `<div class="roadmap-task" draggable="true" data-drag="task:${esc(t.id)}" data-drop="task:${esc(t.id)}" ><span class="status-mark" style="--status:${esc(t.color||getStatus(t.status).color)}">${icon(isDone(t)?'check':'circle')}</span><button data-task="${esc(t.id)}">${esc(t.title)}</button><button class="task-delete-inline delete-inline" data-action="delete-task" data-id="${esc(t.id)}" title="Aufgabe löschen" aria-label="Aufgabe ${esc(t.title)} löschen">${icon('trash')}</button>${DB.documents.some(d=>d.taskId===t.id)?`<span class="roadmap-file-clip" title="Dateianhänge">${icon('file')}</span>`:''}</div>`}
function roadmapArea(p,i,opts={}){
 const stages=sort(DB.stages.filter(s=>s.projectId===p.id)),tasks=projectTasks(p.id),color=projectColor(p),single=!!opts.single;
 return `<article class="roadmap-area ${single?'roadmap-area--single':''}" style="--topic:${esc(color)}" data-drop="project:${esc(p.id)}" data-roadmap-area="${esc(p.id)}">
 <div class="roadmap-area-header"><span class="roadmap-number">${String(i+1).padStart(2,'0')}</span><div class="roadmap-area-icon">${icon(projectIcon(p))}</div><div class="roadmap-area-name"><button data-project="${esc(p.id)}">${esc(p.name)}</button><small>${tasks.filter(isDone).length}/${tasks.length} erledigt</small></div><button type="button" class="roadmap-edit-topic" data-entity-more="project:${esc(p.id)}" aria-label="Weitere Aktionen für ${esc(p.name)}" title="Weitere Aktionen" aria-haspopup="menu">${icon('more')}</button><button type="button" class="roadmap-edit-topic" data-action="edit-project" data-id="${esc(p.id)}" title="Bereich bearbeiten" aria-label="${esc(p.name)} bearbeiten">${icon('edit')}</button><button type="button" class="roadmap-edit-topic delete-inline" data-action="delete-project" data-id="${esc(p.id)}" title="Bereich löschen" aria-label="${esc(p.name)} löschen">${icon('trash')}</button>${single?'':`<button class="drag-topic" draggable="true" data-drag="project:${esc(p.id)}" title="Bereich verschieben" aria-label="Bereich verschieben">⠿</button>`}</div>
 <div class="roadmap-glass-scene" aria-hidden="true"><span class="roadmap-light-field"></span><span class="roadmap-ring ring-outside"></span><span class="roadmap-ring ring-inside"></span><span class="roadmap-core">${icon(projectIcon(p))}</span><span class="roadmap-point roadmap-point-a"></span><span class="roadmap-point roadmap-point-b"></span></div>
 <div class="roadmap-stage-list">${stages.length?stages.map((st,j)=>{const ts=sort(tasks.filter(t=>t.stageId===st.id));return `<section class="roadmap-stage" draggable="true" data-drag="stage:${esc(st.id)}" data-drop="stage:${esc(st.id)}"><div class="roadmap-stage-head"><span class="stage-no">${String(j+1).padStart(2,'0')}</span><strong>${esc(st.title)}</strong><span class="stage-count">${ts.length}</span><button class="stage-drag" title="Phase verschieben" aria-label="Phase verschieben">⠿</button><button class="stage-edit" data-entity-more="stage:${esc(st.id)}" title="Weitere Phasenaktionen" aria-haspopup="menu">${icon('more')}</button><button class="stage-edit" data-action="edit-stage" data-id="${esc(st.id)}" title="Phase bearbeiten">${icon('edit')}</button><button class="stage-edit delete-inline" data-action="delete-stage" data-id="${esc(st.id)}" title="Phase löschen" aria-label="Phase ${esc(st.title)} löschen">${icon('trash')}</button></div><div class="roadmap-stage-tasks" data-drop="stage:${esc(st.id)}">${ts.map(roadmapTaskRow).join('')}${btt(icon('plus')+'Aufgabe','add-task','roadmap-inline-add',`data-project-id="${esc(p.id)}" data-stage-id="${esc(st.id)}"`)}</div></section>`}).join(''):'<div class="roadmap-empty-stage">Noch keine Phasen</div>'}
 ${sort(tasks.filter(t=>!t.stageId)).length?`<div class="roadmap-unassigned"><small>OHNE PHASE</small>${sort(tasks.filter(t=>!t.stageId)).map(roadmapTaskRow).join('')}</div>`:''}</div>
 <div class="roadmap-area-footer">${btt(icon('plus')+'Phase','add-stage','btn mini',`data-project-id="${esc(p.id)}"`)}${btt(icon('plus')+'Aufgabe','add-task','btn mini',`data-project-id="${esc(p.id)}"`)}</div></article>`
}
function renderRoadmap(){
 const projects=visibleProjects();
 const selection=projects.find(p=>p.id===roadmapProjectId)||projects.find(p=>p.id===ui.project)||projects[0];
 if(selection)roadmapProjectId=selection.id;
 const current=selection?.id?getProject(selection.id):null;
 const tabs=`<div class="roadmap-view-switch" role="group" aria-label="Fahrplanansicht"><button type="button" data-action="roadmap-mode-all" class="${roadmapMode==='all'?'active':''}" aria-pressed="${roadmapMode==='all'}">${icon('grid')} Gesamtfahrplan</button><button type="button" data-action="roadmap-mode-single" class="${roadmapMode==='single'?'active':''}" aria-pressed="${roadmapMode==='single'}">${icon('layers')} Einzelbereich</button></div>`;
 const picker=roadmapMode==='single'&&projects.length?`<label class="roadmap-picker">Bereich <select id="roadmap-scope-project" class="field-select" aria-label="Bereich für Fahrplan">${projects.map(p=>`<option value="${esc(p.id)}" ${p.id===roadmapProjectId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>`:'';
 const actions=btt(icon('plus')+'Bereich','add-project','btn primary');
 $('#view').innerHTML=header('Fahrplan',roadmapMode==='all'?'GESAMTFAHRPLAN':'BEREICHSFAHRPLAN','',actions)+`<div class="roadmap-scope-bar">${tabs}${picker}</div>`+
 (roadmapMode==='all'?`<div class="spatial-heading-row roadmap-tools"><span>${projects.length} Bereiche · Bereiche und Phasen verschiebbar · Mausrad zum Blättern</span>${projects.length?`<div class="spatial-nav"><button data-action="rail-prev" data-target="roadmap-track" aria-label="Nach links scrollen">${icon('chevron')}</button><button data-action="rail-next" data-target="roadmap-track" aria-label="Nach rechts scrollen">${icon('chevron')}</button></div>`:''}</div>`+
 (projects.length?`<div class="roadmap-track" id="roadmap-track" tabindex="0" data-horizontal-rail="true" aria-label="Gesamtfahrplan horizontal durchblättern">${projects.map(roadmapArea).join('')}<button class="roadmap-new-area" data-action="add-project">${icon('plus')} Bereich hinzufügen</button></div>`:empty('Noch keine Bereiche','Bereich erstellen','add-project')):
 current?`<div class="roadmap-single-shell">${roadmapArea(current,projects.findIndex(p=>p.id===current.id),{single:true})}</div>`:empty('Noch keine Bereiche','Bereich erstellen','add-project'));
 requestAnimationFrame(()=>{const el=$('#roadmap-track');if(el)el.scrollLeft=roadmapRailX});
}
function classifyFile(d){const ext=d.name.toLowerCase().split('.').pop();return ['pdf'].includes(ext)?'pdf':['doc','docx','odt','rtf','txt','md'].includes(ext)?'word':['xls','xlsx','ods','csv'].includes(ext)?'sheet':['png','jpg','jpeg','gif','webp','svg','avif','bmp'].includes(ext)?'image':['mp3','wav','mp4','mov'].includes(ext)?'media':'other'}
let searchScope='all',searchFileType='all';
const FILE_KIND_LABEL={pdf:'PDF',word:'Word / Text',sheet:'Excel / Tabellen',image:'Bilder',media:'Audio / Video',other:'Sonstige'};
const FILE_KIND_TERMS={pdf:'pdf dokument dokumente',word:'word doc docx odt rtf txt md text dokument',sheet:'excel xls xlsx ods csv tabelle tabellen kalkulation',image:'bild bilder foto fotos picture png jpg jpeg gif svg webp bmp avif',media:'video audio mp3 mp4 wav mov musik film',other:'datei zip archiv sonstige'};
const cleanSearch=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de-DE').trim();
const fileIndexText=d=>{
 const p=getProject(d.projectId),t=getTask(d.taskId),kind=classifyFile(d);
 return cleanSearch([d.name, d.mime, d.name.split('.').pop(),FILE_KIND_LABEL[kind],FILE_KIND_TERMS[kind],p?.name,categoryFor(p)?.name,t?.title,(t?.tags||[]).join(' ')].join(' '));
};
function matchesFile(d,query='',kind='all'){
 if(kind!=='all'&&classifyFile(d)!==kind)return false;
 const q=cleanSearch(query);return !q||q.split(/\s+/).every(token=>fileIndexText(d).includes(token));
}
const fileIconName=kind=>({pdf:'file',word:'book-open',sheet:'chart',image:'image',media:'film',other:'archive'}[kind]||'file');
function fileOrb(d,i){const p=getProject(d.projectId),type=classifyFile(d),color=projectColor(p);return `<article class="file-orb-cell" style="--topic:${esc(color)};--drift:${(i%6-3)*.55}s"><a class="file-orb ${type}" href="${fileURL(d)}" target="_blank" rel="noopener" title="${esc(d.name)} öffnen"><span class="orb-swirl"></span><span class="orb-lines"></span><span class="orb-symbol">${icon(type==='sheet'?'chart':type==='image'?'paintbrush':type==='word'?'book-open':type==='media'?'gamepad':'file')}</span><span class="file-ext">${esc(d.name.split('.').pop().toUpperCase().slice(0,5))}</span></a><button data-project="${esc(p?.id||'')}" class="file-orb-project">${esc(p?.name||'')}</button><div class="file-orb-title" title="${esc(d.name)}">${esc(d.name)}</div><div class="file-orb-footer"><button type="button" data-annotate-file="${esc(d.id)}" title="Eigene Anmerkungsebene öffnen">✎</button><small>${esc(bytes(d.size))}</small><button data-action="delete-file" data-id="${esc(d.id)}" title="Datei löschen" aria-label="Datei löschen">${icon('trash')}</button></div></article>`}
function renderFiles(){
 const projects=visibleProjects(),visible=new Set(projects.map(p=>p.id));let docs=[...DB.documents].filter(d=>visible.has(d.projectId));
 if(ui.fileProject!=='all'&&projects.some(p=>p.id===ui.fileProject))docs=docs.filter(d=>d.projectId===ui.fileProject);else ui.fileProject='all';
 const available=docs.length,term=ui.fileQuery||'',kind=ui.fileType||'all';docs=docs.filter(d=>matchesFile(d,term,kind)).reverse();
 const options=projects.map(p=>`<option value="${esc(p.id)}" ${ui.fileProject===p.id?'selected':''}>${esc(p.name)}</option>`).join('');
 const kinds=`<option value="all">Alle Dateitypen</option>${Object.entries(FILE_KIND_LABEL).map(([key,label])=>`<option value="${key}" ${kind===key?'selected':''}>${esc(label)}</option>`).join('')}`;
 $('#view').innerHTML=header('Dateien','DATEI-HUB','',btt(icon('upload')+'Dateien hinzufügen','upload-files','btn primary'))+
 `<div class="file-hub-tools"><div class="file-search-controls"><label class="file-search-box">${icon('search')}<input id="file-query" type="search" autocomplete="off" placeholder="Dateiname, PDF, Bild, Aufgabe oder Bereich …" aria-label="Dateien suchen" value="${esc(term)}"></label><select id="file-kind-filter" class="field-select" aria-label="Dateityp filtern">${kinds}</select><select id="file-filter" class="field-select" aria-label="Bereich filtern"><option value="all">Alle Bereiche</option>${options}</select></div><span id="file-count">${docs.length} von ${available} Dateien</span></div>`+
 `<section class="file-universe"><div class="universe-mesh"></div>${docs.length?`<div class="file-orb-grid">${docs.map(fileOrb).join('')}<button class="file-orb-add" data-action="upload-files"><span>${icon('plus')}</span> Dateien hinzufügen</button></div>`:
 `<div class="file-universe-empty"><div class="empty-geometry">${spatialArt({icon:term||kind!=='all'?'search':'file',color:'#7ad9c4'},true)}</div><strong>${available?'Keine Treffer':'Keine Dateien vorhanden'}</strong>${term||kind!=='all'?'<button type="button" class="btn mini" data-action="clear-file-search">Filter zurücksetzen</button>':btt(icon('upload')+'Dateien hinzufügen','upload-files','btn')}</div>`}</section>`;
}
function noteCard(n){return `<article class="note-card"><div class="note-head"><strong>${esc(n.title||'Notiz')}</strong><button data-entity-more="note:${esc(n.id)}" aria-label="Weitere Notizaktionen" title="Weitere Aktionen" aria-haspopup="menu">${icon('more')}</button><button data-action="edit-note" data-id="${esc(n.id)}" title="Notiz bearbeiten">${icon('edit')}</button><button class="delete-inline" data-action="delete-note" data-id="${esc(n.id)}" title="Notiz löschen" aria-label="Notiz ${esc(n.title||'Notiz')} löschen">${icon('trash')}</button></div><p>${esc(n.body||'')}</p></article>`}
// A project's modules are layout only; all project data remains intact when hidden.
const TOPIC_MODULE_DEFAULTS=[
 {id:'topic-tasks',kind:'tasks',visible:true,wide:false,order:0},
 {id:'topic-notes',kind:'notes',visible:true,wide:false,order:1},
 {id:'topic-files',kind:'files',visible:true,wide:false,order:2},
 {id:'topic-roadmap',kind:'roadmap',visible:true,wide:true,order:3},
 {id:'topic-progress',kind:'progress',visible:false,wide:false,order:4},
 {id:'topic-info',kind:'info',visible:false,wide:false,order:5},
 {id:'topic-due',kind:'due',visible:false,wide:false,order:6}
];
const TOPIC_MODULE_LABELS={tasks:'Aufgaben',notes:'Notizen',files:'Dateien',roadmap:'Fahrplan',progress:'Fortschritt',info:'Bereichsinformationen',due:'Fällige Aufgaben',text:'Freier Text'};
function topicModuleList(project){
 const stored=Array.isArray(project?.modules)?project.modules:[];
 const found=new Set(),kinds=new Set(),clean=[];
 for(const m of stored){
  if(!m||typeof m.id!=='string'||found.has(m.id)||!TOPIC_MODULE_LABELS[m.kind]||m.kind!=='text'&&kinds.has(m.kind))continue;
  found.add(m.id);if(m.kind!=='text')kinds.add(m.kind);
  clean.push({...m,visible:m.visible===true,wide:m.wide===true,collapsed:m.collapsed===true,size:moduleSize(m.size)});
 }
 for(const m of TOPIC_MODULE_DEFAULTS)if(!kinds.has(m.kind))clean.push({...m,size:moduleSize(m.size),id:found.has(m.id)?'topic-default-'+m.kind:m.id,order:Math.max(0,...clean.map(w=>Number(w.order)||0))+1});
 return sort(clean);
}
function topicModulesForWrite(p){p.modules=topicModuleList(p).map(m=>({...m}));return p.modules}
function topicModuleContent(m,p,tasks,stages,docs,notes){
 switch(m.kind){
  case 'tasks': return `<section class="topic-detail-section"><header><h2>Aufgaben</h2><button class="btn mini" data-action="quick-add-topic-task" data-id="${esc(p.id)}">${icon('plus')} Hinzufügen</button></header>${tasks.length?sort(tasks).map(t=>`<div class="detail-task"><span class="status-mark" style="--status:${esc(t.color||getStatus(t.status).color)}">${icon(isDone(t)?'check':'circle')}</span><button data-task="${esc(t.id)}"><strong>${esc(t.title)}</strong><small>${esc(getStage(t.stageId)?.title||'Ohne Phase')}</small></button><span class="tag">${esc(getStatus(t.status).label)}</span><button class="delete-inline detail-delete" data-action="delete-task" data-id="${esc(t.id)}" title="Aufgabe löschen" aria-label="Aufgabe ${esc(t.title)} löschen">${icon('trash')}</button></div>`).join(''):'<p class="empty-line">Noch keine Aufgaben</p>'}<button class="detail-link" data-action="topic-roadmap" data-id="${esc(p.id)}">Fahrplan anzeigen ${icon('arrow')}</button></section>`;
  case 'notes': return `<section class="topic-detail-section"><header><h2>Notizen</h2><button class="btn mini" data-action="new-note" data-id="${esc(p.id)}">${icon('plus')} Notiz</button></header>${notes.length?notes.map(noteCard).join(''):'<p class="empty-line">Noch keine Notizen</p>'}</section>`;
  case 'files': return `<section class="topic-detail-section topic-files-section"><header><h2>Dateien <span class="topic-files-count">${docs.length}</span></h2><button class="btn mini" data-action="topic-upload" data-id="${esc(p.id)}">${icon('upload')} Hinzufügen</button></header>
 ${docs.length?`<div class="topic-file-tools"><label class="topic-file-search">${icon('search')}<input type="search" id="topic-file-search" placeholder="Dateien suchen …" aria-label="Dateien in diesem Bereich suchen" autocomplete="off"></label><select id="topic-file-type" class="field-select" aria-label="Dateityp in diesem Bereich filtern"><option value="all">Alle Typen</option>${Object.entries(FILE_KIND_LABEL).map(([kind,label])=>`<option value="${esc(kind)}">${esc(label)}</option>`).join('')}</select></div><p id="topic-file-counter" class="topic-file-counter">${docs.length} ${docs.length===1?'Datei':'Dateien'}</p><div class="topic-file-list">${[...docs].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).map(d=>{const kind=classifyFile(d);return `<article class="topic-file-entry" data-topic-file-type="${esc(kind)}" data-topic-file-search="${esc(cleanSearch([d.name,getTask(d.taskId)?.title||'',FILE_KIND_LABEL[kind]||''].join(' ')))}" data-file-id="${esc(d.id)}" tabindex="0"><span class="topic-file-type-icon">${icon(fileIconName(kind))}</span><div class="topic-file-description"><strong title="${esc(d.name)}">${esc(d.name)}</strong><small>${esc(FILE_KIND_LABEL[kind]||'Datei')} · ${esc(bytes(d.size))}${d.taskId?' · '+esc(getTask(d.taskId)?.title||'Aufgabe'):''}</small></div><div class="topic-file-actions"><a class="btn mini" href="${esc(fileURL(d))}" target="_blank" rel="noopener" aria-label="Datei ${esc(d.name)} öffnen">Öffnen</a><button type="button" class="icon-btn small" data-file-menu="${esc(d.id)}" title="Weitere Dateiaktionen" aria-label="Weitere Aktionen für ${esc(d.name)}">${icon('more')}</button></div></article>`}).join('')}</div><p id="topic-file-empty" class="empty-line" hidden>Keine passenden Dateien gefunden.</p>`:'<p class="empty-line">Noch keine Dateien</p>'}</section>`;
  case 'roadmap': return `<section class="topic-inline-roadmap" aria-label="Fahrplan dieses Bereichs"><div class="topic-inline-heading"><div><span class="eyebrow">BEREICHSFAHRPLAN</span><h2>Fahrplan · ${esc(p.name)}</h2></div><button type="button" class="btn mini" data-action="topic-roadmap" data-id="${esc(p.id)}">Im Fahrplan öffnen ${icon('arrow')}</button></div>${roadmapArea(p,0,{single:true})}</section>`;
  case 'progress': {const done=tasks.filter(isDone).length;const pct=tasks.length?Math.round(done/tasks.length*100):0;
   return `<section class="topic-detail-section topic-stats-section"><header><h2>Aufgabenfortschritt</h2></header><div class="topic-progress-stat"><strong>${pct}%</strong><span>${done} von ${tasks.length} Aufgaben abgeschlossen</span></div><div class="progress-track"><span style="width:${pct}%"></span></div></section>`;}
  case 'info': return `<section class="topic-detail-section"><header><h2>Informationen</h2></header><dl class="topic-info-list"><dt>Projekt</dt><dd>${esc(categoryFor(p)?.name||'Allgemein')}</dd><dt>Beschreibung</dt><dd>${esc(p.description||'Keine Beschreibung')}</dd><dt>Phasen</dt><dd>${stages.length}</dd><dt>Dateien</dt><dd>${docs.length}</dd><dt>Erstellt</dt><dd>${esc(p.createdAt?new Date(p.createdAt).toLocaleDateString('de-DE'):'—')}</dd></dl></section>`;
  case 'due': {const due=tasks.filter(t=>!isDone(t)&&t.dueDate).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,8);
   return `<section class="topic-detail-section topic-due-section"><header><h2>Fällige Aufgaben</h2><span class="topic-files-count">${due.length}</span></header>${due.length?due.map(t=>`<div class="detail-task"><span class="tag ${t.dueDate<today()?'warn':''}">${esc(shortDate(t.dueDate))}</span><button data-task="${esc(t.id)}"><strong>${esc(t.title)}</strong><small>${t.dueDate<today()?'Überfällig':'Fällig'} · ${esc(getStatus(t.status).label)}</small></button></div>`).join(''):'<p class="empty-line">Keine anstehenden Termine.</p>'}</section>`;}
  case 'text': return `<section class="topic-detail-section"><header><h2>${esc(m.title||'Freier Text')}</h2><button class="btn mini" type="button" data-action="topic-module-edit" data-id="${esc(m.id)}">${icon('edit')} Bearbeiten</button></header><p class="topic-custom-text">${esc(m.body||'Noch kein Text eingetragen.')}</p></section>`;
  default: return '';
 }
}
function renderTopicModule(m,p,tasks,stages,docs,notes){
 const label=m.title||TOPIC_MODULE_LABELS[m.kind]||'Modul',closed=m.collapsed===true;
 return `<section class="topic-module-card module-size-${moduleSize(m.size)} ${m.wide?'wide':''} ${closed?'is-collapsed':''}" data-drop="topicmodule:${esc(m.id)}" data-topic-module="${esc(m.id)}" aria-label="${esc(label)}">
 <div class="topic-module-toolbar module-header"><span class="topic-module-title">${esc(label)}</span><div class="topic-module-actions">
 <button type="button" class="module-drag-handle module-drag" draggable="true" data-drag="topicmodule:${esc(m.id)}" aria-label="${esc(label)} mit der Maus verschieben" title="Zum Verschieben ziehen">⠿</button>
 <button type="button" class="icon-btn small module-expand" data-action="topic-module-collapse" data-id="${esc(m.id)}" aria-expanded="${closed?'false':'true'}" aria-controls="topic-body-${esc(m.id)}" title="${closed?'Ausklappen':'Einklappen'}" aria-label="${esc(label)} ${closed?'ausklappen':'einklappen'}">${icon(closed?'down':'up')}</button>
 <button type="button" class="icon-btn small" data-action="topic-module-edit" data-id="${esc(m.id)}" title="Größe und Darstellung" aria-label="${esc(label)} Einstellungen">${icon('settings')}</button>
 </div></div><div class="module-collapsed-summary" ${closed?'':'hidden'}>Eingeklappt · Über den Pfeil wieder öffnen</div><div class="topic-module-body" id="topic-body-${esc(m.id)}" ${closed?'hidden':''}>${closed?'':topicModuleContent(m,p,tasks,stages,docs,notes)}</div></section>`;
}
function renderTopic(){
 const p=getProject(ui.project);if(!p){goto('home');return};const tasks=projectTasks(p.id),stages=sort(DB.stages.filter(s=>s.projectId===p.id)),docs=topicFiles(p.id),notes=topicNotes(p.id),color=projectColor(p);
 $('#view').innerHTML=`<div class="topic-back"><button data-nav="home">${icon('chevron')} Übersicht</button><span class="muted" id="pc-sync-project-state">${window.plannerSyncProjects?.has(p.categoryId)?'Gesamtprojekt: synchronisiert':'Gesamtprojekt: lokal'}</span><button class="btn mini" data-action="edit-category" data-id="${esc(p.categoryId)}">${icon('settings')} Projekt / Freigabe</button>${window.plannerSyncProjects?.has(p.categoryId)?`<button class="btn mini" data-action="pc-sync-now">${icon('refresh')} Abgleichen</button><button class="btn mini" data-action="pc-sync-details">Sync-Status</button>`:''}<button class="btn mini" data-action="edit-project" data-id="${esc(p.id)}">${icon('edit')} Bearbeiten</button><button class="btn mini delete-inline" data-action="delete-project" data-id="${esc(p.id)}">${icon('trash')} Bereich löschen</button></div>
 <section class="topic-detail-hero" style="--topic:${esc(color)}"><div class="detail-hero-copy"><span class="eyebrow">${esc(categoryFor(p)?.name||'BEREICH')}</span><h1>${esc(p.name)}</h1><p>${esc(p.description||'')}</p><div class="detail-pills"><span>${tasks.length} Aufgaben</span><span>${stages.length} Phasen</span><span>${docs.length} Dateien</span><span>${notes.length} Notizen</span></div></div>${spatialArt(p)}</section>
 <div class="topic-module-heading"><div><span class="eyebrow">DEIN BEREICH</span><h2>Module</h2></div><button class="btn mini" type="button" data-action="topic-modules" data-id="${esc(p.id)}">${icon('settings')} Module anpassen</button></div>
 <div class="topic-module-grid" id="topic-module-grid">${topicModuleList(p).filter(m=>m.visible).map(m=>renderTopicModule(m,p,tasks,stages,docs,notes)).join('')||`<div class="topic-modules-empty"><p>Alle Module ausgeblendet. Deine Aufgaben, Notizen und Dateien sind weiterhin gespeichert.</p><button type="button" class="btn mini" data-action="topic-modules" data-id="${esc(p.id)}">Module wieder einblenden</button></div>`}</div>`;
}
function render(){
 if(!DB)return;
 const categories=sort(DB.categories);
 $('#primary-nav').innerHTML=NAV.map(([key,label,glyph])=>`<button class="side-item ${ui.view===key?'active':''}" data-nav="${key}">${icon(glyph)}<span class="label">${label}</span></button>`).join('');
 $('#sidebar-categories').innerHTML=`<button class="side-item side-category ${ui.category==='all'?'active':''}" data-category="all">Alle Projekte <small class="side-count">${DB.categories.length}</small></button>`+categories.map(c=>`<div class="editable-category-row" draggable="true" data-drag="category:${esc(c.id)}" data-drop="category:${esc(c.id)}"><button type="button" class="side-item side-category ${ui.category===c.id?'active':''}" data-category="${esc(c.id)}" title="Projekt ${esc(c.name)} anzeigen"><span class="cat-dot" style="--cat:${esc(c.color)}">${icon(c.icon)}</span><span class="label">${esc(c.name)}</span>${window.plannerSyncProjects?.has(c.id)?`<span title="Projekt-Synchronisierung aktiv" aria-label="Synchronisiert">⇄</span>`:''}</button><button type="button" class="category-row-action" data-action="edit-category" data-id="${esc(c.id)}" title="Projekt bearbeiten" aria-label="Projekt ${esc(c.name)} bearbeiten">${icon('edit')}</button><button type="button" class="category-row-action category-row-delete" data-action="delete-category" data-id="${esc(c.id)}" title="Projekt löschen" aria-label="Projekt ${esc(c.name)} löschen">${icon('trash')}</button></div>`).join('');
 $('#settings-icon').innerHTML=icon('settings');$('#search-symbol').innerHTML=icon('search');$('#top-settings-icon').innerHTML=icon('settings');$('#search-dialog-symbol').innerHTML=icon('search');
 const viewTitle=ui.view==='topic'?getProject(ui.project)?.name||'Bereich':ui.view==='home'?'Übersicht':NAV.find(n=>n[0]===ui.view)?.[1]||'Einstellungen';
 $('#breadcrumb').innerHTML=`Project Planner ${icon('chevron','inline-icon')} <strong>${esc(viewTitle)}</strong>${ui.category!=='all'&&getCat(ui.category)?`<button type="button" class="btn mini" data-action="edit-category" data-id="${esc(ui.category)}">${icon('settings')} Projekt / Freigabe</button><span class="muted" id="pc-sync-project-state">${window.plannerSyncProjects?.has(ui.category)?'Sync: verbunden':'Nur lokal'}</span>${window.plannerSyncProjects?.has(ui.category)?`<button type="button" class="btn mini" data-action="pc-sync-now">${icon('refresh')} Abgleichen</button><button type="button" class="btn mini" data-action="pc-sync-details">Sync-Status / Konflikte</button>`:''}`:''}`;
 if(ui.view==='home')renderHome();else if(ui.view==='roadmap')renderRoadmap();else if(ui.view==='files')renderFiles();else if(ui.view==='topic')renderTopic();else if(ui.view==='tasks')renderTasks();else renderSettings();
}
function goto(view){if(!NAV.some(n=>n[0]===view)&&view!=='settings'&&view!=='topic')return;ui.view=view;ui.search='';render();window.scrollTo({top:0,behavior:'instant'});history.replaceState(null,'','#/'+view+(view==='topic'?'/'+ui.project:''))}
function selectProject(pid){if(!getProject(pid))return;ui.project=pid;goto('topic')}
function selectCategory(cid){ui.category=cid; if(ui.view!=='roadmap')ui.view='home'; render(); window.scrollTo({top:0,behavior:'instant'})}
function openProject(pid=''){
 const p=getProject(pid),cats=sort(DB.categories),chosenIcon=projectIcon(p),chosenColor=projectColor(p),customIcon=!!p?.icon,customColor=!!p?.color;
 dialog(p?'Bereich bearbeiten':'Bereich hinzufügen','',`<form id="project-form" data-edit="${esc(pid)}"><label class="form-field"><span>Name</span><input class="text-field" name="name" required maxlength="180" value="${esc(p?.name||'')}" placeholder="Name des Bereichs" autocomplete="off"></label><label class="form-field"><span>Projekt</span><select class="field-select" name="categoryId">${optionList(cats.map(c=>[c.id,c.name]),p?.categoryId||(ui.category==='all'?cats[0]?.id:ui.category))}</select></label><div class="form-field"><div class="picker-title"><span>3D-Symbol</span><button class="btn mini ghost" type="button" data-action="reset-project-icon">${icon('x')} Zurücksetzen</button></div>${iconFamilyPicker(chosenIcon,p?.icon||'')}<small class="picker-help">Ohne eigenes Symbol: <span data-project-inherit-icon>${customIcon?'Individuelles Symbol':'Projektsymbol'}</span></small></div><div class="form-field"><div class="picker-title"><span>Farbe</span><button class="btn mini ghost" type="button" data-action="reset-project-color">${icon('x')} Zurücksetzen</button></div><div class="color-row">${COLORS.map(color=>`<button type="button" data-color-choice="${color}" class="color-swatch ${color===chosenColor&&customColor?'active':''}" style="--swatch:${color}" title="${color}" aria-label="Farbe ${color}"></button>`).join('')}<input type="color" class="custom-color" name="colorPreview" value="${esc(chosenColor)}" title="Eigene Farbe wählen" aria-label="Eigene Farbe wählen"></div><small class="picker-help">Ohne eigene Farbe: <span data-project-inherit-color>${customColor?'Individuelle Farbe':'Projektfarbe'}</span></small></div><input type="hidden" name="icon" value="${esc(p?.icon||'')}"><input type="hidden" name="color" value="${esc(p?.color||'')}"><label class="form-field"><span>Beschreibung (optional)</span><textarea name="description" class="textarea" maxlength="10000" placeholder="">${esc(p?.description||'')}</textarea></label>${footer(p?'Speichern':'Bereich erstellen',p?'delete-project':'',pid)}</form>`);
}
function openNote(nid='',projectId=''){
 const n=(DB.notes||[]).find(x=>x.id===nid),pid=n?.projectId||projectId||ui.project;if(!getProject(pid))return;
 dialog(n?'Notiz bearbeiten':'Neue Notiz','',`<form id="note-form" data-edit="${esc(nid)}" data-project="${esc(pid)}"><label class="form-field"><span>Titel</span><input name="title" class="text-field" maxlength="160" required value="${esc(n?.title||'')}" placeholder="Titel"></label><label class="form-field"><span>Notiz</span><textarea name="body" class="textarea note-edit" maxlength="100000" placeholder="Text eingeben">${esc(n?.body||'')}</textarea></label>${footer(n?'Speichern':'Notiz erstellen',n?'delete-note':'',nid)}</form>`);
}
// New context actions are handled before the legacy bubbling click dispatcher.
document.addEventListener('click',async e=>{
 const a=e.target.closest('[data-action]');if(!a)return;
 const action=a.dataset.action,idValue=a.dataset.id;
 if(['rail-prev','rail-next'].includes(action)){
    e.preventDefault();e.stopPropagation();const track=$('#'+a.dataset.target);if(track)track.scrollBy({left:(action==='rail-next'?1:-1)*(track.querySelector('article')?.getBoundingClientRect().width||400)+ (action==='rail-next'?26:-26),behavior:'smooth'});return;
 }
 if(action==='roadmap-mode-all'||action==='roadmap-mode-single'){e.preventDefault();e.stopPropagation();roadmapMode=action==='roadmap-mode-all'?'all':'single';if(roadmapMode==='single'&&!getProject(roadmapProjectId))roadmapProjectId=visibleProjects()[0]?.id||'';renderRoadmap();return}
 if(action==='reset-project-icon'){e.preventDefault();e.stopPropagation();const form=$('#project-form');if(form){form.querySelector('[name=icon]').value='';form.querySelectorAll('[data-icon-choice]').forEach(btn=>{btn.classList.remove('active');btn.setAttribute('aria-pressed','false')});form.querySelector('[data-project-inherit-icon]').textContent='Projektsymbol';}return}
 if(action==='reset-project-color'){e.preventDefault();e.stopPropagation();const form=$('#project-form');if(form){form.querySelector('[name=color]').value='';form.querySelector('[name=colorPreview]').value=categoryFor(getProject(form.dataset.edit))?.color||getCat(form.querySelector('[name=categoryId]').value)?.color||COLORS[0];form.querySelectorAll('[data-color-choice]').forEach(btn=>btn.classList.remove('active'));form.querySelector('[data-project-inherit-color]').textContent='Projektfarbe';}return}
 if(action==='reset-category-style'){e.preventDefault();e.stopPropagation();const form=$('#category-form');if(form){form.querySelector('[name=icon]').value='layers';form.querySelector('[name=color]').value=COLORS[0];form.querySelectorAll('[data-icon-choice]').forEach(btn=>(btn.classList.toggle('active',btn.dataset.iconChoice==='layers'),btn.setAttribute('aria-pressed',String(btn.dataset.iconChoice==='layers'))));form.querySelectorAll('[data-color-choice]').forEach(btn=>btn.classList.toggle('active',btn.dataset.colorChoice===COLORS[0]));}return}
 if(action==='toggle-modules'){e.preventDefault();e.stopPropagation();topicModulesOpen=!topicModulesOpen;const x=$('#topic-track');if(x)topicRailX=x.scrollLeft;renderHome();return}
 if(action==='quick-add-topic-task'){e.preventDefault();e.stopPropagation();ui.project=idValue;openTask('',{projectId:idValue});return}
 if(action==='topic-upload'){e.preventDefault();e.stopPropagation();ui.fileProject=idValue;ui.project=idValue;openUpload();return}
 if(action==='topic-new-stage'){e.preventDefault();e.stopPropagation();ui.project=idValue;openStage();return}
 if(action==='topic-roadmap'){e.preventDefault();e.stopPropagation();ui.project=idValue;roadmapProjectId=idValue;roadmapMode='single';goto('roadmap');return}
 if(action==='new-note'){e.preventDefault();e.stopPropagation();openNote('',idValue);return}
 if(action==='edit-note'){e.preventDefault();e.stopPropagation();openNote(idValue);return}
 if(action==='note-search'){e.preventDefault();e.stopPropagation();openNote(idValue);return}
 if(action==='delete-note'){e.preventDefault();e.stopPropagation();const target=(DB.notes||[]).find(n=>n.id===idValue);if(!target||!await confirmDelete('Notiz „'+target.title+'“ in den Papierkorb verschieben?',a))return;mutate(()=>DB.notes=DB.notes.filter(n=>n.id!==idValue));if(modal.open)modal.close();toast('Notiz gelöscht.');return}
 if(action==='mark-doing'){e.preventDefault();e.stopPropagation();const t=getTask(idValue);if(t)mutate(()=>{t.status=t.status==='doing'?'open':(DB.statuses.some(s=>s.id==='doing')?'doing':DB.statuses[0].id);t.updatedAt=new Date().toISOString()});return}
 if(['add-stage','add-task'].includes(action)&&a.dataset.projectId){ui.project=a.dataset.projectId}
},true);
// Extend the project form and add free-form notes, while preserving the previous API and backups.
document.addEventListener('submit',async e=>{
 const form=e.target;if(form.id!=='project-form'&&form.id!=='note-form')return;
 e.preventDefault();e.stopImmediatePropagation();const data=new FormData(form);const v=key=>String(data.get(key)||'').trim();
 if(form.id==='project-form'){
   const old=getProject(form.dataset.edit),fields={name:v('name'),categoryId:v('categoryId'),description:v('description'),icon:v('icon'),color:v('color')};
   if(!fields.name||!getCat(fields.categoryId)){toast('Name und Projekt auswählen.');return}
   if(old){mutate(()=>Object.assign(old,fields))}
   else {const areaId=id();mutate(()=>DB.projects.push({id:areaId,...fields,order:DB.projects.length,createdAt:new Date().toISOString()}));ui.project=areaId}
   modal.close();toast('Bereich gespeichert.');return;
 }
 if(form.id==='note-form'){
   const old=(DB.notes||[]).find(n=>n.id===form.dataset.edit),fields={title:v('title'),body:v('body'),updatedAt:new Date().toISOString()};
   if(!fields.title){toast('Titel fehlt.');return}
   if(old)mutate(()=>Object.assign(old,fields));else mutate(()=>{DB.notes??=[];DB.notes.push({id:id(),projectId:form.dataset.project,taskId:'',...fields,order:DB.notes.length})});
   modal.close();toast('Notiz gespeichert.');
 }
},true);
// Accessible expanding icon families, shared by categories and project areas.
document.addEventListener('click',e=>{
 const toggle=e.target.closest('[data-icon-family-toggle]');
 if(toggle){e.preventDefault();e.stopImmediatePropagation();const expanded=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!expanded));document.getElementById('family-'+toggle.dataset.iconFamilyToggle).hidden=expanded;return;}
 const pick=e.target.closest('[data-icon-choice],[data-color-choice]');if(!pick)return;
 const form=pick.closest('#project-form,#category-form');if(!form)return;
 if(pick.dataset.iconChoice){e.preventDefault();e.stopImmediatePropagation();form.querySelector('[name=icon]').value=pick.dataset.iconChoice;form.querySelectorAll('[data-icon-choice]').forEach(btn=>{const active=btn===pick;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active))});if(form.id==='project-form')form.querySelector('[data-project-inherit-icon]').textContent='Individuelles Symbol';return;}
 if(pick.dataset.colorChoice&&form.id==='project-form'){e.preventDefault();e.stopImmediatePropagation();form.querySelector('[name=color]').value=pick.dataset.colorChoice;form.querySelector('[name=colorPreview]').value=pick.dataset.colorChoice;form.querySelectorAll('[data-color-choice]').forEach(el=>el.classList.toggle('active',el===pick));form.querySelector('[data-project-inherit-color]').textContent='Individuelle Farbe';}
},true);
document.addEventListener('input',e=>{if(e.target.matches('#project-form [name=colorPreview]')){const form=$('#project-form');form.querySelector('[name=color]').value=e.target.value;form.querySelectorAll('[data-color-choice]').forEach(btn=>btn.classList.toggle('active',btn.dataset.colorChoice.toLowerCase()===e.target.value.toLowerCase()));form.querySelector('[data-project-inherit-color]').textContent='Individuelle Farbe'}},true);
document.addEventListener('change',e=>{if(e.target.id==='roadmap-scope-project'){roadmapProjectId=e.target.value;ui.project=e.target.value;renderRoadmap();return}if(e.target.matches('#project-form [name=categoryId]')){const f=$('#project-form');if(f&&!f.querySelector('[name=color]').value){f.querySelector('[name=colorPreview]').value=getCat(e.target.value)?.color||COLORS[0]}}},true);
document.addEventListener('click',e=>{
 const scope=e.target.closest('[data-search-scope]');if(scope){e.preventDefault();e.stopImmediatePropagation();searchScope=scope.dataset.searchScope;updateSearch();return;}
 const clear=e.target.closest('[data-action="clear-file-search"]');if(clear){e.preventDefault();e.stopImmediatePropagation();ui.fileQuery='';ui.fileType='all';renderFiles();$('#file-query')?.focus();}
},true);
document.addEventListener('change',e=>{if(e.target.id==='file-kind-filter'){ui.fileType=e.target.value;renderFiles()}if(e.target.id==='search-file-type'){searchFileType=e.target.value;updateSearch()}},true);
document.addEventListener('input',e=>{if(e.target.id==='file-query'){const start=e.target.selectionStart;ui.fileQuery=e.target.value;renderFiles();const next=$('#file-query');next?.focus();next?.setSelectionRange(start,start)}},true);
// Preserve scroll offset across normal state updates, including drag reorder.
const previousMutate=mutate;
mutate=function(fn){topicRailX=$('#topic-track')?.scrollLeft??topicRailX;roadmapRailX=$('#roadmap-track')?.scrollLeft??roadmapRailX;return previousMutate(fn)};
function updateSearch(){
 const field=$('#quick-search-input');if(!field)return;
 const q=cleanSearch(field.value),terms=q?q.split(/\s+/):[];let hits=[];
 const match=values=>terms.every(term=>cleanSearch(values.join(' ')).includes(term));
 if(searchScope==='all'||searchScope==='project')for(const p of DB.projects)if(match([p.name,p.description,categoryFor(p)?.name]))hits.push({type:'project',id:p.id,title:p.name,sub:'Bereich · '+(categoryFor(p)?.name||'')});
 if(searchScope==='all'||searchScope==='task')for(const t of DB.tasks)if(match([t.title,t.description,(t.tags||[]).join(' '),getProject(t.projectId)?.name]))hits.push({type:'task',id:t.id,title:t.title,sub:'Aufgabe · '+(getProject(t.projectId)?.name||'')});
 if(searchScope==='all'||searchScope==='file')for(const d of DB.documents)if(matchesFile(d,q,searchFileType))hits.push({type:'file',id:d.id,title:d.name,sub:FILE_KIND_LABEL[classifyFile(d)]+' · '+(getProject(d.projectId)?.name||'')+(d.taskId?' · '+(getTask(d.taskId)?.title||''):'')});
 if(searchScope==='all'||searchScope==='note')for(const n of (DB.notes||[]))if(!n.title?.startsWith('PP-OVERLAY-V1:')&&match([n.title,n.body,getProject(n.projectId)?.name]))hits.push({type:'note',id:n.id,title:n.title,sub:'Notiz · '+(getProject(n.projectId)?.name||'')});
 const select=$('#search-file-type');if(select)select.hidden=searchScope!=='file';
 document.querySelectorAll('[data-search-scope]').forEach(btn=>{const active=btn.dataset.searchScope===searchScope;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active))});
 $('#quick-search-results').innerHTML=`<div class="search-results"><div class="search-count">${hits.length} Treffer${hits.length>70?' · erste 70 angezeigt':''}</div>${hits.slice(0,70).map(h=>`<button class="search-hit" data-search-type="${h.type}" data-search-id="${esc(h.id)}">${icon(h.type==='project'?'folder':h.type==='file'?fileIconName(classifyFile(DB.documents.find(d=>d.id===h.id))):h.type==='note'?'book-open':'check')}<span class="search-text"><strong>${esc(h.title)}</strong><small>${esc(h.sub)}</small></span>${icon('chevron')}</button>`).join('')||'<div class="empty">Keine Ergebnisse.</div>'}</div>`;
}
// Capture note results before the legacy search route treats unknown result types as files.
document.addEventListener('click',e=>{const hit=e.target.closest('[data-search-type="note"]');if(!hit)return;e.preventDefault();e.stopImmediatePropagation();searchModal.close();const note=(DB.notes||[]).find(n=>n.id===hit.dataset.searchId);if(note){ui.project=note.projectId;goto('topic');openNote(note.id)}},true);
function moveProject(p1,p2){if(!getProject(p1)||!getProject(p2)||p1===p2)return;mutate(()=>moveInList(DB.projects,p1,p2))}
document.addEventListener('drop',e=>{
 const target=e.target.closest('[data-drop^="project:"],[data-drop^="task:"]');
 const item=e.dataTransfer?.getData('text/plain')||dragged;
 if(target?.dataset.drop.startsWith('task:')&&item?.startsWith('task:')){
   e.preventDefault();e.stopImmediatePropagation();const source=getTask(item.slice(5)),other=getTask(target.dataset.drop.slice(5));
   if(source&&other&&source.id!==other.id&&source.projectId===other.projectId){
     mutate(()=>{source.stageId=other.stageId;moveInList(DB.tasks.filter(t=>t.projectId===other.projectId&&t.stageId===other.stageId),source.id,other.id)})
   }
   dragged=null;return;
 }
 if(target&&item?.startsWith('project:')){e.preventDefault();e.stopImmediatePropagation();const source=item.slice(8),dest=target.dataset.drop.slice(8);target.classList.remove('drag-over');moveProject(source,dest);dragged=null}
},true);
// Native drag events must allow the project card as a drop target.
document.addEventListener('dragover',e=>{const target=e.target.closest('[data-drop^="project:"],[data-drop^="task:"]');if(target&&(e.dataTransfer?.types.includes('text/plain'))){e.preventDefault();target.classList.add('drag-over')}},true);
// Route deep links and scrolling after startup.
window.addEventListener('hashchange',()=>{const parts=location.hash.slice(2).split('/');if(parts[0]==='topic'&&getProject(parts[1])){ui.project=parts[1];goto('topic')}});
// Horizontal mouse wheel / trackpad. No CSS snap during free navigation.
// Capture allows this to work while hovering card children and decorative overlays.
document.addEventListener('wheel',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey)return; // preserve browser zoom and system actions
 const rail=e.target.closest?.('[data-horizontal-rail]')||document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-horizontal-rail]');
 if(!rail||rail.scrollWidth<=rail.clientWidth+1)return;
 if(e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 // DeltaMode: 0 pixels, 1 lines, 2 pages; mouse and trackpad both supported.
 const scale=e.deltaMode===1?22:e.deltaMode===2?Math.max(240,rail.clientWidth*.8):1;
 const dominant=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
 const delta=dominant*scale;if(Math.abs(delta)<.1)return;
 const max=rail.scrollWidth-rail.clientWidth;
 const next=Math.min(max,Math.max(0,rail.scrollLeft+delta));
 if(Math.abs(next-rail.scrollLeft)<.2)return; // natural page scroll at either end
 if(e.cancelable)e.preventDefault();
 rail.scrollLeft=next;
 if(rail.id==='topic-track')topicRailX=rail.scrollLeft;
 if(rail.id==='roadmap-track')roadmapRailX=rail.scrollLeft;
},{capture:true,passive:false});
document.addEventListener('scroll',e=>{if(e.target?.id==='topic-track')topicRailX=e.target.scrollLeft;if(e.target?.id==='roadmap-track')roadmapRailX=e.target.scrollLeft},true);


// Entire overview card opens the area, except its independent action buttons.
// Ignore the click emitted after a drag/reorder; do not alter the existing drag handlers.
let topicCardDragEndAt = 0;
document.addEventListener('dragend', e => { if (e.target.closest('[data-topic-card]')) topicCardDragEndAt = Date.now(); }, true);
document.addEventListener('click', e => {
 const card=e.target.closest('[data-topic-card]');
 if(!card || ui.view!=='home' || Date.now()-topicCardDragEndAt<250)return;
 if(e.target.closest('button,a,input,select,textarea,label,[contenteditable],[data-action],[data-task],[data-entity-more],[data-drag]'))return;
 e.preventDefault();selectProject(card.dataset.topicCard);
});
document.addEventListener('keydown', e => {
 const card=e.target.closest('[data-topic-card]');
 if(!card || e.target!==card || ui.view!=='home' || !['Enter',' '].includes(e.key))return;
 e.preventDefault();selectProject(card.dataset.topicCard);
});

function updateTopicFileFilter(){
 const search=cleanSearch(document.querySelector('#topic-file-search')?.value||'');
 const kind=document.querySelector('#topic-file-type')?.value||'all';
 let shown=0;
 document.querySelectorAll('.topic-file-entry').forEach(row=>{
  const matches=(kind==='all'||row.dataset.topicFileType===kind)&&(!search||search.split(/\s+/).every(token=>row.dataset.topicFileSearch.includes(token)));
  row.hidden=!matches;if(matches)shown++;
 });
 const empty=document.querySelector('#topic-file-empty');if(empty)empty.hidden=shown>0;
 const counter=document.querySelector('#topic-file-counter');if(counter)counter.textContent=shown+' von '+document.querySelectorAll('.topic-file-entry').length+' Dateien';
}
document.addEventListener('input', e=>{if(e.target.id==='topic-file-search')updateTopicFileFilter();},true);
document.addEventListener('change',e=>{if(e.target.id==='topic-file-type')updateTopicFileFilter();},true);


// 3.6.2 Bereichsmodule: visibility/width/order are persisted per project.
function openTopicModules(pid=ui.project){
 const p=getProject(pid);if(!p)return;
 const modules=topicModuleList(p);
 dialog('Module · '+p.name,'Für diesen Bereich Position, Breite, Höhe und Sichtbarkeit bestimmen.',`<div class="topic-module-config" data-topic-config="${esc(pid)}"><p class="topic-config-hint">Ausblenden und Einklappen löschen keine Inhalte. Zum Sortieren die Position wählen oder den Griff ziehen.</p><div class="topic-config-list module-config-list">${modules.map(m=>`<div class="topic-config-row module-config-row" data-drop="topicmodule:${esc(m.id)}"><button type="button" class="topic-config-drag module-drag" draggable="true" data-drag="topicmodule:${esc(m.id)}" title="Zum Verschieben ziehen" aria-label="${esc(m.title||TOPIC_MODULE_LABELS[m.kind])} ziehen">⠿</button><div class="topic-config-label module-config-name"><strong>${esc(m.title||TOPIC_MODULE_LABELS[m.kind])}</strong><small>${esc(TOPIC_MODULE_LABELS[m.kind])}</small></div><label class="module-config-control">Position<select class="field-select module-pos-select" data-topic-module-position="${esc(m.id)}" aria-label="Position von ${esc(m.title||TOPIC_MODULE_LABELS[m.kind])}">${modules.map((x,i)=>`<option value="${i}" ${x.id===m.id?'selected':''}>${i+1} · ${esc(x.title||TOPIC_MODULE_LABELS[x.kind])}</option>`).join('')}</select></label><label class="module-config-control">Höhe<select class="field-select module-size-select" data-topic-module-size="${esc(m.id)}">${optionList(MODULE_SIZE_OPTIONS,moduleSize(m.size))}</select></label><label class="module-config-control">Breite<select class="field-select module-width-select" data-topic-module-width="${esc(m.id)}"><option value="half" ${m.wide?'':'selected'}>Halb</option><option value="full" ${m.wide?'selected':''}>Voll</option></select></label><label class="module-config-check">Sichtbar<input type="checkbox" data-topic-module-visible="${esc(m.id)}" ${m.visible?'checked':''}></label><button type="button" class="icon-btn small" data-action="topic-module-edit" data-id="${esc(m.id)}" title="Titel und Inhalt bearbeiten" aria-label="${esc(m.title||TOPIC_MODULE_LABELS[m.kind])} bearbeiten">${icon('edit')}</button></div>`).join('')}</div><div class="modal-footer topic-config-footer"><button type="button" class="btn mini" data-action="topic-module-add">${icon('plus')} Freien Text hinzufügen</button><button type="button" class="btn mini ghost" data-action="topic-module-reset">Standardanordnung</button><button type="button" class="btn" data-action="close-modal">Schließen</button></div></div>`);
}
function editTopicModule(mid){const p=getProject(ui.project);if(!p)return;const m=topicModuleList(p).find(x=>x.id===mid);if(!m)return;
 if(modal.open)modal.close();
 dialog('Modul bearbeiten','Name und Darstellung nur für diesen Bereich ändern.',`<form id="topic-module-form" data-edit="${esc(mid)}" data-project="${esc(p.id)}"><label class="form-field"><span>Titel (optional)</span><input class="text-field" name="title" value="${esc(m.title||'')}" maxlength="120" placeholder="${esc(TOPIC_MODULE_LABELS[m.kind])}"></label>${m.kind==='text'?`<label class="form-field"><span>Freier Text</span><textarea class="textarea" name="body" maxlength="20000" rows="8">${esc(m.body||'')}</textarea></label>`:''}<label class="setting-toggle"><input type="checkbox" name="visible" ${m.visible?'checked':''}> Sichtbar</label><label class="form-field"><span>Modulhöhe</span><select class="field-select" name="size">${optionList(MODULE_SIZE_OPTIONS,moduleSize(m.size))}</select></label><label class="setting-toggle"><input type="checkbox" name="wide" ${m.wide?'checked':''}> Breites Modul</label><div class="modal-footer"><button type="button" class="btn ghost" data-action="topic-modules" data-id="${esc(p.id)}">Zurück zur Anordnung</button><button type="submit" class="btn primary">Speichern</button></div></form>`);
}
function topicModuleMutate(fn,refresh=false){const p=getProject(ui.project);if(!p)return;mutate(()=>fn(topicModulesForWrite(p)));if(refresh&&modal.open){modal.close();openTopicModules(p.id)}}
function topicModuleMove(source,target){if(source===target)return;const p=getProject(ui.project);if(!p)return;const list=topicModuleList(p);if(!list.some(m=>m.id===source)||!list.some(m=>m.id===target))return;
 topicModuleMutate(modules=>moveInList(modules,source,target),!!modal.open&&!!modal.querySelector('[data-topic-config]'));
}
document.addEventListener('click', e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const name=b.dataset.action;
 if(!['topic-modules','topic-module-add','topic-module-up','topic-module-down','topic-module-edit','topic-module-reset','topic-module-collapse','topic-module-left','topic-module-right'].includes(name))return;
 e.preventDefault();e.stopPropagation();
 if(name==='topic-modules'){if(modal.open)modal.close();openTopicModules(b.dataset.id||ui.project);return}
 if(name==='topic-module-collapse'){
  topicModuleMutate(modules=>{const m=modules.find(x=>x.id===b.dataset.id);if(m)m.collapsed=!m.collapsed});return;
 }
 if(name==='topic-module-left'||name==='topic-module-right'){
  const list=topicModuleList(getProject(ui.project)).filter(m=>m.visible);
  const i=list.findIndex(m=>m.id===b.dataset.id),j=i+(name==='topic-module-left'?-1:1);
  if(i>=0&&j>=0&&j<list.length)topicModuleMove(list[i].id,list[j].id);return;
 }
 if(name==='topic-module-edit'){editTopicModule(b.dataset.id);return}
 if(name==='topic-module-add'){
  const p=getProject(ui.project);if(!p)return;const current=topicModuleList(p);if(current.length>=16||current.filter(m=>m.kind==='text').length>=8){toast('Maximal acht freie Textmodule bzw. insgesamt 16 Module pro Bereich.');return}
  const mid=id();topicModuleMutate(modules=>modules.push({id:mid,kind:'text',title:'Freier Text',body:'',visible:true,wide:false,order:Math.max(0,...modules.map(m=>m.order))+1}));editTopicModule(mid);return;
 }
 if(name==='topic-module-reset'){
  if(!window.confirm('Standardgröße und Reihenfolge wiederherstellen? Freie Textmodule bleiben bestehen.'))return;
  topicModuleMutate(modules=>{
   const customs=sort(modules.filter(m=>m.kind==='text'));
   const standard=TOPIC_MODULE_DEFAULTS.map(m=>({...m}));
   modules.splice(0,modules.length,...standard,...customs.map((m,i)=>({...m,order:standard.length+i})));
  },true);return;
 }
 if(name==='topic-module-up'||name==='topic-module-down'){
  const p=getProject(ui.project),list=topicModuleList(p);if(!p)return;
  const i=list.findIndex(m=>m.id===b.dataset.id),j=i+(name==='topic-module-up'?-1:1);
  if(i>=0&&j>=0&&j<list.length)topicModuleMove(list[i].id,list[j].id);
 }
},true);
document.addEventListener('change',e=>{
 const t=e.target;
 if(t.dataset.topicModulePosition!==undefined){const p=getProject(ui.project);if(!p)return;const list=topicModuleList(p),from=list.find(x=>x.id===t.dataset.topicModulePosition),dest=list[Number(t.value)];if(from&&dest&&from.id!==dest.id)topicModuleMove(from.id,dest.id);return}
 if(t.dataset.topicModuleSize){const mid=t.dataset.topicModuleSize;topicModuleMutate(modules=>{const m=modules.find(x=>x.id===mid);if(m)m.size=moduleSize(t.value)});return}
 if(t.dataset.topicModuleWidth){const mid=t.dataset.topicModuleWidth;topicModuleMutate(modules=>{const m=modules.find(x=>x.id===mid);if(m)m.wide=t.value==='full'});return}
 if(t.dataset.topicModuleVisible){const mid=t.dataset.topicModuleVisible;topicModuleMutate(modules=>{const m=modules.find(x=>x.id===mid);if(m)m.visible=t.checked});return}
 if(t.dataset.topicModuleWide){const mid=t.dataset.topicModuleWide;topicModuleMutate(modules=>{const m=modules.find(x=>x.id===mid);if(m)m.wide=t.checked});return}
},true);
document.addEventListener('submit',e=>{
 if(e.target.id!=='topic-module-form')return;
 e.preventDefault();e.stopPropagation();const form=e.target,p=getProject(form.dataset.project);
 if(!p)return;const fd=new FormData(form);
 const title=String(fd.get('title')||'').trim(),body=String(fd.get('body')||'');
 // Go validates UTF-8 bytes (not JavaScript UTF-16 code units).
 if(new TextEncoder().encode(title).length>120 || new TextEncoder().encode(body).length>20000){toast('Modultitel oder Text ist zu lang (maximal 120 bzw. 20.000 UTF-8-Bytes).');return}
 topicModuleMutate(modules=>{const m=modules.find(x=>x.id===form.dataset.edit);if(!m)return;m.title=String(fd.get('title')||'').trim().slice(0,120);if(m.kind==='text')m.body=String(fd.get('body')||'').slice(0,20000);m.visible=fd.has('visible');m.wide=fd.has('wide');m.size=moduleSize(fd.get('size'))});
 modal.close();openTopicModules(p.id);toast('Modul gespeichert.');
},true);
// Run in capture phase: the legacy generic drop listener must not consume a
// project-module reorder. The list is scoped to the active project, not global.
document.addEventListener('drop',e=>{
 const dest=e.target.closest('[data-drop^="topicmodule:"]');if(!dest)return;
 const raw=e.dataTransfer?.getData('text/plain')||dragged||'';
 if(!raw.startsWith('topicmodule:'))return;
 e.preventDefault();e.stopPropagation();topicModuleMove(raw.slice('topicmodule:'.length),dest.dataset.drop.slice('topicmodule:'.length));dragged=null;
},true);
