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
const stripComments = h => h
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');
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
t('the tile states it was never received', /never received — accrued at declared rates/.test(term));
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
  /Congratulations — your access to PerceptFolio has been approved/.test(admin) &&
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

  /* These move money, mint codes, spend quota or read the queue. Operator only. */
  for (const r of ['/requests', '/decide', '/pause', '/summarise', '/finnhub'])
    t(r + ' must require the sync key', exists(r) && !isPublic(r));

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

t('the invite grant decides the account tier, not the sign-up dropdown',
  /const grantedTier=\(inv\.tier==='business'\|\|inv\.tier==='personal'\)\?inv\.tier:accountType/.test(term) &&
  /accountType:grantedTier/.test(term));
t('the sign-up screen says the invite governs the tier',
  /Your invite decides this/.test(term));
t('first-run setup does not assume the reader owns the worker',
  !/Skip it if your worker already holds one/.test(term));

/* ==================== B1 — CRON MARKING ==================== */
G('B1: marks no longer depend on the app being open');

t('the worker exports a scheduled handler', /async scheduled\(event, env, ctx\)/.test(worker));
t('every run stamps cron:last, even on failure', /put\('cron:last', JSON\.stringify\(note\)\)/.test(worker));
t('overdue-past-tolerance is never backfilled (I11)', /lag < 0 \|\| lag > cronTolerance\(h\)/.test(worker));
t('an existing mark is never overwritten', /if \(\(marks\[c\.id\] \|\| \{\}\)\[h\]\) continue/.test(worker));
t('the registry keeps only validated fields, not the client blob',
  /Only the fields the cron needs are kept/.test(worker));
t('/callreg and /marks are dual-auth like /fred', /'c:' \+ code/.test(worker) && /'s:' \+ slot/.test(worker));
t('the client registers open calls after marking', /pushCallRegistry\(\);\s*\/\/ keep the worker/.test(term));
t('the client adopts worker marks on session entry', /reconcileWorkerMarks\(\)\.then/.test(term));
t('adoption never overwrites a local mark', /if\(c\.marks\[h\]\|\|!wm\[h\]\)return/.test(term));
t('the demo account registers nothing', /isDemoUser\(\)\)return null/.test(term));
t('/version reports the last cron run so a missing trigger is observable', /body\.cron = cl/.test(worker));

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

const S2 = new Function(`
  let D; const CALL_HORIZONS=[30,90,180,365];
  ${grab(term, 'upcomingMarks')}
  ${grab(term, 'missedMarks')}
  return {setD:d=>{D=d}, upcomingMarks, missedMarks};
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
