'use strict';
// Project Planner - private fullscreen file reader.
// This viewer is UI-only: all bytes come through PlannerCloud.fileBlob,
// which verifies the current session and the shared workspace membership.
(function(){
  const TEXT_LIMIT=4*1024*1024;
  const imageMimes={
    png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',
    webp:'image/webp',avif:'image/avif',bmp:'image/bmp'
  };
  const textExtensions=new Set([
    'txt','md','markdown','csv','tsv','json','log','xml','html','htm','svg',
    'yaml','yml','ini','conf','cfg','css','js','mjs','ts','py','sql','sh'
  ]);
  const audioMimes={mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4',aac:'audio/aac',flac:'audio/flac'};
  const videoMimes={mp4:'video/mp4',webm:'video/webm',ogv:'video/ogg',mov:'video/quicktime'};
  let viewer=null,body=null,heading=null,detail=null,zoomText=null,zoomMinus=null,zoomPlus=null,tip=null;
  let current=null,blob=null,objectURL='',version=0,returnFocus=null,zoom=100,textSize=16,kind='';
  function extension(doc){return String(doc.name||'').toLowerCase().split('.').pop();}
  function classify(doc){
    const ext=extension(doc);
    if(imageMimes[ext])return {kind:'image',mime:imageMimes[ext]};
    if(ext==='pdf')return {kind:'pdf',mime:'application/pdf'};
    if(textExtensions.has(ext))return {kind:'text',mime:'text/plain;charset=utf-8'};
    if(audioMimes[ext])return {kind:'audio',mime:audioMimes[ext]};
    if(videoMimes[ext])return {kind:'video',mime:videoMimes[ext]};
    return {kind:'other',mime:'application/octet-stream'};
  }
  function $(selector){return viewer.querySelector(selector);}
  function ensureUI(){
    if(viewer)return;
    viewer=document.createElement('dialog');
    viewer.id='pp-file-viewer';
    viewer.className='pp-file-viewer';
    viewer.setAttribute('aria-labelledby','pp-file-viewer-title');
    viewer.innerHTML=[
      '<div class="ppfv-shell">',
        '<header class="ppfv-header">',
          '<div class="ppfv-file"><span class="ppfv-label">PROJECT PLANNER · DATEI</span>',
            '<h2 id="pp-file-viewer-title"></h2><p id="pp-file-viewer-detail"></p></div>',
          '<div class="ppfv-controls">',
            '<div class="ppfv-zoom" role="group" aria-label="Ansichtsgröße">',
              '<button type="button" data-pfv="smaller" aria-label="Verkleinern">−</button>',
              '<span id="ppfv-zoom-value">100 %</span>',
              '<button type="button" data-pfv="larger" aria-label="Vergrößern">+</button>',
            '</div>',
            '<button type="button" class="ppfv-btn" data-pfv="new-tab" title="Separat öffnen">In neuem Tab öffnen</button>',
            '<button type="button" class="ppfv-btn" data-pfv="download" title="Originaldatei speichern">Herunterladen</button>',
            '<button type="button" class="ppfv-close" data-pfv="close" aria-label="Dateiansicht schließen" title="Schließen (Esc)">×</button>',
          '</div>',
        '</header>',
        '<div class="ppfv-body" id="ppfv-body" aria-live="polite"></div>',
        '<footer class="ppfv-footer"><span id="ppfv-hint">Esc: Schließen · Datei bleibt im gemeinsamen Arbeitsbereich</span></footer>',
      '</div>'
    ].join('');
    document.body.append(viewer);
    body=$('#ppfv-body');
    heading=$('#pp-file-viewer-title');
    detail=$('#pp-file-viewer-detail');
    zoomText=$('#ppfv-zoom-value');
    zoomMinus=$('[data-pfv="smaller"]');
    zoomPlus=$('[data-pfv="larger"]');
    tip=$('#ppfv-hint');
    viewer.addEventListener('close',cleanup);
    viewer.addEventListener('click',event=>{
      const control=event.target.closest('[data-pfv]');
      if(!control)return;
      const action=control.dataset.pfv;
      if(action==='close'){viewer.close();return}
      if(action==='new-tab'){openNewTab();return}
      if(action==='download'){download().catch(error=>showError(error));return}
      if(action==='smaller'||action==='larger')adjustZoom(action==='larger'?1:-1);
    });
  }
  function clearObjectURL(){
    if(objectURL){URL.revokeObjectURL(objectURL);objectURL=''}
  }
  function cleanup(){
    version++;
    body.replaceChildren();
    clearObjectURL();
    current=null;blob=null;kind='';zoom=100;textSize=16;
    zoomMinus.disabled=zoomPlus.disabled=true;
    const old=returnFocus;returnFocus=null;
    if(old?.isConnected)old.focus({preventScroll:true});
  }
  function message(title,description){
    body.replaceChildren();
    const section=document.createElement('section');
    section.className='ppfv-message';
    const strong=document.createElement('strong');
    strong.textContent=title;
    const p=document.createElement('p');
    p.textContent=description;
    section.append(strong,p);
    body.append(section);
  }
  function showError(error){
    console.error('Project Planner Datei-Viewer:',error);
    if(viewer?.open)message('Datei kann nicht angezeigt werden',
      'Der geschützte Download ist fehlgeschlagen. Prüfe deine Verbindung und versuche es erneut.');
  }
  function setZoomControls(enabled){
    zoomMinus.disabled=zoomPlus.disabled=!enabled;
    zoomText.textContent=enabled?(kind==='text'?String(textSize)+' px':String(zoom)+' %'):'—';
  }
  function adjustZoom(direction){
    if(kind==='image'){
      zoom=Math.max(50,Math.min(300,zoom+direction*25));
      const img=body.querySelector('.ppfv-image');
      if(img){img.style.width=zoom>100?zoom+'%':'auto';img.style.maxWidth=zoom>100?'none':'100%';img.style.maxHeight=zoom>100?'none':'100%'}
      zoomText.textContent=String(zoom)+' %';
    }else if(kind==='text'){
      textSize=Math.max(11,Math.min(30,textSize+direction*2));
      const pre=body.querySelector('.ppfv-text');
      if(pre)pre.style.fontSize=textSize+'px';
      zoomText.textContent=String(textSize)+' px';
    }
  }
  function openNewTab(fileId){
    const item=fileId?(typeof DB!=='undefined'&&DB?.documents?.find(d=>d.id===fileId)):current;
    if(!item)return;
    // Preserve the app's established signed-URL / download fallback for a new tab.
    const url=fileURL(item);
    window.open(url,'_blank','noopener,noreferrer');
  }
  async function getBlob(doc){
    if(window.PlannerCloud?.fileBlob)return window.PlannerCloud.fileBlob(doc);
    const response=await fetch(fileURL(doc),{cache:'no-store'});
    if(!response.ok)throw Error('Datei nicht verfügbar');
    return response.blob();
  }
  async function download(fileId){
    const item=fileId?(typeof DB!=='undefined'&&DB?.documents?.find(d=>d.id===fileId)):current;
    if(!item)throw Error('Datei nicht gefunden');
    const data=blob&&current?.id===item.id?blob:await getBlob(item);
    const url=URL.createObjectURL(data);
    const a=document.createElement('a');
    a.href=url;a.download=String(item.name||'Datei');a.rel='noopener';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function open(fileId,trigger){
    ensureUI();
    const doc=typeof DB!=='undefined'&&DB?.documents?.find(item=>item.id===fileId);
    if(!doc)throw Error('Datei nicht mehr im gemeinsamen Arbeitsbereich vorhanden.');
    if(viewer.open){version++;body.replaceChildren();clearObjectURL();}
    returnFocus=trigger||document.activeElement;
    current=doc;
    blob=null;kind='';
    zoom=100;textSize=16;
    const ticket=++version;
    const view=classify(doc);
    kind=view.kind;
    heading.textContent=String(doc.name||'Datei');
    const size=Number(doc.size);
    detail.textContent=(Number.isFinite(size)?size.toLocaleString('de-DE')+' Byte':'Datei')+
      ' · '+(doc.projectId?'Projektdatei':'Datei-Eingang');
    tip.textContent='Esc: Schließen · Originaldatei bleibt unverändert';
    setZoomControls(view.kind==='image'||view.kind==='text');
    message('Datei wird geöffnet …','Geschützter Download aus eurem gemeinsamen Project Planner.');
    if(!viewer.open)viewer.showModal();
    $('[data-pfv="close"]').focus();
    if(view.kind==='other'){
      message('Für diesen Dateityp gibt es noch keine sichere Browser-Darstellung',
        'Office-Dokumente, ZIP-Dateien und andere Spezialformate kannst du über die Symbolleiste in einem neuen Tab öffnen oder herunterladen. Es erfolgt keine Übertragung an fremde Konvertierungsdienste.');
      return true;
    }
    try{
      const downloaded=await getBlob(doc);
      if(ticket!==version||!viewer.open)return false;
      blob=downloaded;
      if(view.kind==='text'){
        const limited=downloaded.size>TEXT_LIMIT;
        const contents=await downloaded.slice(0,TEXT_LIMIT).text();
        if(ticket!==version||!viewer.open)return false;
        body.replaceChildren();
        const pre=document.createElement('pre');pre.className='ppfv-text';
        pre.textContent=contents.replace(/^\uFEFF/,'');
        pre.style.fontSize=textSize+'px';
        body.append(pre);
        if(limited){tip.textContent='Nur die ersten 4 MB angezeigt · Vollständige Datei über „Herunterladen“ verfügbar'}
        return true;
      }
      if(view.kind==='pdf'){
        const magic=await downloaded.slice(0,5).text();
        if(ticket!==version||!viewer.open)return false;
        if(magic!=='%PDF-'){
          message('Ungültiges PDF','Die Dateiendung ist PDF, aber der Inhalt ist kein gültiger PDF-Anfang. Aus Sicherheitsgründen wird diese Datei nicht eingebettet.');
          return false;
        }
      }
      const display=new Blob([downloaded],{type:view.mime});
      objectURL=URL.createObjectURL(display);
      body.replaceChildren();
      let element;
      if(view.kind==='image'){
        const wrap=document.createElement('div');wrap.className='ppfv-image-stage';
        element=document.createElement('img');element.className='ppfv-image';
        element.alt=String(doc.name||'Bild');element.decoding='async';
        element.addEventListener('error',()=>{if(viewer.open)message('Bild konnte nicht geladen werden','Das Bildformat wird von diesem Browser möglicherweise nicht unterstützt.')},{once:true});
        element.src=objectURL;wrap.append(element);body.append(wrap);
      }else if(view.kind==='pdf'){
        element=document.createElement('iframe');element.className='ppfv-pdf';
        element.title='PDF: '+String(doc.name||'Dokument');
        element.referrerPolicy='no-referrer';element.src=objectURL;
        body.append(element);
        tip.textContent='PDF-Ansicht deines Browsers · Esc: Schließen';
      }else if(view.kind==='video'||view.kind==='audio'){
        element=document.createElement(view.kind);
        element.className=view.kind==='video'?'ppfv-video':'ppfv-audio';
        element.controls=true;element.preload='metadata';element.autoplay=false;
        element.src=objectURL;body.append(element);
        tip.textContent='Abspielfunktionen hängen von der Browserunterstützung ab · Esc: Schließen';
      }
      return true;
    }catch(error){
      if(ticket!==version)return false;
      showError(error);return false;
    }
  }
  // Capturing before app.js's older click handlers prevents accidental new tabs.
  document.addEventListener('click',event=>{
    const target=event.target;
    // Only a primary left click opens the in-app viewer; right click keeps its own menu.
    if((event.button!==undefined&&event.button!==0)||!target?.closest)return;
    const direct=target.closest('[data-file-viewer]');
    const search=target.closest('[data-search-type="file"]');
    const row=target.closest('[data-file-id]');
    const automatic=row&&!target.closest('button,a,input,select,textarea,[contenteditable="true"]');
    const chosen=direct||search||(automatic?row:null);
    if(!chosen)return;
    const fileId=chosen.dataset.fileViewer||chosen.dataset.searchId||chosen.dataset.fileId;
    if(!fileId)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(search&&typeof searchModal!=='undefined'&&searchModal.open)searchModal.close();
    open(fileId,chosen).catch(showError);
  },true);
  document.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    const focused=document.activeElement;
    if(!focused?.matches?.('[data-file-id]'))return;
    event.preventDefault();event.stopImmediatePropagation();
    open(focused.dataset.fileId,focused).catch(showError);
  },true);
  window.PPFileViewer={open,download,openNewTab,classify};
})();
