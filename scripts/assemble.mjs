/* Assemble the Cloudflare Pages output.

   dist/ is what Pages serves: the React site at the root, the gated terminal and admin beside it,
   the entry page, the fonts and demo data, and the Pages Functions. Nothing else from the repo
   goes in, so worker.js, tests, PRD.md and the rest are never served. This is the M7 cut-over
   step; until then GitHub Pages keeps serving the vanilla root. */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

/* BUILD THE SITE FIRST, IF IT IS STALE.
   This script used to copy site/dist and trust it. Editing a .tsx, running assemble and deploying
   therefore shipped the PREVIOUS bundle, silently, with every check passing: the suite reads the
   source, and the source was right. It cost a deploy of a fix that was never compiled.
   So: compare the newest file under site/src (plus the config and index.html that also change the
   output) against the newest file in site/dist, and run vite when the source is ahead. An
   up-to-date build is skipped, so the common case stays fast. */
const newest = (dir, ext = null) => {
  let t = 0;
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (!ext || ext.test(e.name)) t = Math.max(t, fs.statSync(f).mtimeMs);
  } };
  if (fs.existsSync(dir)) walk(dir);
  return t;
};
if (fs.existsSync('site/src')) {
  const src = Math.max(
    newest('site/src'),
    newest('site/public'),
    ...['site/index.html', 'site/vite.config.ts', 'site/tailwind.config.ts', 'site/package.json']
      .filter(f => fs.existsSync(f)).map(f => fs.statSync(f).mtimeMs),
  );
  const built = newest('site/dist');
  if (src > built) {
    console.log(built ? 'site/dist is older than site/src: building' : 'no site build yet: building');
    execFileSync('npm', ['--prefix', 'site', 'run', 'build'], { stdio: 'inherit' });
  } else {
    console.log('site build is current');
  }
}

const out = 'dist';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const copy = (from, to = from) => { if (!fs.existsSync(from)) { console.warn('missing:', from); return; } fs.cpSync(from, path.join(out, to), { recursive: true }); };

copy('site/dist', '.');                       // the public site
copy('terminal');                              // gated by functions/_middleware.js
copy('admin.html');                            // gated, operator only
copy('enter');                                 // the door
copy('functions');                             // the gate, /api/enter, /api/leave, /api/portal
copy('fonts'); copy('demo'); copy('preview'); copy('verify'); copy('call'); copy('favicon.svg'); copy('manifest.json'); copy('sw.js'); copy('robots.txt'); copy('sitemap.xml');
copy('vendor');                                // Chart.js and Cesium, served from this origin (see vendor/README.md)
copy('world/data'); copy('world/ne110.json'); copy('world/places.json');  // the World view's bundled plant layers and the country polygons; catalog.mjs and the extract script are source, not product
/* No 404.html on Pages: its absence is what makes Pages serve index.html for unknown paths, which
   is how /pricing, /apply and the rest reach the React router. The app has its own not-found page. */
for (const f of ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.svg', 'icon-maskable-512.png', 'apple-touch-icon.png', 'thanks.html']) copy(f);

/* SPA routes: Pages serves index.html for unknown paths only with a _redirects rule. */
/* Legacy static paths from the GitHub Pages era keep working. */
/* One origin. An account lives in the browser's storage for the exact address, so www.perceptfolio.com
   and perceptfolio.com would be two different terminals with two different accounts; everyone lands
   on the bare domain. */
fs.writeFileSync(path.join(out, '_redirects'), ['https://www.perceptfolio.com/* https://perceptfolio.com/:splat 301', '/privacy/ /privacy 301', '/terms/ /terms 301', '/thanks.html /thanks 301', ''].join('\n'));
console.log('assembled', out, ':', fs.readdirSync(out).join(' '));
