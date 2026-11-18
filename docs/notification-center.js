'use strict';
/* Project Planner 3.2 – optional, non-modal, local error center.
   Reports only fixed error categories; never sends user data or tokens. */
Object.assign(ICONS,{
 'bell':'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>'
});
const ppDiagPanel=document.getElementById('diagnostics-panel');
const ppDiagTrigger=document.getElementById('diagnostics-open');
const ppDiagList=document.getElementById('diagnostics-list');
const ppDiagCaption=document.getElementById('diagnostics-caption');
const ppDiagFooter=document.getElementById('diagnostics-footer');
const ppDiagClose=document.getElementById('diagnostics-close');
ppDiagTrigger.innerHTML=icon('bell')+'<span class="diagnostics-badge" hidden></span>';
// In the immersive file archive, the normal header is intentionally hidden.
// The compact dock keeps both requested actions accessible without changing it.
const ppDiagFileDock=document.createElement('div');
ppDiagFileDock.className='file-hub-diagnostics-dock';
ppDiagFileDock.innerHTML='<button type="button" class="icon-btn diagnostics-bell" data-diagnostics-toggle aria-label="Fehlerzentrale öffnen" aria-controls="diagnostics-panel" aria-expanded="false" title="Fehlerzentrale">'+icon('bell')+'<span class="diagnostics-badge" hidden></span></button>';
document.body.append(ppDiagFileDock);

let ppDiagEvents=[],ppDiagPending=[],ppDiagVisible=false,ppDiagPolling=null,ppDiagSending=false,ppDiagLastTrigger=null;
const ppDiagAreas=new Set(['Speichern','Import','Sicherung','Mobilzugriff','Dateien','Darstellung','System']);
const ppDiagAreaFromURL=url=>{
 const route=String(url||'').split('?')[0];
 if(route==='/api/state')return 'Speichern';
 if(route==='/api/import')return 'Import';
 if(route==='/api/backup')return 'Sicherung';
 if(route.startsWith('/api/mobile/'))return 'Mobilzugriff';
 if(route.startsWith('/api/files/')||route.startsWith('/api/delete/')||['/api/upload','/api/file-action','/api/trash/action'].includes(route))return 'Dateien';
 return 'System';
};
function ppDiagLabel(e){
 switch(e.code){
 case 'server-error':return ['Interner Fehler bei '+e.area,'Die Funktion hat den Vorgang nicht erfolgreich abgeschlossen. Bitte den letzten Schritt kontrollieren.'];
 case 'mobile-start':return ['Mobilzugriff konnte nicht starten','Prüfe Netzwerk, Firewall und die Einstellungen unter „Verbundene Geräte“.'];
 case 'client-api':return [e.area+' konnte nicht abgeschlossen werden','Die Aktion wurde nicht bestätigt. Prüfe den Speicherstatus oder versuche es erneut.'];
 case 'client-runtime':return ['Fehler in der Oberfläche','Ein unerwarteter Fehler ist aufgetreten. Die aktuelle Ansicht bleibt geöffnet.'];
 case 'client-promise':return ['Unerwarteter Ablauf','Ein Vorgang konnte nicht erfolgreich abgeschlossen werden.'];
 case 'history-corrupt':return ['Fehlerverlauf nicht lesbar','Das frühere Diagnoseprotokoll war beschädigt. Neue Meldungen werden separat erfasst.'];
 default:return ['Unbekanntes Problem','Ein Fehler wurde erfasst.'];
 }
}
function ppDiagStamp(timestamp){
 try{return new Date(timestamp).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}catch{return 'Zeit unbekannt'}
}
function ppDiagOpen(){return ppDiagVisible}
function ppDiagUpdate(){
 const entries=[...ppDiagPending,...ppDiagEvents];
 const unread=entries.filter(x=>!x.read).length;
 document.querySelectorAll('.diagnostics-badge').forEach(el=>{el.hidden=unread===0;el.textContent=unread>99?'99+':String(unread)});
 document.querySelectorAll('#diagnostics-open,[data-diagnostics-toggle]').forEach(el=>{
  el.setAttribute('aria-label',unread?`Fehlerzentrale öffnen, ${unread} ungelesen`:'Fehlerzentrale öffnen');
  el.setAttribute('aria-expanded',String(ppDiagVisible));
 });
 ppDiagCaption.textContent=entries.length?`${entries.length} Meldungen · ${unread} ungelesen`:'Keine erkannten Fehler';
 ppDiagList.replaceChildren();
 if(!entries.length){const empty=document.createElement('div');empty.className='diagnostics-empty';empty.innerHTML='<strong>Keine Fehler gemeldet</strong>Die Fehlerzentrale zeigt erkannte Probleme automatisch an.';ppDiagList.append(empty);return;}
 for(const e of entries.slice(0,100)){
  const [title,desc]=ppDiagLabel(e);
  const row=document.createElement('article');row.className='diagnostics-row';row.dataset.unread=String(!e.read);row.dataset.severity=e.code==='mobile-start'?'warning':'error';
  const mark=document.createElement('span');mark.className='diagnostics-mark';mark.setAttribute('aria-hidden','true');
  const body=document.createElement('div');body.className='diagnostics-body';
  const meta=document.createElement('div');meta.className='diagnostics-meta';
  for(const label of [e.area,ppDiagStamp(e.lastSeen),e.count>1?`${e.count}×`:'']){
    if(!label)continue;const m=document.createElement('span');m.textContent=label;meta.append(m);
  }
  const strong=document.createElement('strong');strong.textContent=title;
  const details=document.createElement('p');details.textContent=desc+(e.status?` (HTTP ${e.status})`:'');
  body.append(meta,strong,details);row.append(mark,body);ppDiagList.append(row);
 }
}
async function ppDiagRefresh(){
 if(!secret)return;
 try{
  const res=await fetch('/api/diagnostics',{headers:{'X-Project-Planner-Token':secret},cache:'no-store'});
  if(!res.ok)return;
  const payload=await res.json();
  if(Array.isArray(payload.events))ppDiagEvents=payload.events;
  ppDiagUpdate();
 }catch{/* Desktop server may temporarily be unavailable. The panel still works. */}
}
let ppDiagReportGuard=new Set();
async function ppDiagReport(code,area,status=0){
 if(!ppDiagAreas.has(area)||!['client-api','client-runtime','client-promise'].includes(code))return;
 const key=code+'|'+area+'|'+status;
 if(ppDiagReportGuard.has(key))return;
 ppDiagReportGuard.add(key);setTimeout(()=>ppDiagReportGuard.delete(key),1500);
 const temp={id:'pending-'+Date.now(),code,area,status,read:false,count:1,lastSeen:new Date().toISOString()};
 ppDiagPending.unshift(temp);if(ppDiagPending.length>10)ppDiagPending.pop();ppDiagUpdate();
 if(!secret)return;
 try{
  const res=await fetch('/api/diagnostics',{method:'POST',headers:{'Content-Type':'application/json','X-Project-Planner-Token':secret},body:JSON.stringify({action:'record',code,area,status}),cache:'no-store'});
  if(res.ok){ppDiagPending=ppDiagPending.filter(e=>e!==temp);await ppDiagRefresh();}
 }catch{/* Keep the local indicator while the server is unavailable. */}
}
async function ppDiagAction(action){
 if(action==='copy'){
  const text=['Project Planner · Fehlerdiagnose',...ppDiagEvents.map(e=>{
   const [label]=ppDiagLabel(e);return `${e.lastSeen} | ${e.area} | ${label} | Status ${e.status||'-'} | ${e.count}×`;
  })].join('\n');
  try{await navigator.clipboard.writeText(text);toast('Diagnose kopiert (ohne Dateiinhalte und Zugangsdaten).')}catch{toast('Kopieren nicht möglich.');}
  return;
 }
 if(action==='clear'&&!confirm('Den lokalen Fehlerverlauf leeren? Die Projektdaten bleiben erhalten.'))return;
 try{
  const res=await fetch('/api/diagnostics',{method:'POST',headers:{'Content-Type':'application/json','X-Project-Planner-Token':secret},body:JSON.stringify({action}),cache:'no-store'});
  if(!res.ok)throw new Error('Fehlerprotokoll konnte nicht aktualisiert werden');
  if(action==='clear')ppDiagPending=[];
  if(action==='read')ppDiagPending.forEach(e=>e.read=true);
  await ppDiagRefresh();
 }catch{toast('Fehlerverlauf konnte nicht aktualisiert werden.');}
}
function ppDiagPosition(trigger){
 const rect=trigger?.getBoundingClientRect?.();const width=Math.min(412,innerWidth-24);
 let left=rect?rect.right-width:innerWidth-width-16;
 left=Math.max(12,Math.min(left,innerWidth-width-12));
 const top=rect?rect.bottom+12:74;
 ppDiagPanel.style.left=left+'px';ppDiagPanel.style.right='auto';
 ppDiagPanel.style.top=(top+100<innerHeight?top:12)+'px';
}
function ppDiagHide(restoreFocus=true){
 if(!ppDiagVisible)return;
 ppDiagVisible=false;
 if(ppDiagPanel.matches(':popover-open'))ppDiagPanel.hidePopover();
 ppDiagPanel.classList.remove('diagnostics-fallback-open');
 ppDiagUpdate();
 if(restoreFocus&&ppDiagLastTrigger?.isConnected)ppDiagLastTrigger.focus({preventScroll:true});
}
function ppDiagShow(trigger){
 if(ppDiagVisible){ppDiagHide();return;}
 ppDiagLastTrigger=trigger;
 // Keep an open task editor intact. A child of the active modal remains operable
 // when the native modal dialog makes the background inert.
 if(modal?.open && ppDiagPanel.parentElement!==modal)modal.append(ppDiagPanel);
 else if(!modal?.open && ppDiagPanel.parentElement!==document.body)document.body.append(ppDiagPanel);
 ppDiagPosition(trigger);
 try{ppDiagPanel.showPopover()}catch{ppDiagPanel.classList.add('diagnostics-fallback-open')}
 ppDiagVisible=true;ppDiagUpdate();ppDiagClose.focus({preventScroll:true});ppDiagRefresh();
}
// Observe the open editor and keep its small notification button usable while
// the normal header is blocked by the modal backdrop.
function ppDiagInjectModalButton(){
 if(!modal?.open)return;
 const head=modal.querySelector('.modal-head');
 if(!head||head.querySelector('[data-diagnostics-toggle]'))return;
 const button=document.createElement('button');button.type='button';button.className='icon-btn diagnostics-bell';button.dataset.diagnosticsToggle='';button.title='Fehlerzentrale';button.setAttribute('aria-label','Fehlerzentrale öffnen');button.innerHTML=icon('bell')+'<span class="diagnostics-badge" hidden></span>';
 const close=head.querySelector('button');
 if(close)close.before(button);else head.append(button);
 ppDiagUpdate();
}
new MutationObserver(ppDiagInjectModalButton).observe(modal,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
modal.addEventListener('close',()=>{if(ppDiagVisible)ppDiagHide(false);if(ppDiagPanel.parentElement!==document.body)document.body.append(ppDiagPanel)});
document.addEventListener('click',e=>{
 const action=e.target.closest('[data-diagnostics-action]');if(action){e.preventDefault();ppDiagAction(action.dataset.diagnosticsAction);return;}
 if(e.target.closest('#diagnostics-close')){e.preventDefault();ppDiagHide();return;}
 const trigger=e.target.closest('#diagnostics-open,[data-diagnostics-toggle]');
 if(trigger){e.preventDefault();e.stopImmediatePropagation();ppDiagShow(trigger);return;}
 if(ppDiagVisible&&!ppDiagPanel.contains(e.target))ppDiagHide(false);
},true);
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&ppDiagVisible){e.preventDefault();e.stopImmediatePropagation();ppDiagHide();}
 if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='e'&&!e.repeat){e.preventDefault();ppDiagShow(document.querySelector('#diagnostics-open'));}
},true);
window.addEventListener('resize',()=>{if(ppDiagVisible)ppDiagPosition(ppDiagLastTrigger)});
window.addEventListener('error',()=>{ppDiagReport('client-runtime','Darstellung')});
window.addEventListener('unhandledrejection',()=>{ppDiagReport('client-promise','Darstellung')});
const ppDiagOldRequest=request;
request=async function(url,options={}){
 try{return await ppDiagOldRequest(url,options)}
 catch(err){
  if(!String(url).startsWith('/api/diagnostics') && !(/zwischenzeitlich geändert|\b409\b|Revision/i.test(String(err?.message||'')))){
   ppDiagReport('client-api',ppDiagAreaFromURL(url));
  }
  throw err;
 }
};
ppDiagUpdate();
// Startup may run before the session key is fetched. Retry once it is present.
let ppDiagBootAttempts=0;
const ppDiagBootTimer=setInterval(()=>{if(secret){clearInterval(ppDiagBootTimer);ppDiagRefresh()}else if(++ppDiagBootAttempts>25)clearInterval(ppDiagBootTimer)},300);
ppDiagPolling=setInterval(()=>{if(secret&&!document.hidden)ppDiagRefresh()},18000);
