'use strict';
const PREFIX='faz-shell-'+self.registration.scope;
const CACHE=PREFIX+'-v1.1.1';
const ASSETS=['./','./index.html','./style.css','./storage.js','./app.js'];
const URLS=ASSETS.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));
// No skipWaiting: a newly downloaded build cannot replace an open editing session.
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!URLS.includes(event.request.url))return;
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
