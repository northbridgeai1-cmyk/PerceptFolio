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
/* Strips BOTH comment kinds. It stripped only HTML comments, which meant an assertion about what
   the page CLAIMS could fail on a source comment documenting the very claim being removed — the
   same trap that produced two false failures earlier in this suite's life. Only rendered text can
   make a promise, so only rendered text is audited. */
const admin = read('admin.html');
const privacy = read('privacy/index.html');
const terms = read('terms/index.html');
/* Comment scoping has to respect script boundaries. An earlier version stripped JS block comments
   anywhere in the document, so an HTML attribute whose value ends in a slash-star sequence (an
   image accept filter) opened a fake comment that swallowed 87,520 characters of real markup. The
   audit built on it then reported "no em dashes" while 116 were still on screen. A tool that can
   be fooled into a clean result is worse than no tool.
   This very comment hit the same trap once: writing the offending literal inside a block comment
   closed it early. It is described in words here for that reason. */
const stripComments = h => h
  .split(/(<script\b[^>]*>[\s\S]*?<\/script>)/i)
  .map(part => /^<script\b/i.test(part)
      ? part.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
      : part.replace(/<!--[\s\S]*?-->/g, ''))
  .join('');
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

/* ==================== 4b. FINNHUB PROXY — no key in the browser ==================== */
G('Finnhub proxy — the market-data key must never reach a public file');

t('no Finnhub key is hardcoded anywhere in the shipped pages',
  !/token=[A-Za-z0-9]{15,}/.test(term + idx) && !/["'][a-z0-9]{20}["']\s*;?\s*\/\/\s*finnhub/i.test(term));
t('the worker exposes a /finnhub route', /url\.pathname === '\/finnhub'/.test(worker));
t('the proxy is an allowlist, not a passthrough', /const ALLOWED = new Set\(\[/.test(worker));
t('the routing parameter cannot smuggle a token', /k !== 'path' && k !== 'token'/.test(worker));
t('the key is attached server-side', /searchParams\.set\('token', env\.FINNHUB_API_KEY\)/.test(worker));
t('rate limit and bad key stay distinguishable', /res\.status === 429/.test(worker) && /res\.status === 401 \|\| res\.status === 403/.test(worker));

/* Every endpoint the app calls must be permitted, or that screen breaks only for people
   relying on the proxy — a failure mode invisible to anyone testing with a local key. */
const called = [...new Set([...term.matchAll(/fh\('(\/[^'?]*)/g)].map(m => m[1]))].sort();
const allowed = (/const ALLOWED = new Set\(\[([\s\S]*?)\]\)/.exec(worker) || [, ''])[1];
const missing = called.filter(e => !allowed.includes("'" + e + "'"));
t('every endpoint the app calls is on the allowlist', missing.length === 0,
  missing.length ? 'MISSING: ' + missing.join(', ') : called.length + ' endpoints');

t('the landing form points at a worker hostname, not a path on this site',
  /worker: 'https:\/\/[a-z0-9.-]+'/.test(idx) && !/worker: 'https:\/\/perceptfolio\.com/.test(idx));
t('the worker reports its own build so a paste-deploy can be verified',
  /const WORKER_VERSION/.test(worker) && /url\.pathname === '\/version'/.test(worker));
t('/version never leaks secret values, only whether they are set',
  /FINNHUB_API_KEY: !!env\.FINNHUB_API_KEY/.test(worker) && !/FINNHUB_API_KEY: env\.FINNHUB_API_KEY[^!]/.test(worker));
t('the app falls back to the worker when no local key is set',
  /if\(!D\.apiKey&&syncConfigured\(\)\)/.test(term));
t('a local key still wins over the worker', term.indexOf('if(!D.apiKey&&syncConfigured()') < term.indexOf("if(!D.apiKey)throw new Error('NO_KEY')"));
t('feature gates count the worker as a source of market data',
  !/if\(!D\.apiKey\)\{toast\(/.test(term) && /function hasMarketData\(\)/.test(term));

/* ==================== 4c. TEST ACCOUNT — must be a sandbox ==================== */
G('Test account — public credentials, so containment is the whole safety argument');

t('the demo credentials exist', /const DEMO_ID='test1212', DEMO_PW='testishard'/.test(term));
t('login accepts them before the normal profile lookup',
  term.indexOf("if(email===DEMO_ID&&pw===DEMO_PW)return enterDemo()") <
  term.indexOf("if(!email||!DB.profiles[email])return toast"));

/* The containment claim, checked per function. If any sync entry point loses its guard, a login
   whose password is printed in a public file could overwrite the real portfolio — and
   last-write-wins makes that silent and unrecoverable. */
for (const fn of ['syncPush','syncPull','syncNow','syncPullForce','scheduleSync','saveSyncConfig']) {
  const m = new RegExp('function ' + fn + '\\([^)]*\\)\\{\\s*(?:\\/\\*[\\s\\S]*?\\*\\/\\s*|\\/\\/[^\\n]*\\n\\s*)*if\\(isDemoUser\\(\\)\\)').test(term);
  t(fn + ' refuses the demo account before doing anything', m);
}
t('the demo profile is flagged in storage', /isDemo:true/.test(term));
t('the demo is rebuilt on each sign-in, not reused', /DB\.profiles\[DEMO_ID\]=\{/.test(term));
t('a demo session is visually unmistakable', /body\.is-demo #app::before/.test(term) && /classList\.toggle\('is-demo'/.test(term));
t('the demo carries no market-data key', !/demoData[\s\S]{0,900}apiKey:\s*['"][^'"]+['"]/.test(term));
t('demo holdings are seeded with prices so screens render with no API',
  /demoData\(\)[\s\S]{0,700}sym:'AAPL'[^}]*price:/.test(term));

/* ==================== 4d. ACTIVE RETURN / INFORMATION RATIO ==================== */
G('Active return — tracking error must never stand alone, and IR never without its interval');

/* The mean subtraction is the C7 guarantee and must not move. The annualisation multiplier moved
   in C6 from a bare sqrt(252) to the Lo-adjusted scale, which is why this no longer pins the whole
   expression — only the part that carries the promise. */
t('tracking error subtracts the mean (stdev, not RMS)',
  /\(b-m\)\*\(b-m\)/.test(term) && /const te=Math\.sqrt\(v\)\*annualScale\(d,TRADING_DAYS\)\.scale/.test(term));
t('IR is active return over tracking error', /const ir=meanAnn\/te/.test(term));
t('a confidence interval is always computed', /lo=se==null\?null:ir-1\.96\*se/.test(term));
t('the straddle case is detected explicitly', /straddles:/.test(term));
t('a straddling interval renders the words "Don\'t know"', /Don\\'t know/.test(term));
t('the years-needed figure is shown when the interval straddles', /yearsNeeded/.test(term));
t('weights are cost basis, not market value',
  /costs=hs\.map\(h=>h\.shares\*h\.cost\)/.test(term) && !/costs=hs\.map\(h=>h\.shares\*h\.price\)/.test(term));
/* Ordering is the Chairman's ruling, not cosmetics: the equal-weight row grades sizing on a
   sample that exists, the SPY row needs ~16 years. Whichever renders first is what gets read.
   NB the source carries a raw ampersand here, not an entity — an earlier version of this
   assertion searched for "S&amp;P" and failed against correct code. */
t('the equal-weight benchmark exists and is listed first',
  term.includes('Against equal weight') && term.includes('Against the S&P 500') &&
  term.indexOf('Against equal weight') < term.indexOf('Against the S&P 500'));
t('returns are date-aligned across every ticker', /dates\.every\?|dates=Object\.keys\(maps\[0\]\)\.filter\(d=>maps\.every/.test(term));
t('tracking error is never presented as a standalone verdict',
  /how different, not how good/.test(term));

/* ==================== 4e. THE DAY TOGGLE ==================== */
G('Today vs Yesterday — broken three times, so the shape of the fix is asserted');

/* The bug each time was asking "is there a live quote" instead of "which session does it
   describe". Outside market hours Finnhub returns the last completed session — the same one
   FRED's newest row holds — so the two tabs rendered one number twice. */
t('session identity is decided by date, not by whether a quote exists',
  /function liveIsOwnSession\(data,spx\)/.test(term) && /sd>spx\[0\]\.date/.test(term));
t('a quote with no timestamp falls back to comparing the moves',
  /Math\.abs\(fredMove-data\.LIVE\.pct\)>0\.005/.test(term));
t('the FRED path no longer keys the offset off mere existence of a quote',
  !/const off=\(moveDay==='yesterday'&&!data\.LIVE\)\?1:0/.test(term));
t('the FRED path offsets from what today actually rendered',
  /const todayShowsSpx0=!\(data\.LIVE&&ownSession\)/.test(term));
t('"today" only uses the live quote when it is its own session',
  /moveDay==='today'&&data\.LIVE&&ownSession/.test(term));
t('the no-VIX path applies the same test against its own log',
  /const liveOwnSession=!!\(live&&\(!newest\|\|Math\.abs\(newest\.pct-live\.pct\)>0\.005\)\)/.test(term));
t('the no-VIX path no longer keys off mere existence either',
  !/const off=\(moveDay==='yesterday'&&live\)\?0:/.test(term));
t('a stale close is never labelled "right now"',
  /moveDay==='today'&&live&&liveOwn/.test(term));

/* ==================== C1 — BETA-ADJUSTED MARKS ==================== */
G('C1 acceptance: no mark renders anywhere without a beta beside it');

t('Jensen alpha exists and follows r_p - [r_f + beta(r_m - r_f)]',
  /function jensenAlpha/.test(term) && /stockRet-\(rf\+beta\*\(spyRet-rf\)\)/.test(term));
t('beta is estimated as cov/var from the stored series',
  /function betaVsSpy/.test(term) && /cov\/varm/.test(term));
t('the risk-free leg is scaled to the holding period, not annualised',
  /RF_ANNUAL\*\(heldDays\/365\)/.test(term));
t('a call with no beta is not graded', /if\(stockRet==null\|\|spyRet==null\|\|beta==null/.test(term));
t('the scorecard table carries a beta column', /<th title="Sensitivity to the market[^>]*>&beta;<\/th>/.test(term));
t('raw excess return is kept but labelled unadjusted',
  /vs SPY <span style="font-weight:400;opacity:\.6">\(raw\)<\/span>/.test(term));
t('an ungraded row says "no beta" rather than showing a number',
  /no beta<\/span>/.test(term));
t('the headline no longer calls raw excess return an edge vs SPY',
  /pts per call, beta-adjusted/.test(term) && !/pts per call vs SPY/.test(term));
t('the aggregate is beta-adjusted too, not just the rows',
  /callEdge\(c,jensenAlpha\(stockRet,spyRet,bi\?bi\.beta:null,held\)\)/.test(term));

/* ==================== C2 — INVITE GATE ==================== */
G('C2 acceptance: account creation is impossible without a valid unburned code');

t('the create-account form has an invite field', /id="newInvite"/.test(term));
t('the code is format-checked before any network call',
  /\^\[A-Z0-9\]\{5\}-\[A-Z0-9\]\{5\}\$\/\.test\(code\)/.test(term));
t('the worker validates it', /\/invite\?code='\+encodeURIComponent\(code\)/.test(term));
t('creation is refused unless the worker says valid', /if\(!r\.ok\|\|!inv\.valid\)return toast/.test(term));
t('the worker\'s own error text is surfaced, not a paraphrase', /toast\(inv\.error\|\|/.test(term));
/* Burn AFTER the profile is stored. The reverse strands someone with a spent code and no
   account, which is the unrecoverable direction. */
t('the code is burned only after the profile is written',
  term.indexOf('localStorage.setItem(STORE_KEY,JSON.stringify(DB));\n  /* Burned after') <
  term.indexOf("method:'POST'"));
t('validation works without sync configured (the /invite route is public)',
  /const INVITE_WORKER=/.test(term) && /syncConfigured\(\)\?syncCfg\.url:INVITE_WORKER/.test(term));
t('a network failure fails closed, never open', /Could not reach the worker to check that code/.test(term));

/* ==================== C3 — DERIVED SAMPLE THRESHOLD ==================== */
G('C3 acceptance: "40" no longer appears as a threshold anywhere');

t('the hard-coded constant is gone', !/RECORD_THRESHOLD/.test(term));
t('no page asserts forty marked calls',
  !/forty marked calls/i.test(stripComments(term)) && !/forty marked calls/i.test(stripComments(idx)));
t('the threshold is computed as (Z*sigma/mean)^2',
  /Math\.ceil\(Math\.pow\(Z95\*sd\/mean,2\)\)/.test(term));
t('the pre-record assumption is declared as one',
  /EDGE_ASSUMPTION=\{mean:2,sd:12\}/.test(term) && /an assumption, not a measurement/.test(term));
t('the operator\'s own edge and dispersion replace it once a sample exists',
  /usingOwn\?Math\.abs\(st\.expectancy\):EDGE_ASSUMPTION\.mean/.test(term));
t('a floor stops dispersion being estimated from nothing', /RECORD_FLOOR=20/.test(term));
t('the landing page states the formula rather than a round number',
  /1\.96 × dispersion ÷ edge/.test(idx));

/* ==================== C6 — AUTOCORRELATION-ADJUSTED ANNUALISATION ==================== */
G('C6: sqrt(252) is only right for iid returns');

t('the Lo scale exists and reduces to sqrt(q) when no lag is significant',
  /function annualScale/.test(term) && /const plain=Math\.sqrt\(q\)/.test(term));
t('autocorrelations are estimated from the series', /function autocorr/.test(term));
t('only individually significant lags contribute', /Math\.abs\(r\)>bound\?r:0/.test(term));
t('Sharpe uses q/scale, not sqrt(q)', /const rt=TRADING_DAYS\/as\.scale/.test(term));
t('annualised volatility uses the same scale', /volAnnual:sd\*as\.scale/.test(term));
t('GARCH output is corrected too', /const gScale=annualScale\(rets,TRADING_DAYS\)\.scale/.test(term));
t('the Monte Carlo de-annualisation is excluded on purpose, with a reason',
  /C6 EXCLUSION[\s\S]{0,300}iid by\s*\n?\s*construction/.test(term));
t('the VIX de-annualisation is excluded on purpose, with a reason',
  /C6 EXCLUSION[\s\S]{0,300}options market's own annualised number/.test(term));
t('no empirical series is still annualised by a bare sqrt', 
  !/const te=Math\.sqrt\(v\)\*Math\.sqrt\(TRADING_DAYS\)/.test(term) &&
  !/sigma=Math\.sqrt\(variance\)\*Math\.sqrt\(252\)/.test(term));

/* ==================== C8 — DIVIDENDS ARE A PROJECTION ==================== */
G('C8: an accrued figure must not be labelled as income received');

t('no screen says "Dividends earned"', !/Dividends earned/.test(stripComments(term)));
t('the tile says projected', /Dividends accrued <span class="muted"[^>]*>\(projected\)/.test(term));
t('the tile states it was never received', /never received[,—:] accrued at declared rates/.test(term));
t('the explanatory copy calls it a projection, not income', /a <b>projection, not income<\/b>/.test(term));

/* ==================== ACCESS REQUEST — no three-call requirement ==================== */
G('Access request: email and a reason, nothing else mandatory');

t('the worker no longer rejects a request without three calls',
  !/return json\(\{ error: 'Three calls are required\.' \}/.test(worker));
t('structured calls are still accepted and validated if sent',
  /if \(!\/\^\[A-Z\.\\-\]\{1,8\}\$\/\.test\(sym\)\)/.test(worker));
t('the optional free-text call is stored', /const call = clean\(body\.call, 300\)/.test(worker));
t('the form no longer builds three structured rows', !/callRows/.test(idx));
t('the form no longer blocks on calls', !/Fill in all three calls/.test(idx));
t('the page does not claim all fields are required', !/all fields required/.test(stripComments(idx)));
t('no public page still says three calls are required',
  !/three calls, with a target, a stop and a date/.test(stripComments(idx)));

/* The denial email carried the marking promise C5 removed from the landing page — in the one place
   an applicant would read it as a personal commitment. */
/* stripComments, because the change note above the fix quotes the sentence it removed — the same
   trap that has produced a false failure in this suite four times now. */
t('the denial email makes no promise to mark and report',
  !/will be marked on the dates you set/.test(stripComments(admin)));
t('the approval email points at a real sign-in URL',
  /origin\+'\/terminal\//.test(admin) && !/origin\+'\/app\\n/.test(admin));

/* ==================== ADMIN QUEUE — tabs, pause, two emails ==================== */
G('Access queue: four views, a pause that states its own limits, and both emails');

t('four filter tabs exist', /data-f="pending"/.test(admin) && /data-f="accepted"/.test(admin) &&
  /data-f="denied"/.test(admin) && /data-f="all"/.test(admin));
t('a paused grant still counts as accepted, not denied',
  /const isAccepted=r=>r\.status==='personal'\|\|r\.status==='business'/.test(admin));
t('each tab shows a count', /\['pending','accepted','denied','all'\]\.forEach/.test(admin));

t('the worker refuses a paused code', /if \(inv\.paused\) return json/.test(worker));
t('only a granted request can be paused', /Only a granted request can be paused/.test(worker));
/* Was: "already redeemed — their existing account is unaffected". That sentence described the old
   limitation and had to change when Pause started reaching redeemed accounts. */
t('pausing reports which case applied',
  /already redeemed — they are locked out at next check-in/.test(worker) &&
  /already redeemed — access restored at next check-in/.test(worker));
/* The honest limit, stated in the UI and not only in a comment: an already-created account cannot
   be revoked, because the terminal is local and offline by design. */
/* Pause now reaches redeemed accounts, so the copy that said otherwise had to change with it —
   an interface describing an older limit is the same fault as one describing a false capability. */
t('the admin screen states that a redeemed account IS locked out',
  /locked out at its next check-in/.test(admin));
t('the confirm dialog states the offline grace before you click',
  /keeps working for up to 7 days, then locks itself/.test(admin));
t('the terminal actually checks in on login', /const acc=await checkAccess\(email\)/.test(term));
t('a paused verdict is cached so going offline cannot dodge it',
  /if\(st\[key\]&&st\[key\]\.paused\)return\{allow:false,reason:'paused'\}/.test(term));
t('the grace is measured from the last SUCCESSFUL check, not from now',
  /const days=\(Date\.now\(\)-last\)\/86400000/.test(term));
t('an unknown grant is never a lockout', /known: false, active: true/.test(worker));
t('the durable grant record has no TTL',
  /put\('grant:' \+ code, JSON\.stringify\(\{[\s\S]{0,240}\}\)\);/.test(worker));
t('pausing updates the durable grant, not just the expiring code',
  /await env\.PF_SYNC\.put\('grant:' \+ rec\.code, JSON\.stringify\(g\)\)/.test(worker));
t('a locked-out user can still export their own data', /blockedExport/.test(term));
t('the access check cannot hang login — it aborts after 5s into the grace path',
  /new AbortController\(\)/.test(term) && /setTimeout\(\(\)=>ctl\.abort\(\),5000\)/.test(term));

t('there are two distinct email templates', /const denied=r\.status==='denied'/.test(admin));
t('the approval email congratulates and leads with the code',
  /Congratulations[.,—]? ?[Yy]our access to PerceptFolio has been approved/.test(admin) &&
  /YOUR INVITE CODE:/.test(admin));
t('single use is stated twice, once on the code line',
  /This code works ONCE, and expires 30 days from today/.test(admin) &&
  /it stops working the moment your account exists/.test(admin));
t('the decline email issues no code and makes no promise',
  /not able to grant access at this time/.test(admin) && !/invite code/i.test(
    (/\? 'Thanks for applying[\s\S]*?financial branch'/.exec(admin)||[''])[0]));
t('the sign-in link is the public site, not location.origin',
  /const origin='https:\/\/perceptfolio\.com'/.test(admin));

/* ==================== WORKER ROUTE BOUNDARY ==================== */
G('Which routes sit above the auth check — a route on the wrong side fails silently');

{
  const auth = worker.indexOf('safeEqual(token, env.SYNC_SECRET)');
  const at = r => worker.indexOf("url.pathname === '" + r + "'");
  const isPublic = r => { const i = at(r); return i !== -1 && i < auth; };
  const exists = r => at(r) !== -1;

  /* These are called by clients holding no credentials. Behind the auth check they return 401,
     and the caller cannot tell that apart from the worker being down — so the feature fails
     silently rather than loudly. /status behind auth meant Pause never locked anyone out. */
  for (const r of ['/request', '/version', '/invite', '/status', '/fred'])
    t(r + ' must be reachable without the sync key', isPublic(r));

  /* Operator only — these read the queue, mint codes, or spend the shared 60/min Finnhub quota
     that every user's market data depends on. /finnhub in particular must stay here: it was
     briefly carried above the wall by an edit that sliced between two comment banners, which
     would have let anyone exhaust the quota. */
  for (const r of ['/requests', '/decide', '/pause', '/finnhub'])
    t(r + ' must require the sync key', exists(r) && !isPublic(r));

  /* /summarise is dual-auth by design: operator key, or a live invite code under a daily cap. It
     sits above the wall and does its own checking, so "requires the key" is the wrong assertion —
     what matters is that it cannot be called with neither. */
  t('/summarise authenticates itself rather than relying on the wall',
    isPublic('/summarise') &&
    /Summaries need a live invite code or the sync key/.test(worker) &&
    /Daily summary limit reached/.test(worker));

  /* Every route the worker advertises must actually be implemented. This is the check that caught
     /finnhub being deleted by an edit that sliced from one comment banner to the next. */
  const advertised = (/routes: \[([^\]]*)\]/.exec(worker) || [, ''])[1]
    .split(',').map(x => x.trim().replace(/'/g, '')).filter(x => x.startsWith('/') && x !== '/?slot=');
  const missing = advertised.filter(r => !exists(r));
  t('every advertised route is implemented', missing.length === 0,
    missing.length ? 'MISSING: ' + missing.join(', ') : advertised.length + ' routes');
}

t('a code redeemed before grant records existed still gets macro data',
  /const c = await env\.PF_SYNC\.get\('code:' \+ code\)/.test(worker) && /legacy: true/.test(worker));
t('a paused code is refused on both lookup paths',
  (worker.match(/if \(inv\.paused\) return null/g)||[]).length >= 1 &&
  /return rec\.paused \? null : rec/.test(worker));
t('macro data is gated on a live grant, not the sync key',
  /Macro data needs a live invite code, or the sync key/.test(worker));
t('the FRED series allowlist is closed',
  /FRED_ALLOWED = new Set\(\['VIXCLS', 'SP500', 'WILL5000PR', 'GDP'\]\)/.test(worker));
t('a paused grant loses macro data too', /return rec\.paused \? null : rec/.test(worker));
t('the terminal presents its invite code when it has no sync key',
  /codeParam=syncConfigured\(\)\?'':'&code='/.test(term));

/* Stronger than before: the dropdown is gone entirely rather than present-but-overridden. A control
   whose value is discarded looks like a decision and is not one. */
t('there is no account-type control to override', !/newAccountType/.test(term));
t('the tier comes only from the grant, defaulting to the lesser of the two',
  /const grantedTier=\(inv\.tier==='business'\|\|inv\.tier==='personal'\)\?inv\.tier:'personal'/.test(term) &&
  /accountType:grantedTier/.test(term));
t('first-run setup does not assume the reader owns the worker',
  !/Skip it if your worker already holds one/.test(term));

/* ==================== B1 — CRON MARKING ==================== */
G('B1: marks no longer depend on the app being open');

t('the worker exports a scheduled handler', /async scheduled\(event, env, ctx\)/.test(worker));
t('every run stamps cron:last, even on failure', /put\('cron:last', JSON\.stringify\(note\)\)/.test(worker));
/* Two guards since D3 split them: not yet due, and too late to be honest about. Both must hold
   or the cron would fabricate a mark from a price nobody observed on the day. */
t('nothing is marked before its anniversary reaches a close', /if \(today < sch\.due\) continue;/.test(worker));
t('overdue-past-tolerance is never backfilled (I11)', /if \(lag > cronTolerance\(h\)\) continue;/.test(worker));
t('an existing mark is never overwritten', /if \(\(marks\[c\.id\] \|\| \{\}\)\[h\]\) continue/.test(worker));
t('the registry keeps only validated fields, not the client blob',
  /Only the fields the cron needs are kept/.test(worker));
t('/callreg and /marks are dual-auth like /fred', /'c:' \+ code/.test(worker) && /'s:' \+ slot/.test(worker));
t('the client registers open calls after marking', /pushCallRegistry\(\);\s*\/\/ keep the worker/.test(term));
t('the client adopts worker marks on session entry', /reconcileWorkerMarks\(\)\.then/.test(term));
t('adoption never overwrites a local mark', /if\(c\.marks\[h\]\|\|!wm\[h\]\)return/.test(term));
t('the demo account registers nothing', /isDemoUser\(\)\)return null/.test(term));
t('/version reports the last cron run so a missing trigger is observable', /body\.cron = cl/.test(worker));

/* ==================== B2 — BACKUP PROTECTION ==================== */
G('B2: a record that cannot be rebuilt must nag before it can be lost');

t('exports are timestamped', /D\.lastExportAt=Date\.now\(\)/.test(term));
t('a never-exported profile with data gets the red banner', /No backup exists\./.test(term));
t('a stale backup gets the amber banner with the age', /Last backup '\+st\.days\+' days ago/.test(term));
t('the never-exported banner cannot be snoozed, the stale one can',
  /st\.level==='stale'&&sessionStorage\.getItem\('pf_backup_snooze'\)/.test(term) &&
  /never\?'':'<button[^>]*pf_backup_snooze/.test(term));
t('iOS Safari uninstalled adds the 7-day eviction warning',
  /iosSafariUninstalled/.test(term) && /deletes this site\\'s storage after 7 days/.test(term));
t('an empty profile is never nagged', /hasData=\(D\.holdings\|\|\[\]\)\.length>0/.test(term));
t('the demo account is never nagged', /backupState\(\)\{\s*\n?\s*if\(typeof isDemoUser/.test(term));

/* ==================== QUEUE NOTIFICATION ==================== */
G('The queue is no longer silent');

t('the operator terminal checks for pending requests', /function checkPendingRequests/.test(term));
t('only devices holding the sync key make the check', /if\(!syncConfigured\(\)\|\|!syncCfg\.key\)return/.test(term));
t('the demo account never checks', /checkPendingRequests[\s\S]{0,300}isDemoUser\(\)\)return/.test(term));
t('throttled to one look per 15 minutes', /_pendingReqs\.at<15\*60\*1000/.test(term));
t('pending requests appear as a Command action', /kind:'ACCESS',sym:'QUEUE'/.test(term));
t('no email is claimed, because the worker cannot send any',
  /the worker cannot send any/.test(term));

/* ==================== PER-USER SYNC AND SUMMARIES ==================== */
G('Invited users get sync and summaries without the master key');

t('/usync exists and is keyed on the invite code', /url\.pathname === '\/usync'/.test(worker) &&
  /const ukey = 'uslot:' \+ code/.test(worker));
t('a paused grant loses sync with everything else', /if \(!\(await activeGrant\(code\)\)\)/.test(worker));
/* Each code addresses only its own key, so one user cannot read another's blob. */
t('one code cannot reach another code\'s slot',
  !/uslot:' \+ (?!code)/.test(worker));
t('the same 2MB ceiling and updatedAt contract as operator sync',
  /raw\.length > MAX_BYTES/.test(worker) && /typeof parsed\.updatedAt !== 'number'/.test(worker));

t('summaries are capped per code per day', /aiq:' \+ new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(worker) &&
  /used >= 12/.test(worker));
t('the operator key is uncapped', /if \(!safeEqual\(tok2, env\.SYNC_SECRET\)\) \{/.test(worker));

t('code sync is a distinct shape from operator sync', /function codeSyncActive/.test(term) &&
  /syncCfg&&syncCfg\.url&&syncCfg\.code&&!syncCfg\.key/.test(term));
t('operator-only gates still use syncConfigured, not syncActive',
  /if\(!syncConfigured\(\)\|\|!syncCfg\.key\)return/.test(term));
t('the offer is hidden from the operator and the demo', /const demo=\(typeof isDemoUser/.test(term));
t('the trade-off is stated before they turn it on', /readable by anyone holding it/.test(term));
t('a rejected code explains that a pause stops sync',
  /if your access was paused, sync stops with it/i.test(term));

/* ==================== P2 — THE AUDIT SCREEN ==================== */
G('P2: the terminal publishes its own breaches');

t('the audit screen exists and is re-checkable', /function renderAudit/.test(term) && /id="auditBody"/.test(term));
t('it renders on opening Settings', /refreshCodeSyncOffer\(\);renderAudit\(\)/.test(term));
/* Placement is deliberate: diagnostics belong after the controls, not in front of them. */
t('the audit card sits last in Settings, after Danger Zone',
  term.indexOf('<h3>Danger Zone</h3>') < term.indexOf('<h3 style="margin:0">Audit</h3>'));
t('the sign-up promise is checked against the live DOM, not asserted',
  /const gated=\/id="newInvite"\/\.test\(document\.documentElement\.innerHTML\)/.test(term));
t('it reads the same record function as the headline strip, so they cannot drift',
  /const rec=callRecord\(90\)/.test(term));
/* Punctuation-agnostic on purpose: these assert BEHAVIOUR, and a copy edit that changes a dash
   to a comma must not read as a regression. */
t('a missing cron trigger is reported as a breach, not silence',
  /NEVER RUN[^<]{0,4}the Cron Trigger is missing/.test(term));
t('a stale cron is caught even if it once ran', /ageH>=36/.test(term));
t('an unreachable worker says so rather than assuming the favourable answer',
  /could not read \/version/.test(term));
t('a never-exported profile is a red row',
  /No backup exists\.<\/b> Everything here lives only in this browser/.test(term));

/* CLEANUP */
t('the dead version-skew fallback is gone', !/queue is mid-update/.test(idx));
t('the request form still distinguishes rejection from unreachable',
  /err\.rejected=true/.test(idx) && /mailFallback\('<b>The request queue is not reachable/.test(idx));

/* ==================== SCHEMA INTEGRITY ==================== */
G('defaultData must keep every key — a missing one is silent data loss');

{
  /* This exists because a // line comment inserted into the object literal — which is written
     across continued lines — swallowed the rest of its line and deleted alerts, analyses, manual,
     myTags and history from every new profile. Nothing failed loudly; the portfolio table simply
     threw on the next render. Keys are cheap to assert and the failure mode is not. */
  const i = term.indexOf('function defaultData');
  let j = term.indexOf('{', i), d = 0, k = j;
  while (true) { if (term[k] === '{') d++; else if (term[k] === '}') { d--; if (!d) break; } k++; }
  const shape = new Function(term.slice(i, k + 1) + ';return defaultData();')();
  const need = ['apiKey','cash','holdings','watchlist','favorites','lists','listOpen','alerts',
    'priceAlerts','analyses','manual','myTags','privacyMode','history','displayName','transactions',
    'dividends','theme','calls','scoreLog','priceLog','strategies','theses','policy','rules',
    'ruleChanges','syncedAt','lastLocalEdit','tourSeen','macro','relations'];
  const missing = need.filter(x => !(x in shape));
  t('every expected key survives in defaultData', missing.length === 0,
    missing.length ? 'MISSING: ' + missing.join(', ') : Object.keys(shape).length + ' keys');
  /* An earlier version of this block also tried to spot a swallowed key by regex. It could not
     distinguish a hidden key from a comment whose TEXT mentions one, and flagged a correct line.
     The evaluation above is the real check: if a key is swallowed it is simply absent, whatever
     the syntax that hid it. A test that cannot tell right from wrong is noise, so it is gone. */
}

/* ==================== LISTS ==================== */
G('Lists: an organisational layer that cannot lose tickers');

t('the tab is labelled Lists', /<span class="lbl">Lists<\/span>/.test(term));
t('lists are additive to watchlist, which keeps its shape',
  /lists:\[\],/.test(term) && /watchlist:\[\],/.test(term));
/* The whole safety argument: two dozen features read D.watchlist, so it must stay a flat array. */
t('watchlist is still a flat array of symbols, not restructured',
  /D\.watchlist\.includes\(sym\)/.test(term) && !/D\.watchlist\.syms/.test(term));
t('adding to a list also adds to the watchlist, so it gets scored',
  /if\(!D\.watchlist\.includes\(sym\)\)D\.watchlist\.push\(sym\)/.test(term));
t('deleting a list keeps its tickers', /they just move to Unlisted/.test(term) &&
  /D\.lists=allLists\(\)\.filter\(x=>x\.id!==id\)/.test(term));
t('removing from the watchlist strips the symbol from every list',
  /if\(sym\)allLists\(\)\.forEach\(l=>\{ if\(l\.syms\)l\.syms=l\.syms\.filter/.test(term));
t('a fixed colour palette, not a free picker', /const LIST_COLORS=\[/.test(term));
t('new lists get an unused colour where one is free', /LIST_COLORS\.find\(c=>!used\.includes\(c\.k\)\)/.test(term));
t('duplicate list names are refused', /You already have a list called that/.test(term));
/* The default bucket is now shown and named as a list called Watchlist, rather than as leftovers
   labelled "Unlisted" — it was always a list, and the old label made the default sound like a
   failure state. */
t('the default bucket is a list called Watchlist',
  /const WATCHLIST_ID='__watchlist'/.test(term) && /name:'Watchlist'/.test(term) &&
  !/label:'Unlisted'/.test(term));
t('a ticker in no named list belongs to Watchlist',
  /\(D\.watchlist\|\|\[\]\)\.filter\(x=>!filed\.has\(x\)\)/.test(term));
t('the Lists column is rendered before My Call, matching the header',
  term.indexOf("listDotsHtml(s)+' '+listMenuHtml(s)") < term.indexOf("'<td class=\"mycall-cell\">'+myTagSelect(s)"));
t('the empty-state colspan matches the column count', /colspan="9" class="empty"/.test(term));

/* ==================== "+ ADD" DIALOGS ==================== */
G('Add forms are dialogs, not permanent fixtures at the top of every tab');

for (const id of ['add-holding','add-ticker','add-list','add-alert'])
  t(id + ' is a hidden dialog until asked for', new RegExp('class="addwrap" id="' + id + '"').test(term));
t('every dialog has a close control', (term.match(/class="add-close"/g)||[]).length >= 4);
t('the tabs carry a + Add button', (term.match(/class="btn-add"/g)||[]).length >= 4);

/* Success closes; failure must not, or a rejected entry silently loses what was typed. */
/* addWatch now has two success paths: a brand-new ticker, and an existing one being filed into
   the open list. Both must close; the "already watched, already in this list" path must not. */
{
  const fn = /function addWatch\(\)\{[\s\S]*?\n\}/.exec(term)[0];
  const closes = (fn.match(/closeAddModal\(\)/g)||[]).length;
  t('both successful ticker paths close the dialog', closes === 2, closes + ' close calls');
  t('the duplicate path returns without closing',
    /return toast\(t\+' is already on your watchlist\.'\)/.test(fn));
}
t('a successful alert closes the dialog', /paPrice'\)\.value='';\s*\n\s*closeAddModal\(\)/.test(term));
t('a successful list closes the dialog', /if\(el\)el\.value='';\s*\n\s*closeAddModal\(\)/.test(term));
t('a successful holding closes the dialog via clearForm, which only runs on success',
  /const clearForm=\(\)=>\{\[[^\]]*\]\.forEach\(id=>\{[^}]*\.value='';\}\);closeAddModal\(\);\}/.test(term));
/* M2's decision price is part of the buy form and must be cleared with it: a value carried into
   the next trade would silently attribute one trade's hesitation to another. */
t('the decision price is cleared with the rest of the form',
  /const clearForm=\(\)=>\{\[[^\]]*'hDecided'[^\]]*\]/.test(term));
/* Every rejection path returns before reaching the close, so no explicit test can assert absence —
   what is asserted is that closing is tied to the success statement, not to the click. */
t('closing is never wired to the button itself', !/onclick="addWatch\(\);closeAddModal/.test(term));

t('Escape closes the open dialog', /e\.key==='Escape'&&_addOpen/.test(term));
t('the backdrop closes it but a click inside does not',
  /e\.target\.id===_addOpen\)closeAddModal/.test(term));
t('only one dialog can be open at a time', /function openAdd\(id\)\{\s*\n\s*closeAddModal\(\)/.test(term));

/* ==================== HOUSE STYLE ==================== */
G('No AI-template tells');

{
  const pages = {index:idx, terminal:term, refused:read('refused/index.html'),
                 '404':read('404.html'), thanks:read('thanks.html'), admin, privacy, terms};
  const rendered = h => h.replace(/<!--[\s\S]*?-->/g,'').replace(/\/\*[\s\S]*?\*\//g,'');

  /* Em dashes are legitimate punctuation; the objection is to the density, which read as generated.
     Source comments keep theirs, since only rendered text is seen. */
  const dashes = Object.entries(pages).filter(([,h]) => rendered(h).includes('—')).map(([n]) => n);
  t('no em dashes in rendered text', dashes.length === 0, dashes.length ? dashes.join(', ') : 'all pages clean');

  /* Coloured emoji used as status icons. Monochrome dingbats (close, favourite, pass/fail) are
     conventional UI marks and deliberately kept. */
  const emoji = Object.entries(pages)
    .filter(([,h]) => /[\u{1F300}-\u{1FAFF}]/u.test(rendered(h))).map(([n]) => n);
  t('no coloured emoji icons', emoji.length === 0, emoji.length ? emoji.join(', ') : 'none');

  t('no purple or violet gradient', !/gradient\([^)]*(?:purple|#[89ab][0-9a-f]{2}[0-9a-f]{2}f)/i.test(idx + term));
  t('no pill-shaped buttons', !/\.btn[^{]*\{[^}]*border-radius:\s*(?:999|9999|50%)/.test(idx + term));
  t('no scroll-triggered reveal animations', !/IntersectionObserver/.test(idx) && !/onscroll/.test(idx));
  t('no testimonials or review widgets', !/testimonial|trusted by|customers say|★★★/i.test(rendered(idx)));

  /* The headline counts must match the code they describe. */
  const q = (term.match(/add\(out\.quality,/g)||[]).length;
  const pr = (term.match(/add\(out\.priceChecks,/g)||[]).length;
  const mo = (term.match(/add\(out\.momentum,/g)||[]).length;
  t('the "22 checks" claim matches the code', q === 12 && pr === 6 && mo === 4 && q+pr+mo === 22,
    `${q} quality + ${pr} value + ${mo} momentum`);
}

/* ==================== LEGAL PAGES ==================== */
G('Privacy and Terms exist, are reachable, and are accepted at sign-up');

t('both pages exist as folders with index.html (case-sensitive host, no rewrites)',
  privacy.length > 3000 && terms.length > 3000);
t('privacy states the no-cookie, no-analytics position', /no cookies, no analytics/i.test(privacy));
t('privacy names every third party that receives anything',
  /Finnhub/.test(privacy) && /Cloudflare/.test(privacy) && /Anthropic/.test(privacy) &&
  /St\. Louis/.test(privacy));
t('terms lead with not-advice', /not investment advice/i.test(terms) &&
  /not a registered investment adviser/i.test(terms));
t('terms state that data loss is unrecoverable',
  /cannot restore data it has never held/.test(terms) && /destroys that data permanently/.test(terms));
t('the documents are formally structured, not marketing pages',
  /class="doc-meta"/.test(privacy) && /class="clause"/.test(terms) &&
  /PF-PRIV-001/.test(privacy) && /PF-TERM-001/.test(terms) &&
  /<dl class="defs">/.test(terms));
t('terms draw attention to the limiting clauses up front',
  /attention is drawn to both/.test(terms));
t('the landing footer links both', /href="\/privacy\/"/.test(idx) && /href="\/terms\/"/.test(idx));

t('sign-up has an acceptance checkbox', /id="agreeTerms"/.test(term));
t('creation is refused without it', /if\(!agreed\)return toast/.test(term));
/* Order matters: refusing after validation would burn a single-use invite code on a rejected
   sign-up, and the applicant would need a new one. */
t('acceptance is checked before the invite code is validated',
  term.indexOf('if(!agreed)return toast') < term.indexOf("'/invite?code='"));
t('what was accepted is recorded on the profile', /acceptedTerms:\{at:Date\.now\(\)/.test(term));
t('the links open in a new tab so the form is not lost', /href="\/terms\/" target="_blank"/.test(term));

/* ==================== CRAFT ==================== */
G('Craft: focus, contrast, landmarks, touch targets');

{
  const pages = ['index.html','terminal/index.html','refused/index.html','privacy/index.html',
                 'terms/index.html','404.html','thanks.html','admin.html'].map(read);
  t('every page has a visible keyboard focus state',
    pages.every(p => /:focus-visible/.test(p)));
  /* An earlier assertion here tried to prove no plain :focus rule existed. It could not tell the
     legitimate "input:focus{outline:none;border-color:...}" — which pairs with the :focus-visible
     ring above — from a real problem, and flagged correct code. Presence of :focus-visible is the
     check that means something. */
  t('the faint text colour clears WCAG AA (4.60:1, was 3.24:1)',
    !/--faint:#5d636e/.test(read('index.html')) && /--faint:#757b86/.test(read('index.html')));
  t('public pages have a main landmark',
    /<main>/.test(read('index.html')) && /<main>/.test(read('refused/index.html')));
  /* Vertical padding on an inline element is painted and clickable but does not grow the box, so
     the display change is what actually enlarges the target rather than just its paint. */
  t('touch targets are enlarged on coarse pointers',
    /@media\(hover:none\),\(max-width:760px\)/.test(read('index.html')) &&
    /\.nav-links a\{display:inline-block;padding:11px 12px/.test(read('index.html')));
  t('footer links are targeted by their own class, not a losing generic selector',
    /footer a,\.foot-l a\{display:inline-block;padding:12px 10px\}/.test(read('index.html')));
}

/* ==================== OVERFLOW MENUS ==================== */
G('Row actions collapse into one control');

t('a single menu implementation serves every row', /function openMenu\(btn,items\)/.test(term));
t('the trigger is a three-dot glyph, drawn not typed',
  /function ovfButton/.test(term) && /<circle cx="8" cy="3"/.test(term));
t('lists use it', /function listMenu\(btn,id\)/.test(term));
t('tickers use it', /function tickerMenu\(btn,sym,idx\)/.test(term));
t('holdings use it', /function holdingMenu\(btn,sym,idx\)/.test(term));
/* The default list cannot be renamed, recoloured or deleted, so offering the menu would present
   three actions that all fail. */
t('the default Watchlist has no list menu', /if\(!l\|\|l\.isDefault\)return/.test(term));
t('destructive items are marked as such', /danger:true/.test(term));
t('the menu flips upward when there is no room below', /below<h\+12\? r\.top-h-6 : r\.bottom\+6/.test(term));
t('Escape and an outside click close it',
  /if\(e\.key==='Escape'\)closeMenu\(\)/.test(term) && /!e\.target\.closest\('\.ovf-menu,\.ovf-btn'\)/.test(term));
t('scrolling closes it, so it cannot detach from its row', /window\.addEventListener\('scroll',\(\)=>closeMenu\(\),true\)/.test(term));

t('filters appear inside a list and not on the overview',
  /if\(filters\)filters\.style\.display=listView\?'block':'none'/.test(term));
/* Filtering to nothing and opening an empty list look identical without this. */
t('the count distinguishes a filtered result from an empty list',
  /sorted\.length===total\?total\+' ticker'/.test(term) && /sorted\.length\+' of '\+total/.test(term));
t('the list picker and group-by toggle are gone, being meaningless inside one list',
  !/wlFilterList/.test(term) && !/wlGroup/.test(term));
t('the lists overview is a row list, not a card grid', /class="list-rows"/.test(term) && /class="list-row"/.test(term));
t('an open list shows a breadcrumb back to Lists',
  /class="crumb"/.test(term) && /onclick="closeList\(\)">Lists<\/a>/.test(term));

/* ==================== D6. BOOT ASSERTIONS ==================== */
G('A rename must throw, not wipe');

t('the key literal is asserted at boot', /if\(STORE_KEY!=='quantfolio_v1'\)\{[\s\S]{0,160}?throw new Error/.test(term));
t('the assertion refuses to boot rather than warning', /Refusing to boot/.test(term));
/* A guard on saveDB protected nothing while ten call sites wrote localStorage directly. */
/* Exactly one: inside persistDB. A blanket rewrite once pointed persistDB's own write back at
   itself, which the assertion below is shaped to catch as well as the original leak. */
t('the store is written from exactly one place',
  (term.match(/localStorage\.setItem\(STORE_KEY/g)||[]).length === 1);
t('that one place is inside the guarded path, not recursing into it',
  /function persistDB\(opts\)\{[\s\S]{0,900}?localStorage\.setItem\(STORE_KEY,JSON\.stringify\(DB\)\);/.test(term) &&
  !/function persistDB\(opts\)\{[\s\S]{0,900}?\n\s*persistDB\(\);/.test(term));
t('every write goes through the guarded path', (term.match(/persistDB\(/g)||[]).length >= 10);
t('the profile count is captured from what was actually on disk', /_profileCount=Object\.keys\(DB\.profiles\)\.length/.test(term));
t('a write that would lose a profile is refused', /n<_profileCount&&!o\.deleting/.test(term));
t('the refusal is shown, not just returned', /Refusing to write: '\+lost/.test(term));
/* A refusal is not a browser fault and must not be worded as one; the data is intact and a
   reload recovers it. */
t('a refusal reads differently from a storage failure',
  /showSaveFailure\(false,new Error\([\s\S]{0,300}?\),'refused'\)/.test(term) &&
  /const refused=kind==='refused'/.test(term) &&
  /Save stopped to protect your data/.test(term));
t('the count only advances after a successful write', /_profileCount=n;\s*\n\s*_saveFailed=false;/.test(term));
/* Named rather than counted: the self-test harness legitimately uses it too, and a bare count
   would make adding a test look like adding a deletion path. */
t('deliberate deletion passes the intent explicitly, at both real call sites',
  /function removeClient\([\s\S]{0,400}?persistDB\(\{deleting:true\}\)/.test(term) &&
  /function deleteProfile\([\s\S]{0,300}?persistDB\(\{deleting:true\}\)/.test(term));
t('DB.profiles is repaired if the stored blob is malformed', /if\(!DB\.profiles\|\|typeof DB\.profiles!=='object'\)DB\.profiles=\{\}/.test(term));

/* ==================== INPUT VALIDATION ==================== */
G('Nothing reaches the return series unchecked');

t('every price passes an acceptance gate', /function acceptPrice\(sym,price,prevRow,date\)/.test(term));
t('logPrice routes through it', /if\(!acceptPrice\(sym,price,ref,d\)\)return/.test(term));
t('backfilled candles are scanned before storage', /D\.priceLog\[sym\]=scanSeries\(sym,series\)/.test(term));
/* Comparing a same-day update against this morning's own quote would let a split through in
   daily increments. */
t('a same-day update compares against the previous DAY',
  /const ref=\(last&&last\.d===d\)\?arr\[arr\.length-2\]:last/.test(term));
t('refused observations are quarantined, never dropped', /function quarantine\(sym,date,price,prev,reason,detail\)/.test(term));
t('one quarantine entry per symbol per day', /q\.sym===sym&&q\.d===date/.test(term));
t('unclassified moves are held back too, not just splits', /'unexplained'/.test(term));

t('existing logs are repaired, not just future ones', /function repairAllSeries/.test(term));
t('repair runs on session entry, before any statistic', /try\{ repairAllSeries\(\); \}catch/.test(term));
t('repair rescales history rather than deleting the observation',
  /for\(let j=0;j<i;j\+\+\)out\[j\]\.p=\+\(out\[j\]\.p\/sp\.ratio\)/.test(term));
/* 2% was too tight: an observed ratio carries one session's real price move on top of the split,
   so a 10-for-1 on a 4% day reads as 10.42 and was missed. */
t('split tolerance accommodates a day of real price movement', /const SPLIT_TOLERANCE=0\.08/.test(term));
t('the nearest matching ratio wins, not the first', /err<best\.err/.test(term));

/* The 40% gate cannot reach a 3-for-2, which is a 33.3% fall; that ratio was unreachable as
   originally specified. Verified against every ratio in the list before adding a second gate. */
t('ratio matching starts below the unexplained-move gate', /const SPLIT_SCAN=0\.27/.test(term));
t('the low band is scanned, the high band is repaired',
  /if\(move<=SPLIT_SCAN\)return true/.test(term) && /if\(move<=MAX_DAILY\)\{/.test(term));
/* Withholding a 30% loss because it resembles a 3-for-2 would delete a real bad day from the
   record. A record that discards its worst days is a flattered record. */
t('a suspected low-band split is accepted into the series, not withheld',
  /'split-suspected',[\s\S]{0,220}?return true;/.test(term));
t('the low band is never rescaled', /if\(sp&&mv<=MAX_DAILY\)\{[\s\S]{0,400}?continue;/.test(term));
t('the audit says which way that error runs', /understates rather than flatters the record/.test(term));

/* A1 also covers what is not a split. */
t('zero, negative and unusable prices are quarantined, not dropped silently',
  /'bad-value',\s*\n\s*price===0/.test(term));
t('bad values already in a series are removed, since no arithmetic recovers them',
  /removed from the series; never a valid price/.test(term) &&
  /return out\.filter\(r=>r\.p>0&&isFinite\(r\.p\)\)/.test(term));
t('a symbol that priced and went silent is recorded', /function noteNoQuote/.test(term));
t('a single missing day is not called a delisting', /if\(!\(days>=3\)\)return/.test(term));
t('a symbol that never priced concludes nothing', /if\(!Array\.isArray\(arr\)\|\|!arr\.length\)return/.test(term));
t('the no-quote path is actually wired to the failure', /noteNoQuote\(sym\)/.test(term) &&
  /e\.message==='NO_DATA'\)\{try\{noteNoQuote/.test(term));
/* The vendor moved Dividends from free to premium without notice; the split endpoint could go the
   same way, so it is not load-bearing. */
t('the split endpoint check is recorded rather than assumed', /THE SPLIT ENDPOINT WAS CHECKED FIRST/.test(term));
t('all five quarantine categories reach the audit screen',
  ['split','split-repaired','split-suspected','no-quote','bad-value']
    .every(r=>term.includes("==='"+r+"'")));

/* ==================== D1. WHAT COUNTS AS A CALL ==================== */
G('One opinion is one call');

t('a verdict must hold before it is recorded', /const CONFIRM_REFRESHES=3/.test(term));
t('leaving BUY needs a clear margin, not a touch', /const EXIT_MARGIN=2/.test(term));
t('the exit gate reads the score, not just the flipped verdict',
  /sc\.qScore<=bar-EXIT_MARGIN/.test(term));
t('unconfirmed verdicts survive a reload', /pendingCalls:\{\}/.test(term));
/* Discarding flickers would answer by assumption whether conviction is worth anything. */
t('flickers are recorded, not discarded', /write\('flickering'/.test(term));
t('confirmed calls are marked as such', /write\('persistent',CONFIRM_REFRESHES\)/.test(term));
/* A flicker is an observation, not the standing opinion: treating it as the latter would let one
   brief BUY suppress the genuine sustained BUY behind it. */
t('the standing opinion ignores flickering rows',
  /conviction!=='flickering'\)\{firmIdx=i;break;\}/.test(term));
t('one flicker row per episode, not one per swing', /const flickeredSince=\(\)=>/.test(term));
/* An oscillation that lands back on the standing verdict still killed a candidate. */
t('a candidate killed by the standing verdict is still recorded',
  /flickerOut\(pend\[key\]\);\s*\n\s*delete pend\[key\];/.test(term));
t("an operator's own thesis condition is not held for three refreshes",
  /function bypassesHysteresis/.test(term) && /write\('thesis',1\)/.test(term));

t('the scorecard grades the two apart',
  /scoredAll\.filter\(r=>r\.c\.conviction!=='flickering'\)/.test(term) &&
  /scoredAll\.filter\(r=>r\.c\.conviction==='flickering'\)/.test(term));
t('the headline expectancy excludes flickers but says how many', /flickering, scored apart/.test(term));
t('legacy calls without a conviction field are not silently reclassified',
  /Calls recorded before the hysteresis gate existed carry no conviction field/.test(term));
/* THE STANDING CONTRACT: the module states how it could be shown to be wrong, on screen. */
t('the conviction split states its own falsification',
  /Falsification: if this difference stays inside its own confidence interval/.test(term));
t('it refuses to read the comparison on too small a sample',
  /Math\.min\(st\.n,stFlick\.n\)<10/.test(term));

/* ==================== D2 + E3. EFFECTIVE SAMPLE SIZE ==================== */
G('Never report a raw n');

t('the correction exists', /function effectiveN\(calls\)/.test(term));
t('it is the standard formula', /n\/\(1\+\(n-1\)\*rho\)/.test(term));
/* The whole point: two guessed correction factors multiplied together produce a precise number
   resting on nothing, which is the failure this product exists to expose. */
t('rho comes from observed data, never a constant',
  /RHO IS MEASURED, NEVER ASSUMED/.test(term) &&
  !/rho=0\.[0-9]/.test(term));
t('same-name pairs use the actual overlap of their marking windows',
  /const span=Math\.min\(e1,e2\)-Math\.max\(s1,s2\)/.test(term));
t('different-name pairs use the correlation of their own returns',
  /alignedReturns\(\[a\.sym,b\.sym\]\)/.test(term) && /sxy\/Math\.sqrt\(sxx\*syy\)/.test(term));
/* A rho averaged over three of forty pairs is not a measurement. */
t('too few measurable pairs returns null rather than a number',
  /measurable\/pairs<NEFF_MIN_PAIRS/.test(term) && /neff:null/.test(term));
t('the screen says so instead of claiming a figure', /no effective sample size is claimed/.test(term));
/* Claiming more independent observations than you have calls is not a claim this file makes. */
t('a negative average correlation cannot inflate the sample', /Math\.max\(0,sum\/measurable\)/.test(term));

t('the scorecard reports both counts', /An estimated '\+/.test(term) && /independent observations/.test(term));
t('it says the interval is computed on the flattering one', /so treat it as the optimistic end/.test(term));
t('the audit compares the threshold against independent observations, not raw marks',
  /const against=effN==null\?have:effN/.test(term) && /' marked, about '\+/.test(term));
t('the aggregate excludes flickers before correcting',
  /marked\.filter\(r=>r\.c\.conviction!=='flickering'\)/.test(term));

/* ==================== SESSION TEARDOWN ==================== */
G('Nothing resumes into a session that ended');

/* Found by racing a refresh against a delete, not by reading. The delete button itself threw:
   deleteProfile removed the profile and then called logout, which saves, which wrote to the
   profile it had just removed. */
t('saveDB requires the profile to still exist', /if\(USER&&DB\.profiles\[USER\]\)\{/.test(term));
t('deleteProfile clears the session itself rather than leaving it to logout',
  /delete DB\.profiles\[USER\];\s*\n\s*if\(!persistDB\(\{deleting:true\}\)\)return;/.test(term) &&
  /USER=null; D=null; bizContext=null;/.test(term));
t('a refused write leaves the account intact', /the write was refused; the account still exists/.test(term));
/* A network round trip takes seconds and a session can end inside one. */
t('there is one test for a live session',
  /function sessionAlive\(\)\{return !!\(USER&&D&&DB\.profiles&&DB\.profiles\[USER\]\);\}/.test(term));
t('both refresh paths check it', (term.match(/if\(!sessionAlive\(\)\)return/g)||[]).length >= 8);
/* The first fix guarded only the success branch; the crash was coming from the catch, which
   resumes just as late. */
t('the failure branch is guarded as well as the success branch',
  /catch\(e\)\{\s*\n\s*if\(!sessionAlive\(\)\)return;/.test(term));

/* ==================== M8. GJR-GARCH ==================== */
G('Falls hit harder than rises, or say they do not');

const S9 = new Function(`
  ${grab(term, 'garchFit')}
  ${grab(term, 'autocorr')}
  ${grab(term, 'annualScale')}
  const TRADING_DAYS=252, LO_MAXLAG=10, LO_MINOBS=60;
  return {garchFit};
`)();
function xs(seed){let x=seed>>>0;return()=>{x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
function simGjr(alpha,beta,gamma,n,seed){
  const rnd=xs(seed);
  const gauss=()=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
  const lr=0.0001, om=lr*(1-alpha-gamma/2-beta);
  if(!(om>0))throw new Error('non-stationary fixture');
  let s2=lr; const out=[];
  for(let i=0;i<n;i++){const e=Math.sqrt(s2)*gauss();out.push(e);s2=om+(alpha+(e<0?gamma:0))*e*e+beta*s2;}
  return out;
}
/* Simulate a series that genuinely has the leverage effect, and one that genuinely does not. */
const gjrYes=S9.garchFit(simGjr(0.02,0.90,0.10,1200,12345));
const gjrNo =S9.garchFit(simGjr(0.07,0.90,0.00,1200,999));
t('a real leverage effect is detected', gjrYes.leverage===true && gjrYes.gamma>0.05,
  'gamma '+gjrYes.gamma.toFixed(3)+', LR '+gjrYes.lrStat.toFixed(1));
/* The important half: the model must be able to say the extra parameter did not earn its place. */
t('no leverage effect is rejected, not fitted anyway', gjrNo.leverage===false && gjrNo.gamma===0,
  'LR '+gjrNo.lrStat.toFixed(2)+' against 3.841');
t('a rejected gamma falls back to plain GARCH(1,1)', gjrNo.gamma===0 && gjrNo.alpha>0 && gjrNo.beta>0);
t('the decision is a likelihood-ratio test at chi-square one degree', /lr>3\.841/.test(term));
t('the indicator fires on down days only', /const neg=dev\[i\]<0\?1:0/.test(term));
/* Variance targeting must account for gamma or omega is wrong by half of it. */
t('variance targeting accounts for the asymmetric term',
  /lrVar\*\(1-alpha-g\/2-beta\)/.test(term) && /best\.a\+best\.g\/2\+best\.b/.test(term));
t('the fit stays stationary', gjrYes.persist<1 && gjrNo.persist<1);
t('too few observations returns null rather than a fit', S9.garchFit(new Array(30).fill(0.01))===null);
t('gamma is on the face of the panel, including when rejected',
  /Leverage γ/.test(term) && /'not found'/.test(term));
t('a rejection is written as a result, not a failure',
  /This is the result the model is supposed to be able to return/.test(term));
t('it states the exact falsification the spec asks for',
  /if γ is not significantly positive, this is GARCH\(1,1\) with an extra parameter and should be dropped/.test(term));

/* ==================== M6. PSR, DEFLATED SHARPE, MinTRL ==================== */
G('Whether the Sharpe is believable at all');

const S8 = new Function(`
  ${grab(term, 'normCdf')}
  ${grab(term, 'normInv')}
  ${grab(term, 'skewKurt')}
  ${grab(term, 'srVariance')}
  ${grab(term, 'probabilisticSharpe')}
  ${grab(term, 'minTrackRecord')}
  ${grab(term, 'expectedMaxSharpe')}
  const EULER_GAMMA=0.5772156649015329;
  return {normCdf,normInv,skewKurt,srVariance,probabilisticSharpe,minTrackRecord,expectedMaxSharpe};
`)();
t('normInv inverts the normal to 1e-6',
  Math.abs(S8.normInv(0.975)-1.959963985)<1e-6 &&
  Math.abs(S8.normInv(0.05)+1.644853627)<1e-6 &&
  Math.abs(S8.normInv(0.5))<1e-12);
/* For normal returns the correction collapses to the textbook 1 + S^2/2. */
t('the variance factor reduces to the iid case',
  Math.abs(S8.srVariance(0.10,0,3)-(1+0.01/2))<1e-12);
t('PSR matches its closed form', (() => {
  const S=0.10,n=250;
  const want=S8.normCdf(S*Math.sqrt(n-1)/Math.sqrt(1+S*S/2));
  return Math.abs(S8.probabilisticSharpe(S,n,0,3,0)-want)<1e-12;
})());
/* This is the whole point: real equity returns are skewed and fat-tailed, and that makes a given
   Sharpe LESS significant than the plain interval says. */
t('negative skew and fat tails lower the probability',
  S8.probabilisticSharpe(0.10,250,-0.8,7,0) < S8.probabilisticSharpe(0.10,250,0,3,0));
t('and demand a longer track record',
  S8.minTrackRecord(0.10,-0.8,7,0,0.95) > S8.minTrackRecord(0.10,0,3,0,0.95));
/* MinTRL must be the exact inverse of PSR, or it is not answering the question it claims to. */
t('PSR at MinTRL equals the confidence asked for', (() => {
  const need=S8.minTrackRecord(0.10,0,3,0,0.95);
  return Math.abs(S8.probabilisticSharpe(0.10,need,0,3,0)-0.95)<1e-6;
})());
/* Deflation: reporting the best of several as if it were the only one tried is how a record lies. */
t('one trial deflates by nothing', S8.expectedMaxSharpe(1,0.05)===0);
t('more trials raise the bar', S8.expectedMaxSharpe(45,0.05) > S8.expectedMaxSharpe(4,0.05));
t('the benchmark is the expected maximum, not an arbitrary constant',
  /\(1-EULER_GAMMA\)\*a\+EULER_GAMMA\*b/.test(term));
t('deflation counts the live tracks rather than a hardcoded number',
  /ACTIVE_TRACKS!=='undefined'&&ACTIVE_TRACKS\.length\)\?ACTIVE_TRACKS\.length:1/.test(term));
/* A negative root is not a confidence statement. */
t('an impossible variance factor returns null rather than NaN',
  S8.srVariance(3,5,3)===null && S8.probabilisticSharpe(3,100,5,3,0)===null);
t('a Sharpe below the benchmark yields no track length rather than a negative one',
  S8.minTrackRecord(0.05,0,3,0.20,0.95)===null);
t('the screen says so instead of printing a number',
  /no amount of additional data would make it significant at this level/.test(term));
/* Moments are measured from the operator's own returns. */
t('skew and kurtosis are measured, never assumed', /function skewKurt/.test(term) &&
  /measured from your own returns rather than assumed/.test(term));
t('daily units are used throughout, not annualised ones',
  /matching the moments, and converted for display only/.test(term));
t('it states its own falsification', /this whole panel collapses to the plain interval above/.test(term));
t('it converts the wait into a number rather than an apology',
  /It is a number rather than an apology/.test(term));

/* ==================== CRAFT ADDITIONS ==================== */
G('The small things, where they earn their place');

t('a skip link exists and targets a real landmark',
  /class="skip-link" href="#main"/.test(term) && /<main id="main" tabindex="-1">/.test(term));
t('table headers stay put while a table is scrolled', /table thead th\{position:sticky/.test(term));
t('password fields get a reveal toggle', /function initPasswordToggles/.test(term));
/* The login form is on screen before any session exists, and those are the fields people type
   into most, so this cannot wait for enterSession. */
t('and it runs before sign-in, not only after',
  /DOMContentLoaded',\(\)=>\{try\{initPasswordToggles\(\)/.test(term));
t('copy confirms on the button rather than silently', /btn\.textContent='Copied'/.test(term));
t('copy falls back when the clipboard API is unavailable', /function fallbackCopy/.test(term));
t('invite codes in the admin queue are copyable', /copyBtn\(r\.code\)/.test(admin));
/* A record is worth having on paper. */
t('there is a real print stylesheet, not a hidden-nav hack',
  /@media print\{/.test(term) && /--bg:#fff/.test(term) && /thead\{display:table-header-group\}/.test(term));
t('printing shows the whole record, not just the open tab',
  /\.tabs-hidden\{display:block !important\}/.test(term));
t('back to top appears only once it saves something', /window\.scrollY>600/.test(term));

/* ==================== HINDSIGHT ==================== */
G('A leaderboard is a trap unless it grades the system');

/* I10: the free tier is 60 calls a minute with no historical candles, so ranking the whole market
   is unavailable rather than slow. */
t('the file records why the whole market is not scanned',
  /WHY THE WHOLE MARKET IS NOT AVAILABLE/.test(term));
t('and the screen says it too, with the arithmetic',
  /about four thousand quotes per window against a sixty-per-minute limit/.test(term));
t('the five-year window is called unavailable, not slow',
  /it is unavailable rather than merely slow/.test(term));
/* A hindsight ranking teaches only if it is next to what the system said at the time. */
t('each row carries what the checklist said before the window opened',
  /function verdictBefore/.test(term) && /etDate\(c\.ts\)<=cutoffDate/.test(term));
t('it refuses to double-list a name when there are too few tickers',
  /const split=rows\.length>=6/.test(term));
t('it reports the span it actually measured, not the one requested',
  /const short=covered<hindsightWin/.test(term) && /sessions, not a '\+esc\(asked\)/.test(term));
t('it states its own falsification',
  /the checklist is not selecting winners and this table is where that shows first/.test(term));

/* ==================== P4. CRAFT AND MOBILE ==================== */
G('The daily check happens on a phone');

/* A spinner says something is happening; a skeleton says a four-row table is arriving here. */
t('loading states are skeletons, not spinners', /function skeleton\(kind,rows\)/.test(term) &&
  !/class="empty">Loading/.test(term));
t('the skeleton is hidden from screen readers and the wait is announced instead',
  /aria-hidden="true"/.test(term) && /el\.setAttribute\('aria-busy','true'\)/.test(term) &&
  /<span class="sr-only">Loading<\/span>/.test(term));
t('there is an sr-only class for it to use', /\.sr-only\{position:absolute/.test(term));
/* No hover on a phone, so a press must acknowledge itself before the work finishes. */
t('taps give immediate feedback', /\.btn:active,\.btn-add:active,\.ovf-btn:active,\.prov:active\{transform:scale\(\.97\)\}/.test(term));
t('and that is dropped for reduced-motion', /@media \(prefers-reduced-motion:reduce\)\{[\s\S]{0,200}?transform:none/.test(term));
t('numbers align down a column', /font-variant-numeric:tabular-nums/.test(term));
/* Touch targets are gated on pointer, not width: a narrow desktop window still has a mouse. */
t('touch targets are enlarged for coarse pointers only', /@media \(pointer:coarse\)\{/.test(term));
t('the touch block is last, because media queries add no specificity',
  term.lastIndexOf('@media (pointer:coarse)') > term.lastIndexOf('@media (max-width:400px)'));
/* Row actions behind the 3-dot menu, finishing the treatment. */
t('Screener, History and Clients row actions are behind overflow menus',
  /function screenerMenu/.test(term) && /function historyMenu/.test(term) && /function clientMenu/.test(term));
t('their menus use the expression-string convention the others use',
  /run:'removeTransaction\('\+\(\+i\)\+'\)'/.test(term));
t('destructive row actions are marked as such', /run:'removeClient\('\+q\+'\)'\}/.test(term) &&
  /danger:true,run:'removeTransaction/.test(term));
/* Offline: the worker already handled it, nothing told the user. */
/* Built in script rather than markup, so assert on the construction. */
t('offline is announced', /function renderOfflineState/.test(term) &&
  /el\.id='offlineBanner'/.test(term) && /setAttribute\('role','status'\)/.test(term));
t('it says which half still works rather than implying the app is down',
  /Your record, scorecard, risk panels and audit all still work/.test(term));
t('buttons that need the network are disabled with the reason, not left spinning',
  /b\.title='Needs a connection\. You are offline\.'/.test(term) && /b\.textContent='Offline'/.test(term));
t('and are restored with their original label', /b\.textContent=b\.dataset\.onlineLabel/.test(term));
/* Empty states on the panels that were blank. */
t('the analyzer says what it is before anything is analysed', /<b>Nothing analysed yet\.<\/b>/.test(term));
t('the command tab explains what a review does', /<b>Nothing checked yet today\.<\/b>/.test(term));
t('the audit shows a skeleton rather than a blank panel while it computes',
  /id="auditBody"[^>]*aria-busy="true"/.test(term));

/* ==================== P3. THE COMMAND BAR ==================== */
G('A professional does not reach for the mouse');

const SD = new Function(`
  ${grab(term, 'parseCommand')}
  const CMD_VERBS={SCORE:{needsSym:true},THESIS:{needsSym:true},MAP:{needsSym:true},NEWS:{needsSym:true},
                   RISK:{},EFFBETS:{},AUDIT:{},SCORECARD:{},HELP:{}};
  const CMD_HORIZONS={'30D':'30','90D':'90','180D':'180','365D':'365'};
  return {parseCommand};
`)();
const PC=x=>SD.parseCommand(x);
t('a bare ticker means score it', PC('AAPL').ok && PC('AAPL').verb==='SCORE' && PC('AAPL').sym==='AAPL');
t('the grammar is subject then verb', PC('ASML SCORE').verb==='SCORE' && PC('ASML THESIS').verb==='THESIS');
t('book-level commands need no subject', PC('BOOK RISK').ok && PC('BOOK EFFBETS').ok && PC('AUDIT').ok);
t('a horizon can be set from the bar', PC('SCORE 90D').ok && PC('SCORE 90D').horizon==='90');
t('lowercase is accepted', PC('aapl score').ok && PC('aapl score').sym==='AAPL');
/* Guessing at the nearest match is how the wrong ticker gets analysed. */
t('gibberish is refused rather than guessed at', !PC('!!!').ok && /not a ticker or a command/.test(PC('!!!').why));
t('an unknown verb names itself and lists the real ones',
  !PC('AAPL FLY').ok && /FLY/.test(PC('AAPL FLY').why) && /SCORE, THESIS, MAP or NEWS/.test(PC('AAPL FLY').why));
t('a ticker verb applied to the book is refused', !PC('BOOK SCORE').ok);
t('an incomplete command explains what is missing', !PC('BOOK').ok && /BOOK needs a verb/.test(PC('BOOK').why));
t('empty input explains rather than doing nothing', !PC('').ok);
/* The safety property: a typo must not be able to change the record. */
/* Scoped to the block itself: a loose regex here runs past the closing brace and matches a
   mutating call elsewhere in a 12,000 line file, which is a false alarm rather than a finding. */
t('every verb only navigates or looks up, none mutate', (() => {
  const i=term.indexOf('const CMD_VERBS={');
  if(i<0)return false;
  const block=term.slice(i, term.indexOf('\n};', i));
  return !/saveDB|recordCall|persistDB|\.push\(|delete D\./.test(block);
})());
t('parsing is separate from executing so it can be tested without a DOM',
  /function parseCommand\(raw\)/.test(term) && /function runCommand\(raw\)/.test(term));
t('it opens on a keystroke and never steals one while typing',
  /if\(\/INPUT\|TEXTAREA\|SELECT\/\.test\(tag\)\|\|e\.target\.isContentEditable\)return/.test(term));

/* ==================== E1. THE MONTHLY CLOSE ==================== */
G('The likeliest failure is not being wrong, it is being unused');

t('there is a monthly close', /function renderMonthlyClose/.test(term) && /function monthlyCloseData/.test(term));
/* Firing once on the 1st and vanishing would miss anyone who did not open the app that day. */
t('it persists until read rather than firing on one day',
  /\(D\.closeSeen\|\|''\)>=mk/.test(term) && /function dismissMonthlyClose/.test(term));
t('being read is remembered across sessions', /D\.closeSeen=prevMonthKey\(\);\s*\n\s*saveDB\(\)/.test(term));
/* It reports what RESOLVED in the month, not what was called in it: those are different questions
   and the second one cannot be answered until the horizons come due. */
t('it counts marks stamped during the month, whatever month the call was made in',
  /if\(!m\|\|m\.missed\|\|!m\.at\|\|!inMonth\(m\.at\)\)return/.test(term));
t('it separates flickering calls from conviction', /c\.flickers\?/.test(term));
t('it surfaces what was held out of the return series', /bad or unexplained prices/.test(term));
/* The instinct to wait until the sample is rigorous is what guarantees the sample never grows. */
t('it refuses to read a thin month as a result', /<b>This is too few marks to read as a result\.<\/b>/.test(term));
t('and says why it reports anyway', /rather than only in two years/.test(term));
t('a month with nothing in it does not interrupt', /if\(!c\.calls&&!c\.marked\.length&&!c\.trades\)/.test(term));
t('a month where nothing marked names the reason', /marks only happen if the app is open when a call comes due/.test(term));

/* ==================== P2. THE AUDIT SCREEN ==================== */
G('A product that publishes its own breaches cannot rot quietly');

t('effective bets reaches the audit page', /'Effective bets',/.test(term));
/* The page claimed to report quota; now it counts rather than estimates. */
t('Finnhub usage is counted, not guessed', /function fhUsage/.test(term) &&
  /_fhCalls\.push\(Date\.now\(\)\)/.test(term));
t('the call window cannot grow without bound', /if\(_fhCalls\.length>200\)_fhCalls=_fhCalls\.slice\(-120\)/.test(term));
t('the quota row shows both numbers', /' calls in the last minute'/.test(term));

/* ==================== P1. THE PROVENANCE CONTRACT ==================== */
G('A number that cannot show its working');

const SC = new Function(`
  const PROV={}; let _provSeq=0;
  ${grab(term, 'prov')}
  ${grab(term, 'provStale')}
  return {prov, provStale, PROV};
`)();
/* A contract that silently degrades is not a contract. */
t('a figure without a formula is refused, not rendered bare', (() => {
  try{ SC.prov('42',{inputs:'x'}); return false; }catch(e){ return /formula/.test(e.message); }
})());
t('a figure without inputs is refused', (() => {
  try{ SC.prov('42',{formula:'x'}); return false; }catch(e){ return true; }
})());
t('all six fields are stored', (() => {
  const h=SC.prov('42',{formula:'a/b',inputs:'a and b',n:10,ci:'1 to 2',asOf:'today'});
  const d=SC.PROV[h.match(/data-prov="(pv\d+)"/)[1]];
  return ['value','formula','inputs','n','ci','asOf'].every(k=>k in d);
})());
t('absent optional fields become null rather than undefined', (() => {
  const h=SC.prov('42',{formula:'a/b',inputs:'a and b'});
  const d=SC.PROV[h.match(/data-prov="(pv\d+)"/)[1]];
  return d.n===null && d.ci===null && d.asOf===null;
})());
/* Staleness is the failure mode a terminal actually has: not a wrong number, an old one. */
t('staleness measures when inputs were observed, not when the div rendered',
  SC.provStale(Date.now()-2*864e5)==='2 days ago' && SC.provStale(Date.now())==='today');
t('the figure is reachable by keyboard, not only by mouse',
  /tabindex="0"/.test(term) && /event\.key==='Enter'/.test(term));
t('the affordance is visible rather than hidden', /\.prov\{border-bottom:1px dotted/.test(term));
/* The claim-making figures, which are the ones that matter. */
t('expectancy carries its derivation', /formula:'mean\(edge_i\)/.test(term));
t('the Sharpe carries the Lo correction it actually uses', /Lo \(2002\)'/.test(term));
t('the deflated PSR names its benchmark', /being the expected best of '\+m6\.trials/.test(term));
t('effective bets names whether the covariance was shrunk',
  /Ledoit-Wolf shrunk by '\+\(R\.shrunk\.delta\*100\)/.test(term));
/* The spec asks for every number; this ships the mechanism plus the claim-making figures, and
   says so rather than overstating coverage. */
t('the file states its own scope honestly', /HONEST SCOPE, because the spec says/.test(term));

/* ==================== M7. LEDOIT-WOLF SHRINKAGE ==================== */
G('The covariance estimate is biased, and by how much is measurable');

const SB = new Function(`${grab(term, 'ledoitWolf')}\nreturn {ledoitWolf};`)();
function lwXs(seed){let x=seed>>>0;return()=>{x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
function lwBlocks(N,T,seed){
  const rnd=lwXs(seed);
  const gs=()=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
  const out=Array.from({length:N},()=>[]);
  for(let t=0;t<T;t++){const fA=gs(),fB=gs();
    for(let i=0;i<N;i++)out[i].push(Math.sqrt(0.8)*((i<N/2)?fA:fB)+Math.sqrt(0.2)*gs());}
  return out;
}
/* The defining property: shrinkage is heavy when data is thin and falls as it accumulates. */
t('shrinkage falls monotonically as history grows', (() => {
  const d=[40,120,400,1200].map(T=>SB.ledoitWolf(lwBlocks(8,T,77)).delta);
  return d.every((v,i)=>i===0||v<d[i-1]);
})());
t('and stays a proper fraction', (() => {
  const d=[40,120,400,1200].map(T=>SB.ledoitWolf(lwBlocks(8,T,77)).delta);
  return d.every(v=>v>=0&&v<=1);
})());
/* When the target IS the truth, shrinking all the way to it is correct, not a bug. */
t('a correctly specified target attracts full shrinkage', (() => {
  const rnd=lwXs(11);
  const gs=()=>{let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
  const out=Array.from({length:8},()=>[]);
  for(let tt=0;tt<600;tt++){const c=gs();for(let i=0;i<8;i++)out[i].push(Math.sqrt(0.4)*c+Math.sqrt(0.6)*gs());}
  return SB.ledoitWolf(out).delta>0.8;
})());
t('the result stays symmetric with positive variances', (() => {
  const r=SB.ledoitWolf(lwBlocks(6,200,5));
  return r.S.every((row,i)=>row[i]>0 && row.every((v,j)=>Math.abs(v-r.S[j][i])<1e-12));
})());
t('the average correlation is recovered', (() => {
  const r=SB.ledoitWolf(lwBlocks(8,1200,77));
  return r.rBar>0.2 && r.rBar<0.6;
})());
t('too little history returns null rather than a fragile matrix',
  SB.ledoitWolf(lwBlocks(3,10,5))===null);
t('a single asset returns null', SB.ledoitWolf(lwBlocks(1,100,5))===null);
/* A shrinkage intensity is a parameter, and this file does not hide parameters. */
t('delta is derived, never a constant', /const delta=Math\.max\(0,Math\.min\(1,\(\(pi-rho\)\/gamma\)\/T\)\)/.test(term));
t('the target is constant-correlation, not identity', /rBar\*sd\[i\]\*sd\[j\]/.test(term));
t('the risk panel reports the intensity', /<b>Covariance is shrunk, by '\+/.test(term));
t('and says when it could not shrink at all', /<b>Covariance is not shrunk here\.<\/b>/.test(term));
t('the shrunk estimate is what the risk figures consume',
  /const lw=shrunkCovFor\(rows\.map\(r=>r\.sym\)\)/.test(term));

/* ==================== M3 + M4. AUDITING THE CHECKS ==================== */
G('Twenty-two checks are not twenty-two opinions');

const SA = new Function(`
  ${grab(term, 'pointBiserial')}
  return {pointBiserial};
`)();
const mkPairs=(nPass,nFail,sep)=>{
  const out=[];
  for(let i=0;i<nPass;i++)out.push({hit:1,edge:sep+((i%5)-2)});
  for(let i=0;i<nFail;i++)out.push({hit:0,edge:-sep+((i%5)-2)});
  return out;
};
t('a check that separates outcomes shows a strong correlation', (() => {
  const r=SA.pointBiserial(mkPairs(30,30,3));
  return r.r>0.5 && r.signal===true;
})());
t('a check uncorrelated with the outcome reads as noise', (() => {
  const noise=[]; for(let i=0;i<40;i++)noise.push({hit:i%2,edge:(i%7)-3});
  const r=SA.pointBiserial(noise);
  return Math.abs(r.r)<0.2 && r.signal===false && r.lo<0 && r.hi>0;
})());
/* Fisher z diverges at |r|=1. Collapsing that into "noise" would print the opposite of what the
   data said, so the third state is carried through to the screen. */
t('an un-intervalable correlation is null, never false', (() => {
  const perfect=[]; for(let i=0;i<20;i++)perfect.push({hit:1,edge:5}); for(let i=0;i<20;i++)perfect.push({hit:0,edge:-5});
  const r=SA.pointBiserial(perfect);
  return r.signal===null && r.lo===null;
})());
t('the screen reports that third state separately', /no interval could be fitted/.test(term));
t('a check with no contrast is omitted rather than shown at zero',
  SA.pointBiserial(Array.from({length:20},(_,i)=>({hit:1,edge:i})))===null);
t('too few observations returns null', SA.pointBiserial([{hit:1,edge:1},{hit:0,edge:2}])===null);
/* Check results must be stamped, not recomputed: today's fundamentals are not the ones the call
   was made on, and I11 forbids reconstructing them. */
t('check outcomes are recorded onto the call', /checks:\(typeof checkBitmap==='function'\)\?checkBitmap\(sc\):null/.test(term));
t('the bitmap has a fixed position for each of the 22 checks', (() => {
  const m=term.match(/const CHECK_ORDER=(\[[\s\S]*?\]);/);
  if(!m)return false;
  return new Function('return '+m[1])().length===22;
})());
t('unevaluable checks are a third symbol, not a fail',
  /v===true\?'1':v===false\?'0':'-'/.test(term));
t('M4 reduces the check correlation matrix the same way effective bets does',
  /jacobiEigenvalues\(C\)/.test(term) && /redundancy=\{counted:usable\.length,independent:Math\.exp\(h\)\}/.test(term));
t('it says what redundancy costs an equal-weighted score',
  /Counting one idea three times and calling it three points/.test(term));
t('with too few marked calls it says so rather than ranking noise',
  /The 22 checks have not been audited yet/.test(term));
t('it states its own falsification',
  /the checklist is not selecting stocks and the score is arithmetic on noise/.test(term));

/* ==================== M5. EFFECTIVE NUMBER OF BETS ==================== */
G('Nine tickers is not nine bets');

const S7 = new Function(`
  ${grab(term, 'jacobiEigenvalues')}
  ${grab(term, 'effectiveBets')}
  return {jacobiEigenvalues, effectiveBets};
`)();
const I3=[[1,0,0],[0,1,0],[0,0,1]];
t('uncorrelated equal weights give exactly the nominal count', (() => {
  const r=S7.effectiveBets([1/3,1/3,1/3],I3);
  return Math.abs(r.nConc-3)<1e-9 && Math.abs(r.nCorr-3)<1e-9;
})());
/* The case the figure exists for: four tickers, one bet. */
t('perfectly correlated names collapse to one bet', (() => {
  const r=S7.effectiveBets([1/3,1/3,1/3],[[1,1,1],[1,1,1],[1,1,1]]);
  return Math.abs(r.nCorr-1)<1e-6 && Math.abs(r.breadth-1)<1e-6;
})());
t('concentration alone is the Herfindahl inverse', (() => {
  const w=[0.92,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01];
  const want=1/w.reduce((a,x)=>a+x*x,0);
  return Math.abs(S7.effectiveBets(w,null).nConc-want)<1e-9;
})());
/* Correlation bites harder than sizing and is invisible in the weights. */
t('a correlated cluster is caught even at equal weight', (() => {
  const S=[];for(let i=0;i<5;i++){S.push([]);for(let j=0;j<5;j++)S[i].push(i===j?1:((i<4&&j<4)?0.9:0.05));}
  const r=S7.effectiveBets([0.2,0.2,0.2,0.2,0.2],S);
  return Math.abs(r.nConc-5)<1e-6 && r.nCorr<2.5;
})());
t('breadth takes the more pessimistic of the two', (() => {
  const S=[];for(let i=0;i<5;i++){S.push([]);for(let j=0;j<5;j++)S[i].push(i===j?1:0.9);}
  const r=S7.effectiveBets([0.2,0.2,0.2,0.2,0.2],S);
  return Math.abs(r.breadth-Math.min(r.nConc,r.nCorr))<1e-12;
})());
/* No library, per I2. */
t('eigenvalues come from a symmetric Jacobi rotation, not a dependency',
  /function jacobiEigenvalues/.test(term) && S7.jacobiEigenvalues(I3).every(x=>Math.abs(x-1)<1e-9));
t('a single holding and an empty book both return null',
  S7.effectiveBets([1],[[1]])===null && S7.effectiveBets([],null)===null);
t('without a covariance matrix it reports concentration only, never a guess',
  S7.effectiveBets([0.5,0.5],null).nCorr===null);
t('the screen says correlation could not be measured rather than showing a figure',
  /this is the concentration figure alone and is the optimistic end/.test(term));
/* Concentration is fixed by resizing; correlation is not. Different remedies, reported apart. */
t('the two collapses are reported separately', /Sizing alone accounts for/.test(term) &&
  /Correlation takes it to/.test(term));
t('it says resizing cannot fix the correlation half', /resizing does not fix it/.test(term));
t('breadth feeds Grinold', /square root of breadth/.test(term));
t('it states its own falsification', /the correlation input is wrong and the number is decoration/.test(term));
t('it reads the same weights and covariance the risk table uses',
  /bets:effectiveBets\(w,S\)/.test(term));

/* ==================== M9. THE CASH ASYMMETRY ==================== */
G('A smaller size is not a better size');

/* The actual arm is fully invested by construction; a smaller budget leaves the remainder in
   cash. So over a window that fell, the smaller arm wins by arithmetic. The panel previously told
   the reader that neither row could win on cash, which is the opposite of what drives the
   numbers, and would have taught "size smaller" from the direction of the market. */
t('the actual arm is fully invested', /dollars,cash:0,cashPct:0/.test(term));
t('the alternative holds what it did not deploy', /const cash=Math\.max\(0,W\.start-asked\*scale\)/.test(term));
t('the screen does not claim cash is neutralised between rows',
  !/neither can win by holding a different amount of it/.test(term));
t('it says the undeployed remainder is doing work in the numbers',
  /it sits in the alternative row earning nothing/.test(term));
t('and warns that a falling window flatters the smaller size',
  /<b>Smaller is not better, it is smaller\.<\/b>/.test(term) &&
  /wins by arithmetic and tells you nothing/.test(term));
t('it tells the reader which two columns to read together',
  /Read the drawdown column against the cash column/.test(term));

/* ==================== M2. IMPLEMENTATION SHORTFALL ==================== */
G('Gross is not net, and the cost is measured');

const S6 = new Function(`
  ${grab(term, 'shortfallOf')}
  ${grab(term, 'shortfallSigned')}
  return {shortfallOf, shortfallSigned};
`)();
t('shortfall is the gap between deciding and filling',
  Math.abs(S6.shortfallOf({price:204,decided:200}) - 2) < 1e-9);
/* Signed against the operator, or a buy filled high and a sell filled low would cancel out. */
t('a buy filled above the decision price counts as a cost',
  S6.shortfallSigned({action:'buy',price:204,decided:200}) > 0);
t('a sell filled below the decision price also counts as a cost',
  S6.shortfallSigned({action:'sell',price:96,decided:100}) > 0);
t('and a fill that went the operator\'s way is credited',
  S6.shortfallSigned({action:'buy',price:96,decided:100}) < 0 &&
  S6.shortfallSigned({action:'sell',price:104,decided:100}) < 0);
/* An assumed spread is a guess wearing a decimal point, which is the thing this product condemns. */
t('a trade with no decision price contributes nothing',
  S6.shortfallSigned({action:'buy',price:100}) === null &&
  S6.shortfallSigned({action:'buy',price:100,decided:0}) === null);
t('the field exists on both the buy and the sell path',
  /id="hDecided"/.test(term) && /id="sellDecided_'\+i\+'"/.test(term));
t('it is optional in the interface', /placeholder="optional"/.test(term));
t('both paths store it on the transaction',
  /action:'buy'[\s\S]{0,120}?decided:decidedPrice\(\)/.test(term) &&
  /action:'sell'[\s\S]{0,120}?decided,/.test(term));
t('gross and net are reported side by side', /before implementation cost/.test(term) &&
  /which leaves roughly/.test(term));
t('shortfall is broken out per ticker', /perTicker:Object\.values/.test(term) &&
  /Worst by ticker/.test(term));
/* Silence would read as a cost of zero, which is a claim and the wrong one. */
t('with nothing recorded it says the figures are gross rather than showing nothing',
  /<b>Every figure above is gross\.<\/b>/.test(term));
t('and says why it will not estimate one', /an assumed spread is a guess wearing a decimal point/.test(term));
t('it states its own falsification', /hesitation is not measurably expensive and the field can be retired/.test(term));

/* ==================== M1. OPERATOR vs SYSTEM ==================== */
G('The query the terminal turns on');

/* myTags is a current map with no history, so without a stamp the matrix could only ever apply
   today's opinion to last year's calls, which grades the operator on hindsight. */
t("the operator's position is stamped onto the call as it is recorded",
  /myCall:\(typeof myTag==='function'\?myTag\(sym\):''\)\|\|null/.test(term));
t('agreement is on direction, not wording', /function directionOf/.test(term) &&
  /v==='hold'\|\|v==='watch'\|\|v==='watching'/.test(term));
/* No opinion is not the same as agreement, and counting it as such would inflate the consensus row
   with every ticker the operator never looked at. */
t('untagged rows are excluded rather than counted as agreement',
  /if\(sys==null\|\|op==null\)return null/.test(term));
t('non-directional system verdicts are excluded', /if\(sys==='flat'\)return null/.test(term));
t('flickering calls do not enter the matrix', /if\(c\.conviction==='flickering'\)return/.test(term));
t('all four cells are produced', /'up-agree':\[\], 'up-differ':\[\], 'down-agree':\[\], 'down-differ':\[\]/.test(term));
t('each cell carries its own interval and effective n',
  /st:rows\.length\?expectancyStats/.test(term) && /eff:effectiveN\(rows\.map/.test(term));
/* Every cell reports the CHECKLIST's edge. A low number where the operator differed means the
   checklist was wrong on the calls they refused, which is evidence FOR the operator. Reading it
   the other way inverts the finding the table exists to produce. */
t('the file records which direction is good news', /WHICH DIRECTION IS GOOD NEWS/.test(term));
t('a low override cell is read as evidence for the operator',
  /worse on exactly the calls you refused to follow/.test(term));
t('a high override cell is read as evidence against',
  /You were overriding its <b>better<\/b> calls/.test(term));
t('overlapping intervals are reported as no difference, not as a winner',
  /const overlap=!\(Dd\.st\.hi<A\.st\.lo\|\|A\.st\.hi<Dd\.st\.lo\)/.test(term) &&
  /no measurable difference<\/b> between following the checklist and overriding it/.test(term));
t('the screen says whose result the numbers are', /Every cell is the checklist/.test(term));
t('it refuses to read a cell under ten calls', /m\[k\]\.n>=10/.test(term));
t('it states its own falsification', /<b>Falsification:<\/b> if the two rows stay inside each other/.test(term));
/* Fixed horizons only: the open-ended view gives every cell a different holding period. */
t('the open-ended view is refused', /if\(winRaw==='since'\)return '';/.test(term));

/* ==================== D5. THE SHIPPED SELF-TEST ==================== */
G('A harness nobody runs is decoration');

t('the harness exists and is reachable without a console', /function renderSelfTestPage/.test(term) &&
  /\[\?&\]selftest=1/.test(term));
t('a failing test is a breached promise on the audit page', /id="selfTestRow"/.test(term) &&
  /of '\+res\.length\+' FAILING/.test(term));
/* Every assertion D5 names. */
const d5Wanted = [
  'a 10-for-1 split is quarantined','a 3-for-2 split is flagged','a genuine 40% fall is NOT flagged',
  'an oscillating score produces one call, not four',
  'expectancy and its interval match a hand-computed fixture',
  'beta recovers a known factor loading','Jensen alpha subtracts the risk it was paid for',
  'a Saturday anniversary rolls to the Monday close','a market holiday is skipped',
  'a full store fails loudly instead of silently',
  'the hash chain verifies','an edited mark breaks the chain',
  'STORE_KEY is unchanged','a profile count that drops without a delete is refused'
];
const d5Missing = d5Wanted.filter(w => !term.includes(w));
t('every assertion the spec lists is present', d5Missing.length === 0, d5Missing.join(' | ') || d5Wanted.length + ' present');

/* A self-test that damages the data it is reassuring you about is worse than none. The storage
   guard tests call persistDB directly, and one of them must let a write SUCCEED. */
t('writes are neutralised for the whole run, not merely avoided',
  /localStorage\.setItem=function\(\)\{\};/.test(term));
t('the real setItem is restored whatever happens',
  /\}finally\{\s*\n\s*localStorage\.setItem=realSet;/.test(term));
t('the harness verifies its own containment rather than asserting it',
  /the self-test left stored data untouched/.test(term) && /before===after/.test(term));
t('D and DB are swapped and restored', /D=realD; DB=realDB; _profileCount=realCount;/.test(term));
/* Extracted so the chain can be exercised without saveDB. */
t('sealing is testable without writing', /async function sealInto/.test(term) &&
  /const n=await sealInto\(pending,D\.chain\)/.test(term));
t('the audit result is written after the DOM stops being rewritten',
  term.indexOf('const res=await runSelfTest()') > term.indexOf("el.innerHTML=out+head('Worker')"));

/* ==================== B2. FIRST-RUN EXPORT ==================== */
G('The first holding is the first thing worth losing');

t('a blocking gate exists', /function showFirstRunExport/.test(term));
/* Not at an empty account: exporting an empty file teaches nothing. */
t('it fires on the first holding, not before',
  /const wasEmpty=\(D\.holdings\|\|\[\]\)\.length===0/.test(term) &&
  /if\(wasEmpty&&!firstRunExportDone\(\)\)showFirstRunExport\(\)/.test(term));
t('it fires once and is remembered', /D\.firstRunAck=Date\.now\(\)/.test(term) &&
  /function firstRunExportDone/.test(term));
t('an existing export counts as done', /D\.lastExportAt\|\|D\.firstRunAck/.test(term));
t('it names the real mechanism, not a vague warning',
  /the record is forward-only, so it cannot be rebuilt/.test(term));
t('iOS Safari gets the seven-day rule specifically',
  /iOS deletes this site\\'s storage after seven days/.test(term));
/* One blocking interruption only; a second teaches clicking through them. */
t('the file says why this is the only blocking dialogue',
  /a second one would\s*\n?\s*teach the habit of clicking through them/.test(term));

/* ==================== F1. CLIENT BOOKS DO NOT SYNC ==================== */
G('The one item with third-party consequences');

t('a managed or business profile is identified', /function syncBlockedReason/.test(term) &&
  /if\(p\.managedBy\)return 'client'/.test(term) &&
  /if\(p\.accountType==='business'\)return 'business'/.test(term));
/* Enforced in the transport, not by hiding a button: scheduleSync fires on a timer. */
t('syncActive is false for those profiles', /function syncActive\(\)\{\s*\n\s*if\(syncBlockedReason\(\)\)return false/.test(term));
t('the debounced timer is stopped too', /if\(syncBlockedReason\(\)\)return;\s*\/\/ F1/.test(term));
t('push and pull each refuse independently',
  (term.match(/if\(syncBlockedReason\(\)\)\{setSyncStatus\(syncBlockedMessage\(\)/g)||[]).length === 2);
/* The registry carries symbols, entry prices and dates: that is position data. */
t('the cron registry is blocked as well', /function pushCallRegistry\(\)\{[\s\S]{0,260}?if\(syncBlockedReason\(\)\)return;/.test(term));
t('the chain head is blocked as well', /function pushChainHead\(\)\{[\s\S]{0,200}?if\(syncBlockedReason\(\)\)return;/.test(term));
/* The demo guard must stay first; a public password overwriting the real book is the worse failure. */
t('the demo refusal still comes before the F1 refusal',
  term.indexOf("if(isDemoUser()){setSyncStatus('Test account. Sync is disabled here.','muted');return{skipped:true};}\n  if(syncBlockedReason())") > 0);
/* A panel that silently does nothing reads as a bug rather than a refusal. */
t('a blocked profile is told why, before pressing anything', /function renderSyncBlocked/.test(term) &&
  /syncBlockedNotice/.test(term));
t('the reason names the actual defect, a key that cannot be revoked per account',
  /cannot be revoked for them alone/.test(term));
t('and offers the route that does work', /Export a backup/.test(term));

/* ==================== E2. HASH-CHAINED MARKS ==================== */
G('Tamper-evidence, claimed no wider than it is');

const S5 = new Function(`
  ${grab(term, 'canonicalJson')}
  ${grab(term, 'chainRecord')}
  return {canonicalJson, chainRecord};
`)();
/* Two devices sealing the same marks must build the same chain, so serialisation cannot depend on
   the order keys happen to be written in. */
t('canonical JSON is key-order independent',
  S5.canonicalJson({b:1,a:2,c:{z:1,y:2}}) === S5.canonicalJson({c:{y:2,z:1},a:2,b:1}));
t('it is stable for nested arrays too',
  S5.canonicalJson({a:[{q:1,p:2}]}) === S5.canonicalJson({a:[{p:2,q:1}]}));
t('the chain commits to exactly the fields the spec names, and no others', (() => {
  const got = Object.keys(S5.chainRecord('x',30,{intended:'a',actual:'b',price:1,spy:2,beta:3},'h')).sort();
  const want = ['callId','horizon','intendedDate','actualDate','price','spy','beta','prevHash'].sort();
  return got.join() === want.join();
})());
t('each link carries the previous hash', /prevHash:prevHash\|\|''/.test(term));
t('sealing is ordered deterministically', /function unsealedMarks/.test(term) &&
  /a\.mk\.at\|\|0\)-\(b\.mk\.at\|\|0\)/.test(term));
t('a mark is never sealed twice', /if\(!mk\|\|mk\.missed\|\|mk\.hash\)return/.test(term));
t('SHA-256 comes from crypto.subtle, no library', /crypto\.subtle\.digest\('SHA-256'/.test(term));
t('beta is recorded at stamping time, not recomputed later', /beta:\(bi&&isFinite\(bi\.beta\)\)/.test(term));
/* markCalls must stay synchronous or a mark could be half-written. */
t('sealing happens after stamping, not during', /sealNewMarks\(\)\.then/.test(term));

/* THE PART THAT MATTERS MOST: the claim is bounded on screen, beside the result. */
t('the audit says what the chain proves', /edited since it was written/.test(term));
t('and says plainly what it does not prove',
  /does not prove the prices were true when written/.test(term) &&
  /a chain can be built from scratch in one pass/.test(term));
t('the worker record is called corroboration, not a notary', /That is corroboration, not a notary/.test(term));
t('the worker file makes the same disclaimer to whoever reads it',
  /It is NOT a notary and is not described as one anywhere/.test(worker));
t('the worker stamps the head with its own clock, not the client\'s',
  /at: Date\.now\(\), head, n/.test(worker) && /const today = new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/.test(worker));
t('a head must be a real digest before it is stored', /\^\[0-9a-f\]\{64\}\$/.test(worker));
/* Verification is the only asynchronous part of the audit and the worker section rewrites the DOM
   when its fetch settles, so ordering here is load-bearing, not cosmetic. */
t('verification runs after the section that rewrites the DOM',
  term.indexOf('const v=await verifyChain()') > term.indexOf("el.innerHTML=out+head('Worker')"));

/* ==================== D4. MARKS ARE APPEND-ONLY ==================== */
G('A mark survives the merge, because it cannot be rebuilt');

const S4 = new Function(`
  ${grab(term, 'callId')}
  ${grab(term, 'betterMark')}
  ${grab(term, 'unionMarked')}
  ${grab(term, 'mergeRecordInto')}
  return {betterMark, unionMarked, mergeRecordInto, callId};
`)();
const T4 = Date.parse('2026-01-05T15:00:00Z');
const c4 = (ts,sym,marks) => ({ts,sym,track:'checklist',verdict:'buy',price:100,spy:400,marks});
const clone = o => JSON.parse(JSON.stringify(o));

/* The scenario the spec names: the Worker stamps a 90-day mark, this device holds older state. */
const cloud4  = {calls:[c4(T4,'AAA',{30:{price:105,spy:410,at:1},90:{price:112,spy:420,at:2}})]};
const laptop4 = {calls:[c4(T4,'AAA',{30:{price:105,spy:410,at:1}})]};
t('a pull keeps the mark this device never saw',
  Object.keys(S4.mergeRecordInto(clone(cloud4),laptop4).calls[0].marks).join()==='30,90');
const lap4=clone(laptop4); S4.mergeRecordInto(lap4,cloud4);
t('a push cannot clobber a mark stamped elsewhere',
  Object.keys(lap4.calls[0].marks).join()==='30,90');
const localOnly4={calls:[c4(T4,'AAA',{180:{price:130,spy:440,at:9}})]};
t('a mark made only on this device survives taking the cloud copy',
  Object.keys(S4.mergeRecordInto(clone(cloud4),localOnly4).calls[0].marks).join()==='30,90,180');

/* Neither of these is a real conflict, but both need a rule. */
const missed4={90:{missed:true,lag:40}}, real4={90:{price:112,spy:420,at:2}};
t('a real mark beats a missed one, whichever side holds it',
  S4.betterMark(missed4[90],real4[90]).price===112 && S4.betterMark(real4[90],missed4[90]).price===112);
/* A later re-stamp would be a re-mark, which I11 forbids. */
t('between two real marks the earlier observation wins',
  S4.betterMark({price:112,at:1000},{price:999,at:9000}).price===112 &&
  S4.betterMark({price:999,at:9000},{price:112,at:1000}).price===112);
t('calls present on only one side are all kept',
  S4.mergeRecordInto({calls:[c4(T4,'AAA',{}),c4(T4+1,'BBB',{})]},{calls:[c4(T4+2,'CCC',{})]})
    .calls.map(c=>c.sym).join()==='AAA,BBB,CCC');
t('sell marks on transactions are unioned too', /next\.transactions=unionMarked/.test(term));
/* Everything that is not a mark still takes the newer copy, which is what it should do. */
t('only the record is unioned; the rest stays last-write-wins',
  /D=mergeRecordInto\(Object\.assign\(defaultData\(\),remote\.data\|\|\{\}\),D\)/.test(term));
t('the push reads before it writes', /const cur=await syncFetch\('GET',slot\)/.test(term));

/* ==================== D3. ANNIVERSARY RESOLUTION ==================== */
G('One rule for what a horizon means');

t('horizons are calendar days, added as dates not milliseconds', /function addDays\(ds,n\)\{return dayStr\(dayNum\(ds\)\+n\)/.test(term));
/* Elapsed-ms arithmetic is not a calendar day across a daylight-saving boundary. */
t('age is no longer elapsed milliseconds over 86400000', !/\(now-c\.ts\)\/86400000/.test(term));
t('the exchange decides what day it is', /const ET_TZ='America\/New_York'/.test(term) &&
  /timeZone:ET_TZ/.test(term));
t('the mark is due at the first regular close at or after', /due:nextTradingDay\(intended\)/.test(term));
/* A hardcoded holiday table is correct until the year it silently is not, and there is no build
   step here to refresh one. */
t('holidays are computed, not tabulated', /function holidaysFor\(y\)/.test(term) &&
  /function easterSunday\(y\)/.test(term));
t('all ten NYSE holidays are covered', ['New Year','Martin Luther King','Washington','Good Friday',
  'Memorial Day','Juneteenth','Independence Day','Labor Day','Thanksgiving','Christmas']
  .every(h=>term.includes(h)));
t('a Saturday holiday is observed on the Friday, a Sunday on the Monday',
  /w===6\?addDays\(ds,-1\):w===0\?addDays\(ds,1\)/.test(term));
/* Spending tolerance on a closed market is how a mark gets dropped for no reason. */
t('lag runs from the first available close, not the calendar anniversary',
  /const lag=dayNum\(today\)-dayNum\(sch\.due\)/.test(term));
t('intended, actual and trading days are stored separately',
  /intended:sch\.intended,due:sch\.due,actual:today/.test(term) && /tradingDays:tradingDaysBetween/.test(term));
t('a missed mark still records what it was aiming at', /missed:true,lag,intended:sch\.intended,due:sch\.due/.test(term));
/* Legacy marks predate these fields and must not be recomputed from data never stored. */
t('older marks fall back rather than being invented', /function markHeldDays/.test(term) &&
  /if\(mk&&mk\.held!=null\)return mk\.held/.test(term));
/* Every place that turns a mark into a return must use the stored calendar span, not re-derive it.
   Counted rather than named, so a new consumer that skips it fails here. */
t('every consumer uses the stored span',
  (term.match(/=markHeldDays\(mk,days\)/g)||[]).length === 4);
/* One schedule, or the sell marks drift away from the call marks. */
t('sell marks run on the same calendar', /const sch=markSchedule\(tx\.ts,h\)/.test(term));
t('nothing schedules a mark by millisecond age any more',
  !/const age=\(now-c\.ts\)\/86400000/.test(term) && !/const age=\(now-tx\.ts\)\/86400000/.test(term));

/* ==================== TOTAL RETURN ==================== */
G('Marks credit distributions, on both legs');

t('marks are total return, not price return', /function accruedYield/.test(term) &&
  /priceRet\+accruedYield\(dy,heldDays\)/.test(term));
/* Crediting the holding but not the index would swap a bias against dividend payers for one in
   their favour. */
t('the benchmark is credited on the same basis',
  /benchPriceRet\+accruedYield\(SPY_YIELD_PCT,heldDays\)/.test(term) && /const SPY_YIELD_PCT/.test(term));
t('the aggregate uses total return too', /accruedYield\(yieldPctFor\(c\.sym\),held\)/.test(term));
t('an unknown yield accrues nothing rather than an assumption', /isFinite\(y\)&&y>0&&y<25/.test(term));

/* ==================== QUOTA GUARD ==================== */
G('A full browser store must fail loudly');

t('the single write path catches the write', /try\{\s*\n\s*localStorage\.setItem\(STORE_KEY,JSON\.stringify\(DB\)\);[^\n]*\n\s*\}catch\(err\)/.test(term));
t('QuotaExceededError is recognised across browsers', /err\.name==='QuotaExceededError'\|\|err\.code===22\|\|err\.code===1014/.test(term));
t('a failed save is shown, not swallowed', /function showSaveFailure/.test(term));
t('a failed save does not schedule a sync of data that never saved',
  /if\(!persistDB\(\)\)return;/.test(term) && /showSaveFailure\(quota,err\);\s*\n\s*return false;/.test(term));

/* ==================== M9. COUNTERFACTUAL SIZING, NOT A BACKTEST ==================== */
G('Sizing varies. Selection, timing and prices do not');

const CF = new Function(`
  let D; const TRADING_DAYS=252; const LO_MAXLAG=10, LO_MINOBS=60; const MIN_CF_DAYS=21;
  ${grab(term, 'toReturns')}
  ${grab(term, 'autocorr')}
  ${grab(term, 'annualScale')}
  ${grab(term, 'observedSigma')}
  ${grab(term, 'counterfactualWindow')}
  ${grab(term, 'sizedEquityPath')}
  ${grab(term, 'counterfactualSizing')}
  ${grab(term, 'actualSizing')}
  return {setD:d=>{D=d}, observedSigma, counterfactualWindow, sizedEquityPath,
          counterfactualSizing, actualSizing};
`)();

/* THE HAND-COMPUTED CASE, worked on paper before it was coded.
     10 shares of X and 10 of Y. X closes 100, 120, 90. Y flat at 100. Opening equity 2000.
     ACTUAL  1000 in each. Path 2000 / 2200 / 1900. End 1900, peak 2200, maxDD 300/2200 = 13.636%.
     4% RULE budget 2000*0.04 = 80. X gets 80/0.20 = 400, Y gets 80/0.40 = 200, cash 1400.
             Path 2000 / 2080 / 1960. End 1960, peak 2080, maxDD 120/2080 = 5.769%.               */
const cfW = () => ({ok:true, syms:['X','Y'], shares:{X:10,Y:10},
  px:{X:{'2026-01-02':100,'2026-01-05':120,'2026-01-06':90},
      Y:{'2026-01-02':100,'2026-01-05':100,'2026-01-06':100}},
  dates:['2026-01-02','2026-01-05','2026-01-06'],
  sigma:{X:0.20,Y:0.40}, sigN:{X:30,Y:30}, start:2000,
  heldFrom:'2026-01-02', from:'2026-01-02', to:'2026-01-06'});

{
  const a = CF.actualSizing(cfW()), c = CF.counterfactualSizing(4, cfW());
  t('the actual arm reproduces the observed path exactly',
    Math.abs(a.end - 1900) < 1e-9 && Math.abs(a.maxDD - 300/2200) < 1e-12 && a.n === 3,
    'end ' + a.end.toFixed(2) + ', maxDD ' + (a.maxDD*100).toFixed(3) + '%');
  t('a 4% risk budget reproduces the hand-computed counterfactual',
    Math.abs(c.end - 1960) < 1e-9 && Math.abs(c.maxDD - 120/2080) < 1e-12 &&
    Math.abs(c.cash - 1400) < 1e-9 && Math.abs(c.dollars.X - 400) < 1e-9 && Math.abs(c.dollars.Y - 200) < 1e-9,
    'end ' + c.end.toFixed(2) + ', maxDD ' + (c.maxDD*100).toFixed(3) + '%, cash ' + c.cash.toFixed(2));
  t('it reports how many observations it could use', a.n === 3 && c.n === 3);

  /* PROVING THE CHECK CAN FAIL. The same fixture with a deliberately wrong sigma must NOT produce
     the hand-computed answer; a test that passes on broken maths is decoration. */
  const broken = cfW(); broken.sigma.X = 0.10;
  const b = CF.counterfactualSizing(4, broken);
  t('a deliberately wrong volatility does not reproduce it (the check can fail)',
    Math.abs(b.end - 1960) > 1 && Math.abs(b.dollars.X - 800) < 1e-9,
    'end moves to ' + b.end.toFixed(2) + ' when sigma is halved');

  /* Halving the budget halves every position, so the excess over the cash line halves with it. */
  const half = CF.counterfactualSizing(2, cfW());
  t('halving the risk budget halves every position size',
    Math.abs(half.dollars.X - 200) < 1e-9 && Math.abs(half.dollars.Y - 100) < 1e-9 &&
    Math.abs(half.end - 1980) < 1e-9, 'end ' + half.end.toFixed(2));
  t('a smaller budget produces a smaller drawdown on the same prices', half.maxDD < c.maxDD);
}
{
  /* At 25% the rule wants 3750 against 2000. Scaled by 2000/3750 the book is fully invested:
     X holds 1333.33 and Y 666.67, path 2000 / 2266.67 / 1866.67, maxDD 400/2266.67 = 3/17. */
  const c = CF.counterfactualSizing(25, cfW());
  t('a rule that asks for more than the book is flagged unfundable, not levered',
    c.fundable === false && Math.abs(c.cash) < 1e-9 &&
    Math.abs(c.end - 5600/3) < 1e-9 && Math.abs(c.maxDD - 3/17) < 1e-12,
    'scaled to ' + (c.scale*100).toFixed(1) + '%, end ' + c.end.toFixed(2));
  t('a fundable rule is not scaled', CF.counterfactualSizing(4, cfW()).scale === 1);
}
{
  /* The single most important refusal. A backtester fills the gap; this one stops. */
  const W = cfW(); delete W.px.X['2026-01-05'];
  t('a missing close refuses the path rather than carrying the previous one forward',
    CF.sizedEquityPath(W, {X:1000,Y:1000}, 0) === null);
  const W2 = cfW(); W2.px.Y['2026-01-06'] = 0;
  t('a zero price is refused too', CF.sizedEquityPath(W2, {X:1000,Y:1000}, 0) === null);
}
{
  /* Only positions actually held, over dates actually logged, from a date actually recorded. */
  CF.setD({holdings:[{sym:'X',shares:10}], transactions:[{action:'buy',sym:'X',date:'2026-01-02'}],
           priceLog:{X:[{d:'2026-01-02',p:100}]}});
  t('one position is not a sizing comparison', CF.counterfactualWindow().reason.includes('at least two open positions'));

  CF.setD({holdings:[{sym:'X',shares:10},{sym:'Y',shares:10}], transactions:[],
           priceLog:{X:[{d:'2026-01-02',p:100}],Y:[{d:'2026-01-02',p:100}]}});
  t('with no dated buy or sell it refuses rather than assuming a start date',
    CF.counterfactualWindow().reason.includes('no date from which these positions are known to have been held'));

  CF.setD({holdings:[{sym:'X',shares:10},{sym:'Y',shares:10}],
           transactions:[{action:'buy',sym:'X',date:'2026-01-02'}],
           priceLog:{X:[{d:'2026-01-02',p:100}],Y:[]}});
  t('a holding with no logged closes stops the whole panel',
    CF.counterfactualWindow().reason.includes('No logged closes at all for Y'));
}
{
  /* Calm before the window, violent inside it. Sizing off in-window volatility would let the
     alternative arm shrink exactly the name that was about to fall, which is hindsight. */
  const day = k => new Date(Date.UTC(2026,0,2) + k*864e5).toISOString().slice(0,10);
  const build = (pre, inside) => {
    const rows = []; let p = 100;
    for (let k = 0; k < 45; k++) { rows.push({d:day(k), p:+p.toFixed(6)}); p *= (k % 2 ? 1-pre : 1+pre); }
    for (let k = 45; k < 75; k++) { rows.push({d:day(k), p:+p.toFixed(6)}); p *= (k % 2 ? 1-inside : 1+inside); }
    return rows;
  };
  const log = {X:build(0.004, 0.05), Y:build(0.004, 0.004)};
  CF.setD({holdings:[{sym:'X',shares:10},{sym:'Y',shares:10}],
           transactions:[{action:'buy',sym:'X',date:day(45)}], priceLog:log});
  const W = CF.counterfactualWindow();
  const pre = CF.observedSigma(log.X.filter(r => r.d < W.from).map(r => r.p));
  const all = CF.observedSigma(log.X.map(r => r.p));
  t('the window opens at the last dated change to a held position', W.ok && W.from >= day(45));
  t('volatility is measured strictly before the window, never inside it',
    W.ok && Math.abs(W.sigma.X - pre.sigma) < 1e-12 && all.sigma > W.sigma.X * 2,
    W.ok ? (W.sigma.X*100).toFixed(1) + '% used, ' + (all.sigma*100).toFixed(1) + '% if the window were included' : W.reason);

  /* Nothing is assumed in place of a measurement it does not have. */
  CF.setD({holdings:[{sym:'X',shares:10},{sym:'Y',shares:10}],
           transactions:[{action:'buy',sym:'X',date:day(2)}], priceLog:log});
  const thin = CF.counterfactualWindow();
  t('too little history before the window refuses instead of assuming a default volatility',
    thin.ok === false && /not enough closes logged before/i.test(thin.reason), thin.reason ? 'refused' : 'ran anyway');
}
{
  /* A sell shrinks a position, so today's share count cannot be run back across it. */
  const day = k => new Date(Date.UTC(2026,0,2) + k*864e5).toISOString().slice(0,10);
  CF.setD({holdings:[{sym:'X',shares:10},{sym:'Y',shares:10}],
           transactions:[{action:'buy',sym:'X',date:day(1)},{action:'sell',sym:'Y',date:day(30)}],
           priceLog:{X:[{d:day(1),p:100}],Y:[{d:day(1),p:100}]}});
  const W = CF.counterfactualWindow();
  t('a sell restarts the window as well as a buy', W.reason.includes(day(30)), W.reason.slice(0, 60));
}

/* The boundary, asserted structurally rather than trusted. */
t('the module states the boundary and why it is not a backtest',
  /M9\. COUNTERFACTUAL SIZING/.test(term) && /THE BOUNDARY, STATED FIRST/.test(term) &&
  /SELECTION IS FIXED/.test(term) && /TIMING IS FIXED/.test(term) && /PRICES ARE FIXED/.test(term));
{
  const mod = term.slice(term.indexOf('M9. COUNTERFACTUAL SIZING'), term.indexOf('function renderCounterfactual'));
  t('nothing in the module fetches a price',
    !/\bfetch\(|getCandles|getQuote|fh\(|await /.test(mod));
  t('it reads only holdings, the ledger and the app\'s own price log',
    [...mod.matchAll(/\bD\.([A-Za-z]+)/g)].map(m => m[1])
      .every(k => ['holdings','transactions','priceLog'].includes(k)));
  /* The missing surface IS the guarantee: one number and an observed window, no dates, no symbol
     list, no entry or exit rule. Widening this signature is how it would become a backtester. */
  t('the pure function takes a risk percentage and nothing else that could move a date',
    /function counterfactualSizing\(riskPct,W\)\{/.test(mod));
  t('weights are set once at the opening close, never rebalanced',
    /WEIGHTS ARE SET ONCE/.test(mod) && /units\[s\]=\(dollars\[s\]\|\|0\)\/p0;/.test(mod));
  t('the date set is an intersection, so a gap is dropped rather than filled',
    /INTERSECTION, NOT UNION/.test(mod) &&
    /dates=Object\.keys\(px\[syms\[0\]\]\)\.filter\(d=>d>=heldFrom&&syms\.every\(s=>px\[s\]\[d\]>0\)\)/.test(mod));
}
t('the screen says in plain words that this is not a backtest',
  /<b>This is not a backtest, and the difference matters\.<\/b>/.test(term) &&
  /A backtest has to invent prices for trades you never made; this invents nothing/.test(term));
t('it renders the sentence the spec asks for',
  /risk per position<\/b> instead of the sizing you actually used/.test(term) &&
  /your maximum drawdown across these '\+alt\.n\+' observed sessions would have been/.test(term));
t('it states its own falsification',
  /<b>Falsification:<\/b> if the alternative rows sit within a single day/.test(term));
t('it says when the window is too short to read',
  /A maximum drawdown is the largest of '\+W\.dates\.length\+' draws/.test(term));
t('it lives on the Risk tab and is rendered when that tab opens',
  /id="cfBody"/.test(term) &&
  /if\(t==='risk'\)\{renderBenchmarks\(\);renderRiskContrib\(\);renderCounterfactual\(\);/.test(term));
t('the panel is cleared when the account is switched',
  /const cfb=document\.getElementById\('cfBody'\);if\(cfb\)cfb\.innerHTML='';/.test(term));

/* ============================ 5. MATHS ============================ */
G('Maths — parsed out of terminal/index.html so the shipped code is what runs');

const M = new Function(`
  let D; const TRADING_DAYS=252; const LO_MAXLAG=10, LO_MINOBS=60;
  ${grab(term, 'toReturns')}
  ${grab(term, 'normCdf')}
  ${grab(term, 'autocorr')}
  ${grab(term, 'annualScale')}
  ${grab(term, 'thesisSigma')}
  ${grab(term, 'thesisProbability')}
  ${grab(term, 'spyRealisedVol')}
  ${grab(term, 'expectancyStats')}
  return {setD:d=>{D=d}, toReturns, normCdf, autocorr, annualScale, thesisSigma, thesisProbability, spyRealisedVol, expectancyStats};
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

/* ==================== 5b. MARKS SCHEDULE ==================== */
G('Marks schedule — the record cannot accrue if marks are missed');

/* The schedule is now calendar-based (D3), so the date helpers come along. Pulled from the shipped
   file by the same brace matching as everything else: what is tested is what runs. */
const S2 = new Function(`
  let D; const CALL_HORIZONS=[30,90,180,365];
  ${grab(term, 'etDate')}
  ${grab(term, 'dayNum')}
  ${grab(term, 'dayStr')}
  ${grab(term, 'addDays')}
  ${grab(term, 'dowOf')}
  ${grab(term, 'easterSunday')}
  ${grab(term, 'nthDow')}
  ${grab(term, 'lastDow')}
  ${grab(term, 'observedHoliday')}
  ${grab(term, 'holidaysFor')}
  ${grab(term, 'isTradingDay')}
  ${grab(term, 'nextTradingDay')}
  ${grab(term, 'tradingDaysBetween')}
  ${grab(term, 'markSchedule')}
  ${grab(term, 'markHeldDays')}
  const ET_TZ='America/New_York';
  const _etFmt=new Intl.DateTimeFormat('en-CA',{timeZone:ET_TZ,year:'numeric',month:'2-digit',day:'2-digit'});
  const _pad=n=>String(n).padStart(2,'0');
  const _holCache={};
  ${grab(term, 'upcomingMarks')}
  ${grab(term, 'missedMarks')}
  return {setD:d=>{D=d}, upcomingMarks, missedMarks,
          holidaysFor, isTradingDay, nextTradingDay, tradingDaysBetween, markSchedule,
          easterSunday, addDays, dayNum, etDate, observedHoliday};
`)();
const DAY = 864e5, NOW = Date.now();
const mkCall = (sym, age, marks) => ({ sym, verdict: 'buy', ts: NOW - age * DAY, price: 100, spy: 100, marks: marks || {} });
S2.setD({ calls: [
  mkCall('AAA', 29), mkCall('BBB', 88), mkCall('CCC', 1),
  mkCall('DDD', 200, { 30: { price: 1, spy: 1 }, 90: { price: 1, spy: 1 } }),
  mkCall('EEE', 120, { 30: { missed: true, lag: 44 } }),
  { sym: 'HOLD', verdict: 'hold', ts: NOW - 40 * DAY, price: 100, spy: 100 },
]});
const due = S2.upcomingMarks(14);
t('lists an anniversary falling inside the window', due.some(m => m.sym === 'AAA' && m.horizon === 30));
t('excludes horizons already marked', !due.some(m => m.sym === 'DDD' && m.horizon <= 90));
t('excludes anything beyond the window', !due.some(m => m.sym === 'CCC'));
t('excludes non-directional verdicts', !due.some(m => m.sym === 'HOLD'));
t('sorted soonest first', due.every((m, i) => !i || due[i-1].daysLeft <= m.daysLeft));

/* ---- D3, executed rather than grepped. Checked against the published NYSE calendar. ---- */
G('The exchange calendar, computed');

const H26=[...S2.holidaysFor(2026)].sort().join(',');
const H27=[...S2.holidaysFor(2027)].sort().join(',');
t('2026 NYSE holidays are exactly right',
  H26==='2026-01-01,2026-01-19,2026-02-16,2026-04-03,2026-05-25,2026-06-19,2026-07-03,2026-09-07,2026-11-26,2026-12-25', H26);
/* 2027 is the interesting year: Juneteenth falls Saturday, July 4 Sunday, Christmas Saturday. */
t('2027 observed shifts land correctly',
  H27==='2027-01-01,2027-01-18,2027-02-15,2027-03-26,2027-05-31,2027-06-18,2027-07-05,2027-09-06,2027-11-25,2027-12-24', H27);
t('Good Friday tracks Easter', S2.addDays(S2.easterSunday(2026),-2)==='2026-04-03' &&
                               S2.addDays(S2.easterSunday(2027),-2)==='2027-03-26');
t('a Saturday holiday is observed on the Friday', S2.observedHoliday('2027-06-19')==='2027-06-18');
t('a Sunday holiday is observed on the Monday', S2.observedHoliday('2027-07-04')==='2027-07-05');
t('weekends are not trading days', !S2.isTradingDay('2026-07-11') && !S2.isTradingDay('2026-07-12'));
t('a holiday is not a trading day', !S2.isTradingDay('2026-11-26'));

/* The acceptance case: an anniversary the market never opened for. */
const wk=S2.markSchedule(Date.parse('2026-04-12T14:00:00Z'),90);
t('a Saturday anniversary rolls to the Monday close',
  wk.intended==='2026-07-11' && wk.due==='2026-07-13', wk.intended+' -> '+wk.due);
const hol=S2.markSchedule(Date.parse('2026-06-04T14:00:00Z'),30);
t('an anniversary on a holiday weekend rolls past the observed holiday',
  hol.intended==='2026-07-04' && hol.due==='2026-07-06', hol.intended+' -> '+hol.due);
const th=S2.markSchedule(Date.parse('2026-10-27T14:00:00Z'),30);
t('Thanksgiving rolls to the Friday', th.intended==='2026-11-26' && th.due==='2026-11-27');

/* Elapsed milliseconds are not calendar days across a daylight-saving boundary. */
const dst=S2.markSchedule(Date.parse('2026-02-01T17:00:00Z'),90);
t('90 calendar days across the spring DST change is exactly 90',
  S2.dayNum(dst.intended)-S2.dayNum(dst.from)===90);
/* The browser and the Worker must agree on the date; UTC and ET do not. */
t('a call logged at 9:30pm ET is dated that day, not the next',
  S2.etDate(Date.parse('2026-03-10T01:30:00Z'))==='2026-03-09');
t('trading days are fewer than calendar days over the same span',
  S2.tradingDaysBetween('2026-04-12','2026-07-11')===62);
t('a mark on the first available close is on time, not late',
  S2.dayNum('2026-07-13')-S2.dayNum(wk.due)===0);

/* The browser and the Worker both decide when a mark is due. If their calendars drift, the cron
   stamps marks the browser thinks are early, or the browser waits for marks that never come.
   Rather than trust that two copies of the rule stay in step, compare them. */
/* Taken as one contiguous block: these helpers reference each other, so grabbing them
   individually reorders them and breaks the references. */
const wkCal = worker.slice(worker.indexOf('const _etFmtW'),
                           worker.indexOf('async function runCronMarks'));
const WK = new Function(wkCal + '\nreturn {markScheduleW, holidaysForW, tradingDaysBetweenW};')();
let drift = null;
for (let d = 0; d < 400 && !drift; d++) {
  const ts = Date.parse('2026-01-05T15:00:00Z') + d * 864e5;
  for (const h of [30, 90, 180, 365]) {
    const a = S2.markSchedule(ts, h), b = WK.markScheduleW(ts, h);
    if (a.from !== b.from || a.intended !== b.intended || a.due !== b.due) {
      drift = `d${d} h${h}: browser ${a.intended}/${a.due} vs worker ${b.intended}/${b.due}`;
      break;
    }
  }
}
t('browser and worker resolve every anniversary identically', drift === null, drift || '1600 schedules agree');
let holDrift = null;
for (let y = 2024; y <= 2035; y++) {
  const a = [...S2.holidaysFor(y)].sort().join(), b = [...WK.holidaysForW(y)].sort().join();
  if (a !== b) { holDrift = y + ': ' + a + ' vs ' + b; break; }
}
t('their holiday calendars agree for twelve years', holDrift === null, holDrift || '2024-2035 identical');
t('their trading-day counts agree',
  S2.tradingDaysBetween('2026-04-12','2026-07-11') === WK.tradingDaysBetweenW('2026-04-12','2026-07-11'));
t('every entry carries a real due date', due.every(m => /^\d{4}-\d{2}-\d{2}$/.test(m.due)));
t('missed marks are reported, not swept up', S2.missedMarks().some(m => m.sym === 'EEE' && m.lag === 44));

/* The bug this exists to prevent: the word and the date came from different sources, so a call
   0.9999 days from its anniversary printed "today" beside tomorrow's date. */
t('the day label is derived from the calendar date, not fractional days',
  /const dayDiff=due=>Math\.round/.test(term) && !/m\.daysLeft<1\?'today'/.test(term));

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
