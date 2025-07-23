// Basic service worker for offline support
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('deezqy-cache-v1').then(cache => {
      return cache.addAll([
        '',
        'index.html',
        'style.css',
        'app.js',
        'appState.js',
        'favicon.svg',
        'manifest.webmanifest',
        'loader.gif',
        'pages/Collection.js',
        'pages/Help.js',
        'pages/Search.js',
        'pages/Setup.js',
        'misc/listRenderer.js',
        'misc/uiFeedback.js',
        'misc/Utils.js',
        'api/cookie.js',
        'api/db.js',
        'api/discogs.js'
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
