import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const orbitSource=src('docs/orbit.js');
const contextSource=src('docs/file-context.js');
const A='a'.repeat(24);
const B='b'.repeat(24);

function createNode(tag){
  return {
    tagName:tag.toUpperCase(),
    id:'',style:{},dataset:{},hidden:false,innerHTML:'',
    parentElement:null,children:[],
    setAttribute(){},focus(){},select(){},close(){},showModal(){},
    getBoundingClientRect(){return {left:120,top:180,width:320,height:290}},
    querySelector(selector){return selector.includes('[role="menuitem"]')?{focus(){}}:null},
    querySelectorAll(){return []},
    insertAdjacentHTML(){},
    contains(element){return element===this||element?.parentElement===this},
    append(...children){for(const child of children){this.children.push(child);child.parentElement=this}},
  };
}
function setup(){
  const handlers=[];
  const opened=[],tabs=[],toasts=[];
  const gallery=createNode('div');
  const body=createNode('body');
  body.classList={toggle(){},contains(){return false}};
  const doc={
    body,activeElement:null,
    createElement:createNode,
    addEventListener(type,callback,options){handlers.push({type,callback,options})},
    getElementById(id){return id==='orbit-gallery'?gallery:null},
    querySelector(){return null},
    querySelectorAll(){return []}
  };
  const win={
    PPFileViewer:{
      async open(id,trigger){opened.push({id,trigger});return true},
      openNewTab(id){tabs.push(id)}
    },
    open(){throw new Error('Legacy window.open must not run on file left click')},
    addEventListener(){},
  };
  const files=[{id:A,projectId:'p',name:'a.pdf',size:111},{id:B,projectId:'p',name:'b.txt',size:222}];
  const sandbox={
    window:win,document:doc,
    DB:{documents:files,projects:[],tasks:[]},
    ui:{view:'files',fileProject:'all',fileQuery:'',fileType:'all'},
    render(){},renderFiles(){},
    visibleProjects(){return [{id:'p',name:'Projekt'}]},
    getProject(){return {id:'p',name:'Projekt'}},
    getTask(){return null},
    matchesFile(){return true},
    classifyFile(doc){return doc.name.endsWith('pdf')?'pdf':'word'},
    FILE_KIND_LABEL:{pdf:'PDF',word:'Text'},
    projectColor(){return '#999999'},
    sort(items){return [...items]},
    icon(){return ''},
    bytes(size){return String(size)+' B'},
    esc(value){return String(value)},
    performance:{now(){return 1000}},
    innerWidth:1440,innerHeight:900,
    requestAnimationFrame(){return 1},cancelAnimationFrame(){},
    toast(msg){toasts.push(msg)},
    searchModal:{open:false},
    modal:{open:false}
  };
  const ctx=vm.createContext(sandbox);
  // Important: load the REAL modules in HTML order. Orbit's capturing listener
  // previously blocked the later fullscreen listener, which old tests missed.
  vm.runInContext(orbitSource,ctx,{filename:'docs/orbit.js'});
  vm.runInContext(contextSource,ctx,{filename:'docs/file-context.js'});
  vm.runInContext("orbitSelectedProject='p'; orbitActiveFile=0;",ctx);
  const dispatch=(type,target,button=0)=>{
    const event={
      type,target,button,clientX:220,clientY:260,
      prevented:false,stopped:false,
      preventDefault(){this.prevented=true},
      stopImmediatePropagation(){this.stopped=true}
    };
    for(const listener of handlers){
      if(listener.type!==type)continue;
      listener.callback(event);
      if(event.stopped)break;
    }
    return event;
  };
  function fileCard(index){
    const card={dataset:{orbitFileIndex:String(index),fileId:files[index].id},
      hasAttribute(name){return name==='data-orbit-file-index'}};
    const target={
      closest(selector){
        if(selector.includes('[data-orbit-file-index]'))return card;
        if(selector.includes('[data-file-id]'))return card;
        return null;
      }
    };
    return {card,target};
  }
  return {ctx,doc,body,opened,tabs,toasts,dispatch,fileCard};
}
test('real orbit capture handler opens CURRENT document in fullscreen on LEFT click',async()=>{
  const h=setup();
  const {card,target}=h.fileCard(0);
  const event=h.dispatch('click',target,0);
  assert.equal(event.prevented,true);
  assert.equal(event.stopped,true);
  assert.equal(h.opened.length,1);
  assert.equal(h.opened[0].id,A);
  assert.equal(h.opened[0].trigger,card);
  assert.equal(h.tabs.length,0);
});
test('real orbit capture handler selects AND fullscreen-opens a NONCURRENT document on LEFT click',async()=>{
  const h=setup();
  const event=h.dispatch('click',h.fileCard(1).target,0);
  assert.equal(event.prevented,true);
  assert.deepEqual(h.opened.map(x=>x.id),[B]);
  assert.equal(vm.runInContext('orbitActiveFile',h.ctx),1);
  assert.equal(h.tabs.length,0);
});
test('RIGHT click on orbit document opens context menu and then explicit new-tab action',async()=>{
  const h=setup();
  const event=h.dispatch('contextmenu',h.fileCard(0).target,2);
  assert.equal(event.prevented,true);
  assert.equal(h.opened.length,0);
  assert.equal(h.tabs.length,0);
  const menu=h.body.children.find(x=>x.id==='file-context-menu');
  assert.ok(menu);
  assert.equal(menu.hidden,false);
  assert.match(menu.innerHTML,/In neuem Tab öffnen/);
  const menuCommand={
    dataset:{fileCommand:'new-tab'},parentElement:menu,
    closest(selector){
      if(selector==='[data-file-command],[data-file-target],[data-file-task-target]')return this;
      if(selector==='#file-context-menu')return menu;
      return null;
    }
  };
  h.dispatch('click',menuCommand,0);
  assert.deepEqual(h.tabs,[A]);
  assert.equal(h.opened.length,0);
});
test('right mouse button on gallery does NOT open fullscreen or navigate away',()=>{
  const h=setup();
  const event=h.dispatch('click',h.fileCard(0).target,2);
  assert.equal(event.prevented,false);
  assert.equal(h.opened.length,0);
  assert.equal(h.tabs.length,0);
});
test('selected Orbit CTA is a fullscreen BUTTON, not a navigable new-tab anchor',()=>{
  assert.match(orbitSource,/<button type="button" class="orbit-open-full" data-file-viewer=/);
  assert.doesNotMatch(orbitSource,/<a class="orbit-open-full"/);
  assert.doesNotMatch(orbitSource,/target="_blank"/);
  assert.doesNotMatch(orbitSource,/window\.open\s*\(/);
  assert.match(orbitSource,/button\.dataset\.fileViewer=active\.id/);
});
test('decorative PDF thumbnail does not embed a separate interactive browsing context',()=>{
  assert.doesNotMatch(orbitSource,/<iframe/);
  assert.match(orbitSource,/orbit-paper-preview is-pdf/);
  const css=src('docs/orbit.css');
  assert.match(css,/\.orbit-document-card \.orbit-document-leaf,[\s\S]*?pointer-events:none/);
});
test('Escape prioritizes fullscreen viewer above gallery navigation',()=>{
  const code=src('docs/quality-v28.js');
  const nav=code.slice(code.indexOf('function navDismissLayer()'));
  assert.match(nav,/getElementById\('pp-file-viewer'\)/);
  assert.match(nav,/if\(fullscreenReader\?\.open\)\{fullscreenReader\.close\(\);return true\}/);
  assert.ok(nav.indexOf("getElementById('pp-file-viewer')")<nav.indexOf('orbitSelectedProject'));
});
test('all Project Planner file-click scripts are versioned to prevent old cached handlers',()=>{
  const html=src('docs/planner.html');
  for(const file of ['orbit.js','file-context.js','file-viewer.js','quality-v28.js']){
    assert.ok(html.includes('./'+file+'?v=20261123-fileclick-fix'),file);
  }
});
