/* The door's last hop: /api/whoami turns the HttpOnly session into the access code the terminal
   needs, so a new device opens on the book instead of on a form. */
import { onRequestGet } from '../functions/api/whoami.js';
import { sign, COOKIE } from '../functions/_lib/session.js';

const env = { SESSION_SECRET: 'sess-secret' };
const get = (cookie) => onRequestGet({ env, request: new Request('https://perceptfolio.com/api/whoami', cookie ? { headers: { Cookie: cookie } } : {}) });
let fails = 0; const t = (n, ok, x = '') => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok ? '' : '   ' + x)); if (!ok) fails++; };

let r = await get(null); let j = await r.json();
t('no cookie is not signed in (401)', r.status === 401 && j.signedIn === false, r.status + ' ' + JSON.stringify(j));

r = await get(COOKIE + '=not.a.real.token'); t('a forged cookie is refused', r.status === 401);

const now = Date.now();
const good = await sign({ c: 'ABCDE-12345', t: 'personal', iat: now, exp: now + 86400000, chk: now }, env.SESSION_SECRET);
r = await get(COOKIE + '=' + good); j = await r.json();
t('a live session returns the code the door was opened with', r.status === 200 && j.code === 'ABCDE-12345' && j.tier === 'personal', JSON.stringify(j));
t('it says when the session stops being accepted', typeof j.expiresAt === 'number' && j.expiresAt > now);
t('it is never cached, and varies on the cookie',
  /no-store/.test(r.headers.get('Cache-Control') || '') && (r.headers.get('Vary') || '').includes('Cookie'));

const stale = await sign({ c: 'ABCDE-12345', t: 'personal', iat: now - 2e9, exp: now - 1000, chk: now }, env.SESSION_SECRET);
r = await get(COOKIE + '=' + stale); t('an expired session is refused, not honoured', r.status === 401);

const op = await sign({ c: 'OPERATOR', t: 'operator', iat: now, exp: now + 86400000, chk: now }, env.SESSION_SECRET);
r = await get(COOKIE + '=' + op); j = await r.json();
t('the operator session carries no book to open', r.status === 200 && j.operator === true && j.code === null, JSON.stringify(j));

r = await onRequestGet({ env: {}, request: new Request('https://perceptfolio.com/api/whoami') });
t('with no SESSION_SECRET it says so rather than letting anyone in', r.status === 503);

console.log(fails ? '\n' + fails + ' FAILED' : '\nALL WHOAMI CHECKS PASSED');
process.exit(fails ? 1 : 0);
