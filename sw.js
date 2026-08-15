/* PerceptFolio service worker.
   Bump CACHE_VERSION whenever index.html changes, otherwise installed copies keep serving the old
   shell until the cache happens to be evicted. */
const CACHE_VERSION = 'perceptfolio-v1';

/* Only these two are genuinely required for the app to open offline. */
const REQUIRED = ['./', './index.html'];

/* Everything else is cached best-effort. cache.addAll() is atomic — a single 404 anywhere in the
   list aborts the whole install and you silently get no offline support at all. So optional assets
   are added one at a time and allowed to fail individually. */
const OPTIONAL = [
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
  './favicon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(REQUIRED);
    await Promise.all(OPTIONAL.map(u => cache.add(u).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* ---- NEVER cache market data. ----
     Serving a cached quote would show someone a stale price as if it were live, which for a finance
     app is worse than showing nothing. Finnhub always goes straight to the network and any failure is
     surfaced to the app's own error handling rather than papered over with old data. */
  if (url.hostname.endsWith('finnhub.io')) return;

  /* Navigations: network-first so a redeployed index.html is picked up as soon as there's a
     connection, with the cached shell as the offline fallback. */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  /* Everything else (icons, manifest, the Chart.js bundle): cache-first, refreshed in the background
     so the next load gets any update without ever blocking on the network. */
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        caches.open(CACHE_VERSION).then(c => c.put(req, res.clone()));
      }
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
