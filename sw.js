// ============================================================
// Colour Palette — Service Worker
// 每次更新 index.html 時，把下面日期改成今天的日期再一起上傳
// ============================================================
const VERSION = 'colour-palette-20260417';

const ASSETS = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Asimovian&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js'
];

// ── Install：預先快取所有資源 ──────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(VERSION).then(function(cache) {
      var requests = ASSETS.map(function(url) {
        if (url.startsWith('http')) {
          return cache.add(new Request(url, { mode: 'no-cors' }));
        }
        return cache.add(url);
      });
      return Promise.allSettled(requests);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── Activate：刪除舊版快取 ─────────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== VERSION; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch：Cache First，找不到才去網路 ───────────────────
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (!response || response.status !== 200) return response;
        var clone = response.clone();
        caches.open(VERSION).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      }).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
