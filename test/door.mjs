/* Drive functions/api/enter.js against a stubbed worker: the day's hold, and the device that
   already holds a session. */
import { onRequestPost } from '../functions/api/enter.js';
import { sign, COOKIE } from '../functions/_lib/session.js';

const env = { SESSION_SECRET: 'sess-secret', WORKER_URL: 'https://worker.example' };
let doorCalls = 0, holdNext = false;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('/status?code=')) return new Response(JSON.stringify({ known: true, active: true, tier: 'personal' }), { status: 200 });
  if (u.endsWith('/door')) {
    doorCalls++;
    if (holdNext) return new Response(JSON.stringify({ ok: false, error: 'One new sign-in a day: try again in 22 hours.', retryAfterMs: 22 * 3600000, retryAfterHours: 22 }), { status: 429 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  throw new Error('unstubbed ' + u);
};
const post = (body, cookie) => onRequestPost({ env, request: new Request('https://perceptfolio.com/api/enter', {
  method: 'POST', body: JSON.stringify(body),
  headers: cookie ? { 'content-type': 'application/json', Cookie: cookie } : { 'content-type': 'application/json' } }) });

let fails = 0;
const t = (name, ok, extra='') => { console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok ? '' : '   ' + extra)); if (!ok) fails++; };

const CODE = 'ABCDE-12345';
let r = await post({ code: CODE }); let j = await r.json();
t('a fresh sign-in on a free code goes through', r.status === 200 && j.ok === true && doorCalls === 1, r.status + ' ' + JSON.stringify(j));

holdNext = true;
r = await post({ code: CODE }); j = await r.json();
t('the next fresh sign-in the same day is held (429) and says how long', r.status === 429 && /22 hours/.test(j.error), r.status + ' ' + JSON.stringify(j));
t('the hold carries Retry-After in seconds', r.headers.get('Retry-After') === String(22 * 3600));

const token = await sign({ c: CODE, t: 'personal', iat: Date.now(), exp: Date.now() + 86400000, chk: Date.now() }, env.SESSION_SECRET);
const before = doorCalls;
r = await post({ code: CODE }, COOKIE + '=' + token); j = await r.json();
t('a device that already holds a session is never asked and never held', r.status === 200 && j.ok === true && doorCalls === before, r.status + ' ' + JSON.stringify(j));

const other = await sign({ c: 'ZZZZZ-99999', t: 'personal', iat: Date.now(), exp: Date.now() + 86400000, chk: Date.now() }, env.SESSION_SECRET);
r = await post({ code: CODE }, COOKIE + '=' + other); j = await r.json();
t('a session for a DIFFERENT code does not skip the hold', r.status === 429, r.status + ' ' + JSON.stringify(j));

globalThis.fetch = async (url) => { if (String(url).includes('/status')) return new Response(JSON.stringify({ known: true, active: true, tier: 'personal' }), { status: 200 }); throw new Error('worker down'); };
r = await post({ code: CODE }); j = await r.json();
t('an unreachable worker lets the account in rather than locking it out', r.status === 200 && j.ok === true, r.status + ' ' + JSON.stringify(j));

console.log(fails ? '\n' + fails + ' FAILED' : '\nALL DOOR CHECKS PASSED');
process.exit(fails ? 1 : 0);
