// Basic service worker for offline support
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('deezqy-cache-v3').then(cache => {
      return cache.addAll([
        '',
        'manifest.webmanifest',
        'favicon.svg',
        'loader.gif',
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
