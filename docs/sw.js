// Familink Service Worker — オフライン対応＋即時起動（cache-first / 版管理は ?v= で）
// 方針:
//  ・SW_VERSION（= index.html の var V と同値）を本ファイルに焼き込む。版が変わると sw.js のバイトが
//    変わり、ブラウザが新SWを検知 → skipWaiting で即入れ替え → controllerchange で1回だけ自動リロード。
//    通常は即時キャッシュ表示のまま、新版がある時だけ自動で最新へ（古いキャッシュに張り付かない）。
//  ・同一オリジンの GET はキャッシュ優先で即返す → 遅い回線でも一瞬・オフラインでも動く。
//    返した後、裏でネットワーク取得しキャッシュを更新（次回さらに新しく）。
//  ・別オリジン（Supabase CDN / Google Fonts）はキャッシュせずネットワークに任せる
//    （未接続時はアプリが LocalStorage のみで動作する設計）。
// SW_VERSION は docs 同期(§12.3)で index.html の var V と同じ値に更新する（バイトが変わり更新検知される）
var SW_VERSION = 'v20260614w';
var CACHE = 'familink-' + SW_VERSION;
var CORE  = ['./', './index.html', './manifest.json', './icon-192.png', './icon-256.png'];

self.addEventListener('install', function(e) {
  self.skipWaiting();   // 新版を即座に待機解除＝開けば自動で最新へ（古いキャッシュに張り付かない）
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return Promise.all(CORE.map(function(u) {
        return fetch(u, { cache: 'reload' })
          .then(function(r) { if(r && r.ok) return c.put(u, r.clone()); })
          .catch(function() {});
      }));
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { if(k !== CACHE) return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('message', function(e) {
  if(e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if(req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch(_) { return; }
  if(url.origin !== self.location.origin) return;   // 別オリジンはネットワークに任せる
  if(/\/sw\.js$/.test(url.pathname)) return;         // SW 自身はキャッシュしない（更新検知を妨げない）

  var isNav = req.mode === 'navigate';
  var key = isNav ? './index.html' : req;

  // 背景更新を最後まで完了させる keep-alive
  var _done;
  e.waitUntil(new Promise(function(res){ _done = res; }));

  e.respondWith(
    caches.open(CACHE).then(function(c) {
      return c.match(key).then(function(cached) {
        var net = fetch(req).then(function(r) {
          if(r && r.ok) { try { c.put(key, r.clone()); } catch(_) {} }
          return r;
        }).catch(function() { return null; });
        net.then(function(){ _done(); }, function(){ _done(); });
        if(cached) return cached;                        // キャッシュがあれば即返す
        return net.then(function(r){ return r || new Response('', { status: 503 }); });
      });
    })
  );
});
