'use strict';
class LibraryStore {
  static valid(data) {
    const str = x => typeof x === 'string';
    const id = x => str(x) && /^[a-zA-Z0-9_-]{1,100}$/.test(x);
    const unique = a => new Set(a).size === a.length;
    if (!data || data.format !== 'faz-library' || data.schema !== 1 || !Number.isInteger(data.revision) || !Array.isArray(data.projects)) throw Error('This is not a supported FAZ library manifest. Your files have not been changed.');
    if (!unique(data.projects.map(p => p.id))) throw Error('Duplicate project IDs in library manifest.');
    for (const p of data.projects) {
      if (!id(p.id) || !str(p.name) || !str(p.description) || !Array.isArray(p.tags) || !p.tags.every(str) || !str(p.created) || !str(p.updated) || typeof p.archived !== 'boolean' || !Array.isArray(p.versions)) throw Error('Invalid project in library manifest.');
      if (!unique(p.versions.map(v => v.id))) throw Error('Duplicate version IDs in library manifest.');
      for (const v of p.versions) {
        if (!id(v.id) || !str(v.label) || !str(v.stage) || !str(v.notes) || !str(v.created) || !Array.isArray(v.images)) throw Error('Invalid version in library manifest.');
        const prefix = `projects/${p.id}/${v.id}/`;
        if (v.source !== prefix + 'source.pine' || !v.images.every(i => i && str(i.name) && str(i.path) && i.path.startsWith(prefix) && /^image-\d+\.(png|jpg|webp)$/.test(i.path.slice(prefix.length)))) throw Error('Unsafe file path in library manifest.');
      }
    }
    return data;
  }
  constructor(token, repo='blessayannawaz/faz-trading-library-data') {
    this.token=token;this.repo=repo;this.root={name:repo};this.data=null;this.head=null;this.branch='main';this.baseTree=null;
  }
  async api(path,method='GET',body,raw=false,missing=false) {
    let response;
    try { response=await fetch('https://api.github.com/repos/'+this.repo+path,{
      method,cache:'no-store',credentials:'omit',redirect:'error',
      headers:{Authorization:'Bearer '+this.token,Accept:raw?'application/vnd.github.raw+json':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    }); } catch { throw Error('GitHub could not be reached. Check your internet connection, then reconnect before retrying a save.'); }
    if(missing&&response.status===404)return null;
    if(!response.ok){
      if(response.status===401)throw Error('Your GitHub access key expired or is invalid. Connect again with a valid key.');
      if(response.status===403||response.status===429)throw Error('GitHub refused access or its request limit was reached. Check Contents read/write permission or try again later.');
      if(response.status===404)throw Error('Private library not accessible. Give your key access to faz-trading-library-data.');
      if(response.status===409||response.status===422)throw Error('The GitHub library changed or could not be updated. Click Refresh library before retrying.');
      throw Error('GitHub request failed ('+response.status+'). Your saved library has not been replaced.');
    }
    return raw?response.blob():response.json();
  }
  async open(){
    const repo=await this.api('');
    if(!repo.private)throw Error('This library must be private. Make the data repository private before connecting.');
    if(!repo.permissions?.push)throw Error('Write access to the data repository is required.');
    this.branch=repo.default_branch;
    const ref=await this.api('/git/ref/heads/'+encodeURIComponent(this.branch));
    const head=ref.object.sha,commit=await this.api('/git/commits/'+head);
    const blob=await this.api('/contents/library.json?ref='+head,'GET',undefined,true,true);
    const raw=blob?await blob.text():null;
    const data=raw===null?{format:'faz-library',schema:1,revision:0,projects:[]}:LibraryStore.valid(JSON.parse(raw));
    this.head=head;this.baseTree=commit.tree.sha;this.raw=raw;this.data=data;return data;
  }
  async file(path){
    if(path.split('/').some(p=>!p||p==='.'||p==='..'||/[\\:]/.test(p)))throw Error('Invalid library file path.');
    const file=await this.api('/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+this.head,'GET',undefined,true);
    const ext=path.split('.').at(-1),type={png:'image/png',jpg:'image/jpeg',webp:'image/webp',pine:'text/plain'}[ext]||'application/octet-stream';
    return new Blob([file],{type});
  }
  async commit(next,assets=[]){
    LibraryStore.valid(next);
    const ref=await this.api('/git/ref/heads/'+encodeURIComponent(this.branch));
    if(ref.object.sha!==this.head)throw Error('Another session changed your GitHub library. Click Refresh library before saving.');
    const tree=[];
    for(const asset of assets){
      const blob=asset.content instanceof Blob?asset.content:new Blob([asset.content]);
      const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';
      for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      const saved=await this.api('/git/blobs','POST',{content:btoa(binary),encoding:'base64'});
      tree.push({path:asset.path,mode:'100644',type:'blob',sha:saved.sha});
    }
    const updated=structuredClone(next);updated.revision=this.data.revision+1;
    const raw=JSON.stringify(updated,null,2);
    tree.push({path:'library.json',mode:'100644',type:'blob',content:raw});
    const nextTree=await this.api('/git/trees','POST',{base_tree:this.baseTree,tree});
    const commit=await this.api('/git/commits','POST',{message:'FAZ library: save revision '+updated.revision,tree:nextTree.sha,parents:[this.head]});
    // Non-forced updates reject concurrent changes. Files and catalogue become
    // visible together; failed uploads never partially replace a saved version.
    await this.api('/git/refs/heads/'+encodeURIComponent(this.branch),'PATCH',{sha:commit.sha,force:false});
    this.head=commit.sha;this.baseTree=nextTree.sha;this.raw=raw;this.data=updated;return updated;
  }
}
if(typeof module!=='undefined')module.exports=LibraryStore;
