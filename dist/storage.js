'use strict';
// All data stays in the directory selected through the browser folder picker.
class LibraryStore {
  constructor(root) { this.root = root; this.raw = null; this.data = null; }
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
  async text(name) {
    try { return await (await (await this.root.getFileHandle(name)).getFile()).text(); }
    catch (e) { if (e.name === 'NotFoundError') return null; throw e; }
  }
  async open() {
    this.raw = await this.text('library.json');
    this.data = this.raw === null ? {format:'faz-library',schema:1,revision:0,projects:[]} : LibraryStore.valid(JSON.parse(this.raw));
    return this.data;
  }
  async file(path) {
    const parts = path.split('/');
    if (parts.some(s => !s || s === '.' || s === '..' || /[\\:]/.test(s))) throw Error('Invalid file path.');
    let dir = this.root;
    for (const part of parts.slice(0,-1)) dir = await dir.getDirectoryHandle(part);
    return (await dir.getFileHandle(parts.at(-1))).getFile();
  }
  async write(path, content) {
    const parts = path.split('/'); let dir = this.root;
    for (const part of parts.slice(0,-1)) dir = await dir.getDirectoryHandle(part,{create:true});
    const handle = await dir.getFileHandle(parts.at(-1),{create:true});
    const stream = await handle.createWritable();
    try { await stream.write(content); await stream.close(); }
    catch(e) { try { await stream.abort(); } catch {} throw e; }
  }
  async commit(next, assets = []) {
    LibraryStore.valid(next);
    if (await this.text('library.json') !== this.raw) throw Error('This folder was changed elsewhere. Reconnect the folder to reload before saving.');
    // Write new, uniquely named assets before committing metadata. Failed saves
    // may leave unused assets, but never replace a previous version's files.
    for (const asset of assets) await this.write(asset.path, asset.content);
    if (await this.text('library.json') !== this.raw) throw Error('This folder was changed elsewhere. Reconnect before saving.');
    if (this.raw !== null) await this.write('library.backup.json',this.raw);
    next.revision = this.data.revision + 1;
    const raw = JSON.stringify(next,null,2);
    await this.write('library.json',raw);
    this.raw = raw; this.data = next;
    return next;
  }
}
if (typeof module !== 'undefined') module.exports = LibraryStore;
