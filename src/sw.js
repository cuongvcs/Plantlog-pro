// PlantLog Pro Service Worker v178
const CACHE = 'plantlog-pro-v178';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './vendor/jspdf.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).catch(err => console.warn('[SW] Cache addAll warning:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Never cache Google Apps Script or external API calls
  if (url.includes('script.google.com') || url.includes('googleapis.com') || url.includes('telegram.org')) {
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
