#!/usr/bin/env node
/* PerceptFolio regression suite.   Run:  node test/run.mjs
   ============================================================================
   WHY THIS EXISTS.
   This site was, for a period, entirely broken in production — the root returned 404 because the
   only file there was Index.html with a capital I, and a case-insensitive laptop cannot see that.
   Separately the landing page and the terminal were served from each other's paths, so the sign-in
   button reloaded the page it was on. Both are the kind of fault that is obvious once seen and
   invisible until then, and neither would be caught by reading the diff.

   Everything checked here is something that has actually gone wrong, or arithmetic that would be
   silently wrong rather than loudly broken. The maths tests deliberately parse the FUNCTIONS OUT OF
   THE SHIPPED FILES rather than importing a copy, so the thing under test is the thing that ships.
   ============================================================================ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = f => fs.existsSync(path.join(ROOT, f));

let pass = 0, fail = 0, group = '';
const G = n => { group = n; console.log('\n\x1b[1m' + n + '\x1b[0m'); };
const t = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  \x1b[32mPASS\x1b[0m  ' + name + (extra ? '   \x1b[2m' + extra + '\x1b[0m' : '')); }
  else { fail++; console.log('  \x1b[31mFAIL\x1b[0m  ' + name + (extra ? '   ' + extra : '')); }
};

/* Pulls a top-level function out of a source file by brace matching, so the suite exercises the
   deployed code instead of a copy that can drift away from it. */
function grab(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('function not found: ' + name);
  let k = src.indexOf('{', i), depth = 0;
  for (;; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (!depth) break; }
  }
  return src.slice(i, k + 1);
}

const idx = read('index.html');
const term = read('terminal/index.html');
const worker = read('worker.js');
const sw = read('sw.js');

/* ============================ 1. DEPLOY SAFETY ============================ */
G('Deploy safety — the faults that took the site down');

t('a lowercase index.html exists', exists('index.html'));
t('no capital-I Index.html (invisible on a case-insensitive laptop, fatal on Pages)',
  !fs.readdirSync(ROOT).includes('Index.html'));
t('the terminal is at /terminal/, not the root', exists('terminal/index.html'));
t('terminal/index.html is the app, not the landing page',
  read('terminal/index.html').length > 300000, (term.length / 1024 | 0) + ' KB');
t('index.html is the landing page, not the app',
  idx.length < 200000, (idx.length / 1024 | 0) + ' KB');
t('/app.html survives as a redirect stub (it was the only working URL for a while)',
  exists('app.html') && /location\.replace\('\/terminal\/'\)/.test(read('app.html')));
t('/app/ redirect stub kept for installed PWAs',
  exists('app/index.html') && /location\.replace\('\/terminal\/'\)/.test(read('app/index.html')));
t('manifest start_url points at the terminal',
  JSON.parse(read('manifest.json')).start_url === '/terminal/');
t('service worker REQUIREs the terminal', /const REQUIRED\s*=\s*\['\/terminal\/'\]/.test(sw));
t('Chart.js is vendored, not pulled from a CDN at runtime',
  exists('vendor/chart-4.4.1.umd.min.js') && !/cdnjs\.cloudflare\.com[^"']*\.js"/.test(term));

/* ============================ 2. LINK INTEGRITY ============================ */
G('Link integrity — every internal href resolves to a real file');

const pages = ['index.html', 'terminal/index.html', '404.html', 'thanks.html', 'refused/index.html',
               'app.html', 'app/index.html', 'admin.html'];
let dead = [];
for (const p of pages) {
  if (!exists(p)) continue;
  const html = read(p);
  const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1])
    .filter(h => h && !/^(https?:|mailto:|data:|javascript:|#|')/.test(h) && !h.includes("'+"));
  for (const h of hrefs) {
    const clean = h.split('#')[0].split('?')[0];
    if (!clean) continue;
    let target = clean.startsWith('/') ? clean.slice(1)
               : path.posix.join(path.posix.dirname(p), clean);
    if (target.endsWith('/') || target === '') target += 'index.html';
    if (!exists(target) && !exists(target + '/index.html')) dead.push(p + ' -> ' + h);
  }
}
t('no internal link points at a missing file', dead.length === 0, dead.join(' | ') || 'all resolve');

/* ============================ 3. PROMISE AUDIT ============================ */
G('Promise audit — the site may not claim what the code does not do');

/* Strip HTML comments first. The repaired source explains, in a comment, exactly which sentence
   was removed and quotes it — so a naive scan finds the deleted promise in the note describing its
   deletion and fails on prose nobody can read. Only rendered text can make a claim. */
const stripComments = h => h.replace(/<!--[\s\S]*?-->/g, '');
const idxVisible = stripComments(idx);
const marksApplicants = /addEventListener\('scheduled'|scheduled\s*\(|function markRequests|\/mark-requests/i.test(worker);
t('no claim that applicant calls are marked and reported, unless a mechanism exists',
  marksApplicants || !/you are told the result|whether or not access is granted/i.test(idxVisible),
  marksApplicants ? 'mechanism present' : 'no mechanism, and no such claim — consistent');
t('the summariser only claims citation checking when the worker verified it',
  /a\.verified\s*\?/.test(term), 'gated on the verified flag');
t('the 404 request log is derived, not hardcoded',
  !/no redirect rule matched/.test(read('404.html').replace(/<!--[\s\S]*?-->/g, '')));
t('no "BUILD" label implying a pipeline that does not exist', !/>BUILD</.test(idxVisible));

/* ============================ 4. WORKER SECURITY ============================ */
G('Worker — prompt injection and citation enforcement');

t('headline text is stripped of angle brackets before it reaches the prompt',
  /replace\(\/\[<>\]\/g,\s*''\)/.test(worker));
t('instructions live in the system parameter, not the user turn', /\bsystem,\n/.test(worker) || /system\s*,/.test(worker));
t('the system prompt declares headline content untrusted',
  /UNTRUSTED THIRD-PARTY|never an instruction/i.test(worker));
t('claims without a valid citation are dropped',
  /if \(!src\.length\) return null;/.test(worker));
t('citations are range-checked against the headlines actually sent',
  /n >= 1 && n <= heads\.length/.test(worker));
t('an all-dropped response errors rather than showing unverified prose',
  /failed its citation check/.test(worker));
t('summaries are cached by content hash, not by clock hour',
  /SHA-256/.test(worker) && /const cacheKey = 'ai2:' \+ hash/.test(worker));
t('temperature is pinned for reproducibility', /temperature: 0/.test(worker));

// exercise the real validator shape
const validate = new Function(`
  const CTRL=new RegExp('['+String.fromCharCode(0)+'-'+String.fromCharCode(31)+String.fromCharCode(127)+']','g');
  const clean=(v,max)=>String(v==null?'':v).replace(CTRL,' ').slice(0,max).trim();
  return function(c,n){
    if(!c||typeof c.text!=='string')return null;
    const t=clean(c.text,600); if(!t)return null;
    const src=(Array.isArray(c.sources)?c.sources:[]).map(x=>parseInt(x,10))
      .filter(x=>Number.isInteger(x)&&x>=1&&x<=n);
    if(!src.length)return null;
    return {text:t,sources:[...new Set(src)].sort((a,b)=>a-b)};
  };`)();
t('uncited claim dropped', validate({ text: 'x', sources: [] }, 5) === null);
t('out-of-range citation dropped', validate({ text: 'x', sources: [99] }, 5) === null);
t('index 0 rejected (headlines are 1-based)', validate({ text: 'x', sources: [0] }, 5) === null);
t('valid citation kept, bogus index stripped',
  JSON.stringify(validate({ text: 'x', sources: [2, 99] }, 5)?.sources) === '[2]');

/* ============================ 5. MATHS ============================ */
G('Maths — parsed out of terminal/index.html so the shipped code is what runs');

const M = new Function(`
  let D; const TRADING_DAYS=252;
  ${grab(term, 'toReturns')}
  ${grab(term, 'normCdf')}
  ${grab(term, 'thesisSigma')}
  ${grab(term, 'thesisProbability')}
  ${grab(term, 'spyRealisedVol')}
  ${grab(term, 'expectancyStats')}
  return {setD:d=>{D=d}, toReturns, normCdf, thesisSigma, thesisProbability, spyRealisedVol, expectancyStats};
`)();

for (const [x, want] of [[0, .5], [1, .8413447], [-1, .1586553], [1.96, .9750021], [3, .9986501]])
  t(`normCdf(${x})`, Math.abs(M.normCdf(x) - want) < 2e-6, M.normCdf(x).toFixed(7));
t('normCdf is symmetric', Math.abs(M.normCdf(.7) + M.normCdf(-.7) - 1) < 1e-9);

const P = (S, K, T, sig, mu) => {
  const d2 = (Math.log(S / K) + (mu - .5 * sig * sig) * T) / (sig * Math.sqrt(T));
  return K < S ? 1 - M.normCdf(d2) : M.normCdf(d2);
};
t('d2 flip point is sigma = sqrt(2*mu)', Math.abs(P(100, 100.0001, 1, Math.sqrt(2 * .077), .077) - .5) < 1e-3);
t('a 3x target in 3 months is near-impossible', P(100, 300, .25, .3, .077) < .01);
t('more time raises the chance of a distant target', P(100, 140, 2, .3, .077) > P(100, 140, .25, .3, .077));
t('more volatility raises it too', P(100, 140, 1, .6, .077) > P(100, 140, 1, .2, .077));

const log = []; let px = 100;
for (let i = 0; i < 130; i++) { px *= 1 + Math.sin(i * 1.7) * .018; log.push({ d: 'x', p: +px.toFixed(4) }); }
M.setD({ holdings: [{ sym: 'T', type: 'Stock' }], analyses: { T: { price: log.at(-1).p, riskBeta: 1.1 } }, priceLog: { T: log } });
const sig = M.thesisSigma('T');
t('thesisSigma measures from the price log', sig.sigma > .01 && sig.sigma < 3 && /logged closes/.test(sig.source));
const dl = new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10);
t('probability is null without a target', M.thesisProbability('T', null, dl) === null);
t('probability is null without a deadline', M.thesisProbability('T', 100, '') === null);
t('an expired deadline is flagged, not computed', M.thesisProbability('T', 100, '2020-01-01').expired === true);
const up = M.thesisProbability('T', log.at(-1).p * 1.2, dl), dn = M.thesisProbability('T', log.at(-1).p * .85, dl);
t('an upside target is not marked "below"', up.below === false);
t('a downside target is marked "below"', dn.below === true);
t('CAPM drift uses beta', Math.abs(up.mu - (.045 + 1.1 * (.08 - .045))) < 1e-9);

M.setD({ priceLog: { SPY: log } });
const rv = M.spyRealisedVol(20);
t('realised vol uses only the requested window', rv.n === 20);
t('realised vol annualises by sqrt(252)', Math.abs(rv.annual - rv.daily * Math.sqrt(252)) < 1e-9);
M.setD({ priceLog: { SPY: Array.from({ length: 40 }, () => ({ d: 'x', p: 400 })) } });
t('a flat series returns null, not zero or NaN', M.spyRealisedVol(20) === null);

const st = M.expectancyStats([2, -1, 3, -4, 5]);
t('expectancy is the mean edge', Math.abs(st.expectancy - 1) < 1e-9);
t('hit rate counts positive edges only', Math.abs(st.hitRate - 60) < 1e-9);
t('a 95% interval is produced', st.lo != null && st.hi != null && st.lo < st.expectancy && st.hi > st.expectancy);

/* ============================ 6. SEASONALITY ============================ */
G('Calendar effects — must stay context, never a signal');

t('the panel states it feeds no verdict', /not used in any verdict/.test(term));
t('a Bonferroni threshold for 12 tested months is applied', /const crit=2\.87/.test(term));
t('September stays the lowest mean in the table',
  (() => { const m = /const SEASONAL_MEANS=\{([\s\S]*?)\}/.exec(term)[1];
    const o = {}; for (const [, k, v] of m.matchAll(/(\d+):(-?[\d.]+)/g)) o[k] = +v;
    return Object.keys(o).reduce((a, b) => o[a] <= o[b] ? a : b) === '9'; })());

/* ============================ 7. DEMO ============================ */
G('Front-page marking demo');

t('the dataset is bundled, not fetched from a third party at runtime', exists('demo/data.js'));
const ds = JSON.parse(read('demo/data.js').replace(/^[\s\S]*?window\.PF_DEMO=/, '').replace(/;\s*$/, ''));
t('SPY is present as the benchmark', !!ds.series.SPY);
t('every series is the same length as the date index',
  Object.values(ds.series).every(a => a.length === ds.dates.length), ds.dates.length + ' rows');
t('enough history for a 180-day horizon after 120 shown', ds.dates.length > 120 + 180 + 50);
t('no null or non-finite closes', Object.values(ds.series).every(a => a.every(v => Number.isFinite(v))));
t('the demo scores edge against the index, not raw return', /const edge=dir==='BUY'\?alpha:-alpha/.test(idx));
t('the ticker is hidden until after the mark', /it was<\/div>/.test(idx) && !/<label>Ticker<\/label>/.test(idx));

console.log('\n' + (fail
  ? `\x1b[31m${fail} FAILED\x1b[0m, ${pass} passed`
  : `\x1b[32mALL ${pass} CHECKS PASSED\x1b[0m`));
process.exit(fail ? 1 : 0);
