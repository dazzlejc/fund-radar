/**
 * Service Worker for PWA support
 */

const CACHE_NAME = 'fund-tracker-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/favicon.svg',
  '/manifest.json'
];

const API_CACHE_NAME = 'fund-api-v1';
const API_CACHE_DURATION = 5 * 60 * 1000; // 5分钟

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 拦截请求 - 策略化缓存
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非GET请求和chrome扩展
  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:'
  ) {
    return;
  }

  // API请求 - 使用网络优先，失败时回退到缓存（有过期时间）
  if (url.origin.includes('eastmoney.com') || url.origin.includes('gtimg.cn')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            // 只缓存成功的响应
            if (response && response.status === 200) {
              const responseClone = response.clone();
              cache.put(request, responseClone);
            }
            return response;
          })
          .catch(() => {
            return cache.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                const dateHeader = cachedResponse.headers.get('date');
                if (dateHeader) {
                  const cachedTime = new Date(dateHeader).getTime();
                  const now = Date.now();
                  // 检查缓存是否过期
                  if (now - cachedTime < API_CACHE_DURATION) {
                    return cachedResponse;
                  }
                }
                // 如果无法检查时间或已过期，仍然返回缓存（离线模式）
                return cachedResponse;
              }
              return Promise.reject('No cache available');
            });
          });
      })
    );
    return;
  }

  // 静态资源 - 缓存优先策略
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // 后台更新缓存
        fetch(request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response);
            });
          }
        });
        return cachedResponse;
      }

      // 没有缓存，使用网络
      return fetch(request).then((response) => {
        // 缓存新的成功响应
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
