'use strict';
/* Shared Project Planner checklist. No separate database or user session. */
(function(){
const starting=[
 ['Charakter und Ausrüstung',['Sieben Klassenvarianten ausarbeiten','Alle Ausrüstungsslots definieren','Klassenspezifische Bonus-Slots ausarbeiten','Rüstungs- und Klassenkristalle definieren']],
 ['Begleiter und Pets',['Kampfrollen der Begleiter festlegen','Eier, Babys und Entwicklung definieren','Pet-Fähigkeiten und Ressourcenboni ausarbeiten','Mögliche Pet-Kosten festlegen']],
 ['Gebäude und Produktion',['Alle sieben Gebäude ausarbeiten','Wohnhaus-Abhängigkeiten definieren','Gebäude-XP und Produktionsplätze festlegen','Crystalier und Garten genauer definieren']],
 ['Vollständiges Ressourcenregister',['20 Grundmaterialien erfassen','Gold und Category Crystals definieren','Seeds und Spezialressourcen ergänzen','Alle Ressourcenquellen und Verbrauchsmöglichkeiten erfassen']],
 ['Crafting- und Upgrade-Rezepte',['Alle Waffenrezepte','Alle Rüstungsrezepte','Alle Schmuckrezepte','Alle Trankrezepte','Alle Gebäude- und Upgrade-Kosten']],
 ['Bosse und Kampfsystem',['Automatisches Kampfsystem konzipieren','Freischaltungsbosse und Ressourcenbosse unterscheiden','Trankverbrauch und Bosskosten definieren','Crystal-Drops und Pechschutz berechnen']],
 ['Weltkarte und Expeditionen',['20 Gebiete geografisch zuordnen','Reiserouten und Nebenbeute ausarbeiten','Expeditionstypen und Limits definieren','Seeds und Begleiter auf Regionen verteilen']],
 ['League und Ressourcenökonomie',['Verfügbare Matchstatistiken prüfen','Leistungsvergleich entwickeln','Ressourcenmengen pro Match berechnen','Gold, passive Einnahmen und Händlerpreise ausbalancieren']],
 ['Gesamtsimulation',['Kosten und Erträge gemeinsam simulieren','Unterschiedliche Spielertypen vergleichen','Materialengpässe und Überschüsse prüfen','Sämtliche Tier-Freischaltungen testen','Endgültige Gamedesign-Regeln dokumentieren']]
];
function seed(){return {version:1,seedId:'game-design-v1',sections:starting.map((pair,i)=>({
  id:'gd-section-'+(i+1),title:pair[0],collapsed:false,
  items:pair[1].map((text,j)=>({id:'gd-item-'+(i+1)+'-'+(j+1),text,done:false,projectId:'',taskId:''}))
}))}}
const escHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
const freshId=()=>typeof id==='function'?id():crypto.randomUUID();
const state=()=>DB?.gameChecklist&&Array.isArray(DB.gameChecklist.sections)?DB.gameChecklist:seed();
const sectionById=key=>state().sections.find(s=>s.id===key);
function itemById(key){for(const s of state().sections){const item=s.items.find(x=>x.id===key);if(item)return {item,section:s}}return null}
const pct=(done,total)=>total?Math.round(100*done/total):0;
const stat=section=>({done:section.items.filter(x=>x.done).length,total:section.items.length});
let search='',filter='all',menu=null,menuTarget=null,menuFocus=null,editor=null,editMode=null;
function modify(work){
  try{mutate(()=>{
    if(!DB.gameChecklist||!Array.isArray(DB.gameChecklist.sections))DB.gameChecklist=seed();
    work(DB.gameChecklist);
  })}catch(err){console.error('Checklistenänderung fehlgeschlagen:',err);toast('Checkliste: '+err.message)}
}
function updateItem(key,fn){modify(data=>{for(const section of data.sections){const item=section.items.find(x=>x.id===key);if(item){fn(item,section,data);return}}})}
function updateSection(key,fn){modify(data=>{const section=data.sections.find(x=>x.id===key);if(section)fn(section,data)})}
function move(array,key,step){const i=array.findIndex(x=>x.id===key),next=i+step;if(i<0||next<0||next>=array.length)return;[array[i],array[next]]=[array[next],array[i]]}
function assignment(item){
  if(!item.projectId)return '';
  const project=DB.projects.find(p=>p.id===item.projectId);
  const task=item.taskId?DB.tasks.find(t=>t.id===item.taskId):null;
  return (project?.name||'Bereich fehlt')+(item.taskId?' · '+(task?.title||'Aufgabe fehlt'):'');
}
function render(){
  if(ui.view!=='checklist')return;
  const view=document.getElementById('view');if(!view)return;
  hideMenu(false);
  const sections=state().sections,items=sections.flatMap(s=>s.items),done=items.filter(x=>x.done).length,progress=pct(done,items.length);
  const query=search.trim().toLocaleLowerCase('de-DE');
  const show=item=>(filter==='all'||(filter==='done'?item.done:!item.done))&&
    (!query||(item.text+' '+assignment(item)).toLocaleLowerCase('de-DE').includes(query));
  view.innerHTML=
    '<div class="gc-page"><header class="gc-hero"><div class="gc-heading">'+
      '<span class="gc-eyebrow">GAMEDESIGN · ARBEITSLISTE</span><h1>Checkliste</h1>'+
      '<p>Checklistenpunkte bearbeiten, abhaken und optional einem Bereich oder einer Aufgabe zuordnen.</p></div>'+
      '<div class="gc-stat" aria-label="Fortschritt dieser Checkliste"><strong>'+progress+'<small>%</small></strong>'+
      '<span>'+done+' von '+items.length+' Punkten erledigt</span><div class="gc-progress"><span style="width:'+progress+'%"></span></div></div></header>'+
    '<div class="gc-toolbar">'+
      '<label class="gc-search"><span aria-hidden="true">⌕</span><input type="search" data-gc-search placeholder="Checkliste durchsuchen" aria-label="Checkliste durchsuchen" value="'+escHTML(search)+'"></label>'+
      '<div class="gc-filters" role="group" aria-label="Checklistenfilter">'+
      ['all','open','done'].map((kind,i)=>'<button type="button" data-gc-filter="'+kind+'" aria-pressed="'+(filter===kind)+'">'+['Alle','Offen','Erledigt'][i]+'</button>').join('')+
      '</div><button type="button" class="gc-add-section" data-gc-command="new-section">+ Abschnitt</button></div>'+
    '<div class="gc-sections">'+sections.map((section,index)=>{
      const s=stat(section),value=pct(s.done,s.total),visible=section.items.filter(show);
      return '<section class="gc-section" data-gc-section="'+escHTML(section.id)+'">'+
        '<header class="gc-section-header">'+
        '<button type="button" class="gc-collapse" data-gc-collapse="'+escHTML(section.id)+'" aria-expanded="'+(!section.collapsed)+'" aria-label="Abschnitt ein- oder ausklappen">'+(section.collapsed?'▸':'▾')+'</button>'+
        '<div class="gc-section-title"><h2>'+(index+1)+'. '+escHTML(section.title)+'</h2><small>'+s.done+' / '+s.total+' erledigt · '+value+'%</small></div>'+
        '<div class="gc-section-meter gc-progress"><span style="width:'+value+'%"></span></div>'+
        '<button type="button" class="gc-more" data-gc-section-menu="'+escHTML(section.id)+'" title="Abschnitt bearbeiten" aria-label="Abschnitt bearbeiten">···</button>'+
        '</header>'+
        '<div class="gc-section-content" '+(section.collapsed?'hidden':'')+'><div class="gc-list">'+
        (visible.length?visible.map(item=>'<div class="gc-row'+(item.done?' is-done':'')+'" data-gc-item="'+escHTML(item.id)+'" tabindex="-1">'+
          '<input type="checkbox" id="gc-check-'+escHTML(item.id)+'" data-gc-check="'+escHTML(item.id)+'" '+(item.done?'checked':'')+' aria-label="'+escHTML(item.text)+' erledigt">'+
          '<label for="gc-check-'+escHTML(item.id)+'" class="gc-row-text">'+escHTML(item.text)+'</label>'+
          (item.projectId?'<button type="button" class="gc-link" data-gc-command="assign" data-gc-id="'+escHTML(item.id)+'" title="Zuordnung bearbeiten">'+escHTML(assignment(item))+'</button>':'')+
          '<button type="button" class="gc-more gc-row-menu" data-gc-item-menu="'+escHTML(item.id)+'" aria-label="Aktionen für '+escHTML(item.text)+'">···</button>'+
          '</div>').join(''):'<div class="gc-no-results">Keine passenden Punkte für diese Ansicht.</div>')+
        '</div><form class="gc-add-form" data-gc-add="'+escHTML(section.id)+'">'+
        '<input name="name" maxlength="300" required autocomplete="off" placeholder="Neuen Checklistenpunkt hinzufügen …" aria-label="Neuer Checklistenpunkt">'+
        '<button type="submit">+ Hinzufügen</button></form></div></section>';
    }).join('')+'</div>'+
    '<p class="gc-help">Rechtsklick auf einen Punkt: zuweisen, umbenennen, kopieren, verschieben oder löschen. Erledigte Punkte bleiben in der Liste.</p></div>';
}
function ensureDialog(){
  if(editor)return;
  editor=document.createElement('dialog');editor.id='gc-editor';editor.className='gc-dialog';
  editor.innerHTML='<form id="gc-editor-form"><header><h2 id="gc-editor-title"></h2><button type="button" data-gc-close aria-label="Schließen">×</button></header>'+
    '<div id="gc-editor-fields"></div><footer><button type="button" data-gc-close>Abbrechen</button><button type="submit" class="gc-save">Speichern</button></footer></form>';
  document.body.append(editor);
  editor.querySelectorAll('[data-gc-close]').forEach(b=>b.addEventListener('click',()=>editor.close()));
  editor.addEventListener('close',()=>{editMode=null});
  editor.querySelector('form').addEventListener('submit',event=>{event.preventDefault();saveDialog()});
  editor.addEventListener('change',event=>{if(event.target.id==='gc-project')setTaskOptions(event.target.value,'')});
}
function textField(title,value,max){return '<label class="gc-field"><span>'+escHTML(title)+'</span><input name="name" required maxlength="'+max+'" autocomplete="off" value="'+escHTML(value)+'"></label>'}
function setTaskOptions(projectId,selected){
  const tasks=DB.tasks.filter(t=>t.projectId===projectId),select=editor.querySelector('#gc-task');
  if(!select)return;
  select.innerHTML='<option value="">Nur Bereich zuweisen</option>'+tasks.map(t=>'<option value="'+escHTML(t.id)+'" '+(t.id===selected?'selected':'')+'>'+escHTML(t.title)+'</option>').join('');
  select.disabled=!projectId||!tasks.length;
}
function edit(kind,key='',sectionId=''){
  ensureDialog();hideMenu(false);
  editMode={kind,key,sectionId};
  const heading=editor.querySelector('#gc-editor-title'),body=editor.querySelector('#gc-editor-fields');
  if(kind==='section'||kind==='new-section'){
    heading.textContent=kind==='section'?'Abschnitt umbenennen':'Abschnitt hinzufügen';
    body.innerHTML=textField('Abschnittsname',kind==='section'?sectionById(key)?.title||'':'',120);
  }else if(kind==='item'||kind==='new-item'){
    heading.textContent=kind==='item'?'Punkt bearbeiten':'Punkt hinzufügen';
    body.innerHTML=textField('Checklistenpunkt',kind==='item'?itemById(key)?.item.text||'':'',300);
  }else if(kind==='assign'){
    const item=itemById(key)?.item,projectId=item?.projectId||'';
    heading.textContent='Bereich oder Aufgabe zuweisen';
    body.innerHTML='<label class="gc-field"><span>Bereich (optional)</span><select name="projectId" id="gc-project"><option value="">Keine Zuordnung</option>'+
      DB.projects.map(p=>'<option value="'+escHTML(p.id)+'" '+(p.id===projectId?'selected':'')+'>'+escHTML(p.name)+'</option>').join('')+
      '</select></label><label class="gc-field"><span>Aufgabe (optional)</span><select name="taskId" id="gc-task"></select></label>'+
      '<p class="gc-hint">Die Zuordnung verlinkt den Punkt, ohne eine neue Aufgabe zu erstellen.</p>';
    setTaskOptions(projectId,item?.taskId||'');
  }else if(kind==='move'){
    heading.textContent='Punkt in Abschnitt verschieben';
    body.innerHTML='<label class="gc-field"><span>Zielabschnitt</span><select name="destination">'+
      state().sections.map(s=>'<option value="'+escHTML(s.id)+'" '+(s.id===sectionId?'selected':'')+'>'+escHTML(s.title)+'</option>').join('')+
      '</select></label>';
  }
  editor.showModal();editor.querySelector('input,select')?.focus();
}
function saveDialog(){
  const e=editMode;if(!e)return;
  const fd=new FormData(editor.querySelector('form')),name=String(fd.get('name')||'').trim();
  if(!['assign','move'].includes(e.kind)&&!name)return;
  if(e.kind==='section')updateSection(e.key,s=>{s.title=name.slice(0,120)});
  if(e.kind==='new-section')modify(data=>{data.sections.push({id:freshId(),title:name.slice(0,120),collapsed:false,items:[]})});
  if(e.kind==='item')updateItem(e.key,item=>{item.text=name.slice(0,300)});
  if(e.kind==='new-item')updateSection(e.sectionId,s=>{s.items.push({id:freshId(),text:name.slice(0,300),done:false,projectId:'',taskId:''})});
  if(e.kind==='assign'){
    let projectId=String(fd.get('projectId')||''),taskId=String(fd.get('taskId')||'');
    if(!DB.projects.some(p=>p.id===projectId))projectId='';
    if(!DB.tasks.some(t=>t.id===taskId&&t.projectId===projectId))taskId='';
    updateItem(e.key,item=>{item.projectId=projectId;item.taskId=taskId});
  }
  if(e.kind==='move')modify(data=>{
    const origin=data.sections.find(s=>s.items.some(item=>item.id===e.key));
    const destination=data.sections.find(s=>s.id===fd.get('destination'));
    if(!origin||!destination||origin===destination)return;
    const index=origin.items.findIndex(i=>i.id===e.key);
    destination.items.push(...origin.items.splice(index,1));destination.collapsed=false;
  });
  editor.close();
}
function ensureMenu(){
  if(menu)return;
  menu=document.createElement('div');menu.id='gc-context';menu.className='gc-menu';menu.hidden=true;
  menu.setAttribute('role','menu');menu.setAttribute('aria-label','Checklistenaktionen');
  document.body.append(menu);
  menu.addEventListener('click',event=>{
    const button=event.target.closest('[data-gc-menu-action]');if(!button)return;
    event.preventDefault();event.stopPropagation();
    const command=button.dataset.gcMenuAction,target=menuTarget;
    hideMenu(false);if(target)action(command,target);
  });
}
function hideMenu(restore){
  if(!menu||menu.hidden)return;
  menu.hidden=true;menuTarget=null;
  if(restore&&menuFocus?.isConnected)menuFocus.focus({preventScroll:true});
  menuFocus=null;
}
function openMenu(target,x,y,source){
  ensureMenu();menuTarget=target;menuFocus=source||document.activeElement;
  const item=target.type==='item',data=item?itemById(target.id)?.item:sectionById(target.id);
  if(!data)return;
  const commands=item?[
    ['edit','Punkt bearbeiten'],['assign','Bereich / Aufgabe zuweisen'],['unlink','Zuordnung entfernen'],
    ['duplicate','Duplizieren'],['up','Nach oben'],['down','Nach unten'],['move','Anderem Abschnitt zuweisen'],['delete','Löschen']
  ]:[['edit','Abschnitt umbenennen'],['collapse','Ein-/ausklappen'],['up','Nach oben'],['down','Nach unten'],['delete','Abschnitt löschen']];
  menu.innerHTML='<div class="gc-menu-title">'+escHTML(item?data.text:data.title)+'</div>'+
    commands.map(pair=>'<button type="button" role="menuitem" data-gc-menu-action="'+pair[0]+'">'+escHTML(pair[1])+'</button>').join('');
  menu.hidden=false;menu.style.left='0px';menu.style.top='0px';
  const rect=menu.getBoundingClientRect();
  menu.style.left=Math.max(8,Math.min(x,innerWidth-rect.width-12))+'px';
  menu.style.top=Math.max(8,Math.min(y,innerHeight-rect.height-12))+'px';
  menu.querySelector('button')?.focus({preventScroll:true});
}
function action(command,target){
  const isItem=target.type==='item',found=isItem?itemById(target.id):sectionById(target.id);
  if(!found)return;
  if(command==='edit'){edit(isItem?'item':'section',target.id);return}
  if(command==='assign'&&isItem){edit('assign',target.id);return}
  if(command==='move'&&isItem){edit('move',target.id,found.section.id);return}
  if(command==='unlink'&&isItem){updateItem(target.id,i=>{i.projectId='';i.taskId='' });return}
  if(command==='collapse'&&!isItem){updateSection(target.id,s=>{s.collapsed=!s.collapsed});return}
  if(command==='duplicate'&&isItem){
    modify(data=>{const s=data.sections.find(g=>g.items.some(i=>i.id===target.id));if(!s)return;
      const index=s.items.findIndex(i=>i.id===target.id),copy=s.items[index];
      s.items.splice(index+1,0,{...copy,id:freshId(),done:false,text:copy.text+' (Kopie)'})
    });return;
  }
  if(command==='up'||command==='down'){
    const step=command==='up'?-1:1;
    if(isItem)modify(data=>{const s=data.sections.find(g=>g.items.some(i=>i.id===target.id));if(s)move(s.items,target.id,step)});
    else modify(data=>move(data.sections,target.id,step));
    return;
  }
  if(command==='delete'){
    const label=isItem?found.item.text:found.title;
    if(!window.confirm('„'+label+'“ '+(isItem?'löschen?':'mitsamt allen Punkten löschen?')))return;
    if(isItem)modify(data=>{for(const s of data.sections)s.items=s.items.filter(i=>i.id!==target.id)});
    else modify(data=>{data.sections=data.sections.filter(s=>s.id!==target.id)});
  }
}
document.addEventListener('change',event=>{
  const element=event.target.closest?.('[data-gc-check]');
  if(!element||ui.view!=='checklist')return;
  const key=element.dataset.gcCheck,checked=element.checked;
  updateItem(key,item=>{item.done=checked});
  document.querySelector('[data-gc-check="'+CSS.escape(key)+'"]')?.focus({preventScroll:true});
});
document.addEventListener('submit',event=>{
  const form=event.target.closest?.('[data-gc-add]');
  if(!form||ui.view!=='checklist')return;
  event.preventDefault();
  const text=String(new FormData(form).get('name')||'').trim();
  if(!text)return;
  const sectionId=form.dataset.gcAdd;
  updateSection(sectionId,s=>{s.items.push({id:freshId(),text:text.slice(0,300),done:false,projectId:'',taskId:''})});
  document.querySelector('[data-gc-add="'+CSS.escape(sectionId)+'"] input')?.focus({preventScroll:true});
});
document.addEventListener('input',event=>{if(event.target.matches?.('[data-gc-search]')){const position=event.target.selectionStart;search=event.target.value;render();const field=document.querySelector('[data-gc-search]');if(field){field.focus({preventScroll:true});if(Number.isInteger(position))field.setSelectionRange(position,position);}}});
document.addEventListener('click',event=>{
  if(ui.view!=='checklist')return;
  const choice=event.target.closest?.('[data-gc-filter]');
  if(choice){filter=choice.dataset.gcFilter;render();return}
  const collapse=event.target.closest?.('[data-gc-collapse]');
  if(collapse){updateSection(collapse.dataset.gcCollapse,s=>{s.collapsed=!s.collapsed});return}
  const itemButton=event.target.closest?.('[data-gc-item-menu]');
  const sectionButton=event.target.closest?.('[data-gc-section-menu]');
  if(itemButton||sectionButton){
    const button=itemButton||sectionButton,rect=button.getBoundingClientRect();
    openMenu({type:itemButton?'item':'section',id:itemButton?itemButton.dataset.gcItemMenu:sectionButton.dataset.gcSectionMenu},rect.left,rect.bottom+5,button);
    return;
  }
  const command=event.target.closest?.('[data-gc-command]');
  if(command){
    if(command.dataset.gcCommand==='new-section')edit('new-section');
    if(command.dataset.gcCommand==='assign')edit('assign',command.dataset.gcId);
    return;
  }
});
document.addEventListener('contextmenu',event=>{
  if(ui.view!=='checklist')return;
  const row=event.target.closest?.('[data-gc-item]'),section=event.target.closest?.('[data-gc-section]');
  if(!row&&!section)return;
  event.preventDefault();event.stopImmediatePropagation();
  openMenu(row?{type:'item',id:row.dataset.gcItem}:{type:'section',id:section.dataset.gcSection},event.clientX,event.clientY,row||section);
},true);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&menu&&!menu.hidden){event.preventDefault();event.stopImmediatePropagation();hideMenu(true)}
  if((event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10'))&&ui.view==='checklist'){
    const el=document.activeElement?.closest?.('[data-gc-item],[data-gc-section]');
    if(el){event.preventDefault();event.stopImmediatePropagation();const r=el.getBoundingClientRect();
      openMenu(el.dataset.gcItem?{type:'item',id:el.dataset.gcItem}:{type:'section',id:el.dataset.gcSection},r.left+20,r.top+20,el)}
  }
},true);
document.addEventListener('click',event=>{
  if(menu&&!menu.hidden&&!event.target.closest?.('#gc-context,[data-gc-item-menu],[data-gc-section-menu]'))hideMenu(false);
},true);
window.PPChecklist={render,seed,state,pct,dismissMenu(){if(menu&&!menu.hidden){hideMenu(true);return true}return false}};
})();
