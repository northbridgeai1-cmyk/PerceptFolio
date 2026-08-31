/* PerceptFolio service worker.
   Bump CACHE_VERSION whenever index.html changes, otherwise installed copies keep serving the old
   shell until the cache happens to be evicted. */
const CACHE_VERSION = 'perceptfolio-v7';

/* Only these two are genuinely required for the app to open offline. */
const REQUIRED = ['./', './index.html'];

/* Everything else is cached best-effort. cache.addAll() is atomic — a single 404 anywhere in the
   list aborts the whole install and you silently get no offline support at all. So optional assets
   are added one at a time and allowed to fail individually. */
const OPTIONAL = [
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './icon.svg',
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

  /* ---- WHITELIST, not blacklist. ----
     An earlier version listed what to skip (Finnhub) and cached everything else. That silently broke
     the first API added afterwards — the sync worker — because a cross-origin authenticated request
     handled cache-first fails and falls through to Response.error().
     So: only intercept things we KNOW are static assets. Any other request, including every present
     and future API call, passes straight through to the network untouched.

     Two rules that must never change:
       - Market data must never be cached; a stale quote shown as live is worse than no quote.
       - Authenticated requests must never be cached; that would put private data in a shared cache. */
  const sameOrigin = url.origin === self.location.origin;
  const isChartCdn = req.url === 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
  const hasAuth = req.headers.has('Authorization');
  if (hasAuth) return;
  if (!sameOrigin && !isChartCdn) return;

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
