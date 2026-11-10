// Service worker mínimo — "network-first"
// Siempre pide la versión nueva a internet (sin caché del navegador).
// Solo si no hay conexión usa la última copia guardada.
// Nunca guarda llamadas a Supabase ni a otros dominios.
var CACHE = 'gp-offline-v1';

self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Supabase, CDNs, etc.: no se tocan

  e.respondWith(
    fetch(req.url, { cache: 'no-store', credentials: 'same-origin' })
      .then(function(res){
        if (res && res.ok) {
          var copia = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return res;
      })
      .catch(function(){
        return caches.match(req, { ignoreSearch: true }).then(function(r){
          if (r) return r;
          if (req.mode === 'navigate') return caches.match('./', { ignoreSearch: true }).then(function(r2){ return r2 || caches.match('index.html'); });
          return Response.error();
        });
      })
  );
});
