/* Assemble the Cloudflare Pages output. Run after `npm --prefix site run build`.

   dist/ is what Pages serves: the React site at the root, the gated terminal and admin beside it,
   the entry page, the fonts and demo data, and the Pages Functions. Nothing else from the repo
   goes in, so worker.js, tests, PRD.md and the rest are never served. This is the M7 cut-over
   step; until then GitHub Pages keeps serving the vanilla root. */
import fs from 'fs';
import path from 'path';

const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const copy = (from, to = from) => { if (!fs.existsSync(from)) { console.warn('missing:', from); return; } fs.cpSync(from, path.join(out, to), { recursive: true }); };

copy('site/dist', '.');                       // the public site
copy('terminal');                              // gated by functions/_middleware.js
copy('admin.html');                            // gated, operator only
copy('enter');                                 // the door
copy('functions');                             // the gate, /api/enter, /api/leave, /api/portal
copy('fonts'); copy('demo'); copy('preview'); copy('favicon.svg'); copy('manifest.json'); copy('sw.js'); copy('robots.txt'); copy('sitemap.xml');
copy('vendor');                                // Chart.js and Cesium, served from this origin (see vendor/README.md)
copy('world/data'); copy('world/ne110.json');  // the World view's bundled plant layers and the country polygons; catalog.mjs and the extract script are source, not product
/* No 404.html on Pages: its absence is what makes Pages serve index.html for unknown paths, which
   is how /pricing, /apply and the rest reach the React router. The app has its own not-found page. */
for (const f of ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.svg', 'icon-maskable-512.png', 'apple-touch-icon.png', 'thanks.html']) copy(f);

/* SPA routes: Pages serves index.html for unknown paths only with a _redirects rule. */
/* Legacy static paths from the GitHub Pages era keep working. */
fs.writeFileSync(path.join(out, '_redirects'), ['/privacy/ /privacy 301', '/terms/ /terms 301', '/thanks.html /thanks 301', ''].join('\n'));
console.log('assembled', out, ':', fs.readdirSync(out).join(' '));
