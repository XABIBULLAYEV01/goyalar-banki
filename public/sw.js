/**
 * G'oyalar Banki - Service Worker
 * Enables PWA install and smooth offline caching on iOS, Android, and Windows
 */

const CACHE_NAME = 'gb-admin-v3.3';
const STATIC_ASSETS = [
  '/',
  '/static/css/style.css',
  '/static/js/app.js?v=3.3',
  '/static/js/admin.js?v=3.3',
  '/static/js/api.js?v=3.3',
  '/static/js/cefrbek.js?v=3.3',
  '/static/js/jar3d.js?v=3.3',
  '/static/assets/icon-192.svg',
  '/static/assets/icon-512.svg',
  '/static/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Do not cache API endpoints or uploads
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: "Internet aloqasi yo'q" }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Network-first with cache fallback for static assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
