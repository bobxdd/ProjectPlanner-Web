import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../docs/checklist.js',import.meta.url),'utf8');

function editorHarness(){
  const events=new Map();
  let serial=0,allowed=true;
  const view={innerHTML:''},form={data:{},handlers:new Map(),addEventListener(type,fn){this.handlers.set(type,fn)}};
  const title={textContent:''},fields={innerHTML:''};
  const editor={
    id:'',className:'',hidden:false,innerHTML:'',open:false,
    setAttribute(){},addEventListener(){},querySelectorAll(){return []},
    showModal(){this.open=true},close(){this.open=false},
    querySelector(selector){
      if(selector==='form')return form;
      if(selector==='#gc-editor-title')return title;
      if(selector==='#gc-editor-fields')return fields;
      if(selector==='input,select')return {focus(){}};
      return null;
    }
  };
  const document={
    body:{append(){}},getElementById(key){return key==='view'?view:null},
    querySelector(){return {focus(){}}},
    createElement(tag){return tag==='dialog'?editor:{setAttribute(){},addEventListener(){},querySelector(){return {focus(){}}},style:{},innerHTML:'',getBoundingClientRect(){return {height:100,width:200}}}},
    addEventListener(type,handler){
      if(!events.has(type))events.set(type,[]);
      events.get(type).push(handler);
    }
  };
  class FormDataStub{constructor(element){this.data=element.data||{}}get(field){return this.data[field]||''}}
  const DB={gameChecklist:null,projects:[],tasks:[]},ui={view:'checklist'};
  const win={confirm(){return allowed}};
  const context=vm.createContext({
    document,window:win,DB,ui,FormData:FormDataStub,
    id(){serial++;return 'new-checklist-'+serial},
    console,CSS:{escape(v){return v}},
    innerWidth:1280,innerHeight:850,
    mutate(change){change();win.PPChecklist.render()},
    toast(){}
  });
  vm.runInContext(code,context,{filename:'docs/checklist.js'});
  const click=(command,key='',sectionId='')=>{
    const target={dataset:{gcCommand:command,gcId:key,gcSectionId:sectionId},
      closest(selector){return selector==='[data-gc-command]'?this:null}};
    for(const listener of events.get('click')||[])listener({target});
  };
  const save=data=>{
    form.data=data;
    const handler=form.handlers.get('submit');
    assert.equal(typeof handler,'function');
    handler({preventDefault(){}});
  };
  return {DB,view,win,form,fields,title,editor,click,save,allowConfirm(flag){allowed=flag}};
}
test('each section and item has always-visible add/edit/delete controls',()=>{
  const h=editorHarness();h.win.PPChecklist.render();
  const html=h.view.innerHTML;
  for(const command of ['new-section','new-item','edit-section','delete-section','edit-item','delete-item']){
    assert.ok(html.includes('data-gc-command="'+command+'"'),command);
  }
  assert.equal((html.match(/data-gc-command="edit-section"/g)||[]).length,9);
  assert.equal((html.match(/data-gc-command="delete-section"/g)||[]).length,9);
  assert.equal((html.match(/data-gc-command="edit-item"/g)||[]).length,38);
  assert.equal((html.match(/data-gc-command="delete-item"/g)||[]).length,38);
});
test('renaming a section and an item preserves all 38 seeded checklist entries',()=>{
  const h=editorHarness();h.click('edit-section','gd-section-1');
  assert.equal(h.editor.open,true);
  assert.match(h.fields.innerHTML,/Charakter und Ausrüstung/);
  h.save({name:'Charakter-Design'});
  assert.equal(h.DB.gameChecklist.sections[0].title,'Charakter-Design');
  h.click('edit-item','gd-item-1-1');
  h.save({name:'Alle sieben Klassen testen'});
  assert.equal(h.DB.gameChecklist.sections[0].items[0].text,'Alle sieben Klassen testen');
  assert.equal(h.DB.gameChecklist.sections.flatMap(s=>s.items).length,38);
  assert.ok(h.view.innerHTML.includes('Charakter-Design'));
  assert.ok(h.view.innerHTML.includes('Alle sieben Klassen testen'));
});
test('adding an item to a collapsed section expands it, and deletes are confirmable',()=>{
  const h=editorHarness();
  h.DB.gameChecklist=h.win.PPChecklist.seed();
  h.DB.gameChecklist.sections[0].collapsed=true;
  h.click('new-item','', 'gd-section-1');
  h.save({name:'Eigene Kristallregeln'});
  const created=h.DB.gameChecklist.sections[0].items.at(-1);
  assert.equal(created.text,'Eigene Kristallregeln');
  assert.equal(h.DB.gameChecklist.sections[0].collapsed,false);
  assert.equal(h.DB.gameChecklist.sections.flatMap(s=>s.items).length,39);
  h.allowConfirm(false);
  h.click('delete-item',created.id);
  assert.equal(h.DB.gameChecklist.sections[0].items.length,5);
  h.allowConfirm(true);
  h.click('delete-item',created.id);
  assert.equal(h.DB.gameChecklist.sections.flatMap(s=>s.items).length,38);
});
test('adding, renaming and deleting sections is unrestricted, including the starter sections',()=>{
  const h=editorHarness();h.click('new-section');h.save({name:'Neue Mechaniken'});
  let added=h.DB.gameChecklist.sections.at(-1);
  assert.equal(added.title,'Neue Mechaniken');
  assert.equal(h.DB.gameChecklist.sections.length,10);
  h.click('edit-section',added.id);h.save({name:'Kampfüberarbeitung'});
  assert.equal(h.DB.gameChecklist.sections.at(-1).title,'Kampfüberarbeitung');
  h.click('delete-section',added.id);
  assert.equal(h.DB.gameChecklist.sections.length,9);
  h.click('delete-section','gd-section-1');
  assert.equal(h.DB.gameChecklist.sections.length,8);
  assert.equal(h.DB.gameChecklist.sections.flatMap(s=>s.items).length,34);
  assert.ok(h.view.innerHTML.includes('0 von 34 Punkten erledigt'));
});
test('top-bar Checklist tab exists and public script URLs are cache-busted',()=>{
  const html=readFileSync(new URL('../docs/planner.html',import.meta.url),'utf8');
  assert.match(html,/id="top-checklist-tab"/);
  assert.match(html,/data-nav="checklist"/);
  assert.match(html,/checklist\.js\?v=20261124-gd2/);
  assert.match(html,/checklist\.css\?v=20261124-gd2/);
});
