/* Mosaiq — service worker : lecture hors ligne de la dernière édition consultée. */
var CACHE='mosaiq-v1';
var CORE=['./','index.html','monde.svg','regions.svg','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','index.json'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return Promise.all(CORE.map(function(u){return c.add(u).catch(function(){});}));}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf('mosaiq-')===0&&k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){
  var r=e.request;if(r.method!=='GET')return;var u=new URL(r.url);if(u.origin!==self.location.origin)return;
  var isData=/\.(json|svg)$/.test(u.pathname)||r.mode==='navigate'||/\/$|index\.html$/.test(u.pathname);
  if(isData){
    /* réseau d'abord, cache en secours : l'édition du jour quand on est en ligne, la dernière lue sinon */
    e.respondWith(fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp);});}return res;}).catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(m){return m||(r.mode==='navigate'?caches.match('index.html'):undefined);});}));
  }else{
    /* fichiers statiques : cache d'abord */
    e.respondWith(caches.match(r).then(function(m){return m||fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp);});}return res;});}));
  }
});
