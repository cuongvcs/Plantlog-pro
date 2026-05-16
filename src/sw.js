// PlantLog Pro Service Worker v8
const CACHE = 'plantlog-pro-v8';
const HTML_FILES = ['/', './index.html', './404.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled([
        './styles.css',
        './manifest.json',
        './modules/core.js',
        './modules/auth.js',
        './modules/trips.js',
        './modules/tasks.js',
        './modules/report.js',
        './modules/inspection.js',
        './modules/library.js',
        './modules/bills.js',
        './modules/sync.js'
      ].map(url => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Pass through: external APIs and CDN
  if (url.includes('script.google.com') ||
      url.includes('googleapis.com') ||
      url.includes('gstatic.com') ||
      url.includes('cdnjs.cloudflare.com')) return;

  // HTML files: NETWORK FIRST — always get latest from server
  // This ensures updates are picked up immediately
  if (e.request.mode === 'navigate' ||
      e.request.headers.get('accept').includes('text/html')) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r && r.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, r.clone()));
          }
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // JS/CSS/other assets: cache-first (fast)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(r => {
        if (r && r.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        }
        return r;
      });
    })
  );
});
