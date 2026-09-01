/* PerceptFolio service worker.
   Bump CACHE_VERSION whenever the terminal changes, otherwise installed copies keep serving the old
   shell until the cache happens to be evicted. */
const CACHE_VERSION = 'perceptfolio-v17';

/* THE TERMINAL is what has to work offline — and it lives at /app/, not at the root. The landing
   page is the front door: nobody needs to read it on a plane, and listing it as required would let
   a failed fetch of the page nobody opens break the install for the page everybody opens.

   Note the trailing slash. The terminal is app/index.html on disk, but the URL it is fetched by is
   /app/ — cache keys are URLs, so this must match what the browser actually requests. */
const REQUIRED = ['/app/'];

/* Everything else is cached best-effort. cache.addAll() is atomic — a single 404 anywhere in the
   list aborts the whole install and you silently get no offline support at all. So optional assets
   are added one at a time and allowed to fail individually. */
const OPTIONAL = [
  './',
  './index.html',
  './404.html',
  './thanks.html',
  './admin.html',
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

  /* Navigations: network-first so a redeployed page is picked up as soon as there's a connection,
     with the cached copy as the offline fallback.

     THE FALLBACK IS NOW PER-PAGE. The old version cached every navigation under './index.html' and
     served that back for any offline navigation — which was fine when there was only one page, and
     became a bug the moment there were four: opening the terminal offline would have handed you the
     marketing page. Each page is cached under its own URL, and only if nothing matches do we fall
     back to the terminal, because that's the page someone offline actually wanted. */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req, { ignoreSearch: true });
        return cached || (await caches.match('/app/')) || Response.error();
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
