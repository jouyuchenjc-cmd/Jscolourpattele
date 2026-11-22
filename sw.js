// ============================================================
// Colour Palette — Service Worker
// 每次更新 index.html 時，把下面日期改成今天的日期再一起上傳
// ============================================================
const VERSION = 'colour-palette-20261122-8';

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
        // cache:'reload' 略過瀏覽器 HTTP 快取，避免把舊的 index.html 又存進新版快取
        return cache.add(new Request(url, { cache: 'reload' }));
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

// ── Fetch ─────────────────────────────────────────────────
// 頁面（index.html）：網路優先，有網路就一定拿到最新版；離線才用快取
// 其他資源（字型、lottie 等）：快取優先
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var isPage = e.request.mode === 'navigate' || e.request.destination === 'document';
  if (isPage) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' }).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(VERSION).then(function(cache) { cache.put('./index.html', clone); });
        }
        return response;
      }).catch(function() {
        return caches.match('./index.html').then(function(c) { return c || caches.match('./'); });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (!response || (response.status !== 200 && response.type !== 'opaque')) return response;
        var clone = response.clone();
        caches.open(VERSION).then(function(cache) { cache.put(e.request, clone); });
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
