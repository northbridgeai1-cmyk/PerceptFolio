/* POST /api/enter — turn an access code, or the operator secret, into a session.

   Two credentials are accepted, never both at once:

   code    An access code issued by the worker (a purchase, an accepted application, or an employee
           code from admin). The code is the person's credential for the life of the account and
           works on every device they own, which is how the terminal's sync has always treated it.
           First use burns it at the worker (POST /invite), which writes the durable grant; every
           later use is checked against that grant (GET /status). A paused grant is refused here
           exactly as it is at the gate.

           ONE NEW SIGN-IN A DAY (the owner's rule, 2026-09-27). A device that already holds a valid
           session for the code skips every check below and simply gets a fresh thirty days, so a
           signed-in terminal is never interrupted. A sign-in with no session behind it asks the
           worker (POST /door), which allows the first one and makes the next wait out the day. The
           code covers two devices; it does not need turning in a third browser the same afternoon,
           and a code doing that is a code being passed around.

   secret  SYNC_SECRET, the operator's key. This exists to break the loop where admin is behind the
           gate but admin is also where codes come from. It issues a permanent operator session and
           nothing else; the admin page still asks for the secret itself to talk to the worker.

   Rate limiting is applied in front of this route by Cloudflare (see PRD §10 #8); the code alphabet
   and length make guessing impractical even without it, and a wrong code costs one KV read. */

import { sign, setCookie, LIFETIME, verify, readCookie } from '../_lib/session.js';

const CODE = /^[A-Z0-9]{5}-[A-Z0-9]{5}$/;
const json = (obj, status = 200, cookie) => {
  const h = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  if (cookie) {
    h.append('Set-Cookie', cookie);
    /* A second cookie, readable by the page and carrying nothing: the landing page uses it to say
       "Resume session" instead of "Request a demo" to someone who has entered before. The session
       itself stays in the HttpOnly cookie above. A year, because the point is to remember. */
    h.append('Set-Cookie', 'pf_seen=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax');
  }
  return new Response(JSON.stringify(obj), { status, headers: h });
};

async function issue(env, code, tier, next) {
  const life = LIFETIME[tier] || LIFETIME.personal;
  const now = Date.now();
  const token = await sign({ c: code, t: tier, iat: now, exp: now + life, chk: now }, env.SESSION_SECRET);
  return json({ ok: true, tier, next: safeNext(next) }, 200, setCookie(token, life));
}

/* Only same-origin paths are honoured as a post-sign-in destination. */
function safeNext(n) {
  if (typeof n !== 'string' || !n.startsWith('/') || n.startsWith('//') || n.startsWith('/enter')) return '/terminal/';
  return n.slice(0, 200);
}

export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET || !env.WORKER_URL) return json({ ok: false, error: 'Sign-in is not configured.' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Send JSON.' }, 400); }
  const next = body && body.next;

  /* Operator. The key is checked by asking the worker, which alone holds SYNC_SECRET: /version
     answers with a `configured` block only to a request bearing the real key. Pages therefore
     never stores a second copy of the secret. */
  if (body && typeof body.secret === 'string') {
    if (!body.secret || body.secret.length > 200) return json({ ok: false, error: 'That is not the operator key.' }, 401);
    let okKey = false;
    try {
      const r = await fetch(env.WORKER_URL.replace(/\/+$/, '') + '/version', { headers: { 'Authorization': 'Bearer ' + body.secret, 'Accept': 'application/json' } });
      const j = await r.json().catch(() => null);
      okKey = !!(r.ok && j && j.configured && typeof j.configured === 'object');
    } catch { return json({ ok: false, error: 'The access service is not reachable right now.' }, 502); }
    if (!okKey) return json({ ok: false, error: 'That is not the operator key.' }, 401);
    return issue(env, 'OPERATOR', 'operator', next || '/admin.html');
  }

  /* Code */
  const code = String((body && body.code) || '').trim().toUpperCase();
  if (!CODE.test(code)) return json({ ok: false, error: 'A code looks like XXXXX-XXXXX.' }, 400);

  const worker = env.WORKER_URL.replace(/\/+$/, '');
  const get = async (path, method = 'GET') => {
    const r = await fetch(worker + path, { method, headers: { 'Accept': 'application/json' } });
    let j = null; try { j = await r.json(); } catch { /* non-JSON is treated as an outage below */ }
    return { status: r.status, j };
  };

  /* Already signed in on this device, on this code: not a new sign-in at all. Slide the session and
     return, before the day's hold is even consulted. The grant is still checked below on the normal
     path, so a paused code cannot ride an old cookie for thirty days; the gate re-checks it too. */
  const held = await verify(readCookie(request), env.SESSION_SECRET);
  const sameDevice = !!(held && held.c === code);

  let status;
  try { status = await get('/status?code=' + encodeURIComponent(code)); }
  catch { return json({ ok: false, error: 'The access service is not reachable right now. Try again in a minute.' }, 502); }

  /* Already redeemed: the durable grant decides. */
  if (status.j && status.j.known) {
    if (!status.j.active) return json({ ok: false, error: 'Access for this code is paused. Contact the person who issued it.' }, 423);
    if (!sameDevice) {
      const hold = await door(code);
      if (hold) return hold;
    }
    return issue(env, code, status.j.tier || 'personal', next);
  }

  /* Not yet redeemed: validate, then burn. Two calls because GET reports the precise reason for a
     refusal and POST does the writing; the person sees the reason, not "no". */
  let check;
  try { check = await get('/invite?code=' + encodeURIComponent(code)); }
  catch { return json({ ok: false, error: 'The access service is not reachable right now. Try again in a minute.' }, 502); }
  if (!check.j || !check.j.valid) {
    const msg = (check.j && check.j.error) || 'That code is not valid.';
    const st = check.status === 404 ? 404 : check.status === 409 ? 409 : check.status === 423 ? 423 : check.status === 410 ? 410 : 400;
    return json({ ok: false, error: msg }, st);
  }
  let burn;
  try { burn = await get('/invite?code=' + encodeURIComponent(code), 'POST'); }
  catch { return json({ ok: false, error: 'The access service is not reachable right now. Try again in a minute.' }, 502); }
  if (!burn.j || !burn.j.valid) return json({ ok: false, error: (burn.j && burn.j.error) || 'That code could not be redeemed.' }, 400);

  /* The first sign-in ever. Stamped, not held: there is nothing to wait for yet. */
  await door(code);
  return issue(env, code, burn.j.tier || 'personal', next);

  /* The day's hold. Returns a 429 Response to send back, or null to carry on. A worker that cannot
     be reached does NOT lock anyone out: the grant was already checked, and refusing a paying
     account because a rate rule could not be read is the wrong way to fail. */
  async function door(c) {
    let r;
    try {
      r = await fetch(worker + '/door', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ code: c }),
      });
    } catch { return null; }
    if (r.status !== 429) return null;
    const j = await r.json().catch(() => null);
    const h = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    if (j && j.retryAfterMs) h.set('Retry-After', String(Math.ceil(j.retryAfterMs / 1000)));
    return new Response(JSON.stringify({ ok: false, error: (j && j.error) || 'One new sign-in a day on a code. Try again tomorrow.' }), { status: 429, headers: h });
  }
}
