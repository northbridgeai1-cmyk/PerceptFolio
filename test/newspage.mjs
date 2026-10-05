/* THE NEWS SCREEN SHOWS NEWS (2026-10-05).

   The owner's sentence was "when they open News, they expect to see the news all over the page".
   The screen opened with four counting tiles and a list of summaries, so the two things a news page
   is made of, a photograph and a headline, were the two things it did not have.

   THE TRAP THIS SUITE EXISTS FOR. Publisher photographs come from a different CDN for every outlet,
   and this terminal ships a Content-Security-Policy in TWO places: a meta tag inside the file and a
   header written by the Pages middleware. The browser enforces the intersection. Widen one and
   every image is still refused, silently, with nothing in the page to show it: the headline simply
   renders without a picture, which is exactly what the screen looked like before the change. So
   both policies are checked here, by running the middleware's own csp() rather than reading it.

   And the public site must NOT be widened with it. Nothing on the marketing site loads a third
   party image, and a policy that drifts wider than it needs to is how it ends up wider than anyone
   intended. */
import { readFileSync } from 'node:fs';
const term = readFileSync(new URL('../terminal/index.html', import.meta.url), 'utf8');
const mwSrc = readFileSync(new URL('../functions/_middleware.js', import.meta.url), 'utf8');

function lift(src, sig) {
  const at = src.indexOf(sig);
  if (at < 0) throw new Error('not found: ' + sig);
  let depth = 0;
  for (let j = src.indexOf('{', at); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(at, j + 1); }
  }
  throw new Error('unbalanced: ' + sig);
}
const liftConst = (src, name, close) => {
  const at = src.indexOf(name);
  if (at < 0) throw new Error('not found: ' + name);
  return src.slice(at, src.indexOf(close, at) + close.length);
};

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

/* ---- the middleware's real policy, for the three kinds of path ---- */
const csp = new Function(
  liftConst(mwSrc, 'const GATED =', ';') + '\n' +
  liftConst(mwSrc, 'const FRAMEABLE =', ';') + '\n' +
  lift(mwSrc, 'function csp(path, env)') + '\nreturn csp;')();
const env = { WORKER_URL: 'https://example.workers.dev' };
const imgOf = policy => (policy.match(/img-src([^;]*)/) || [, ''])[1].trim();

console.log('\nBOTH COPIES OF THE POLICY, OR THE IMAGES ARE REFUSED');
const metaCsp = (term.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [, ''])[1];
t('the terminal ships a meta policy at all', metaCsp.length > 50);
t('the meta policy admits any https image', /img-src[^;]*\bhttps:/.test(metaCsp), imgOf(metaCsp));
const gated = csp('/terminal/', env);
t('and so does the header for the terminal', /img-src[^;]*\bhttps:/.test(gated), imgOf(gated));
t('the two agree about images', imgOf(metaCsp).includes('https:') && imgOf(gated).includes('https:'));

console.log('\nAND NOTHING ELSE WAS WIDENED WITH THEM');
t('script-src on the terminal is still same-origin', !/script-src[^;]*https:(?!\/\/)/.test(gated), gated.match(/script-src[^;]*/)[0]);
t('the terminal still cannot be framed', /frame-ancestors 'none'/.test(gated));
const pub = csp('/pricing', env);
t('the public site still allows no third-party image', !/img-src[^;]*\bhttps:/.test(pub), imgOf(pub));
t('the public site is unchanged otherwise', /img-src 'self' data:/.test(pub), imgOf(pub));
const frameable = csp('/preview/dashboard.html', env);
t('the framed preview allows no third-party image either', !/img-src[^;]*\bhttps:/.test(frameable), imgOf(frameable));

console.log('\nTHE IMAGE TAG ITSELF');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const newsImg = new Function('esc', lift(term, 'function newsImg(n,h)') + '\nreturn newsImg;')(esc);
const img = newsImg({ image: 'https://cdn.example.com/a.jpg' }, 210);
t('an https image renders', img.startsWith('<img') && img.includes('https://cdn.example.com/a.jpg'), img.slice(0, 60));
t('it tells the CDN nothing about the page', img.includes('referrerpolicy="no-referrer"'), img);
t('it does not fetch until it is on screen', img.includes('loading="lazy"'), img);
t('a dead link hides rather than showing a broken glyph', /onerror=.*display=.?.?none/.test(img) || img.includes("this.style.display='none'"), img);
t('the height asked for is the height used', img.includes('height:210px'), img);
t('the alt is empty, because the headline beside it is the text', img.includes('alt=""'), img);

console.log('\nAND NOTHING ELSE GETS THROUGH IT');
t('no image at all renders nothing', newsImg({}, 130) === '', newsImg({}, 130));
t('an empty string renders nothing', newsImg({ image: '   ' }, 130) === '');
t('a missing field renders nothing', newsImg(null, 130) === '');
t('http is refused rather than blocked later by the browser', newsImg({ image: 'http://cdn.example.com/a.jpg' }, 130) === '');
t('a protocol-relative url is refused', newsImg({ image: '//cdn.example.com/a.jpg' }, 130) === '');
/* The one that matters: an item's image field is third-party text arriving over the network, and it
   is interpolated into an attribute. A javascript: url must not survive, and neither must a quote. */
t('a javascript url is refused', newsImg({ image: 'javascript:alert(1)' }, 130) === '');
t('a data url is refused, however harmless it looks', newsImg({ image: 'data:image/png;base64,AAAA' }, 130) === '');
const hostile = newsImg({ image: 'https://x.test/a.jpg" onload="alert(1)' }, 130);
t('a quote in the url cannot close the attribute', !hostile.includes('onload="alert(1)"'), hostile);
t('and it is escaped rather than dropped', hostile.includes('&quot;'), hostile);

console.log('\nTHE TILE: A PHOTOGRAPH, A HEADLINE, AN OUTLET, A TIME');
const newsTileHtml = new Function('esc', 'newsImg',
  lift(term, 'function newsTileHtml(n,big)') + '\nreturn newsTileHtml;')(esc, newsImg);
const story = { headline: 'Chipmaker raises outlook', source: 'Reuters', url: 'https://ex.test/a',
  datetime: 1759600000, image: 'https://cdn.example.com/a.jpg', summary: 'x'.repeat(400) };
const tile = newsTileHtml(story, false);
t('the headline is there', tile.includes('Chipmaker raises outlook'), tile.slice(0, 80));
t('the outlet is named', tile.includes('Reuters'));
t('the photograph is there', tile.includes('cdn.example.com'));
t('the whole tile opens the article', tile.includes('href="https://ex.test/a"') && tile.includes('rel="noopener"'));
t('and it is not a summary dump', !tile.includes('xxxxxxxxxx'), tile.length);
t('the lead story is taller than the rest', newsTileHtml(story, true).includes('height:210px') && tile.includes('height:132px'));
t('a story with no url is still readable', !newsTileHtml({ ...story, url: '' }, false).includes('<a href'));
t('a story with no photograph still shows its headline', newsTileHtml({ ...story, image: '' }, false).includes('Chipmaker raises outlook'));
t('a hostile headline is escaped', newsTileHtml({ ...story, headline: '<img src=x onerror=alert(1)>' }, false).includes('&lt;img'));

console.log('\nTHE SCREEN PUTS THE NEWS FIRST');
const render = lift(term, 'function renderNews()');
t('the counting tiles no longer open the screen', !/stat-row[\s\S]{0,200}Market stories/.test(render));
t('a grid of tiles does', render.includes('news-grid') && render.includes('newsTileHtml'));
t('the lead story spans two columns', render.includes('news-tile lead'));
t('the counts survive as a source line', /market '\+\(market\.length===1\?'story':'stories'\)/.test(render) && render.includes('border-top'));
t('and the source line says where the pictures came from', render.includes('publishers') && render.includes('fetched from their sites'));
t('the per-position cards were not deleted', render.includes('symbolNewsCard'));
t('the grid collapses to one column on a phone', /@media \(max-width:700px\)\{ \.news-grid\{grid-template-columns:1fr\}/.test(term));

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
