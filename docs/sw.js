'use strict';
// Remove the former offline shell so returning users receive the GitHub edition.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{const prefix='faz-shell-'+self.registration.scope;for(const name of await caches.keys())if(name.startsWith(prefix))await caches.delete(name);await self.clients.claim();await self.registration.unregister();})()));
