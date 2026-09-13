/* End-to-end test of the Pages gate against `wrangler pages dev`.

   Run:  node test/gate.mjs
   Needs: .dev.vars with SESSION_SECRET, WORKER_URL, SYNC_SECRET (see .dev.vars.example). The
   worker is the live one; only /status and /invite are called, and only with codes it does not
   know, so nothing is burned. Exits non-zero on the first failure. CI runs this at M7. */

import { spawn } from 'child_process';
import { createHmac } from 'crypto';
import fs from 'fs';

const PORT = 8790, B = `http://127.0.0.1:${PORT}`;
const vars = Object.fromEntries(fs.readFileSync('.dev.vars', 'utf8').split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(x => x.trim())));
if (!vars.SESSION_SECRET || !vars.SYNC_SECRET) { console.error('need .dev.vars'); process.exit(2); }

const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const forge = (p) => { const body = b64u(JSON.stringify(p)); return body + '.' + b64u(createHmac('sha256', vars.SESSION_SECRET).update(body).digest()); };

let failed = 0;
const t = (name, ok, note = '') => { console.log((ok ? '  PASS ' : '  FAIL ') + name + (note ? '   ' + note : '')); if (!ok) failed++; };
const req = (path, opts = {}) => fetch(B + path, { redirect: 'manual', ...opts });
const cookieOf = res => { const sc = res.headers.get('set-cookie') || ''; const m = sc.match(/pf_session=([^;]*)/); return m ? m[1] : null; };

const dev = spawn('npx', ['--yes', 'wrangler', 'pages', 'dev', '.', '--port', String(PORT), '--compatibility-date=2026-09-01'], { stdio: ['ignore', 'pipe', 'pipe'] });
const ready = new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('wrangler did not start')), 90000);
  const on = d => { if (/Ready on http/.test(String(d))) { clearTimeout(to); res(); } }; dev.stdout.on('data', on); dev.stderr.on('data', on); });

try {
  await ready;
  console.log('gate: end to end');
  let r = await req('/terminal/');
  t('no session: /terminal/ is not served, 302 to /enter/', r.status === 302 && /\/enter\/\?next=%2Fterminal%2F/.test(r.headers.get('location') || ''));
  r = await req('/admin');
  t('no session: /admin is not served', r.status === 302);
  r = await req('/enter/');
  const csp = r.headers.get('content-security-policy') || '';
  t('/enter/ serves with a strict CSP and security headers', r.status === 200 && !/unsafe-inline/.test(csp) && r.headers.get('x-frame-options') === 'DENY' && !!r.headers.get('strict-transport-security') && !r.headers.get('access-control-allow-origin'));
  r = await req('/api/enter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'AAAAA-AAAAA' }) });
  t('unknown code is refused by the worker (404)', r.status === 404);
  r = await req('/api/enter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'x' }) });
  t('malformed code is refused before any lookup (400)', r.status === 400);
  r = await req('/api/enter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret: 'wrong' }) });
  t('wrong operator key is refused (401)', r.status === 401);
  r = await req('/api/enter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret: vars.SYNC_SECRET }) });
  const op = cookieOf(r); const sc = r.headers.get('set-cookie') || '';
  t('operator key issues a permanent HttpOnly Secure Strict cookie', r.status === 200 && !!op && /HttpOnly/.test(sc) && /Secure/.test(sc) && /SameSite=Strict/.test(sc) && /Max-Age=315360000/.test(sc));
  r = await req('/terminal/', { headers: { cookie: 'pf_session=' + op } });
  t('operator session: /terminal/ is served', r.status === 200 && /unsafe-inline/.test(r.headers.get('content-security-policy') || ''));
  r = await req('/admin', { headers: { cookie: 'pf_session=' + op } });
  t('operator session: /admin is served', r.status === 200);
  r = await req('/terminal/', { headers: { cookie: 'pf_session=' + op.slice(0, -1) + 'x' } });
  t('tampered signature is refused', r.status === 302);
  const now = Date.now();
  r = await req('/admin', { headers: { cookie: 'pf_session=' + forge({ c: 'ZZZZZ-ZZZZZ', t: 'personal', iat: now, exp: now + 864e5, chk: now }) } });
  t('personal tier cannot reach admin (404)', r.status === 404);
  r = await req('/terminal/', { headers: { cookie: 'pf_session=' + forge({ c: 'ZZZZZ-ZZZZZ', t: 'personal', iat: now - 36e5, exp: now + 864e5, chk: now - 6e5 }) } });
  t('stale session with no live grant is cleared and marked paused', r.status === 302 && /reason=paused/.test(r.headers.get('location') || '') && /Max-Age=0/.test(r.headers.get('set-cookie') || ''));
  r = await req('/api/leave', { method: 'POST', headers: { cookie: 'pf_session=' + op } });
  t('leave clears the cookie', r.status === 200 && /Max-Age=0/.test(r.headers.get('set-cookie') || ''));
} catch (e) { console.error(e); failed++; }
finally { dev.kill('SIGTERM'); }
console.log(failed ? `\n${failed} FAILED` : '\nALL GATE CHECKS PASSED');
process.exit(failed ? 1 : 0);
