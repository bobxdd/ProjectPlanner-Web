'use strict';
// Project Planner. No external libraries, analytics, fonts, or network dependencies.
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>{const b=new Uint8Array(12);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,'0')).join('')};
const today=()=>new Date().toLocaleDateString('sv-SE');
const shortDate=v=>v?new Date(v+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'}):'—';
const bytes=n=>n>1024*1024?(n/1024/1024).toFixed(1)+' MB':n>1024?(n/1024).toFixed(0)+' KB':n+' B';
const sort=a=>[...a].sort((x,y)=>(x.order??0)-(y.order??0));
const ICONS={
 'grid':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 'layers':'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
 'book-open':'<path d="M12 7v14M3 18V5a2 2 0 0 1 2-2h3a4 4 0 0 1 4 4 4 4 0 0 1 4-4h3a2 2 0 0 1 2 2v13h-5a4 4 0 0 0-4 3 4 4 0 0 0-4-3H3Z"/>',
 'graduation-cap':'<path d="m2 10 10-6 10 6-10 6-10-6ZM6 12v5c4 3 8 3 12 0v-5M22 10v7"/>',
 'dumbbell':'<path d="m6.5 6.5 11 11M3 8l5-5M16 21l5-5M5 3 3 5l4 4 2-2-4-4ZM19 15l-4 4 2 2 4-4-2-2Z"/>',
 'leaf':'<path d="M20 4C9 4 4 10 4 16a4 4 0 0 0 4 4c7 0 13-5 12-16ZM4 20c5-5 8-8 13-11"/>',
 'briefcase':'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a30 30 0 0 0 18 0"/>',
 'code':'<path d="m8 8-4 4 4 4m8-8 4 4-4 4M14 4l-4 16"/>',
 'rocket':'<path d="M4 16c0-5 6-11 14-13l3 3c-2 8-8 14-13 14l-4-4ZM15 9h.01M4 16l-2 6 6-2M7 12H3v-3l4-3M12 17v4h3l3-4"/>',
 'house':'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3V10Z"/>',
 'folder':'<path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/>',
 'calendar':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 10h18"/>',
 'heart':'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 'star':'<path d="m12 2 3.1 6.4 7 1-5.1 5 1.2 7L12 18l-6.2 3.4 1.2-7-5.1-5 7-1L12 2Z"/>',
 'lightbulb':'<path d="M9 18h6m-5 4h4M8 14a7 7 0 1 1 8 0l-1 4H9l-1-4Z"/>',
 'chart':'<path d="M4 21V3M4 21h17M8 16l4-5 4 2 4-8"/>',
 'gamepad':'<path d="M6 8h12a4 4 0 0 1 4 4v4a3 3 0 0 1-5 2l-2-2H9l-2 2a3 3 0 0 1-5-2v-4a4 4 0 0 1 4-4ZM8 10v5M5.5 12.5h5M17 12h.01M19 14h.01"/>',
 'plane':'<path d="m22 2-9 20-3.5-8.5L1 10l21-8ZM9.5 13.5 22 2"/>',
 'paintbrush':'<path d="M14 4 20 10M13 5l5-3 4 4-3 5-7 7-6-6 7-7ZM5 14c-3 0-4 3-4 5 0 2 2 3 5 3 2 0 4-2 4-4"/>',
 'wrench':'<path d="M21 7a6 6 0 0 1-8 6L7 19a3 3 0 0 1-4-4l6-6a6 6 0 0 1 8-8l-4 4 4 4 4-4Z"/>',
 'archive':'<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v12h14V8M10 13h4"/>',
 'check':'<path d="m4 12 5 5L20 6"/>','plus':'<path d="M12 5v14M5 12h14"/>',
 'search':'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>','settings':'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19 13 2-1-2-4-2.2.7a8 8 0 0 0-2-1.3L14 5h-4l-.8 2.4a8 8 0 0 0-2 1.3L5 8l-2 4 2 1a8 8 0 0 0 .4 2L4 17l3 3 2-1a8 8 0 0 0 2 .4l1 2h3l1-2a8 8 0 0 0 2-.4l2 1 2-3-1.5-2a8 8 0 0 0 .5-2Z"/>',
 'file':'<path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM14 2v6h5M8 13h8M8 17h7"/>',
 'list':'<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
 'columns':'<rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/>',
 'route':'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h5a4 4 0 0 1 0 8h-2a4 4 0 0 0 0 4h5"/>',
 'arrow':'<path d="M5 12h14m-6-6 6 6-6 6"/>','chevron':'<path d="m9 18 6-6-6-6"/>',
 'x':'<path d="M18 6 6 18M6 6l12 12"/>','trash':'<path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
 'edit':'<path d="m4 17-1 4 4-1L20 7l-3-3L4 17ZM15 6l3 3"/>','download':'<path d="M12 3v12m-5-5 5 5 5-5M4 18v3h16v-3"/>',
 'upload':'<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>','clock':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'more':'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 'up':'<path d="m6 14 6-6 6 6"/>','down':'<path d="m6 10 6 6 6-6"/>', 'filter':'<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
 'circle':'<circle cx="12" cy="12" r="9"/>','pin':'<path d="m8 4 8 0 2 7-4 2-2 8-2-8-4-2 2-7Z"/>'
};
const icon=(name,extra='')=>`<svg class="${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.folder}</svg>`;
// Weitere Icons: Beruf, Alltag, Studium, Hobbys, Mobilitaet, Natur und Planung.
Object.assign(ICONS,{
 'pencil':'<path d="m4 20 4.8-.9L20 7.9 16.1 4 4.9 15.1 4 20ZM14.7 5.4l3.9 3.9"/>',
 'library':'<path d="M3 5v14M8 5v14M13 7v12M19 4l3 15M2 20h20"/>',
 'microscope':'<path d="m10 3 5 5-2 2-5-5 2-2Zm2 7-3 3m5-3a6 6 0 0 1 1 10M7 16a5 5 0 0 0 5 5M4 21h16M7 10l-2 2"/>',
 'calculator':'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2"/>',
 'flask':'<path d="M9 3h6m-4 0v7l-7 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-7-9V3M7 16h10"/>',
 'laptop':'<rect x="5" y="4" width="14" height="12" rx="1"/><path d="m2 20 3-4h14l3 4H2Z"/>',
 'clipboard':'<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6m-6 4h6"/>',
 'wallet':'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13m-2 10h5v5h-5a2.5 2.5 0 0 1 0-5Z"/>',
 'shopping-cart':'<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 4h2l3 12h12l3-9H5"/>',
 'utensils':'<path d="M4 2v8a3 3 0 0 0 6 0V2M7 2v20M18 22V2c-4 2-5 7-5 12h5"/>',
 'coffee':'<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm13 1h2a3 3 0 0 1 0 6h-2M8 3v3m5-3v3"/>',
 'camera':'<rect x="2" y="6" width="20" height="15" rx="2"/><circle cx="12" cy="13" r="4"/><path d="m7 6 2-3h6l2 3"/>',
 'music':'<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="16" rx="3" ry="2"/>',
 'globe':'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 6-5 12 0 18m0-18c5 6 5 12 0 18"/>',
 'map':'<path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2V5Zm6-2v15m6-12v15"/>',
 'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
 'tree':'<path d="m12 2 7 9h-4l5 7H4l5-7H5l7-9Zm0 16v4"/>',
 'sprout':'<path d="M12 22V11m0 5c-7 0-9-3-9-9 6 0 9 3 9 9Zm0-5c0-6 3-8 9-8 0 6-3 8-9 8Z"/>',
 'paw':'<circle cx="6" cy="8" r="1"/><circle cx="11" cy="5" r="1"/><circle cx="16" cy="6" r="1"/><circle cx="20" cy="10" r="1"/><path d="M7 18c-1-4 3-8 5-8s6 4 5 8c-1 4-4 0-5 0s-4 4-5 0Z"/>',
 'bike':'<circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-10 5 10H5m10 0 4-10h-4M8 7h4"/>',
 'target':'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 'trophy':'<path d="M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v2a5 5 0 0 0 4 5m10-7h4v2a5 5 0 0 1-4 5M12 14v5m-5 2h10m-8-2h6"/>',
 'car':'<path d="M5 16 7 7h10l2 9M3 16h18v4H3v-4ZM5 12h14M6 20v2m12-2v2"/>',
 'train':'<rect x="5" y="2" width="14" height="17" rx="3"/><path d="M5 10h14m-11 5h2m4 0h2M8 19l-2 3m10-3 2 3"/>',
 'gift':'<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12M3 9h18V5H3v4ZM12 9C5 9 6 3 9 3c2 0 3 4 3 6Zm0 0c7 0 6-6 3-6-2 0-3 4-3 6Z"/>',
 'users':'<circle cx="9" cy="7" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2H2Zm14-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 4 5v1h-5"/>',
 'clock':'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 'flag':'<path d="M5 22V3m0 2c6-4 8 4 15 0v11c-7 4-9-4-15 0"/>',
 'shield':'<path d="m12 2 9 4v6c0 6-3 9-9 11-6-2-9-5-9-11V6l9-4Zm-4 10 3 3 5-6"/>',
 'database':'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
 'phone':'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
 'package':'<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm-9 5 9 5 9-5m-9 5v10M7 4l9 5"/>',
 'home-work':'<path d="m2 11 10-9 10 9v11H2V11Zm6 11v-8h8v8"/>'
});
const ICON_LABELS={layers:'Grundlagen', 'book-open':'Lesen', 'graduation-cap':'Studium', dumbbell:'Training', leaf:'Natur', briefcase:'Beruf',code:'Programmieren',rocket:'Ideen',house:'Haushalt',folder:'Ordner',calendar:'Termine',heart:'Gesundheit',star:'Favoriten',lightbulb:'Ideen',chart:'Statistik',gamepad:'Spiele',plane:'Reisen',paintbrush:'Gestaltung',wrench:'Werkzeug',archive:'Archiv',pencil:'Schreiben',library:'Bibliothek',microscope:'Forschung',calculator:'Rechnen',flask:'Labor',laptop:'Computer',clipboard:'Aufgaben',wallet:'Finanzen','shopping-cart':'Einkaufen',utensils:'Kochen',coffee:'Kaffee',camera:'Fotos',music:'Musik',globe:'Welt',map:'Karten',sun:'Sonne',tree:'Bäume',sprout:'Pflanzen',paw:'Tiere',bike:'Fahrrad',target:'Ziele',trophy:'Erfolge',car:'Auto',train:'Bahn',gift:'Geschenke',users:'Gemeinschaft',clock:'Zeit',flag:'Meilensteine',shield:'Sicherheit',database:'Daten',phone:'Telefon',package:'Pakete','home-work':'Zuhause'};
const CHOICES=['layers','book-open','graduation-cap','dumbbell','leaf','briefcase','code','rocket','house','folder','calendar','heart','star','lightbulb','chart','gamepad','plane','paintbrush','wrench','archive','pencil','library','microscope','calculator','flask','laptop','clipboard','wallet','shopping-cart','utensils','coffee','camera','music','globe','map','sun','tree','sprout','paw','bike','target','trophy','car','train','gift','users','clock','flag','shield','database','phone','package','home-work'];
// Additional semantic symbol variants. All paths are local, editable SVG.
Object.assign(ICONS,{
 'book-closed':'<path d="M6 3h13v18H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm0 0v18m3-13h7m-7 4h6"/>',
 'notebook':'<rect x="5" y="2" width="16" height="20" rx="2"/><path d="M9 2v20M2 7h5M2 12h5M2 17h5M12 8h6M12 12h5"/>',
 'beaker':'<path d="M4 4h16M7 4v8L3 20h18l-4-8V4M6 16h12"/>',
 'terminal':'<rect x="2" y="3" width="20" height="18" rx="3"/><path d="m6 9 3 3-3 3m6 0h5"/>',
 'server':'<rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/><path d="M7 7h.01m0 10h.01M12 7h6m-6 10h6"/>',
 'cpu':'<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>',
 'monitor':'<rect x="2" y="3" width="20" height="15" rx="2"/><path d="M12 18v4m-6 0h12"/>',
 'flower':'<circle cx="12" cy="12" r="2.5"/><path d="M12 9C7 1 4 5 9 12c-8-4-10 1-2 3 0 8 5 8 5 0 3 8 8 5 5 0 8-3 6-8-2-5 6-7 3-11-3-4Z"/>',
 'seedling':'<path d="M12 21V9m0 7c-6 0-9-4-8-9 6 0 8 2 8 9Zm0-6c0-6 4-7 9-7 0 6-3 9-9 9ZM6 21h12"/>',
 'mountain':'<path d="m2 21 7-13 4 7 3-5 6 11H2ZM11 21l5-11M9 8l2 4-2-1-2 1"/>',
 'waves':'<path d="M2 7c3 0 3-3 6-3s3 3 6 3 3-3 6-3M2 13c3 0 3-3 6-3s3 3 6 3 3-3 6-3M2 20c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/>',
 'running':'<circle cx="15" cy="4" r="2"/><path d="m8 9 4-2 5 3-2 4 5 4m-8-6-5 4-4 5m9-6-1 6m-6-12 4-3"/>',
 'activity':'<path d="M2 12h5l3-8 4 16 3-8h5"/>',
 'basketball':'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M6 5c7 4 7 10 12 14M18 5C11 9 11 15 6 19"/>',
 'folder-open':'<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h6a2 2 0 0 1 2 2v3M3 10h18l-3 10H6L3 10Z"/>',
 'files-stack':'<path d="M7 3h9l4 4v13H7V3Zm9 0v4h4M4 6H3v15h13v-1M10 12h7m-7 4h7"/>',
 'key':'<circle cx="8" cy="9" r="5"/><path d="m12 13 9 9m-4-4 3-3m-6 0 3-3"/>',
 'washing-machine':'<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="14" r="5"/><path d="M7 6h2m4 0h4"/>',
 'palette':'<path d="M12 2c-6 0-10 5-10 10s4 10 10 10c2 0 3-1 3-3 0-1-1-2-1-3s1-2 2-2h3c4 0 4-4 2-7-2-3-5-5-9-5ZM7 10h.01M11 6h.01M17 8h.01M6 15h.01"/>',
 'film':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 3v18M16 3v18M3 8h5M16 8h5M3 16h5M16 16h5"/>',
 'image':'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
 'bus':'<rect x="4" y="2" width="16" height="18" rx="3"/><path d="M4 10h16m-12 6h2m4 0h2M8 20v2m8-2v2"/>',
 'compass':'<circle cx="12" cy="12" r="9"/><path d="m15 9-2 5-5 1 2-5 5-1Z"/>',
 'suitcase':'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3M9 21v1m6-1v1M3 14h18"/>',
 'building':'<rect x="4" y="3" width="16" height="19" rx="1"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 22v-4h4v4"/>',
 'hammer':'<path d="m15 3 6 6-3 3-6-6m2 4L5 20l-2 1 1-4 9-9M14 3H7L3 7l4 4"/>'
});
const EXTRA_ICON_LABELS={'book-closed':'Buch','notebook':'Notizbuch',beaker:'Versuch',terminal:'Konsole',server:'Server',cpu:'Prozessor',monitor:'Bildschirm',flower:'Blume',seedling:'Keimling',mountain:'Berge',waves:'Wasser',running:'Laufen',activity:'Aktivität',basketball:'Ballsport','folder-open':'Geöffneter Ordner','files-stack':'Dokumente',key:'Schlüssel','washing-machine':'Wäsche',palette:'Farbpalette',film:'Film',image:'Bild',bus:'Bus',compass:'Kompass',suitcase:'Gepäck',building:'Gebäude',hammer:'Handwerk'};
Object.assign(ICON_LABELS,EXTRA_ICON_LABELS);
CHOICES.push(...Object.keys(EXTRA_ICON_LABELS));
const ICON_FAMILIES=[
 ['learn','Studium & Lernen',['graduation-cap','book-open','book-closed','notebook','library','pencil','calculator','microscope','flask','beaker']],
 ['tech','Technik & Software',['code','terminal','laptop','monitor','server','database','cpu','phone','gamepad']],
 ['nature','Natur & Garten',['leaf','sprout','seedling','tree','flower','sun','mountain','waves','paw']],
 ['fitness','Sport & Gesundheit',['dumbbell','running','bike','basketball','activity','target','trophy','heart']],
 ['organize','Organisation & Dateien',['layers','grid','folder','folder-open','files-stack','archive','calendar','clipboard','chart','flag','clock']],
 ['daily','Alltag & Zuhause',['house','home-work','shopping-cart','wallet','utensils','coffee','key','washing-machine','users','gift']],
 ['creative','Kreativität & Medien',['paintbrush','palette','camera','image','film','music','star','lightbulb']],
 ['travel','Mobilität & Reisen',['plane','train','car','bus','map','globe','compass','suitcase']],
 ['work','Beruf & Projekte',['briefcase','building','wrench','hammer','rocket','shield','package']]
];
function iconFamilyPicker(chosenIcon='',activeIcon=chosenIcon){
 const covered=new Set(ICON_FAMILIES.flatMap(f=>f[2]));
 const groups=[...ICON_FAMILIES];const remaining=CHOICES.filter(i=>!covered.has(i));if(remaining.length)groups.push(['extra','Weitere',remaining]);
 return `<div class="icon-family-picker" id="icon-picker">${groups.map(([key,label,items])=>{
 const hasCurrent=items.includes(chosenIcon),isOpen=hasCurrent;
 return `<section class="icon-family" data-family="${key}"><button class="icon-family-toggle" type="button" data-icon-family-toggle="${key}" aria-expanded="${isOpen}" aria-controls="family-${key}"><span class="icon-family-3d">${icon(items[0])}</span><span class="icon-family-name"><strong>${esc(label)}</strong><small>${items.length} Symbolvarianten</small></span><span class="icon-family-count" aria-label="Weitere Varianten">+${Math.max(0,items.length-1)}</span><span class="icon-family-chevron">${icon('down')}</span></button><div id="family-${key}" class="icon-family-options" ${isOpen?'':'hidden'}>${items.map(ic=>`<button type="button" class="icon-choice icon-choice--3d ${ic===activeIcon?'active':''}" data-icon-choice="${esc(ic)}" title="${esc(ICON_LABELS[ic]||ic)}" aria-label="${esc(ICON_LABELS[ic]||ic)}" aria-pressed="${ic===activeIcon}"><span class="icon-3d-object">${icon(ic)}</span><span class="icon-choice-label">${esc(ICON_LABELS[ic]||ic)}</span></button>`).join('')}</div></section>`}).join('')}</div>`;
}
const COLORS=['#bba8f8','#85b8f1','#7ad9c4','#f5bd8d','#ec91b0','#d5cd7e','#a2b5cb','#ca9df0','#88d6e7','#b5d995','#dca4ff','#7e8cff','#73c2fa','#67cfad','#a6e08b','#e6d28b','#ed9c65','#ef7f84','#d37bbd','#bb8bdb','#93a1b8','#b4b1a2','#fcbece','#67b5aa'];
const MODULE_SIZE_OPTIONS=[['compact','Kompakt'],['standard','Standard'],['large','Groß']];
const moduleSize=v=>['compact','standard','large'].includes(v)?v:'standard';
const modulePositionOptions=(items,selected)=>items.map((item,i)=>`<option value="${i}" ${item.id===selected?'selected':''}>${i+1} · ${esc(item.title||WIDGET_NAMES[item.kind]||item.kind)}</option>`).join('');
const WIDGET_NAMES={focus:'Nächste Aufgaben',projects:'Projekte',progress:'Fortschritt',due:'Termine',categories:'Kategorien',documents:'Dateien',inbox:'Datei-Eingang'};
const NAV=[['home','Übersicht','grid'],['roadmap','Fahrplan','route'],['tasks','Aufgaben','list'],['files','Dateien','file']];
let DB=null,secret='',persistRevision=1,saveTimer=null,saveQueue=Promise.resolve(),toastTimer=null,dragged=null,liveDesktopConflict=null,liveDesktopSaving=0,liveDesktopRefreshing=false,liveDesktopPending=false;
let ui={view:'home',category:'all',project:'',taskFilter:'all',taskLayout:'list',search:'',fileProject:'all'};
const modal=$('#modal'),searchModal=$('#search-modal');
const getCat=id=>DB.categories.find(c=>c.id===id);
const getProject=id=>DB.projects.find(p=>p.id===id);
const getStage=id=>DB.stages.find(p=>p.id===id);
const getTask=id=>DB.tasks.find(p=>p.id===id);
const getStatus=id=>DB.statuses.find(p=>p.id===id)||DB.statuses[0];
const catColor=project=>getCat(project?.categoryId)?.color||'#bba8f8';
const visibleProjects=()=>sort(DB.projects.filter(p=>ui.category==='all'||p.categoryId===ui.category));
const filteredTasks=()=>DB.tasks.filter(t=>(ui.category==='all'||getProject(t.projectId)?.categoryId===ui.category)&&(ui.project===''||ui.view!=='roadmap'||t.projectId===ui.project));
const projectTasks=projectId=>DB.tasks.filter(t=>t.projectId===projectId);
const isDone=t=>!!getStatus(t.status)?.isDone;
const progress=tasks=>tasks.length?Math.round(tasks.filter(isDone).length/tasks.length*100):0;
const btt=(label,action,cls='btn',opts='')=>`<button class="${cls}" data-action="${action}" ${opts}>${label}</button>`;
const actionIcon=(action,label,iconName,opts='')=>`<button class="icon-btn" type="button" data-action="${action}" title="${esc(label)}" aria-label="${esc(label)}" ${opts}>${icon(iconName)}</button>`;
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3400)}
async function request(url,options={}){const headers={...options.headers};if(options.method&&options.method!=='GET')headers['X-Project-Planner-Token']=secret;else headers['X-Project-Planner-Token']=secret;
 const res=window.PlannerCloud ? await window.PlannerCloud.request(url,{...options,headers,cache:'no-store'}) : await fetch(url,{...options,headers,cache:'no-store'});if(!res.ok){let text='';try{text=(await res.json()).error||''}catch{}{const err=Error(text||'Fehler '+res.status);err.status=res.status;throw err}};return res}
async function getState(){DB=await (await request('/api/state')).json();persistRevision=DB.revision;syncPrefs();render()}
// Quiet desktop refresh when the PWA edits a project. An active editor or
// pending desktop save is never replaced by an incoming server state.
function desktopCanRefresh(){
 const active=document.activeElement;
 const editing=active&&active.matches?.('input,textarea,select,[contenteditable="true"]');
 return !liveDesktopConflict && !saveTimer && !liveDesktopSaving && !dragged && !editing && !modal.open && !searchModal.open;
}
async function desktopLiveRefresh(){
 if(!secret || !DB || liveDesktopRefreshing || document.hidden)return;
 liveDesktopRefreshing=true;
 try{
  const probe=await(await request('/api/revision')).json();
  if(!Number.isSafeInteger(probe.revision) || probe.revision<=persistRevision)return;
  if(!desktopCanRefresh()){liveDesktopPending=true;return}
  const newState=await(await request('/api/state')).json();
  if(!desktopCanRefresh()){liveDesktopPending=true;return}
  if(!Number.isSafeInteger(newState.revision) || newState.revision<=persistRevision)return;
  DB=newState;persistRevision=newState.revision;syncPrefs();render();
  liveDesktopPending=false;
  const el=document.querySelector('#desktop-live-status');if(el)el.textContent='Mit Tablet/Handy aktualisiert';
 }catch(e){console.debug('Live-Abgleich der Desktop-Oberfläche:',e.message)}
 finally{liveDesktopRefreshing=false}
}
function desktopWatchChanges(){
 setInterval(()=>{if(!document.hidden)desktopLiveRefresh()},2500);
 window.addEventListener('focus',desktopLiveRefresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)desktopLiveRefresh()});
 document.addEventListener('focusout',()=>{if(liveDesktopPending)setTimeout(desktopLiveRefresh,300)});
}
// A simultaneous mobile write can cause the desktop's full-state PUT to
// receive 409. Do not silently reload or overwrite unsaved desktop work.
// A clear, exceptional recovery banner replaces repeated confirmations.
function showDesktopConflict(state){
 liveDesktopConflict=state;
 let bar=document.querySelector('#desktop-live-conflict');
 if(!bar){bar=document.createElement('section');bar.id='desktop-live-conflict';bar.setAttribute('role','alert');bar.className='desktop-live-conflict';
  bar.innerHTML='<strong>Gleichzeitige Änderung erkannt</strong><span>Dein letzter Desktop-Stand wurde nicht gespeichert. Die PC-Version wurde zwischenzeitlich von einem gekoppelten Gerät geändert.</span><button type="button" id="desktop-conflict-export">Meine ungespeicherten Änderungen sichern (JSON)</button><button type="button" id="desktop-conflict-reload">Aktuellen PC-Stand laden</button>';
  const view=document.querySelector('#view');view?.parentNode?.insertBefore(bar,view);
  bar.querySelector('#desktop-conflict-export').onclick=()=>{const data=JSON.stringify({app:'Project Planner',kind:'uncommitted-desktop-state',savedAt:new Date().toISOString(),state:liveDesktopConflict});const u=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='Project-Planner-UNGESPEICHERTE-Desktop-Aenderungen.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),30000)};
  bar.querySelector('#desktop-conflict-reload').onclick=async()=>{if(!confirm('Ungespeicherte Änderungen in dieser Ansicht verwerfen und den neuen PC-Stand laden? Sichere sie vorher bei Bedarf als JSON.'))return;liveDesktopConflict=null;bar.remove();await getState();};
 }
}
function syncPrefs(){document.body.classList.toggle('reduce-motion',!!DB.prefs.reduceMotion);document.body.classList.toggle('compact',!!DB.prefs.compact)}
function mutate(fn){fn();DB.updatedAt=new Date().toISOString();syncPrefs();render();queueSave()}
function runSave(){if(liveDesktopConflict){toast('Ungespeicherte Änderung zuerst sichern oder Konflikt klären.');return saveQueue}const snapshot=structuredClone(DB);liveDesktopSaving++;saveQueue=saveQueue.then(async()=>{snapshot.revision=persistRevision;const res=await request('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(snapshot)});const result=await res.json();persistRevision=result.revision;DB.revision=result.revision}).catch(e=>{if(e.status===409)showDesktopConflict(snapshot);toast('Speichern fehlgeschlagen: '+e.message);console.error(e)}).finally(()=>{liveDesktopSaving--});return saveQueue}
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{saveTimer=null;runSave()},200)}
async function flushSave(){if(saveTimer){clearTimeout(saveTimer);saveTimer=null;runSave()}await saveQueue}
function render(){if(!DB)return;const categories=sort(DB.categories);
 $('#primary-nav').innerHTML=NAV.map(([key,label,glyph])=>`<button class="side-item ${ui.view===key?'active':''}" data-nav="${key}">${icon(glyph)}<span class="label">${label}</span></button>`).join('');
 $('#sidebar-categories').innerHTML=`<button class="side-item side-category ${ui.category==='all'?'active':''}" data-category="all">${icon('grid')}<span class="label">Alle Bereiche</span><small class="side-count">${DB.projects.length}</small></button>`+categories.map(c=>`<button class="side-item side-category ${ui.category===c.id?'active':''}" data-category="${esc(c.id)}" draggable="true" data-drag="category:${esc(c.id)}" data-drop="category:${esc(c.id)}"><span class="cat-dot" style="--cat:${esc(c.color)}">${icon(c.icon)}</span><span class="label">${esc(c.name)}</span><span class="drag-handle" title="Kategorie verschieben" aria-hidden="true">⠿</span></button>`).join('');
 $('#settings-icon').innerHTML=icon('settings');$('#search-symbol').innerHTML=icon('search');$('#top-settings-icon').innerHTML=icon('settings');$('#search-dialog-symbol').innerHTML=icon('search');
 const category=ui.category==='all'?'Alle Bereiche':(getCat(ui.category)?.name||'Alle Bereiche');
 $('#breadcrumb').innerHTML=`Project Planner ${icon('chevron','inline-icon')} <strong>${esc(ui.view==='home'?category:NAV.find(n=>n[0]===ui.view)?.[1]||'Einstellungen')}</strong>`;
 if(ui.view==='home')renderHome();else if(ui.view==='roadmap')renderRoadmap();else if(ui.view==='tasks')renderTasks();else if(ui.view==='files')renderFiles();else renderSettings();
}
function header(title,eyebrow,caption,actions=''){return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${esc(title)}</h1>${caption?`<p class="lede">${esc(caption)}</p>`:''}</div>${actions?`<div class="heading-actions">${actions}</div>`:''}</div>`}
function hero(){const tasks=filteredTasks(),active=tasks.filter(t=>!isDone(t)).length,completed=tasks.filter(isDone).length;return `<div class="hero-strip"><div style="position:relative;z-index:1"><strong>${esc(ui.category==='all'?'Projektübersicht':getCat(ui.category)?.name||'Projektübersicht')}</strong><div class="hero-meta"><span><b>${visibleProjects().length}</b> Projekte</span><span><b>${active}</b> offene Aufgaben</span><span><b>${completed}</b> erledigt</span></div></div><div class="orb-scene" aria-hidden="true"><div class="orb orb-back"></div><div class="orb"></div></div></div>`}
function widgetFrame(w,html){
 const closed=!!w.collapsed,label=w.title||WIDGET_NAMES[w.kind]||w.kind;
 return `<section class="widget glass dashboard-module-card module-size-${moduleSize(w.size)} ${w.wide?'wide':''} ${closed?'is-collapsed':''}" data-drop="widget:${esc(w.id)}" aria-label="${esc(label)}">
 <header class="surface-title module-header"><h2>${esc(label)}</h2><div class="widget-controls">
 <button class="handle-btn module-drag" draggable="true" data-drag="widget:${esc(w.id)}" aria-label="${esc(label)} mit der Maus verschieben" title="Zum Verschieben ziehen">⠿</button>
 <button class="icon-btn small module-expand" type="button" data-action="widget-collapse" data-id="${esc(w.id)}" aria-expanded="${closed?'false':'true'}" aria-controls="widget-body-${esc(w.id)}" aria-label="${esc(label)} ${closed?'ausklappen':'einklappen'}" title="${closed?'Ausklappen':'Einklappen'}">${icon(closed?'down':'up')}</button>
 <button class="icon-btn small" type="button" data-action="edit-widget" data-id="${esc(w.id)}" title="Größe und Darstellung" aria-label="${esc(label)} Einstellungen">${icon('settings')}</button></div></header>
 <div class="module-collapsed-summary" ${closed?'':'hidden'}>Eingeklappt · Über den Pfeil wieder öffnen</div>
 <div class="surface-body" id="widget-body-${esc(w.id)}" ${closed?'hidden':''}>${closed?'':html}</div></section>`;
}
function empty(title,actionLabel='',action=''){return `<div class="empty"><strong>${esc(title)}</strong>${actionLabel?btt(icon('plus')+esc(actionLabel),action,'btn mini'):''}</div>`}
function taskMini(t){const p=getProject(t.projectId),s=getStatus(t.status);return `<div class="quick-task"><span class="status-mark" style="--status:${esc(s.color)}">${isDone(t)?icon('check'):icon('circle')}</span><div class="task-main"><strong title="${esc(t.title)}">${esc(t.title)}</strong><small>${esc(p?.name||'Projekt')} ${t.dueDate?' · '+esc(shortDate(t.dueDate)):''}</small></div>${t.dueDate&&t.dueDate<today()&&!isDone(t)?'<span class="tag warn">Überfällig</span>':''}<button class="row-open" data-task="${esc(t.id)}" title="Aufgabe öffnen">${icon('chevron')}</button></div>`}
function projectCard(p){const tasks=projectTasks(p.id),pct=progress(tasks),color=catColor(p),cat=getCat(p.categoryId);return `<button class="project-card" data-project="${esc(p.id)}" style="--cat:${esc(color)}" title="Bereich öffnen"><span class="project-icon">${icon(p.icon||cat?.icon||'folder')}</span><strong>${esc(p.name)}</strong><small>${esc(cat?.name||'')} · ${tasks.length} Aufgaben · ${pct}%</small><div class="progress-track"><span style="width:${pct}%"></span></div></button>`}
function widgetContent(w){const kind=w.kind;const projects=w.projectId?DB.projects.filter(p=>p.id===w.projectId):w.categoryId?sort(DB.projects.filter(p=>p.categoryId===w.categoryId)):visibleProjects();const projectIDs=new Set(projects.map(p=>p.id));const tasks=(w.projectId||w.categoryId)?DB.tasks.filter(t=>projectIDs.has(t.projectId)):filteredTasks();switch(kind){
 case 'focus':{const sorted=[...tasks].filter(t=>!isDone(t)).sort((a,b)=>{const ap=a.dueDate||'9999',bp=b.dueDate||'9999';const score=t=>t.status==='doing'?0:t.priority==='high'?1:2;return score(a)-score(b)||ap.localeCompare(bp)||(a.order||0)-(b.order||0)}).slice(0,6);return sorted.length?sorted.map(taskMini).join(''):empty('Keine offenen Aufgaben','Aufgabe hinzufügen','add-task')}
 case 'projects':return projects.length?`<div class="project-grid">${projects.slice(0,4).map(projectCard).join('')}</div>`:empty('Keine Projekte vorhanden','Projekt erstellen','add-project');
 case 'progress':{const pct=progress(tasks),done=tasks.filter(isDone).length,doing=tasks.filter(t=>!isDone(t)&&t.status!=='open').length;return `<div class="widget-stat"><div class="stat-ring" style="--p:${pct}%"><b>${pct}%</b></div><div class="stat-values"><div class="stat-value"><span>Gesamt</span><strong>${tasks.length}</strong></div><div class="stat-value"><span>In Bearbeitung</span><strong>${doing}</strong></div><div class="stat-value"><span>Erledigt</span><strong>${done}</strong></div></div></div>`}
 case 'due':{const due=[...tasks].filter(t=>t.dueDate&&!isDone(t)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,6);return due.length?due.map(t=>`<div class="due-row"><span class="tag ${t.dueDate<today()?'warn':''}">${esc(shortDate(t.dueDate))}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</span><button class="row-open" data-task="${esc(t.id)}">${icon('chevron')}</button></div>`).join(''):empty('Keine offenen Termine')}
 case 'categories':return `<div class="cat-tiles">${sort(DB.categories).map(c=>`<button class="cat-tile" data-category="${esc(c.id)}"><span class="cat-dot" style="--cat:${esc(c.color)}">${icon(c.icon)}</span><span><strong>${esc(c.name)}</strong><small>${DB.projects.filter(p=>p.categoryId===c.id).length} Projekte</small></span></button>`).join('')}</div>`;
 case 'documents':{const visible=new Set(projects.map(p=>p.id));const files=DB.documents.filter(d=>visible.has(d.projectId)).slice(-5).reverse();return files.length?files.map(d=>`<div class="file-row" data-file-id="${esc(d.id)}" tabindex="0"><span class="file-icon">${icon('file')}</span><div class="file-main"><strong>${esc(d.name)}</strong><small>${esc(getProject(d.projectId)?.name||'')} · ${bytes(d.size)}</small></div><button type="button" class="btn mini" data-file-viewer="${esc(d.id)}" title="Datei im Vollbild öffnen">${icon('file')} Öffnen</button></div>`).join(''):empty('Keine Dateien vorhanden')}
 case 'inbox':{const files=DB.documents.filter(d=>!d.projectId).slice(-6).reverse();return files.length?files.map(d=>`<div class="file-row" data-file-id="${esc(d.id)}" tabindex="0"><span class="file-icon">${icon('file')}</span><div class="file-main"><strong>${esc(d.name)}</strong><small>Unzugeordnet · ${bytes(d.size)}</small></div><button type="button" class="btn mini" data-file-viewer="${esc(d.id)}" title="Datei im Vollbild öffnen">${icon('file')} Öffnen</button></div>`).join('')+`<button type="button" class="detail-link" data-nav="files">Zum Datei-Eingang ${icon('arrow')}</button>`:empty('Keine unzugeordneten Dateien');}
 case 'notes':return w.body?`<div style="white-space:pre-wrap;color:var(--sub);font-size:12.5px;line-height:1.8">${esc(w.body)}</div>`:empty('Keine Notizen eingetragen');
 default:return ''}}
function renderHome(){const name=ui.category==='all'?'Übersicht':getCat(ui.category)?.name||'Übersicht';const actions=btt(icon('plus')+'Neue Aufgabe','add-task','btn primary')+btt(icon('plus')+'Projekt','add-project');
 $('#view').innerHTML=header(name,'ÜBERSICHT','Projekte, Aufgaben und Dateien an einem Ort.',actions)+hero()+`<div class="toolbar"><div class="toolbar-left"><span class="muted tiny">${visibleProjects().length} Projekte · ${filteredTasks().length} Aufgaben</span></div><div class="toolbar-right">${btt(icon('settings')+'Module anpassen','widget-settings','btn mini')}</div></div><div class="widget-grid">${sort(DB.dashboard.filter(w=>w.visible)).map(w=>widgetFrame(w,widgetContent(w))).join('')||empty('Keine Module aktiviert','Module einrichten','widget-settings')}</div>`}
function projectPicker(){const projects=visibleProjects();if(!projects.some(p=>p.id===ui.project)){ui.project=projects[0]?.id||''};return `<select id="roadmap-project" class="field-select" aria-label="Projekt auswählen">${projects.map(p=>`<option value="${esc(p.id)}" ${p.id===ui.project?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`}
function stageCard(st,i){const tasks=sort(DB.tasks.filter(t=>t.stageId===st.id)),pct=progress(tasks),done=tasks.filter(isDone).length;return `<article class="stage-card glass" draggable="true" data-drag="stage:${esc(st.id)}" data-drop="stage:${esc(st.id)}"><div class="stage-top"><div><div class="stage-index">PHASE ${String(i+1).padStart(2,'0')}</div><h3>${esc(st.title)}</h3>${st.description?`<p>${esc(st.description)}</p>`:''}</div><div class="stage-actions"><button class="handle-btn" title="Phase ziehen" aria-label="Phase verschieben">⠿</button>${actionIcon('edit-stage','Phase bearbeiten','edit',`data-id="${esc(st.id)}"`)}</div></div><div class="stage-progress"><div class="progress-track"><span style="width:${pct}%;--cat:#b8a6f4"></span></div><small>${done} / ${tasks.length} erledigt</small></div><div class="stage-tasks">${tasks.length?tasks.map(t=>`<div class="stage-task-row" draggable="true" data-drag="task:${esc(t.id)}" data-drop="stage:${esc(st.id)}"><button data-task="${esc(t.id)}">${esc(t.title)}</button><span class="tag" style="color:${esc(getStatus(t.status).color)}">${esc(getStatus(t.status).label)}</span></div>`).join(''):'<div class="help">Noch keine Aufgaben in dieser Phase.</div>'}</div><div class="stage-footer"><button class="text-link tiny" data-action="add-task" data-stage-id="${esc(st.id)}">${icon('plus','inline-icon')} Aufgabe hinzufügen</button><div>${actionIcon('stage-up','Nach oben','up',`data-id="${esc(st.id)}"`)} ${actionIcon('stage-down','Nach unten','down',`data-id="${esc(st.id)}"`)}</div></div></article>`}
function renderRoadmap(){const projects=visibleProjects();let actions=btt(icon('plus')+'Projekt','add-project');if(projects.length)actions=btt(icon('plus')+'Phase','add-stage','btn primary')+btt(icon('edit')+'Projekt bearbeiten','edit-project','btn',`data-id="${esc(ui.project)}"`)+actions;
 const selected=projects.some(x=>x.id===ui.project)?ui.project:projects[0]?.id;ui.project=selected||'';const p=getProject(ui.project);const stages=sort(DB.stages.filter(x=>x.projectId===ui.project));const unassigned=sort(DB.tasks.filter(t=>t.projectId===ui.project&&!t.stageId));
 $('#view').innerHTML=header('Fahrplan','PROJEKTSTRUKTUR','Phasen erstellen, verschieben und Aufgaben zuordnen.',actions)+`<div class="toolbar"><div class="toolbar-left">${projects.length?projectPicker():''}</div><div class="toolbar-right"><span class="muted tiny">${stages.length} Phasen · ${projectTasks(ui.project).length} Aufgaben</span></div></div>`+(p?`<div class="hero-strip" style="--accent:${esc(catColor(p))}"><div style="z-index:1;position:relative"><strong>${esc(p.name)}</strong><span class="muted tiny">${esc(p.description||getCat(p.categoryId)?.name||'')}</span><div class="hero-meta"><span><b>${progress(projectTasks(p.id))}%</b> erledigt</span><span><b>${stages.length}</b> Phasen</span></div></div><div class="orb-scene" aria-hidden="true"><div class="orb orb-back"></div><div class="orb"></div></div></div><div class="roadmap-scene">${stages.map(stageCard).join('')||empty('Noch keine Phasen','Phase hinzufügen','add-stage')}${unassigned.length?`<section class="stage-card glass"><h3>Ohne Phase</h3><div class="stage-tasks">${unassigned.map(t=>`<div class="stage-task-row"><button data-task="${esc(t.id)}">${esc(t.title)}</button></div>`).join('')}</div></section>`:''}</div>`:empty('Noch keine Projekte','Projekt erstellen','add-project'));
}
function taskToolbar(){const statusOptions=sort(DB.statuses).map(s=>`<option value="${esc(s.id)}" ${ui.taskFilter===s.id?'selected':''}>${esc(s.label)}</option>`).join('');return `<div class="toolbar"><div class="toolbar-left"><select id="task-filter" class="field-select" aria-label="Aufgabenstatus"><option value="all">Alle Status</option>${statusOptions}</select><input class="text-field filter-input" id="task-search" placeholder="Aufgaben filtern …" value="${esc(ui.search)}" aria-label="Aufgaben filtern"></div><div class="toolbar-right"><div class="segmented"><button data-layout="list" class="${ui.taskLayout==='list'?'active':''}">${icon('list','inline-icon')} Liste</button><button data-layout="board" class="${ui.taskLayout==='board'?'active':''}">${icon('columns','inline-icon')} Board</button></div></div></div>`}
function matchingTasks(){const q=ui.search.trim().toLocaleLowerCase('de-DE');return sort(DB.tasks.filter(t=>{const p=getProject(t.projectId);if(ui.category!=='all'&&p?.categoryId!==ui.category)return false;if(ui.taskFilter!=='all'&&ui.taskFilter!==t.status)return false;return !q||[t.title,t.description,p?.name,...(t.tags||[])].some(s=>String(s||'').toLocaleLowerCase('de-DE').includes(q))}))}
function renderTaskTable(tasks){return `<div class="task-table glass"><div class="task-table-head"><span>Aufgabe</span><span>Status</span><span>Bereich</span><span>Priorität</span><span>Termin</span><span></span></div>${tasks.length?tasks.map(t=>{const p=getProject(t.projectId),stat=getStatus(t.status);return `<div class="task-table-row"><div class="task-title-cell"><span class="status-mark" style="--status:${esc(stat.color)}">${isDone(t)?icon('check'):icon('circle')}</span><div class="task-name"><strong>${esc(t.title)}</strong><small>${esc((t.tags||[]).join(' · ')||getStage(t.stageId)?.title||'Ohne Phase')}</small></div></div><select class="field-select task-status-inline" aria-label="Status von ${esc(t.title)}" data-status-task="${esc(t.id)}">${sort(DB.statuses).map(s=>`<option value="${esc(s.id)}" ${s.id===t.status?'selected':''}>${esc(s.label)}</option>`).join('')}</select><span class="muted tiny">${esc(p?.name||'—')}</span><span class="tag ${t.priority==='high'?'warn':''}">${t.priority==='high'?'Hoch':t.priority==='low'?'Niedrig':'Normal'}</span><span class="muted tiny">${esc(shortDate(t.dueDate))}</span><button class="row-open" data-task="${esc(t.id)}" title="Aufgabe öffnen">${icon('chevron')}</button></div>`}).join(''):empty('Keine passenden Aufgaben','Aufgabe hinzufügen','add-task')}</div>`}
function renderTaskBoard(tasks){return `<div class="kanban" style="grid-template-columns:repeat(${Math.max(1,DB.statuses.length)},minmax(230px,1fr))">${sort(DB.statuses).map(s=>{const group=tasks.filter(t=>t.status===s.id);return `<section class="kanban-col" data-drop="status:${esc(s.id)}"><div class="kanban-head"><strong><span class="status-mark" style="--status:${esc(s.color)};display:inline-grid;vertical-align:middle;margin-right:7px">${icon('circle')}</span>${esc(s.label)}</strong><span class="tag">${group.length}</span></div>${group.map(t=>`<div class="kanban-item" draggable="true" data-drag="task:${esc(t.id)}" data-drop="status:${esc(s.id)}"><strong><button class="text-link" data-task="${esc(t.id)}" style="text-align:left;color:inherit">${esc(t.title)}</button></strong><small>${esc(getProject(t.projectId)?.name||'')} ${t.dueDate?'· '+shortDate(t.dueDate):''}</small><div class="tags">${(t.tags||[]).slice(0,3).map(tag=>`<span class="tag">${esc(tag)}</span>`).join('')}</div></div>`).join('')}${btt(icon('plus')+'Aufgabe','add-task','btn mini ghost',`data-status-id="${esc(s.id)}"`)}</section>`}).join('')}</div>`}
function renderTasks(){const tasks=matchingTasks();$('#view').innerHTML=header('Aufgaben','AUFGABENVERWALTUNG','Alle Aufgaben zentral bearbeiten und filtern.',btt(icon('plus')+'Neue Aufgabe','add-task','btn primary'))+taskToolbar()+(ui.taskLayout==='board'?renderTaskBoard(tasks):renderTaskTable(tasks))}
const fileURL=d=>window.PlannerCloud ? window.PlannerCloud.fileUrl(d) : `/api/files/${encodeURIComponent(d.id)}?key=${encodeURIComponent(secret)}`;
function renderFiles(){const projects=visibleProjects(),visible=new Set(projects.map(p=>p.id));let docs=[...DB.documents].filter(d=>visible.has(d.projectId)||!d.projectId);if(ui.fileProject!=='all')docs=docs.filter(d=>ui.fileProject==='inbox'?!d.projectId:d.projectId===ui.fileProject);docs.reverse();const options=projects.map(p=>`<option value="${esc(p.id)}" ${ui.fileProject===p.id?'selected':''}>${esc(p.name)}</option>`).join('');
 $('#view').innerHTML=header('Dateien','DOKUMENTENVERWALTUNG','Anhänge zu Bereichen und Aufgaben. PDFs, Word, Excel und weitere Formate.',btt(icon('upload')+'Dateien hinzufügen','upload-files','btn primary'))+`<div class="toolbar"><div class="toolbar-left"><select id="file-filter" class="field-select"><option value="all">Alle Bereiche und Eingang</option><option value="inbox" ${ui.fileProject==='inbox'?'selected':''}>Datei-Eingang</option>${options}</select></div><div class="toolbar-right"><small class="muted">${docs.length} Dateien</small></div></div><div class="file-grid glass">${docs.length?docs.map(d=>`<div class="file-row" data-file-id="${esc(d.id)}" tabindex="0"><div class="file-icon">${icon('file')}</div><div class="file-main"><strong>${esc(d.name)}</strong><small>${esc(getProject(d.projectId)?.name||'Datei-Eingang')} ${d.taskId?' · '+esc(getTask(d.taskId)?.title||'Aufgabe'):''} · ${bytes(d.size)} · ${esc(shortDate(d.createdAt?.slice(0,10)))}</small></div><div class="file-actions"><button type="button" class="btn mini" data-file-viewer="${esc(d.id)}">${icon('file')} Öffnen</button><button type="button" class="btn mini" data-annotate-file="${esc(d.id)}">✎ Anmerkungen</button>${btt(icon('trash'),'delete-file','btn mini danger',`data-id="${esc(d.id)}"`)}</div></div>`).join(''):empty('Noch keine Dateien','Dateien hinzufügen','upload-files')}</div>`}
function renderSettings(){const actions=btt(icon('download')+'Sicherung erstellen','backup','btn primary');$('#view').innerHTML=header('Einstellungen','ANPASSUNG','Kategorien, Ansichten, Status und Datensicherung verwalten.',actions)+`<div class="settings-layout"><section class="settings-panel glass"><h2>Kategorien</h2><p>Eigene Namen, Symbole, Farben und Reihenfolgen.</p><div class="category-editor">${sort(DB.categories).map(c=>`<div class="edit-row" draggable="true" data-drag="category:${esc(c.id)}" data-drop="category:${esc(c.id)}"><span class="cat-dot" style="--cat:${esc(c.color)}">${icon(c.icon)}</span><span class="grow"><strong>${esc(c.name)}</strong><small>${DB.projects.filter(p=>p.categoryId===c.id).length} Projekte</small></span>${btt(icon('edit'),'edit-category','btn mini',`data-id="${esc(c.id)}"`)}</div>`).join('')}</div>${btt(icon('plus')+'Kategorie hinzufügen','add-category','btn mini')}</section>
 <section class="settings-panel glass"><h2>Übersicht</h2><p>Module ein- und ausblenden, Breite bestimmen und sortieren.</p><p class="help">Position und Standardgrößen stellst du zentral über „Module verwalten“ ein.</p>${btt(icon('settings')+'Module verwalten','widget-settings','btn mini')}</section>
 <section class="settings-panel glass"><h2>Aufgabenstatus</h2><p>Statusnamen, Farben und die Kennzeichnung „erledigt“ anpassen.</p><div class="status-editor">${sort(DB.statuses).map(s=>`<div class="edit-row"><span class="status-mark" style="--status:${esc(s.color)}">${icon(s.isDone?'check':'circle')}</span><div class="grow"><strong>${esc(s.label)}</strong><small>${s.isDone?'Abgeschlossen':'Offen'}</small></div>${btt(icon('edit'),'edit-status','btn mini',`data-id="${esc(s.id)}"`)}</div>`).join('')}</div>${btt(icon('plus')+'Status hinzufügen','add-status','btn mini')}</section>
 <section class="settings-panel glass"><h2>Darstellung</h2><p>Dunkles Glasdesign mit zurückhaltenden räumlichen Elementen.</p><label class="setting-toggle"><input id="pref-motion" type="checkbox" ${DB.prefs.reduceMotion?'checked':''}> Animationen reduzieren</label><label class="setting-toggle"><input id="pref-compact" type="checkbox" ${DB.prefs.compact?'checked':''}> Kompakte Darstellung</label></section>
 <section class="settings-panel glass"><h2>Datensicherung</h2><p>ZIP-Sicherung einschließlich der angehängten Dateien (bis 200 MB). Ein Import ist zum Schutz bestehender Projekte nur in einem leeren Webkonto möglich.</p><div style="display:flex;gap:8px;flex-wrap:wrap">${btt(icon('download')+'Exportieren','backup','btn mini')}${btt(icon('upload')+'Importieren','import','btn mini')}</div><p class="data-note">Bestehende Projekte bleiben beim Import unverändert. Erstelle regelmäßig eigene Sicherungen.</p></section>
 <section class="settings-panel glass"><h2>Speicherung</h2><p>Deine privaten Projekte und Dateien liegen geschützt in deinem Webkonto. GitHub Pages speichert selbst keine Projektdaten. Gemeinsame Projekte mit anderen Konten sind noch nicht aktiviert.</p><span class="tag">Webversion · angemeldetes Konto</span><p class="data-note">Supabase Auth, private Datenbank und geschützter Dateispeicher. Zurzeit nur dein eigener Arbeitsbereich.</p>${btt('Abmelden','quit-app','btn mini')}</section></div>`}
function goto(view){if(!NAV.some(n=>n[0]===view)&&view!=='settings')return;ui.view=view;ui.search='';render();window.scrollTo({top:0,behavior:'instant'});history.replaceState(null,'','#/'+view)}
function selectCategory(cid){ui.category=cid;if(ui.view==='roadmap')ui.project='';render();window.scrollTo({top:0,behavior:'instant'})}
function selectProject(pid){ui.project=pid;const p=getProject(pid);if(p)ui.category=p.categoryId;goto('roadmap')}
function dialog(title,subtitle,form){modal.innerHTML=`<div class="modal-head"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><button type="button" class="icon-btn" data-action="close-modal" title="Schließen">${icon('x')}</button></div><div class="modal-content">${form}</div>`;modal.showModal()}
function footer(save='Speichern',deleteAction='',deleteID=''){return `<div class="modal-footer">${deleteAction?btt(icon('trash')+'Löschen',deleteAction,'btn danger mini',`data-id="${esc(deleteID)}"`):'<span></span>'}<div class="right">${btt('Abbrechen','close-modal','btn ghost') }<button type="submit" class="btn primary">${esc(save)}</button></div></div>`}
function optionList(items,selected,emptyText=''){return `${emptyText?`<option value="">${esc(emptyText)}</option>`:''}`+items.map(([v,label])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(label)}</option>`).join('')}
function openCategory(cid=''){
 const c=getCat(cid),chosenIcon=c?.icon||'layers',chosenColor=c?.color||COLORS[0];
 const html=`<form id="category-form" data-edit="${esc(cid)}"><label class="form-field"><span>Projektname</span><input class="text-field" name="name" value="${esc(c?.name||'')}" required maxlength="120" autocomplete="off" placeholder="Projektname"></label><div class="form-field"><span>Projekt-Symbol</span>${iconFamilyPicker(chosenIcon)}</div><div class="form-field"><span>Farbe</span><div class="color-row" id="color-picker">${COLORS.map(color=>`<button type="button" data-color-choice="${color}" class="color-swatch ${color===chosenColor?'active':''}" style="--swatch:${color}" title="${color}"></button>`).join('')}<input type="color" class="custom-color" name="color" value="${esc(chosenColor)}" title="Eigene Farbe wählen"></div></div><input type="hidden" name="icon" value="${esc(chosenIcon)}"><div class="picker-title"><small class="picker-help">Projektsymbol und Farbe zurücksetzen</small><button type="button" class="btn mini ghost" data-action="reset-category-style">${icon('x')} Zurücksetzen</button></div><p class="muted tiny">Zum Teilen dieses gesamten Projekts oben auf „Projekt verbinden“ und anschließend „Projekt teilen“ klicken.</p>${footer(c?'Änderungen speichern':'Projekt erstellen',c?'delete-category':'',cid)}</form>`;
 dialog(c?'Projekt bearbeiten':'Projekt erstellen','Das oberste Projekt enthält alle seine Bereiche.',html)
}
function openProject(pid=''){const p=getProject(pid);const cats=sort(DB.categories);dialog(p?'Projekt bearbeiten':'Projekt erstellen','Projekt einem Bereich zuordnen.',`<form id="project-form" data-edit="${esc(pid)}"><label class="form-field"><span>Projektname</span><input class="text-field" name="name" required maxlength="180" value="${esc(p?.name||'')}" autocomplete="off" placeholder="Projektname"></label><label class="form-field"><span>Kategorie</span><select class="field-select" name="categoryId">${optionList(cats.map(c=>[c.id,c.name]),p?.categoryId|| (ui.category==='all'?cats[0]?.id:ui.category))}</select></label><label class="form-field"><span>Beschreibung</span><textarea class="textarea" name="description" maxlength="10000" placeholder="Optional">${esc(p?.description||'')}</textarea></label>${footer(p?'Änderungen speichern':'Projekt erstellen',p?'delete-project':'',pid)}</form>`)}
function openStage(stageID=''){let st=getStage(stageID);const p=getProject(st?.projectId||ui.project)||visibleProjects()[0];if(!p){toast('Bitte zuerst einen Bereich erstellen.');openProject();return}dialog(st?'Phase bearbeiten':'Phase erstellen','Phasen bestimmen die Reihenfolge im Fahrplan.',`<form id="stage-form" data-edit="${esc(stageID)}" data-project="${esc(p.id)}"><label class="form-field"><span>Phasenname</span><input class="text-field" required maxlength="180" name="title" value="${esc(st?.title||'')}" autocomplete="off" placeholder="Zum Beispiel: Vorbereitung"></label><label class="form-field"><span>Beschreibung (optional)</span><textarea class="textarea" name="description" maxlength="5000">${esc(st?.description||'')}</textarea></label>${footer(st?'Änderungen speichern':'Phase erstellen',st?'delete-stage':'',stageID)}</form>`)}
let draftChecklist=[];
function checklistRows(){return `<div id="checklist-rows">${draftChecklist.map(item=>`<div class="subtask-row"><input type="checkbox" data-check-id="${esc(item.id)}" ${item.done?'checked':''}><span style="text-decoration:${item.done?'line-through':'none'}">${esc(item.title)}</span><button type="button" data-check-delete="${esc(item.id)}" aria-label="Entfernen">×</button></div>`).join('')}</div>`}
function taskDocumentRows(taskID){const docs=DB.documents.filter(d=>d.taskId===taskID);return docs.length?docs.map(d=>`<div class="file-mini" data-file-id="${esc(d.id)}" tabindex="0">${icon('file')}<strong title="${esc(d.name)}">${esc(d.name)}</strong><small>${bytes(d.size)}</small><button type="button" class="text-link" data-file-viewer="${esc(d.id)}">Öffnen</button><button class="text-link" type="button" data-annotate-file="${esc(d.id)}">✎ Bearbeitungsebene</button><button class="icon-btn small" type="button" data-action="delete-file" data-id="${esc(d.id)}" title="Anhang löschen">${icon('trash')}</button></div>`).join(''):''}
function openTask(tid='',overrides={}){const t=getTask(tid),projects=sort(DB.projects);if(!projects.length){toast('Bitte zuerst einen Bereich erstellen.');openProject();return};let project=t?.projectId||overrides.projectId||ui.project||projects[0].id;if(!getProject(project))project=projects[0].id;const stages=sort(DB.stages.filter(s=>s.projectId===project));draftChecklist=structuredClone(t?.checklist||[]);
 const form=`<form id="task-form" data-edit="${esc(tid)}"><label class="form-field"><span>Aufgabe</span><input class="text-field" name="title" required maxlength="300" value="${esc(t?.title||'')}" placeholder="Aufgabenname" autocomplete="off"></label><div class="form-two"><label class="form-field"><span>Bereich</span><select name="projectId" id="task-project" class="field-select">${optionList(projects.map(p=>[p.id,p.name]),project)}</select></label><label class="form-field"><span>Fahrplanphase</span><select name="stageId" id="task-stage" class="field-select">${optionList(stages.map(s=>[s.id,s.title]),t?.stageId||overrides.stageId||'','Ohne Phase')}</select></label></div><div class="form-two"><label class="form-field"><span>Status</span><select name="status" class="field-select">${optionList(sort(DB.statuses).map(s=>[s.id,s.label]),t?.status||overrides.status||DB.statuses[0].id)}</select></label><label class="form-field"><span>Priorität</span><select name="priority" class="field-select">${optionList([['low','Niedrig'],['normal','Normal'],['high','Hoch']],t?.priority||'normal')}</select></label></div><div class="form-two"><label class="form-field"><span>Farbe der Aufgabe</span><input type="color" class="custom-color" name="color" value="${esc(t?.color||projectColor(getProject(project)))}"></label></div><div class="form-two"><label class="form-field"><span>Termin (optional)</span><input type="date" name="dueDate" class="text-field" value="${esc(t?.dueDate||'')}"></label><label class="form-field"><span>Tags (durch Komma getrennt)</span><input name="tags" class="text-field" value="${esc((t?.tags||[]).join(', '))}" maxlength="1000" placeholder="Tag 1, Tag 2"></label></div><label class="form-field"><span>Beschreibung / Notizen</span><textarea name="description" class="textarea" maxlength="50000" placeholder="Beschreibung und freie Notizen">${esc(t?.description||'')}</textarea></label><div class="dialog-section"><h3>Checkliste</h3>${checklistRows()}<div class="subtask-add"><input type="text" class="text-field" id="subtask-input" maxlength="200" placeholder="Neuer Unterpunkt">${btt(icon('plus'),'add-check','btn mini')}</div></div><div class="dialog-section"><h3>Dateianhänge</h3>${t?taskDocumentRows(t.id):'<p class="help">Dateien werden beim Speichern der neuen Aufgabe hinzugefügt.</p>'}<label class="attach-drop" id="task-drop">${icon('upload')}<span>Hier Dateien auswählen oder ablegen (max. 100 MB je Datei)</span><input id="task-files" type="file" multiple></label><div id="selected-files" class="help"></div></div>${footer(t?'Änderungen speichern':'Aufgabe erstellen',t?'delete-task':'',tid)}</form>`;
 dialog(t?'Aufgabe bearbeiten':'Neue Aufgabe','Aufgaben können mit einer Fahrplanphase und Dateien verknüpft werden.',form);
}
function openWidgets(){
 const items=sort(DB.dashboard);
 dialog('Module der Übersicht','Position, Breite, Höhe und Sichtbarkeit einstellen. Ziehen ist optional.',`<div class="widget-config module-config-list">${items.map(w=>`<div class="edit-row module-config-row" data-drop="widget:${esc(w.id)}"><button type="button" class="handle-btn module-drag" draggable="true" data-drag="widget:${esc(w.id)}" title="Zum Verschieben ziehen" aria-label="${esc(w.title||WIDGET_NAMES[w.kind]||w.kind)} ziehen">⠿</button><span class="grow module-config-name"><strong>${esc(w.title||WIDGET_NAMES[w.kind]||w.kind)}</strong></span><label class="module-config-control">Position<select class="field-select module-pos-select" data-widget-position="${esc(w.id)}" aria-label="Position von ${esc(w.title||WIDGET_NAMES[w.kind]||w.kind)}">${modulePositionOptions(items,w.id)}</select></label><label class="module-config-control">Höhe<select class="field-select module-size-select" data-widget-size="${esc(w.id)}" aria-label="Größe von ${esc(w.title||WIDGET_NAMES[w.kind]||w.kind)}">${optionList(MODULE_SIZE_OPTIONS,moduleSize(w.size))}</select></label><label class="module-config-control">Breite<select class="field-select module-width-select" data-widget-width="${esc(w.id)}"><option value="half" ${w.wide?'':'selected'}>Halb</option><option value="full" ${w.wide?'selected':''}>Voll</option></select></label><label class="module-config-check">Sichtbar<input type="checkbox" data-widget-visible="${esc(w.id)}" ${w.visible?'checked':''}></label><button class="icon-btn small" data-action="edit-widget" data-id="${esc(w.id)}" title="Weitere Einstellungen" aria-label="${esc(w.title||WIDGET_NAMES[w.kind]||w.kind)} bearbeiten">${icon('edit')}</button><button class="icon-btn small delete-inline" data-action="delete-widget" data-id="${esc(w.id)}" title="Modul löschen" aria-label="Modul ${esc(w.title||WIDGET_NAMES[w.kind]||w.kind)} löschen">${icon('trash')}</button></div>`).join('')}</div><div class="modal-footer">${btt(icon('plus')+'Modul hinzufügen','add-widget','btn mini')}<div class="right">${btt('Schließen','close-modal','btn')}</div></div>`)
}
function openWidgetEditor(wid=''){const w=DB.dashboard.find(x=>x.id===wid);const catItems=sort(DB.categories).map(c=>[c.id,c.name]),projectItems=sort(DB.projects).map(p=>[p.id,p.name]);const kinds=[...Object.entries(WIDGET_NAMES),['notes','Freie Notizen']];
 dialog(w?'Modul bearbeiten':'Modul hinzufügen','Typ, Titel, Projektbezug und Größe bestimmen.',`<form id="widget-form" data-edit="${esc(wid)}"><label class="form-field"><span>Modultyp</span><select class="field-select" name="kind">${optionList(kinds,w?.kind||'focus')}</select></label><label class="form-field"><span>Eigener Titel (optional)</span><input name="title" class="text-field" maxlength="120" value="${esc(w?.title||'')}" placeholder="Modultitel"></label><div class="form-two"><label class="form-field"><span>Nur dieses Projekt (optional)</span><select name="categoryId" class="field-select">${optionList(catItems,w?.categoryId||'','Alle Kategorien')}</select></label><label class="form-field"><span>Nur diesen Bereich (optional)</span><select name="projectId" class="field-select">${optionList(projectItems,w?.projectId||'','Alle Projekte')}</select></label></div><label class="form-field"><span>Inhalt (für Notizmodule)</span><textarea name="body" class="textarea" maxlength="20000" placeholder="Eigener Text">${esc(w?.body||'')}</textarea></label><label class="form-field"><span>Modulhöhe</span><select class="field-select" name="size">${optionList(MODULE_SIZE_OPTIONS,moduleSize(w?.size))}</select></label><label class="setting-toggle"><input name="wide" type="checkbox" ${w?.wide?'checked':''}> Über die ganze Breite anzeigen</label><label class="setting-toggle"><input name="visible" type="checkbox" ${w?.visible??true?'checked':''}> Modul anzeigen</label>${footer(w?'Änderungen speichern':'Modul hinzufügen',w?'delete-widget':'',wid)}</form>`)
}
function openStatus(sid=''){const st=DB.statuses.find(s=>s.id===sid);dialog(st?'Status bearbeiten':'Status erstellen','Statusname und Abschlussverhalten bearbeiten.',`<form id="status-form" data-edit="${esc(sid)}"><label class="form-field"><span>Name</span><input name="label" class="text-field" required maxlength="80" value="${esc(st?.label||'')}"></label><label class="form-field"><span>Farbe</span><input type="color" name="color" class="custom-color" value="${esc(st?.color||COLORS[0])}"></label><label class="setting-toggle"><input type="checkbox" name="isDone" ${st?.isDone?'checked':''}> Aufgaben in diesem Status gelten als erledigt</label>${footer(st?'Änderungen speichern':'Status erstellen',st?'delete-status':'',sid)}</form>`)}
function openUpload(){
 const projects=visibleProjects();
 const selected=ui.fileProject==='inbox'?'':(ui.fileProject!=='all'?ui.fileProject:(projects[0]?.id||''));
 const targets=[['','Datei-Eingang (später zuordnen)'],...projects.map(p=>[p.id,p.name])];
 dialog('Dateien hinzufügen','Im Datei-Eingang sammeln oder direkt einem Projekt zuordnen.',
 `<form id="upload-form"><label class="form-field"><span>Speicherort</span><select class="field-select" name="projectId" id="upload-project">${optionList(targets,selected)}</select></label><label class="form-field"><span>Aufgabe (optional)</span><select class="field-select" name="taskId" id="upload-task"><option value="">Ohne Aufgabe</option>${DB.tasks.filter(t=>t.projectId===selected).map(t=>`<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('')}</select></label><label class="attach-drop" id="global-drop">${icon('upload')}<span>PDF, DOCX, XLSX, Bilder und weitere Dateien auswählen</span><input name="files" type="file" id="global-files" multiple required></label><p class="help" id="upload-selection">Maximal 20 Dateien pro Upload, insgesamt höchstens 100 MB.</p>${footer('Dateien hinzufügen')}</form>`)
}

async function uploadFiles(files,projectId,taskId=''){if(!files?.length)return;const form=new FormData();form.append('projectId',projectId);form.append('taskId',taskId);for(const f of files)form.append('files',f,f.name);const res=await request('/api/upload',{method:'POST',body:form});const answer=await res.json();await getState();toast(answer.uploaded.length+' Datei(en) gespeichert.');return answer}
let activeDeleteAnchor=null;
function confirmDelete(message,anchor=activeDeleteAnchor){return deleteConfirmPopover(message,anchor)}
async function deleteFile(fid,anchor){const doc=DB.documents.find(d=>d.id===fid);if(!doc)return;if(!await confirmDelete('Datei „'+doc.name+'“ in den Papierkorb verschieben?',anchor))return;await flushSave();await request('/api/delete/'+fid,{method:'DELETE'});await getState();if(modal.open){modal.close()};toast('Datei im Papierkorb.')}
function moveInList(list,id1,id2){const items=sort(list);const from=items.findIndex(x=>x.id===id1),to=items.findIndex(x=>x.id===id2);if(from<0||to<0||from===to)return false;const [item]=items.splice(from,1);items.splice(to,0,item);items.forEach((item,i)=>item.order=i);return true}
function moveStage(id1,id2){const st=getStage(id1),other=getStage(id2);if(!st||!other||st.projectId!==other.projectId)return;mutate(()=>moveInList(DB.stages.filter(s=>s.projectId===st.projectId),id1,id2))}
function moveCategory(id1,id2){mutate(()=>moveInList(DB.categories,id1,id2))}
function moveWidget(id1,id2){mutate(()=>moveInList(DB.dashboard,id1,id2));if(modal.open&&modal.innerHTML.includes('widget-config'))openWidgetsRefresh()}
function openWidgetsRefresh(){if(!modal.open)return;const focus=document.activeElement;modal.close();openWidgets();if(focus?.focus){} }
function moveViaButton(list,cid,direction){const sorted=sort(list),i=sorted.findIndex(x=>x.id===cid),next=sorted[i+direction];if(next)mutate(()=>moveInList(list,cid,next.id))}
function searchOpen(){searchModal.showModal();$('#quick-search-input').value='';updateSearch();$('#quick-search-input').focus()}
function updateSearch(){const q=$('#quick-search-input').value.trim().toLocaleLowerCase('de-DE');let hits=[];
 for(const p of DB.projects){if(!q||p.name.toLocaleLowerCase('de-DE').includes(q))hits.push({type:'project',id:p.id,title:p.name,sub:'Projekt · '+(getCat(p.categoryId)?.name||'')})}
 for(const t of DB.tasks){if(!q||[t.title,t.description,(t.tags||[]).join(' ')].some(text=>String(text||'').toLocaleLowerCase('de-DE').includes(q)))hits.push({type:'task',id:t.id,title:t.title,sub:'Aufgabe · '+(getProject(t.projectId)?.name||'')})}
 for(const d of DB.documents){if(!q||d.name.toLocaleLowerCase('de-DE').includes(q))hits.push({type:'file',id:d.id,title:d.name,sub:'Datei · '+(getProject(d.projectId)?.name||'')})}
 $('#quick-search-results').innerHTML=`<div class="search-results">${hits.slice(0,32).map(h=>`<button class="search-hit" data-search-type="${h.type}" data-search-id="${esc(h.id)}">${icon(h.type==='project'?'folder':h.type==='file'?'file':'check')}<span class="search-text"><strong>${esc(h.title)}</strong><small>${esc(h.sub)}</small></span>${icon('chevron')}</button>`).join('')||'<div class="empty">Keine Ergebnisse.</div>'}</div>`}
async function onClickAction(el){const action=el.dataset.action,related=el.dataset.id;if(action.startsWith('delete-'))activeDeleteAnchor=el;if(action==='close-modal'){modal.close();return};if(action==='open-settings'){goto('settings');return};if(action==='search'){searchOpen();return};if(action==='add-category'){openCategory();return};if(action==='edit-category'){openCategory(related);return};if(action==='add-project'){openProject();return};if(action==='edit-project'){openProject(related||ui.project);return};if(action==='add-stage'){openStage();return};if(action==='edit-stage'){openStage(related);return};if(action==='add-task'){openTask('',{projectId:ui.view==='roadmap'?ui.project:undefined,stageId:el.dataset.stageId,status:el.dataset.statusId});return};if(action==='widget-settings'){openWidgets();return};if(action==='add-widget'){openWidgetEditor();return};if(action==='edit-widget'){openWidgetEditor(related);return};if(action==='add-status'){openStatus();return};if(action==='edit-status'){openStatus(related);return};if(action==='upload-files'){openUpload();return};if(action==='backup'){downloadBackup();return};if(action==='quit-app'){quitApp();return};if(action==='import'){importBackup();return};if(action==='delete-file'){deleteFile(related,el).catch(e=>toast(e.message));return};if(action==='add-check'){const input=$('#subtask-input');const title=input?.value.trim();if(!title)return;draftChecklist.push({id:id(),title,done:false});$('#checklist-rows').outerHTML=checklistRows();input.value='';input.focus();return};if(action==='stage-up'){moveViaButton(DB.stages.filter(s=>s.projectId===getStage(related)?.projectId),related,-1);return};if(action==='stage-down'){moveViaButton(DB.stages.filter(s=>s.projectId===getStage(related)?.projectId),related,1);return}
 if(action==='widget-collapse'){const w=DB.dashboard.find(w=>w.id===related);if(w)mutate(()=>w.collapsed=!w.collapsed);return}
 if(action==='widget-up'||action==='widget-down'){
  const list=sort(DB.dashboard.filter(w=>w.visible)),i=list.findIndex(w=>w.id===related),j=i+(action==='widget-up'?-1:1);
  if(i>=0&&j>=0&&j<list.length)moveWidget(list[i].id,list[j].id);return;
 }
 if(action==='delete-widget'){const w=DB.dashboard.find(x=>x.id===related);if(!w||!await confirmDelete('Modul „'+(w.title||WIDGET_NAMES[w.kind]||w.kind)+'“ aus der Übersicht löschen?'))return;mutate(()=>DB.dashboard=DB.dashboard.filter(x=>x.id!==related));if(modal.open)modal.close();toast('Modul gelöscht.');return}
 if(action==='delete-category'){
   const c=getCat(related);if(!c)return;
   const count=DB.projects.filter(x=>x.categoryId===related).length;
   const explanation=count?'Die '+count+' zugehörigen Bereiche bleiben erhalten und werden einer anderen Kategorie zugeordnet.':'Die Kategorie wird entfernt. Es werden keine Bereiche gelöscht.';
   if(!await confirmDelete('Kategorie „'+c.name+'“ löschen?\n\n'+explanation))return;
   mutate(()=>{
     let target=sort(DB.categories.filter(x=>x.id!==related))[0];
     if(!target){target={id:id(),name:'Allgemein',color:COLORS[0],icon:'layers',order:0};DB.categories.push(target)}
     for(const project of DB.projects)if(project.categoryId===related)project.categoryId=target.id;
     for(const widget of DB.dashboard)if(widget.categoryId===related)widget.categoryId=target.id;
     DB.categories=DB.categories.filter(x=>x.id!==related);
     if(ui.category===related)ui.category='all';
   });if(modal.open)modal.close();toast('Kategorie gelöscht.');return;
 }
 if(action==='delete-project'){
   const p=getProject(related);if(!p)return;
   const tasks=DB.tasks.filter(t=>t.projectId===p.id).length,files=DB.documents.filter(d=>d.projectId===p.id).length,notes=(DB.notes||[]).filter(n=>n.projectId===p.id&&!n.title?.startsWith('PP-OVERLAY-V1:')).length;
   if(!await confirmDelete('Bereich „'+p.name+'“ in den Papierkorb verschieben?\n\nMit verschoben werden '+tasks+' Aufgaben, '+files+' Dateien und '+notes+' Notizen sowie alle Fahrplanphasen.\n\nDu kannst den Bereich samt Inhalt im Papierkorb wiederherstellen.'))return;
   deleteProject(p.id).catch(e=>toast('Löschen fehlgeschlagen: '+e.message));return;
 }
 if(action==='delete-task'){
   const t=getTask(related);if(!t)return;
   if(!await confirmDelete('Aufgabe „'+t.title+'“ löschen?\nDateianhänge und zugeordnete Notizen bleiben im Bereich erhalten.'))return;
   mutate(()=>{DB.tasks=DB.tasks.filter(x=>x.id!==t.id);for(const note of (DB.notes||[]))if(note.taskId===t.id)note.taskId='';});
   if(modal.open)modal.close();toast('Aufgabe gelöscht.');return;
 }
 if(action==='delete-stage'){
   const st=getStage(related);if(!st)return;
   if(!await confirmDelete('Fahrplanphase „'+st.title+'“ löschen? Die Aufgaben bleiben erhalten und werden keiner Phase mehr zugeordnet.'))return;
   mutate(()=>{DB.stages=DB.stages.filter(x=>x.id!==st.id);DB.tasks.forEach(t=>{if(t.stageId===st.id)t.stageId=''})});
   if(modal.open)modal.close();toast('Phase gelöscht.');return;
 }
 if(action==='delete-status'){
   const st=DB.statuses.find(x=>x.id===related);
   if(!st||DB.statuses.length<=1){toast('Mindestens ein Status muss bleiben.');return}
   if(!await confirmDelete('Status „'+st.label+'“ löschen? Aufgaben werden auf einen vorhandenen Status umgestellt.'))return;
   mutate(()=>{DB.statuses=DB.statuses.filter(x=>x.id!==st.id);DB.tasks.forEach(t=>{if(t.status===st.id)t.status=DB.statuses[0].id})});
   if(modal.open)modal.close();toast('Status gelöscht.');return;
 }
}
async function deleteProject(pid){
 // The server owns physical file deletion and removes files only AFTER successful state persistence.
 await flushSave();
 if(!getProject(pid))return;
 mutate(()=>{
   DB.projects=DB.projects.filter(p=>p.id!==pid);
   DB.stages=DB.stages.filter(st=>st.projectId!==pid);
   DB.tasks=DB.tasks.filter(t=>t.projectId!==pid);
   DB.documents=DB.documents.filter(d=>d.projectId!==pid);
   DB.notes=(DB.notes||[]).filter(n=>n.projectId!==pid);
   DB.dashboard.forEach(w=>{if(w.projectId===pid)w.projectId=''});
   if(ui.project===pid)ui.project='';
   if(ui.fileProject===pid)ui.fileProject='all';
   if(ui.view==='topic'&&ui.project==='')ui.view='home';
   if(typeof roadmapProjectId!=='undefined'&&roadmapProjectId===pid)roadmapProjectId='';
   if(typeof orbitSelectedProject!=='undefined'&&orbitSelectedProject===pid)orbitSelectedProject=null;
 });
 await flushSave();
 await getState();
 if(getProject(pid))throw new Error('Der Bereich konnte nicht dauerhaft gelöscht werden. Bitte Speicherung und Datenstand prüfen.');
 if(modal.open)modal.close();
 toast('Bereich im Papierkorb.');
}
async function quitApp(){try{await flushSave();if(window.PlannerCloud){await window.PlannerCloud.client.auth.signOut();location.replace('./index.html');return;}await request('/api/quit',{method:'POST'});document.body.innerHTML='<main style="display:grid;place-items:center;min-height:100vh;background:#090a0f;color:#f3f3fc;font:16px system-ui"><div>Project Planner wurde beendet. Dieses Fenster kann geschlossen werden.</div></main>';setTimeout(()=>window.close(),100)}catch(e){toast('Beenden fehlgeschlagen: '+e.message)}}
async function downloadBackup(){await flushSave();try{const res=await request('/api/backup');const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Project-Planner-Backup-'+today()+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('Sicherung erstellt.')}catch(e){toast('Export fehlgeschlagen: '+e.message)}}
function importBackup(){const input=document.createElement('input');input.type='file';input.accept='.zip,application/zip';input.onchange=async()=>{const file=input.files?.[0];if(!file||!window.confirm('Die Sicherung kann nur in ein leeres Webkonto importiert werden. Bestehende Projektdaten werden NICHT überschrieben. Import fortsetzen?'))return;await flushSave();try{
 const options={method:'POST',body:file,headers:{'Content-Type':'application/zip'}};
 const res=await request('/api/import',options);
 const ans=await res.json();modal.close();ui.category='all';ui.project='';await getState();toast(ans.legacy?'Alter Aufgabenstand importiert.':'Sicherung importiert.');
 }catch(e){toast('Import fehlgeschlagen: '+e.message)}};input.click()}
// All entry interactions share event delegation to support freshly rendered views.
document.addEventListener('click',event=>{const action=event.target.closest('[data-action]');if(action){event.preventDefault();onClickAction(action).catch(err=>toast(err.message));return};const nav=event.target.closest('[data-nav]');if(nav){goto(nav.dataset.nav);return};const category=event.target.closest('[data-category]');if(category){selectCategory(category.dataset.category);return};const project=event.target.closest('button[data-project],a[data-project]');if(project){selectProject(project.dataset.project);return};const task=event.target.closest('[data-task]');if(task){openTask(task.dataset.task);return};const sr=event.target.closest('[data-search-type]');if(sr){searchModal.close();if(sr.dataset.searchType==='project')selectProject(sr.dataset.searchId);else if(sr.dataset.searchType==='task')openTask(sr.dataset.searchId);else{const doc=DB.documents.find(d=>d.id===sr.dataset.searchId);if(doc)window.PPFileViewer?.open(doc.id).catch(err=>toast(err.message))}return};const layout=event.target.closest('[data-layout]');if(layout){ui.taskLayout=layout.dataset.layout;renderTasks();return};const c=event.target.closest('[data-icon-choice]');if(c){const input=$('#category-form [name=icon]');if(input)input.value=c.dataset.iconChoice;document.querySelectorAll('[data-icon-choice]').forEach(x=>x.classList.toggle('active',x===c));return};const color=event.target.closest('[data-color-choice]');if(color){const input=$('#category-form [name=color]');if(input)input.value=color.dataset.colorChoice;document.querySelectorAll('[data-color-choice]').forEach(x=>x.classList.toggle('active',x===color));return};const remove=event.target.closest('[data-check-delete]');if(remove){draftChecklist=draftChecklist.filter(x=>x.id!==remove.dataset.checkDelete);$('#checklist-rows').outerHTML=checklistRows()}});
document.addEventListener('change',e=>{const t=e.target;if(t.id==='roadmap-project'){ui.project=t.value;renderRoadmap();return};if(t.id==='task-filter'){ui.taskFilter=t.value;renderTasks();return};if(t.id==='file-filter'){ui.fileProject=t.value;renderFiles();return};if(t.dataset.statusTask){const task=getTask(t.dataset.statusTask);if(task)mutate(()=>{task.status=t.value;task.updatedAt=new Date().toISOString()});return};if(t.id==='task-project'){const stages=sort(DB.stages.filter(s=>s.projectId===t.value));$('#task-stage').innerHTML=optionList(stages.map(s=>[s.id,s.title]),'','Ohne Phase');return};if(t.id==='upload-project'){const tasks=DB.tasks.filter(task=>task.projectId===t.value);$('#upload-task').innerHTML=optionList(tasks.map(task=>[task.id,task.title]),'','Ohne Aufgabe');return};if(t.id==='pref-motion'||t.id==='pref-compact'){mutate(()=>DB.prefs[t.id==='pref-motion'?'reduceMotion':'compact']=t.checked);return};if(t.dataset.widgetPosition!==undefined){const items=sort(DB.dashboard),w=items.find(x=>x.id===t.dataset.widgetPosition),target=items[Number(t.value)];if(w&&target&&w.id!==target.id)moveWidget(w.id,target.id);return};if(t.dataset.widgetSize){const w=DB.dashboard.find(x=>x.id===t.dataset.widgetSize);if(w)mutate(()=>w.size=moduleSize(t.value));return};if(t.dataset.widgetWidth){const w=DB.dashboard.find(x=>x.id===t.dataset.widgetWidth);if(w)mutate(()=>w.wide=t.value==='full');return};if(t.dataset.widgetVisible){const w=DB.dashboard.find(w=>w.id===t.dataset.widgetVisible);if(w)mutate(()=>w.visible=t.checked);return};if(t.dataset.widgetWide){const w=DB.dashboard.find(w=>w.id===t.dataset.widgetWide);if(w)mutate(()=>w.wide=t.checked);return};if(t.dataset.checkId){const item=draftChecklist.find(x=>x.id===t.dataset.checkId);if(item){item.done=t.checked;$('#checklist-rows').outerHTML=checklistRows()}return};if(t.id==='task-files'||t.id==='global-files'){const message=t.id==='task-files'?$('#selected-files'):$('#upload-selection');if(message)message.textContent=[...t.files].map(f=>f.name).join(' · ')||'Keine Datei ausgewählt.'}});
document.addEventListener('input',e=>{if(e.target.id==='task-search'){ui.search=e.target.value;const cursor=e.target.selectionStart;renderTasks();const next=$('#task-search');next.focus();next.setSelectionRange(cursor,cursor)}if(e.target.id==='quick-search-input')updateSearch()});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!searchModal.open)searchOpen();return};if(e.key==='Enter'&&e.target.id==='subtask-input'){e.preventDefault();$('#task-form [data-action=add-check]')?.click()};if(e.key==='Escape'&&searchModal.open)searchModal.close()});
document.addEventListener('submit',async e=>{const f=e.target;if(!['category-form','stage-form','task-form','status-form','upload-form','widget-form'].includes(f.id))return;e.preventDefault();const data=new FormData(f);const v=name=>String(data.get(name)||'').trim();try{
 if(f.id==='category-form'){
  const old=getCat(f.dataset.edit),targetId=old?.id||id();
  if(old)mutate(()=>{old.name=v('name');old.icon=v('icon');old.color=v('color')});
  else mutate(()=>DB.categories.push({id:targetId,name:v('name'),icon:v('icon'),color:v('color'),order:DB.categories.length}));
  modal.close();ui.category=targetId;toast('Projekt gespeichert.');
 } if(f.id==='project-form'){const old=getProject(f.dataset.edit);if(old)mutate(()=>{old.name=v('name');old.categoryId=v('categoryId');old.description=v('description')});else{const projectId=id();mutate(()=>DB.projects.push({id:projectId,categoryId:v('categoryId'),name:v('name'),description:v('description'),icon:'folder',order:DB.projects.length,createdAt:new Date().toISOString()}));ui.project=projectId;render()}modal.close();toast('Projekt gespeichert.')}
 if(f.id==='stage-form'){const old=getStage(f.dataset.edit);if(old)mutate(()=>{old.title=v('title');old.description=v('description')});else mutate(()=>DB.stages.push({id:id(),projectId:f.dataset.project,title:v('title'),description:v('description'),order:DB.stages.filter(s=>s.projectId===f.dataset.project).length}));modal.close();toast('Phase gespeichert.')}
 if(f.id==='widget-form'){const old=DB.dashboard.find(w=>w.id===f.dataset.edit);const fields={kind:v('kind'),title:v('title'),categoryId:v('categoryId'),projectId:v('projectId'),body:v('body'),size:moduleSize(v('size')),wide:data.has('wide'),visible:data.has('visible')};if(old)mutate(()=>Object.assign(old,fields));else mutate(()=>DB.dashboard.push({id:id(),...fields,order:DB.dashboard.length}));modal.close();toast('Modul gespeichert.')}
 if(f.id==='status-form'){const old=DB.statuses.find(s=>s.id===f.dataset.edit);if(old)mutate(()=>{old.label=v('label');old.color=v('color');old.isDone=data.has('isDone')});else mutate(()=>DB.statuses.push({id:id(),label:v('label'),color:v('color'),isDone:data.has('isDone'),order:DB.statuses.length}));modal.close();toast('Status gespeichert.')}
 if(f.id==='task-form'){const files=[...($('#task-files')?.files||[])];let taskId=f.dataset.edit;const fields={title:v('title'),color:v('color'),projectId:v('projectId'),stageId:v('stageId'),status:v('status'),priority:v('priority'),dueDate:v('dueDate'),description:v('description'),tags:v('tags').split(',').map(x=>x.trim()).filter(Boolean).slice(0,30),checklist:structuredClone(draftChecklist),updatedAt:new Date().toISOString()};const old=getTask(taskId);
  if(old)mutate(()=>Object.assign(old,fields));else{taskId=id();mutate(()=>DB.tasks.push({id:taskId,...fields,order:DB.tasks.length,createdAt:new Date().toISOString()}))}modal.close();if(files.length){await flushSave();await uploadFiles(files,fields.projectId,taskId)}else toast('Aufgabe gespeichert.')}
 if(f.id==='upload-form'){const files=[...($('#global-files')?.files||[])];if(!files.length){toast('Bitte Dateien auswählen.');return};modal.close();await flushSave();await uploadFiles(files,v('projectId'),v('taskId'))}
 }catch(err){toast('Fehler: '+err.message);console.error(err)}});
// Native drag and drop for categories, dashboard widgets, phases and task status/stage placement.
document.addEventListener('dragstart',e=>{const el=e.target.closest('[data-drag]');if(!el)return;dragged=el.dataset.drag;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragged);el.classList.add('dragging')});
document.addEventListener('dragend',()=>{dragged=null;document.querySelectorAll('.dragging,.drag-over').forEach(el=>el.classList.remove('dragging','drag-over'))});
document.addEventListener('dragover',e=>{const el=e.target.closest('[data-drop],.attach-drop');if(!el)return;if(el.classList.contains('attach-drop')){e.preventDefault();el.classList.add('is-over');return};if(!dragged)return;const target=el.dataset.drop;const [fromType]=dragged.split(':');const [toType]=target.split(':');if(fromType===toType||(fromType==='task'&&['stage','status'].includes(toType))){e.preventDefault();e.dataTransfer.dropEffect='move';el.classList.add('drag-over')}});
document.addEventListener('dragleave',e=>{e.target.closest('.drag-over,.attach-drop')?.classList.remove('drag-over','is-over')});
document.addEventListener('drop',e=>{const filezone=e.target.closest('.attach-drop');if(filezone&&e.dataTransfer.files.length){e.preventDefault();filezone.classList.remove('is-over');const input=filezone.querySelector('input[type=file]');if(input){input.files=e.dataTransfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))};return};const target=e.target.closest('[data-drop]');if(!dragged||!target)return;e.preventDefault();target.classList.remove('drag-over');const [fromType,source]=dragged.split(':'),[toType,dest]=target.dataset.drop.split(':');if(source===dest)return;
 if(fromType==='category'&&toType==='category')moveCategory(source,dest);
 else if(fromType==='stage'&&toType==='stage')moveStage(source,dest);
 else if(fromType==='widget'&&toType==='widget')moveWidget(source,dest);
 else if(fromType==='task'&&toType==='status'){const task=getTask(source);if(task)mutate(()=>{task.status=dest;task.updatedAt=new Date().toISOString()})}
 else if(fromType==='task'&&toType==='stage'){const task=getTask(source),stage=getStage(dest);if(task&&stage&&task.projectId===stage.projectId)mutate(()=>{task.stageId=dest;task.updatedAt=new Date().toISOString()})}
 dragged=null});
searchModal.addEventListener('click',e=>{if(e.target===searchModal)searchModal.close()});modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});
async function boot(){try{await window.PlannerCloudReady; if(!window.PlannerCloud)throw Error("Konto konnte nicht geladen werden. Bitte neu anmelden."); const launch=new URLSearchParams(location.hash.slice(1)).get('launch');
  if(launch){sessionStorage.removeItem('pp-desktop-session');sessionStorage.setItem('pp-desktop-launch',launch);history.replaceState(null,'',location.pathname+location.search)}
  secret='authenticated-web-session';
  if(false){
    const start=sessionStorage.getItem('pp-desktop-launch');
    const response=start?await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({launch:start}),cache:'no-store'}):await fetch('/api/session',{cache:'no-store'});
    if(!response.ok)throw Error('Desktop-Sitzung fehlt. Project Planner bitte über die EXE öffnen.');
    secret=(await response.json()).key;
    sessionStorage.setItem('pp-desktop-session',secret);
    sessionStorage.removeItem('pp-desktop-launch');
  }
  await getState();
  // Browserkonto ersetzt die frühere Desktop/Tailscale-Verbindung.
  desktopWatchChanges();
  // Confirm this exact app page is alive; a refresh cancels pending shutdown.
  // Keine lokale Serverfenster-Verwaltung im Browser.
  const route=location.hash.slice(2);const parts=route.split('/');if(parts[0]==='topic'&&getProject(parts[1])){ui.project=parts[1];goto('topic')}else if(NAV.some(n=>n[0]===route)||route==='settings')goto(route)}catch(e){console.error(e);$('#view').innerHTML=`<div class="empty"><strong>Projektdaten konnten nicht geladen werden.</strong>${esc(e.message)}</div>`;toast(e.message)}}
boot();

// When the actual app window closes, stop its local server and mobile listener.
// sendBeacon survives page teardown; a quick refresh cancels the 5s shutdown.
window.addEventListener('pagehide',()=>{
 if(!secret)return;
 // Kein eingebetteter Desktop-Server, der beim Schließen beendet werden müsste.
});
