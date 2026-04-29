// ============================================================
// Consorcio IQ — Service Worker
// Cache-first para assets, Network-first para o app
// ============================================================
const CACHE = 'ciq-v1';
const SHELL = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.allSettled(
        SHELL.map(url => cache.add(url).catch(() => {}))
      );
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  // Ignora requests que nao sao GET ou sao Firebase/BrasilAPI
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('brasilapi')) return;

  // Network-first para o index.html (sempre busca versao mais recente)
  if (url.endsWith('/') || url.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(function(resp) {
          var clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        })
        .catch(function() { return caches.match(e.request); })
    );
    return;
  }

  // Cache-first para outros assets (fontes, Chart.js, etc)
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(function() { return cached; });
    })
  );
});
