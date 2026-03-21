const CACHE = 'innerloop-v10';
const PRECACHE = ['/manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Always network first — no caching
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});