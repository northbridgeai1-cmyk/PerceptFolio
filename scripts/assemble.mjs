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
for (const f of ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.svg', 'icon-maskable-512.png', 'apple-touch-icon.png', 'thanks.html', '404.html']) copy(f);

/* SPA routes: Pages serves index.html for unknown paths only with a _redirects rule. */
fs.writeFileSync(path.join(out, '_redirects'), ['/pricing /index.html 200', '/apply /index.html 200', '/thanks /index.html 200', '/terms /index.html 200', '/privacy /index.html 200', '/refunds /index.html 200', ''].join('\n'));
console.log('assembled', out, ':', fs.readdirSync(out).join(' '));
