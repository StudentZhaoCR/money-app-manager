// Service Worker for 赚钱软件管理系统
// 策略：stale-while-revalidate —— 优先返回缓存（快），同时后台拉取最新版本更新缓存；
//       install 时 skipWaiting、activate 时 clients.claim，确保发版后用户尽快拿到新代码。
// 发版时务必 bump CACHE_NAME 以触发更新流程。
const CACHE_NAME = 'money-app-v7';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

// 安装：预缓存核心资源并立即就绪
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(CORE_ASSETS);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

// 激活：清理旧版本缓存并立即接管页面
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
             .map(function (n) { return caches.delete(n); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// 拦截 GET 请求：缓存优先，同时后台更新；缓存未命中走网络，网络失败回退到 /index.html
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async function (cache) {
      const cached = await cache.match(event.request);
      // 后台拉取最新版本并更新缓存（不阻塞当前响应）
      const networkFetch = fetch(event.request).then(function (resp) {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          cache.put(event.request, resp.clone());
        }
        return resp;
      }).catch(function () { return null; });

      // 有缓存立即返回（SWR），否则等网络
      if (cached) {
        return cached;
      }
      const network = await networkFetch;
      if (network) {
        return network;
      }
      // 完全离线且无缓存：回退到首页（SPA）
      const fallback = await cache.match('/index.html');
      return fallback || Response.error();
    })
  );
});
