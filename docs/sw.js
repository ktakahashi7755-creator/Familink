// Familink Service Worker v20260527u
// ネットワーク優先: キャッシュを一切使わず常に最新版を配信
var SW_VERSION = '20260527u';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      // 全クライアントにリロード要求（古いページを強制更新）
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(c) { c.navigate(c.url); });
      });
    })
  );
});

self.addEventListener('fetch', function(e) {
  // 常にネットワークから取得（キャッシュ不使用）
  if(e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(function() {
        return fetch(e.request);
      })
    );
    return;
  }
  e.respondWith(fetch(e.request));
});
