#!/usr/bin/env node
/* Production smoke test. Run against any origin:
     node test/smoke.mjs https://perceptfolio.pages.dev      (before the cut-over: is Pages ready?)
     node test/smoke.mjs https://perceptfolio.com            (after: did the domain move, and is it whole?)
   Read-only: a handful of GETs, no code redeemed, nothing written. Exit 1 on any failure. */
const origin = (process.argv[2] || 'https://perceptfolio.pages.dev').replace(/\/+$/, '');
let fail = 0;
const t = (name, ok, note = '') => { console.log((ok ? '  PASS ' : '  FAIL ') + name + (note ? '   ' + note : '')); if (!ok) fail++; };
const get = (p, opts = {}) => fetch(origin + p, { redirect: 'manual', headers: { 'User-Agent': 'PerceptFolio-smoke/1.0' }, ...opts });
console.log('smoke: ' + origin);

let r = await get('/');
const home = await r.text();
t('the landing page serves', r.status === 200 && /PerceptFolio/.test(home));
t('the landing page carries no unsafe-inline CSP and the security headers (Pages, not GitHub)', /script-src 'self'(;| )/.test(r.headers.get('content-security-policy') || '') && r.headers.get('x-frame-options') === 'DENY' && !!r.headers.get('strict-transport-security'), r.headers.get('content-security-policy') ? '' : 'no CSP header: this origin is still GitHub Pages');
r = await get('/terminal/');
t('the terminal is not served without a session (302 to /enter)', r.status === 302 && /\/enter\/\?next=%2Fterminal%2F/.test(r.headers.get('location') || ''), 'got ' + r.status);
r = await get('/admin');
t('admin is not served without a session', r.status === 302 || r.status === 404, 'got ' + r.status);
r = await get('/enter/');
t('the door serves', r.status === 200 && /code/i.test(await r.text()));
r = await get('/terminal/', { headers: { cookie: 'pf_session=forged.signature' } });
t('a forged session is refused', r.status === 302);
r = await get('/pricing');
t('the React routes answer (SPA fallback on)', r.status === 200 && /text\/html/.test(r.headers.get('content-type') || ''));
for (const [p, type, min] of [['/vendor/chart-4.4.1.umd.min.js', 'javascript', 100000], ['/vendor/cesium/Cesium.js', 'javascript', 5000000], ['/vendor/cesium/Workers/createGeometry.js', 'javascript', 1000], ['/vendor/cesium/Assets/Textures/NaturalEarthII/tilemapresource.xml', 'xml', 200], ['/world/data/index.json', 'json', 5000], ['/world/data/semiconductors.json', 'json', 10000], ['/world/ne110.json', 'json', 100000], ['/fonts/Archivo.woff2', 'font', 10000], ['/sw.js', 'javascript', 1000], ['/manifest.json', 'json', 100]]) {
  r = await get(p); const ct = r.headers.get('content-type') || ''; const len = (await r.arrayBuffer()).byteLength;
  t(`asset ${p}`, r.status === 200 && ct.includes(type) && len >= min, `${r.status} ${ct.split(';')[0]} ${len}b`);
}
r = await get('/world/data/index.json'); const idx = await r.json().catch(() => null);
t('the World manifest lists fifteen layers with counts', !!idx && Array.isArray(idx.industries) && idx.industries.length === 15 && idx.industries.every(i => i.count > 0), idx ? idx.industries.map(i => i.count).join(',') : 'no manifest');
/* Pages serves clean URLs: foo.html answers 308 to foo. Follow it; the landing page's iframe does. */
r = await get('/preview/dashboard.html', { redirect: 'follow' });
t('the dashboard snapshot is frameable by the landing page only', r.status === 200 && r.headers.get('x-frame-options') === 'SAMEORIGIN' && /frame-ancestors 'self'/.test(r.headers.get('content-security-policy') || ''), r.status + ' ' + (r.headers.get('x-frame-options') || ''));
r = await get('/nope-' + Date.now());
t('an unknown path is not a 500', r.status !== 500);
if (/^https:\/\/perceptfolio\.com$/.test(origin)) { r = await fetch('https://www.perceptfolio.com/terminal/', { redirect: 'manual' }); t('www lands on the bare domain (one origin, one account store)', r.status === 301 && /^https:\/\/perceptfolio\.com\/terminal\//.test(r.headers.get('location') || ''), r.status + ' ' + (r.headers.get('location') || '')); }
const worker = 'https://crimson-hat-6ad9.northbridgeai1.workers.dev';
r = await fetch(worker + '/version'); const v = await r.json().catch(() => ({}));
t('the Worker answers with its version and the World route', r.status === 200 && /^\d{4}-\d{2}-\d{2}/.test(v.version || '') && (v.routes || []).includes('/world'), v.version || '');

console.log(fail ? `\n${fail} FAILED` : '\nALL SMOKE CHECKS PASSED');
process.exit(fail ? 1 : 0);
