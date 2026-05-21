// Familink Service Worker v20260520h
// ネットワーク優先: キャッシュを一切使わず常に最新版を配信
var SW_VERSION = '20260520h';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  // 常にネットワークから取得（キャッシュ不使用）
  e.respondWith(fetch(e.request).catch(function() {
    return caches.match(e.request);
  }));
});
