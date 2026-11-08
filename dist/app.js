'use strict';
const $ = id => document.getElementById(id);
let store = null, activeProject = null, activeVersion = null, archived = false, busy = false, generation = 0;
let imageURLs = [], toastTimer, editingProject = null, rememberedFolder = null, favoritesOnly = false;

// Only the folder handle is remembered in this browser. Library data stays on disk.
function folderMemory(value) {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('faz-preferences',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('settings');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result,writing=value!==undefined;
      const tx=db.transaction('settings',writing?'readwrite':'readonly');
      const op=writing?tx.objectStore('settings').put(value,'folder'):tx.objectStore('settings').get('folder');
      tx.oncomplete=()=>{db.close();resolve(writing?value:op.result);};
      tx.onerror=()=>{db.close();reject(tx.error);};
    };
  });
}
async function openFolder(root){
  const candidate=new LibraryStore(root); await candidate.open();
  store=candidate;activeProject=null;activeVersion=null;rememberedFolder=root;
  try{await folderMemory(root);}catch{} // Storage restrictions never block saving.
  $('reconnect').hidden=false;updateStatus();render();
  toast('Connected to '+root.name+'. '+projects().length+' indicators loaded.');
}

const esc = value => String(value).replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const id = () => crypto.randomUUID();
const projects = () => store?.data.projects || [];
const current = () => projects().find(p => p.id === activeProject);
function toast(message,error=false) { clearTimeout(toastTimer); $('toast').textContent=message; $('toast').className=error?'error':''; $('toast').style.display='block'; toastTimer=setTimeout(()=>$('toast').style.display='none',error?10000:4500); }
function showError(e) { console.error(e); if(e.name==='AbortError')return; toast(e.name==='NotAllowedError'?'Folder permission was not granted. Reconnect and allow saving.':e.message || 'Something went wrong. Please try again.',true); }
async function action(fn) { if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){showError(e);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);} }
function updateStatus() { $('saveState').textContent=store?'● Saved on this laptop':'○ Not connected';$('saveState').className='status'+(store?' connected':'');$('folderName').textContent=store?.root.name||'No folder connected';$('connect').textContent=store?'Switch / reconnect':'Connect folder'; }
async function connect() {
  if(!window.showDirectoryPicker){$('helpDialog').showModal();return;}
  await action(async()=>{
    const root=await window.showDirectoryPicker({id:'faz-library',mode:'readwrite'});
    await openFolder(root);
  });
}
function render() {
  const all=projects(), visible=all.filter(p=>!p.archived);
  $('navCount').textContent=visible.length;
  $('projectCount').textContent=String(visible.length).padStart(2,'0');
  $('versionCount').textContent=String(visible.reduce((s,p)=>s+p.versions.length,0)).padStart(2,'0');
  $('imageCount').textContent=String(visible.reduce((s,p)=>s+p.versions.reduce((n,v)=>n+v.images.length,0),0)).padStart(2,'0');
  $('listTitle').textContent=archived?'Archived projects':favoritesOnly?'Favorite indicators':'Indicator library';
  $('libraryNav').classList.toggle('active',!archived&&!favoritesOnly);$('archiveNav').classList.toggle('active',archived);
  $('favoritesNav').classList.toggle('active',favoritesOnly);
  const q=$('search').value.toLowerCase().trim();
  const list=all.filter(p=>p.archived===archived && (!favoritesOnly||p.favorite) && `${p.name} ${p.description} ${p.tags.join(' ')}`.toLowerCase().includes(q));
  list.sort((a,b)=>$('sort').value==='name'?a.name.localeCompare(b.name):$('sort').value==='versions'?b.versions.length-a.versions.length:b.updated.localeCompare(a.updated));
  $('resultCount').textContent=`${list.length} project${list.length===1?'':'s'}`;
  $('projects').innerHTML=list.map(p=>`<button class="project-card" data-project="${esc(p.id)}"><div class="card-top"><span class="code-icon">&lt;/&gt;</span><span class="badge">${esc(p.versions.at(-1)?.stage||'New project')}</span></div><h3>${p.favorite?'★ ':''}${esc(p.name)}</h3><p>${esc(p.description||'Your next trading idea starts here.')}</p><div class="tags">${p.tags.slice(0,4).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><div class="card-footer"><span>${p.versions.length} version${p.versions.length===1?'':'s'}</span><span>${date(p.updated)} ↗</span></div></button>`).join('');
  $('empty').hidden=!!list.length;
  $('empty').querySelector('h2').textContent=q?'No matching indicators.':favoritesOnly?'Keep your go-to indicators close.':archived?'Your archive is clear.':store?'Make room for your first indicator.':'A clean start for your next idea.';
  $('empty').querySelector('p').innerHTML=q?'Try another name, tag or description.':favoritesOnly?'Open an indicator and click Favorite to add it here.':archived?'Archived indicators stay in your folder.<br>You can restore them here anytime.':store?'Create an indicator, then add its first version.<br>Source code and screenshots stay together.':'Connect a local folder, then add your first indicator.<br>Keep every revision and its chart screenshots together.';
  $('emptyAction').hidden=archived||favoritesOnly||!!q;$('emptyAction').textContent=store?'＋ New indicator':'Choose library folder ↗';
}
function newProject(){if(!store){toast('Connect a local library folder first.');return connect();}editingProject=null;$('projectForm').reset();$('projectFormTitle').textContent='New indicator';$('projectSubmit').textContent='Create indicator';$('projectDialog').showModal();}
function clearImages(){for(const url of imageURLs)URL.revokeObjectURL(url);imageURLs=[];}
async function showProject(projectId){activeProject=projectId;activeVersion=current()?.versions.at(-1)?.id; if(!$('detailDialog').open)$('detailDialog').showModal();await renderDetail();}
async function renderDetail(){
  const run=++generation;clearImages();const p=current();if(!p)return;
  $('favoriteProject').textContent=p.favorite?'★ Favorited':'☆ Favorite';
  $('favoriteProject').setAttribute('aria-pressed',String(!!p.favorite));
  $('detailTitle').textContent=p.name;$('detailDescription').textContent=p.description;
  $('detailTags').innerHTML=p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('');
  $('archiveProject').textContent=p.archived?'Restore project':'Archive project';$('addVersion').hidden=p.archived;
  $('versions').innerHTML=p.versions.slice().reverse().map(v=>`<button class="version-button ${v.id===activeVersion?'active':''}" data-version="${esc(v.id)}">${esc(v.label)}<small>${date(v.created)} · ${esc(v.stage)}</small></button>`).join('');
  const v=p.versions.find(v=>v.id===activeVersion);
  if(!v){$('versionContent').innerHTML='<div class="empty"><div class="empty-art">＋</div><h2>The first chapter starts here.</h2><p>Add a version with your Pine source and screenshots.</p></div>';return;}
  $('versionContent').innerHTML=`<div class="version-header"><h3>${esc(v.label)}</h3><span class="badge">${esc(v.stage)} · ${date(v.created)}</span></div><p class="version-notes">${esc(v.notes||'No release notes for this version.')}</p><div class="source-toolbar"><span>source.pine</span><div><button class="button small" id="copySource" disabled>Copy code</button><button class="button small" id="downloadSource" disabled>Download .pine ↓</button></div></div><pre id="sourceCode">Loading source…</pre><h4 class="gallery-title">CHART SCREENSHOTS · ${v.images.length}</h4><div class="gallery" id="gallery"></div>`;
  try{
    const file=await store.file(v.source), source=await file.text(); if(run!==generation)return;
    $('sourceCode').textContent=source;
    $('copySource').disabled=false;$('downloadSource').disabled=false;
    $('copySource').onclick=async()=>{try{await navigator.clipboard.writeText(source);toast('Pine source copied.');}catch{toast('Clipboard access failed. Download the .pine file instead.',true);}};
    $('downloadSource').onclick=()=>{const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=`${p.name}-${v.label}.pine`.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);};
  }catch(e){if(run===generation)$('sourceCode').textContent='Source could not be read. Check that source.pine still exists in your library folder. '+e.message;}
  for(const img of v.images){
    try{const file=await store.file(img.path);if(run!==generation)return;const url=URL.createObjectURL(file);imageURLs.push(url);const b=document.createElement('button'),im=document.createElement('img');im.src=url;im.alt=img.name;b.title=img.name;b.append(im);b.onclick=()=>{$('largeImage').src=url;$('largeImage').alt=img.name;$('imageDialog').showModal();};$('gallery').append(b);}catch(e){if(run!==generation)return;const message=document.createElement('p');message.className='muted';message.textContent=`Missing screenshot: ${img.name}`;$('gallery').append(message);}
  }
  if(!v.images.length)$('gallery').innerHTML='<p class="muted">No screenshots added.</p>';
}
$('projectForm').onsubmit=e=>{e.preventDefault();action(async()=>{
  const f=new FormData(e.target),name=f.get('name').trim();if(!name)throw Error('Enter an indicator name.');
  const now=new Date().toISOString(),next=structuredClone(store.data),pid=editingProject||id();
  if(editingProject){const project=next.projects.find(p=>p.id===pid);project.name=name;project.description=f.get('description').trim();project.tags=[...new Set(f.get('tags').split(',').map(t=>t.trim()).filter(Boolean))];project.updated=now;}
  else next.projects.push({id:pid,name,description:f.get('description').trim(),tags:[...new Set(f.get('tags').split(',').map(t=>t.trim()).filter(Boolean))],created:now,updated:now,archived:false,versions:[]});
  await store.commit(next);$('projectDialog').close();render();updateStatus();toast(editingProject?'Indicator details updated.':'Indicator saved. Add its first version.');await showProject(pid);
});};
$('addVersion').onclick=()=>{$('versionForm').reset();$('versionDialog').showModal();};
$('pineFile').onchange=()=>{if($('pineFile').files.length){$('pineText').value='';$('pineText').disabled=true;}else $('pineText').disabled=false;};
$('versionForm').addEventListener('reset',()=>{$('pineText').disabled=false;});
$('versionForm').onsubmit=e=>{e.preventDefault();action(async()=>{
  const p=current(),f=new FormData(e.target),label=f.get('label').trim();if(!label)throw Error('Enter a version label.');
  if(p.versions.some(v=>v.label.toLowerCase()===label.toLowerCase()))throw Error('This version label already exists. Choose a new label.');
  const pine=$('pineFile').files[0],text=$('pineText').value,shots=[...$('screenshots').files];
  if(!pine&&!text.trim())throw Error('Choose a .pine file or paste the source code.');
  if(pine&&(!/\.pine$/i.test(pine.name)||pine.size>5*1024*1024||!pine.size))throw Error('Choose a non-empty .pine file smaller than 5 MB.');
  if(new Blob([text]).size>5*1024*1024)throw Error('Pasted source must be smaller than 5 MB.');
  if(shots.length>12)throw Error('Choose up to 12 screenshots per version.');
  const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
  if(shots.some(s=>!extensions[s.type]||s.size>20*1024*1024||!s.size))throw Error('Use non-empty PNG, JPG or WEBP images under 20 MB each.');
  const vid=id(),base=`projects/${p.id}/${vid}/`,now=new Date().toISOString();
  const v={id:vid,label,stage:f.get('stage'),notes:f.get('notes').trim(),created:now,source:base+'source.pine',images:shots.map((s,i)=>({name:s.name,path:base+`image-${i+1}.${extensions[s.type]}`}))};
  const assets=[{path:v.source,content:pine||text},...shots.map((s,i)=>({path:v.images[i].path,content:s}))];
  const next=structuredClone(store.data),target=next.projects.find(x=>x.id===p.id);target.versions.push(v);target.updated=now;
  $('saveState').textContent='◌ Saving to folder…';
  try{await store.commit(next,assets);}finally{updateStatus();}
  activeVersion=vid;$('versionDialog').close();render();await renderDetail();toast('Version and screenshots saved to your folder.');
});};
$('archiveProject').onclick=()=>action(async()=>{const next=structuredClone(store.data),p=next.projects.find(p=>p.id===activeProject);p.archived=!p.archived;p.updated=new Date().toISOString();await store.commit(next);$('detailDialog').close();render();toast(p.archived?'Project archived. Files remain in your folder.':'Project restored.');});
document.addEventListener('click',e=>{const close=e.target.closest('[data-close]');if(close&&!busy)$(close.dataset.close).close();const card=e.target.closest('[data-project]');if(card&&!busy)showProject(card.dataset.project).catch(showError);const version=e.target.closest('[data-version]');if(version&&!busy){activeVersion=version.dataset.version;renderDetail().catch(showError);}});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('cancel',e=>{if(busy)e.preventDefault();}));
$('detailDialog').addEventListener('close',()=>{generation++;clearImages();});
$('connect').onclick=connect;$('connectSide').onclick=connect;$('newProject').onclick=newProject;$('emptyAction').onclick=()=>store?newProject():connect();
$('help').onclick=()=>$('helpDialog').showModal();$('search').oninput=render;$('sort').onchange=render;
$('libraryNav').onclick=()=>{archived=false;favoritesOnly=false;render();};$('archiveNav').onclick=()=>{archived=true;favoritesOnly=false;render();};
$('favoritesNav').onclick=()=>{archived=false;favoritesOnly=true;render();};
window.addEventListener('beforeunload',e=>{if(busy||$('versionDialog').open||$('projectDialog').open){e.preventDefault();e.returnValue='';}});
if(!window.showDirectoryPicker||!window.isSecureContext){$('compat').hidden=false;$('compat').textContent='Folder saving requires desktop Microsoft Edge or Google Chrome. Open this app through START-FAZ.cmd at localhost. Firefox and Safari are not supported.';}
render();

$('editProject').onclick=()=>{
  const p=current();editingProject=p.id;const f=$('projectForm');f.reset();
  f.elements.name.value=p.name;f.elements.description.value=p.description;f.elements.tags.value=p.tags.join(', ');
  $('projectFormTitle').textContent='Edit indicator';$('projectSubmit').textContent='Save details';$('projectDialog').showModal();
};
$('favoriteProject').onclick=()=>action(async()=>{
  const next=structuredClone(store.data),p=next.projects.find(p=>p.id===activeProject);p.favorite=!p.favorite;
  await store.commit(next);render();await renderDetail();toast(p.favorite?'Added to favorites.':'Removed from favorites.');
});
$('reconnect').onclick=()=>action(async()=>{
  if(!rememberedFolder)throw Error('Choose your library folder using Connect folder.');
  if(await rememberedFolder.requestPermission({mode:'readwrite'})!=='granted')throw Error('Allow folder access, or choose it again with Connect folder.');
  await openFolder(rememberedFolder);
});
folderMemory().then(handle=>{if(handle&&!store){rememberedFolder=handle;$('reconnect').hidden=false;$('reconnect').title='Reconnect '+handle.name;}}).catch(()=>{});
// Cache application files only. The service worker never sees local library files.
if('serviceWorker' in navigator && window.isSecureContext){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
