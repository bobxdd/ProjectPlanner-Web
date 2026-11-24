import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('docs/checklist.js');
function harness(){
  const handlers=new Map(),view={innerHTML:''};
  const nodes=[];
  const doc={
    body:{append(el){nodes.push(el)}},
    getElementById(id){return id==='view'?view:null},
    querySelector(){return {focus(){}}},
    addEventListener(type,fn,options){const value=handlers.get(type)||[];value.push({fn,options});handlers.set(type,value)},
    createElement(tag){return {tag,style:{},className:'',hidden:false,innerHTML:'',dataset:{},setAttribute(){},addEventListener(){},querySelector(){return {focus(){}}},querySelectorAll(){return []},getBoundingClientRect(){return {width:240,height:290}},showModal(){},close(){}}}
  };
  const window={confirm(){return true}};
  const DB={gameChecklist:null,projects:[],tasks:[]};
  const ui={view:'checklist'};
  const ctx=vm.createContext({document:doc,window,DB,ui,crypto:{randomUUID(){return 'random-uuid'}},id(){return 'a'.repeat(24)},mutate(fn){fn();window.PPChecklist.render()},toast(){},innerWidth:1200,innerHeight:900,CSS:{escape(x){return x}},FormData,console});
  vm.runInContext(source,ctx);
  return {window,DB,view,handlers,ctx,emit(type,event){for(const handler of handlers.get(type)||[])handler.fn(event)}};
}
test('provided checklist seeds exactly nine chapters, in exact order, and 38 items',()=>{
  const h=harness(),sections=h.window.PPChecklist.seed().sections;
  assert.equal(sections.length,9);
  assert.deepEqual(Array.from(sections,s=>s.items.length),[4,4,4,4,5,4,4,4,5]);
  assert.equal(sections.flatMap(s=>s.items).length,38);
  assert.deepEqual(Array.from(sections,s=>s.title),[
    'Charakter und Ausrüstung','Begleiter und Pets','Gebäude und Produktion',
    'Vollständiges Ressourcenregister','Crafting- und Upgrade-Rezepte',
    'Bosse und Kampfsystem','Weltkarte und Expeditionen',
    'League und Ressourcenökonomie','Gesamtsimulation'
  ]);
  assert.equal(sections[0].items[0].text,'Sieben Klassenvarianten ausarbeiten');
  assert.equal(sections[8].items[4].text,'Endgültige Gamedesign-Regeln dokumentieren');
  assert.ok(sections.flatMap(s=>s.items).every(item=>item.done===false));
});
test('view renders every provided item and an independent zero-percent checklist counter',()=>{
  const h=harness();
  h.window.PPChecklist.render();
  assert.ok(h.view.innerHTML.includes('0 von 38 Punkten erledigt'));
  assert.ok(h.view.innerHTML.includes('Charakter und Ausrüstung'));
  assert.ok(h.view.innerHTML.includes('Pet-Fähigkeiten und Ressourcenboni ausarbeiten'));
  assert.ok(h.view.innerHTML.includes('Endgültige Gamedesign-Regeln dokumentieren'));
  assert.equal(h.DB.gameChecklist,null); // rendering cannot clobber a legacy workspace
});
test('checking off one item strikes it but leaves all 38 in the list and persists through mutate',()=>{
  const h=harness();
  const id='gd-item-1-1';
  const input={checked:true,dataset:{gcCheck:id},closest(selector){return selector==='[data-gc-check]'?this:null}};
  h.emit('change',{target:input});
  assert.equal(h.DB.gameChecklist.sections[0].items[0].done,true);
  assert.equal(h.DB.gameChecklist.sections.flatMap(s=>s.items).length,38);
  assert.ok(h.view.innerHTML.includes('3<small>%</small>'));
  assert.ok(h.view.innerHTML.includes('gc-row is-done'));
  assert.ok(h.view.innerHTML.includes('Sieben Klassenvarianten ausarbeiten'));
  input.checked=false;
  h.emit('change',{target:input});
  assert.equal(h.DB.gameChecklist.sections[0].items[0].done,false);
  assert.ok(h.view.innerHTML.includes('0 von 38 Punkten erledigt'));
});
test('HTML in checklist text and names remains escaped instead of executable',()=>{
  const h=harness();
  h.DB.gameChecklist=h.window.PPChecklist.seed();
  h.DB.gameChecklist.sections[0].items[0].text='<img src=x onerror=alert(1)>';
  h.window.PPChecklist.render();
  assert.ok(h.view.innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!h.view.innerHTML.includes('<img src=x onerror=alert(1)>'));
});
test('top navigation, dedicated CSS/JS and shared cloud state are wired',()=>{
  assert.match(read('docs/app.js'),/\['checklist','Checkliste','check'\]/);
  assert.match(read('docs/experience.js'),/ui\.view==='checklist'\)window\.PPChecklist\?\.render\(\)/);
  assert.match(read('docs/planner.html'),/checklist\.js\?v=20261124-gd2/);
  assert.match(read('docs/planner.html'),/checklist\.css\?v=20261124-gd2/);
  assert.match(read('docs/cloud/runtime.js'),/if\(next\.gameChecklist!==undefined\)/);
  assert.match(read('docs/cloud/runtime.js'),/planner_state_put/);
});
test('context menu includes assignment and edit/move/duplicate and Escape is first-class',()=>{
  assert.match(source,/Bereich \/ Aufgabe zuweisen/);
  assert.match(source,/Duplizieren/);
  assert.match(source,/Punkt bearbeiten/);
  assert.match(source,/Anderem Abschnitt zuweisen/);
  assert.match(source,/Zuordnung entfernen/);
  assert.match(read('docs/quality-v28.js'),/PPChecklist\?\.dismissMenu/);
});
