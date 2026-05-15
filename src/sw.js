// PlantLog Pro Service Worker v6
const CACHE = 'plantlog-pro-v7';

// Only cache LOCAL files — never CDN resources that might fail
const LOCAL_ASSETS = [
  './index.html',
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
];

self.addEventListener('install', e => {
  // Cache each file individually — one failure won't break the whole install
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(
        LOCAL_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] Failed to cache:', url, err)
          )
        )
      )
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
  // Never intercept Google Sheets sync or CDN requests
  if (url.includes('script.google.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.includes('cdnjs.cloudflare.com')) {
    return; // Let these go directly to network
  }
  // For local files: cache-first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // If offline and not cached, return a minimal offline page
        if (e.request.headers.get('accept').includes('text/html')) {
          return new Response('<h2>PlantLog Pro</h2><p>You are offline. Open the app from home screen for offline access.</p>',
            {headers: {'Content-Type': 'text/html'}});
        }
      });
    })
  );
});
