/* GET /api/whoami — who is holding this browser, according to the door.

   THE POINT OF THIS ROUTE. The terminal used to open, on a device it had not seen before, on a
   form: type your email, choose a password, and type the access code again. Every one of those
   three is something the person had already done at the door a second earlier, and the only reason
   the terminal asked was that the code never travelled the last hop. The session cookie is
   HttpOnly, so script cannot read it; the page could tell it existed only by being served at all.

   So the page asks the server instead. The cookie rides along because this is the same origin, the
   signature is checked here, and what comes back is the access code the session was issued for.
   From that the terminal pulls the book from the worker and opens, with nothing typed.

   It returns the code, which is the credential for the worker's per-account routes. That is not a
   widening: the browser holding this session is already inside the gate, already being served the
   terminal, and the terminal already sends that code on every data call. The cookie was always
   worth exactly this much; the route stops pretending otherwise.

   No-store, and varying on Cookie: a shared cache holding one person's code and handing it to the
   next request is the one way this route could do harm. */

import { verify, readCookie, LIFETIME } from '../_lib/session.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Vary': 'Cookie',
  },
});

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) return json({ ok: false, error: 'Sign-in is not configured.' }, 503);
  const s = await verify(readCookie(request), env.SESSION_SECRET);
  /* An expired or forged cookie is simply not signed in. The gate would have refused the page
     itself, so this is belt and braces rather than the only check. */
  if (!s || !s.c) return json({ ok: false, signedIn: false }, 401);
  /* The operator's session carries no book: it exists to reach admin, and handing the terminal a
     code of 'OPERATOR' would have it ask the worker for an account that does not exist. */
  if (s.c === 'OPERATOR') return json({ ok: true, signedIn: true, operator: true, code: null, tier: s.t || 'operator' }, 200);
  return json({
    ok: true,
    signedIn: true,
    code: s.c,
    tier: s.t || 'personal',
    /* When this session stops being accepted, so the terminal can say "sign in again" rather than
       failing a write and looking broken. */
    expiresAt: s.exp || null,
    lifetimeMs: LIFETIME[s.t] || LIFETIME.personal,
  }, 200);
}
