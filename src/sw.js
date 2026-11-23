// PlantLog Pro Service Worker v148
// Single-file architecture — reliable caching with failsafe offline fallback
const CACHE = 'plantlog-pro-v148';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      const urls = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png', './vendor/jspdf.umd.min.js', './plantlog_pro_mobile.html'];
      for (const u of urls) {
        try {
          await c.add(u);
        } catch (err) {
          // Graceful skip for optional/secondary assets
        }
      }
    })
  );
});

// REL-04: Controlled activation via user prompt (instant update on reload)
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING' || (e.data && e.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
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
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./plantlog_pro_mobile.html') || caches.match('./')))
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
