'use strict';
/* Project Planner: non-destructive image annotation, shared by desktop/PWA.
   The original attachment bytes are NEVER POSTed or modified. Only vector
   overlay metadata is stored separately; PNG export is a new local file. */
(function(){
 const NOTE_PREFIX='PP-OVERLAY-V1:';
 const MAX_JSON=48000, MAX_ITEMS=300, MAX_POINTS=12000;
 const $=id=>document.getElementById(id);
 const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
 const noteId=docId=>'anno_'+docId;
 const isOverlayNote=n=>typeof n?.title==='string'&&n.title.startsWith(NOTE_PREFIX);
 const supported=doc=>/\.(png|jpe?g|webp)$/i.test(String(doc?.name||'')) || /^(image\/png|image\/jpeg|image\/webp)$/i.test(String(doc?.mime||''));
 const blank=doc=>({v:1,documentId:doc.id,sha256:doc.sha256||'',items:[]});
 function safeOverlay(raw,doc){
  try{
   if(typeof raw==='string'&&raw.length>MAX_JSON)return null;
   const o=typeof raw==='string'?JSON.parse(raw):raw;
   if(!o||o.v!==1||o.documentId!==doc.id||!Array.isArray(o.items)||o.items.length>MAX_ITEMS)return null;
   if(doc.sha256&&o.sha256?.toLowerCase()!==doc.sha256.toLowerCase())return null;
   let points=0;
   for(const item of o.items){
    if(!['stroke','text'].includes(item.type)||!/^#[0-9a-f]{6}$/i.test(item.color||'')||!Number.isFinite(item.size)||item.size<1||item.size>45)return null;
    if(item.type==='stroke'){
     if(!Array.isArray(item.points)||item.points.length>4000)return null;points+=item.points.length;
     if(!item.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&v>=0&&v<=1)))return null;
    } else if(typeof item.text!=='string'||item.text.length>200||!Number.isFinite(item.x)||!Number.isFinite(item.y)||item.x<0||item.x>1||item.y<0||item.y>1)return null;
   }
   if(points>MAX_POINTS)return null;
   return typeof structuredClone==='function'?structuredClone(o):JSON.parse(JSON.stringify(o));
  }catch{return null}
 }
 function makeUI(){
  let dialog=$('pp-overlay-dialog');if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.id='pp-overlay-dialog';dialog.className='pp-overlay-dialog';
  dialog.setAttribute('aria-label','Anmerkungsebene über Datei');
  dialog.innerHTML=`<div class="pp-overlay-top"><div><small>PROJECT PLANNER · ANMERKUNGSEBENE</small><strong id="pp-overlay-filename"></strong></div><button type="button" data-overlay="close">Schließen ✕</button></div>
   <div class="pp-overlay-tools" role="toolbar" aria-label="Anmerkungswerkzeuge">
    <button type="button" data-overlay="pen" aria-pressed="true">✎ Nur Stift</button><button type="button" data-overlay="finger" aria-pressed="false">☝ Finger zeichnen</button>
    <button type="button" data-overlay="text" aria-pressed="false">T Text</button>
    <button type="button" data-overlay="hand" aria-pressed="false">☝ Hand</button>
    <label>Farbe <input id="pp-overlay-color" type="color" value="#111111" aria-label="Stiftfarbe"></label>
    <label>Breite <input id="pp-overlay-width" type="range" min="1" max="20" value="3" aria-label="Strichstärke"></label>
    <button type="button" data-overlay="undo">↶ Rückgängig</button><button type="button" data-overlay="redo">↷ Wiederholen</button>
    <button type="button" data-overlay="save">Ebene speichern</button>
    <button type="button" data-overlay="export">Bild + Ebene als PNG</button>
   </div><p class="pp-overlay-feedback" id="pp-overlay-feedback" role="status" aria-live="polite">Originaldatei bleibt unverändert.</p>
   <div class="pp-overlay-scroll"><div class="pp-overlay-sheet" id="pp-overlay-sheet"><img id="pp-overlay-image" alt="Unveränderte Originaldatei"><canvas id="pp-overlay-canvas" aria-label="Zeichnen und Anmerkungen auf der transparenten Ebene"></canvas></div></div>
   <p class="pp-overlay-help">Striche und Texte sind einzeln editierbare Elemente der Anmerkungsebene. „PNG“ exportiert eine <strong>neue</strong> kombinierte Datei – niemals das Original. Für PDFs ist ein separater Seitenrenderer erforderlich.</p>`;
  document.body.append(dialog);
  return dialog;
 }
 let active=null;
 function feedback(t){const el=$('pp-overlay-feedback');if(el)el.textContent=t}
 function paint(ctx,items,w,h){
  for(const item of items){
   const color=item.color||'#111111';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineCap='round';ctx.lineJoin='round';
   if(item.type==='stroke'){
    const pts=item.points||[];if(!pts.length)continue;ctx.lineWidth=(item.size||3)*w/1000;
    ctx.beginPath();ctx.moveTo(pts[0][0]*w,pts[0][1]*h);
    if(pts.length===1){ctx.lineTo(pts[0][0]*w+.01,pts[0][1]*h+.01)}
    else for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0]*w,pts[i][1]*h);
    ctx.stroke();
   } else if(item.type==='text'){
    ctx.font=`${Math.max(10,Math.round((item.size||18)*w/1000))}px system-ui, sans-serif`;
    ctx.textBaseline='top';ctx.fillText(item.text||'',item.x*w,item.y*h,w*(1-item.x));
   }
  }
 }
 function refresh(){
  if(!active)return;
  const cv=$('pp-overlay-canvas');if(!cv)return;
  const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);
  paint(ctx,active.overlay.items,cv.width,cv.height);
  if(active.ongoing)paint(ctx,[active.ongoing],cv.width,cv.height);
 }
 function point(e){const rect=$('pp-overlay-canvas').getBoundingClientRect();if(!rect.width||!rect.height)return [0,0];return [Math.round(clamp((e.clientX-rect.left)/rect.width,0,1)*10000)/10000,Math.round(clamp((e.clientY-rect.top)/rect.height,0,1)*10000)/10000]}
 function markDirty(){if(!active)return;active.dirty=true;feedback('Änderung noch nicht auf dem PC gespeichert · Original unverändert');
  const current=active;clearTimeout(current.draftTimer);
  current.draftTimer=setTimeout(()=>{if(active===current&&current.saveDraft)current.saveDraft(current.overlay).catch(()=>feedback('Offline-Entwurf konnte nicht gesichert werden – bitte erneut versuchen.'))},250);
 }
 function setMode(mode){if(!active)return;active.mode=mode;
  document.querySelectorAll('#pp-overlay-dialog [data-overlay="pen"],#pp-overlay-dialog [data-overlay="finger"],#pp-overlay-dialog [data-overlay="text"],#pp-overlay-dialog [data-overlay="hand"]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.overlay===mode)));
  $('pp-overlay-canvas').style.touchAction=mode==='hand'?'auto':'none';$('pp-overlay-canvas').style.pointerEvents=mode==='hand'?'none':'auto';
 }
 async function save(){
  const a=active;if(!a)return;
  const source=JSON.stringify(a.overlay);
  if(source.length>MAX_JSON)throw Error('Anmerkungsebene zu groß. Bitte einzelne Schritte rückgängig machen (max. 48.000 Zeichen).');
  if(a.overlay.items.length>MAX_ITEMS)throw Error('Maximal 300 Anmerkungselemente.');
  await a.save(source);
  if(active===a){a.dirty=false;feedback('Anmerkungsebene gespeichert bzw. zur PC-Synchronisierung vorgemerkt · Originaldatei unverändert.');if(a.clearDraft)await a.clearDraft()}
 }
 async function exportPNG(){
  const a=active;if(!a||!a.image.complete)throw Error('Bild noch nicht geladen.');
  const maxDim=3000,scale=Math.min(1,maxDim/Math.max(a.image.naturalWidth,a.image.naturalHeight));
  const w=Math.max(1,Math.round(a.image.naturalWidth*scale)),h=Math.max(1,Math.round(a.image.naturalHeight*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(a.image,0,0,w,h);paint(ctx,a.overlay.items,w,h);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG-Export fehlgeschlagen')),'image/png'));
  const filename=String(a.doc.name||'Datei').replace(/\.[^.]+$/,'')+'_mit_Anmerkungen.png';
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.rel='noopener';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  feedback('Zusammengeführtes PNG erzeugt. Original und editierbare Ebene bleiben unverändert.');
 }
 async function close(){
  const a=active;if(!a)return;
  if(a.dirty){
   try{if(a.saveDraft)await a.saveDraft(a.overlay)}catch(e){feedback('Lokale Sicherung fehlgeschlagen: '+e.message);return}
   const warning=a.saveDraft?'Die Anmerkungen wurden lokal als Entwurf gesichert, aber noch nicht mit dem PC abgeglichen. Trotzdem schließen?':'Diese Anmerkungen sind auf dem PC noch nicht gespeichert und würden beim Schließen verloren gehen. Trotzdem schließen?';
   if(!confirm(warning))return;
  }
  clearTimeout(a.draftTimer);active=null;URL.revokeObjectURL(a.url);$('pp-overlay-dialog').close();
 }
 async function open(config){
  if(active){if(active.dirty)throw Error('Bitte die bisherige Anmerkungsebene erst speichern oder schließen.');await close()}
  const doc=config.doc;if(!doc?.id||!doc.projectId)throw Error('Datei zuerst einem Projekt zuordnen.');
  if(!supported(doc))throw Error('Die kombinierte Anmerkungsebene unterstützt derzeit PNG, JPEG und WebP. Für PDF/Office wird ein separater Seitenrenderer benötigt.');
  const dialog=makeUI();dialog.showModal();feedback('Originaldatei und Ebene werden geladen …');
  let url='';
  try{
   const blob=await config.load(doc);
   if(!blob||blob.size>70*1024*1024)throw Error('Bild nicht verfügbar oder zu groß. Offline-Kopie vorbereiten oder PC verbinden.');
   if(/^[a-f0-9]{64}$/i.test(doc.sha256||'')){
    const hashBytes=new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));
    const actual=[...hashBytes].map(n=>n.toString(16).padStart(2,'0')).join('');
    if(actual!==doc.sha256.toLowerCase())throw Error('Originaldatei stimmt nicht mit ihrer gespeicherten SHA-256-Prüfsumme überein. Keine Anmerkung auf beschädigtem Bild.');
   }
   url=URL.createObjectURL(blob);
   const image=$('pp-overlay-image');image.src=url;
   await new Promise((resolve,reject)=>{if(image.complete&&image.naturalWidth)return resolve();image.onload=resolve;image.onerror=()=>reject(Error('Datei kann nicht als Bild decodiert werden'))});
   if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>32000000)throw Error('Bildabmessungen überschreiten die sicheren Anzeigegrenzen.');
   const width=Math.min(1200,image.naturalWidth),height=Math.max(1,Math.round(width*image.naturalHeight/image.naturalWidth));
   const sheet=$('pp-overlay-sheet'),canvas=$('pp-overlay-canvas');sheet.style.aspectRatio=`${image.naturalWidth} / ${image.naturalHeight}`;
   canvas.width=width;canvas.height=height;
   const stored=await config.read(doc),localDraft=config.readDraft?await config.readDraft(doc):null;
   if(stored&&!safeOverlay(stored,doc))throw Error('Die gespeicherte Ebene passt nicht mehr zur Originaldatei (Version/Prüfsumme geändert). Vorhandene Anmerkungen werden nicht überschrieben.');
   if(localDraft&&!safeOverlay(localDraft,doc))throw Error('Der lokale Entwurf passt nicht zu dieser Originalversion. Er bleibt erhalten; bitte erst exportieren oder die passende Datei wiederherstellen.');
   const accepted=safeOverlay(localDraft,doc)||safeOverlay(stored,doc);
   active={...config,doc,url,image,overlay:accepted||blank(doc),mode:'pen',redo:[],ongoing:null,dirty:!!safeOverlay(localDraft,doc),draftTimer:null};
   $('pp-overlay-filename').textContent=doc.name;$('pp-overlay-color').value='#111111';setMode('pen');refresh();
   feedback(localDraft&&safeOverlay(localDraft,doc)?'Lokaler, noch nicht synchronisierter Entwurf wiederhergestellt.':'Anmerkungsebene bereit · Originaldatei unverändert.');
  }catch(e){if(url)URL.revokeObjectURL(url);dialog.close();active=null;throw e}
 }
 document.addEventListener('pointerdown',e=>{
  const cv=$('pp-overlay-canvas');if(!active||e.target!==cv||active.mode==='hand')return;
  if(active.mode==='text'){
   const text=prompt('Text auf der Anmerkungsebene (max. 200 Zeichen):');if(!text)return;
   const p=point(e);active.overlay.items.push({type:'text',x:p[0],y:p[1],text:text.slice(0,200),size:clamp(Number($('pp-overlay-width').value)*2+8,10,45),color:$('pp-overlay-color').value});active.redo=[];markDirty();refresh();return;
  }
  if(e.button!==0&&e.pointerType==='mouse')return;
  if(active.mode==='pen'&&e.pointerType==='touch')return;
  if(active.mode==='finger'&&e.pointerType==='pen')return;
  if(active.ongoing)return; // a second finger must not corrupt an active pen stroke
  cv.setPointerCapture(e.pointerId);active.pointerId=e.pointerId;active.ongoing={type:'stroke',points:[point(e)],size:Number($('pp-overlay-width').value),color:$('pp-overlay-color').value};
 });
 document.addEventListener('pointermove',e=>{
  const a=active,cv=$('pp-overlay-canvas');if(!a?.ongoing||a.pointerId!==e.pointerId||(e.target!==cv&&!cv.hasPointerCapture(e.pointerId)))return;
  const pts=a.ongoing.points;if(pts.length>=4000)return;
  const p=point(e),last=pts[pts.length-1];if(Math.abs(p[0]-last[0])+Math.abs(p[1]-last[1])<.00035)return;
  pts.push(p);refresh();
 });
 const finish=e=>{const a=active;if(!a?.ongoing||a.pointerId!==e.pointerId)return;const cv=$('pp-overlay-canvas');if(!cv.hasPointerCapture(e.pointerId)&&e.target!==cv)return;
  const stroke=a.ongoing;a.ongoing=null;a.pointerId=null;if(e.type==='pointercancel'){refresh();return}if(stroke.points.length&&a.overlay.items.length<MAX_ITEMS){a.overlay.items.push(stroke);a.redo=[];markDirty()}refresh();
 };
 document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);
 document.addEventListener('click',e=>{
  const b=e.target.closest('#pp-overlay-dialog [data-overlay]');if(!b||!active)return;
  const act=b.dataset.overlay;
  if(['pen','finger','hand','text'].includes(act)){setMode(act);return}
  if(act==='undo'&&active.overlay.items.length){active.redo.push(active.overlay.items.pop());markDirty();refresh()}
  if(act==='redo'&&active.redo.length){active.overlay.items.push(active.redo.pop());markDirty();refresh()}
  if(act==='save')save().catch(e=>feedback('Speichern fehlgeschlagen: '+e.message));
  if(act==='export')exportPNG().catch(e=>feedback('Export fehlgeschlagen: '+e.message));
  if(act==='close')close().catch(e=>feedback(e.message));
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active?.dirty&&active.saveDraft)active.saveDraft(active.overlay).catch(()=>{});});
 document.addEventListener('cancel',e=>{if(e.target?.id==='pp-overlay-dialog'&&active){e.preventDefault();close().catch(err=>feedback(err.message))}});
 window.PPAnnotationLayer={open,noteId,isOverlayNote,blank,safeOverlay,supported,exportPNG};
})();
