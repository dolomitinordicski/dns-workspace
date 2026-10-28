/* Cache only public app-shell assets; never cache Firebase API responses or holder records. */
const CACHE='dns-pass-shell-v3';
const ROOT='/dns-workspace/';
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const page=await fetch(ROOT+'pass.html',{cache:'reload'});
 if(!page.ok)throw Error('PASS_SHELL_UNAVAILABLE');
 const html=await page.clone().text();
 await cache.put(ROOT+'pass.html',page);
 const files=[...html.matchAll(/(?:src|href)="(\/dns-workspace\/[^"]+)"/g)].map(m=>m[1]);
 await Promise.all(files.map(p=>cache.add(p).catch(()=>{})));
 self.skipWaiting();
})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('dns-pass-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(ROOT))return;
 if(!(url.pathname===ROOT+'pass.html'||url.pathname.includes('/assets/')||url.pathname===ROOT+'digital-pass.webmanifest'||url.pathname===ROOT+'digital-pass-icon.svg'))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);
 const saved=await cache.match(req,{ignoreSearch:true});
 // Prefer current HTML when online; retain a previously opened page for offline use.
 if(url.pathname===ROOT+'pass.html') {
   try {const fresh=await fetch(req,{cache:'no-store'});if(fresh.ok){await cache.put(req,fresh.clone());return fresh}}catch{}
   if(saved)return saved;
   return Response.error();
 }
 // Prefer fresh versioned JS/CSS assets while connected. A stale asset can keep an old registration form enabled.
 try {const fresh=await fetch(req,{cache:'no-store'});if(fresh.ok){await cache.put(req,fresh.clone());return fresh}}catch{}
 if(saved)return saved;
 return Response.error();
 })());
});
