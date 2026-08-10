// PlantLog Pro Service Worker v12
// Single-file architecture — only index.html needs caching
const CACHE = 'plantlog-pro-v12';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['./index.html', './manifest.json', './icon-192.png', './icon-512.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never intercept external requests
  if (url.includes('script.google.com') || url.includes('googleapis.com') ||
      url.includes('gstatic.com') || url.includes('cdnjs.') || url.includes('fonts.')) return;

  // For navigation (opening the app): network first, fall back to cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r && r.status === 200) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Assets: cache first
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request)
        .then(r => {
          if (r && r.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, r.clone()));
          }
          return r;
        })
      )
  );
});
