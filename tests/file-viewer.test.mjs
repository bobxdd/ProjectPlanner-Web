import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const script=file('docs/file-viewer.js');

function fakeNode(tag){
 const listeners=new Map();
 const node={
  tagName:tag.toUpperCase(),className:'',dataset:{},hidden:false,
  textContent:'',innerHTML:'',open:false,disabled:false,style:{},
  children:[],isConnected:true,src:'',addEventListener(type,fn){listeners.set(type,fn)},
  append(...els){this.children.push(...els)},appendChild(el){this.children.push(el)},
  replaceChildren(...els){this.children=els},setAttribute(){},
  focus(){},click(){},
  showModal(){this.open=true},close(){this.open=false;listeners.get('close')?.()},
  querySelector(selector){
    if(tag==='dialog'){
      if(!this.refs)this.refs=new Map();
      if(!this.refs.has(selector))this.refs.set(selector,fakeNode(selector));
      return this.refs.get(selector);
    }
    return this.children.find(c=>c.className===selector.slice(1))||null;
  }
 };
 return node;
}
function harness(documents,loader){
 const calls={urls:[],revoked:[],windows:[],handlers:new Map(),loaded:[]};
 const body=fakeNode('body');
 const doc={activeElement:fakeNode('button'),body,createElement:fakeNode,
  addEventListener(type,fn){calls.handlers.set(type,fn)}};
 const url={createObjectURL(blob){const u='blob:file-viewer-test-'+(++calls.urls.length);calls.urls[calls.urls.length-1]=u;return u},
  revokeObjectURL(value){calls.revoked.push(value)}};
 const win={PlannerCloud:{fileBlob:async doc=>{calls.loaded.push(doc.id);return loader(doc)}},
  open(...args){calls.windows.push(args)}};
 const context={document:doc,window:win,DB:{documents},fileURL:d=>'https://example.invalid/'+d.id,
   URL:url,Blob,console,setTimeout,clearTimeout};
 runInNewContext(script,context,{filename:'docs/file-viewer.js'});
 return {api:win.PPFileViewer,calls,dialog:()=>body.children.find(c=>c.tagName==='DIALOG')};
}
const meta=(name,id='a'.repeat(24))=>({id,name,size:100,projectId:'project-1'});

test('fullscreen uses native modal with Escape-close lifecycle and focus management',async()=>{
 const h=harness([meta('notes.txt')],async()=>new Blob(['hello']));
 await h.api.open('a'.repeat(24));
 const d=h.dialog();
 assert.equal(d.open,true);
 assert.equal(d.id,'pp-file-viewer');
 assert.ok(script.includes("viewer.addEventListener('close',cleanup)"));
 assert.ok(script.includes('viewer.showModal()'));
 d.close();assert.equal(d.open,false);
});
test('user-provided HTML is shown as inert text, not executed as markup',async()=>{
 const doc=meta('untrusted.html');
 const unsafe='<img src=x onerror=alert(1)><script>alert(2)</script>';
 const h=harness([doc],async()=>new Blob([unsafe]));
 await h.api.open(doc.id);
 const view=h.dialog().querySelector('#ppfv-body');
 assert.equal(view.children[0].tagName,'PRE');
 assert.equal(view.children[0].textContent,unsafe);
 assert.equal(h.calls.urls.length,0);
});
test('PDF must have a real PDF header before receiving embeddable URL',async()=>{
 const d=meta('sample.pdf');
 const good=harness([d],async()=>new Blob(['%PDF-1.7 good']));
 await good.api.open(d.id);
 assert.equal(good.dialog().querySelector('#ppfv-body').children[0].tagName,'IFRAME');
 assert.equal(good.calls.urls.length,1);
 good.dialog().close();
 assert.equal(good.calls.revoked.length,1);
 const bad=harness([d],async()=>new Blob(['<html>not a pdf</html>']));
 await bad.api.open(d.id);
 assert.equal(bad.calls.urls.length,0);
 assert.equal(bad.dialog().querySelector('#ppfv-body').children[0].className,'ppfv-message');
});
test('Office archives are never sent to an external document converter',async()=>{
 const h=harness([meta('private.docx')],async()=>{throw Error('unexpected fetch')});
 await h.api.open('a'.repeat(24));
 assert.equal(h.calls.loaded.length,0);
 assert.equal(h.dialog().querySelector('#ppfv-body').children[0].className,'ppfv-message');
 h.api.openNewTab();
 assert.equal(h.calls.windows[0][0],'https://example.invalid/'+'a'.repeat(24));
 assert.equal(h.calls.windows[0][1],'_blank');
});
test('all file entrypoints default to fullscreen; explicit new-tab option is retained',()=>{
 const app=file('docs/app.js'),experience=file('docs/experience.js');
 const menu=file('docs/file-context.js'),html=file('docs/planner.html');
 assert.ok(app.includes('data-file-viewer='));
 assert.ok(experience.includes('data-file-viewer='));
 assert.ok(menu.includes("menuButton('new-tab','In neuem Tab öffnen'"));
 assert.ok(menu.includes('window.PPFileViewer?.open(d.id)'));
 assert.ok(!experience.includes('target="_blank"'));
 assert.ok(html.includes('./file-viewer.js'));
 assert.ok(html.includes('./file-viewer.css'));
});
test('private Supabase backend and 2-person revisions remain unchanged',()=>{
 const runtime=file('docs/cloud/runtime.js');
 const storage=file('docs/cloud/storage.js');
 assert.match(runtime,/async function storedFile\(id\)/);
 assert.match(runtime,/async function fileBlob\(doc\)/);
 assert.match(runtime,/planner_state_put/);
 assert.match(file('docs/app.js'),/async function desktopLiveRefresh/);
 assert.match(storage,/sign-download/);
 assert.match(storage,/planner-files/);
 assert.match(script,/window\.PlannerCloud\?\.fileBlob/);
});
