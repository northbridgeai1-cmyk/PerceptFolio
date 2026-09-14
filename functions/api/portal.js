/* POST /api/portal — send the signed-in subscriber to their Stripe billing portal.

   The code lives only in the HttpOnly cookie, so the page cannot read it; this Function does, asks
   the worker for a portal session for that code, and answers with the URL. Employees and the
   operator have no billing account and get a 404 rather than a Stripe error. */
import { verify, readCookie } from '../_lib/session.js';

export async function onRequestPost({ request, env }) {
  const json = (o, s) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  if (!env.SESSION_SECRET || !env.WORKER_URL) return json({ ok: false, error: 'Not configured.' }, 503);
  const session = await verify(readCookie(request), env.SESSION_SECRET);
  if (!session) return json({ ok: false, error: 'Sign in first.' }, 401);
  if (session.t === 'operator' || session.t === 'employee') return json({ ok: false, error: 'No billing account on this session.' }, 404);
  let r;
  try {
    r = await fetch(env.WORKER_URL.replace(/\/+$/, '') + '/portal', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ code: session.c }) });
  } catch { return json({ ok: false, error: 'Billing is not reachable right now.' }, 502); }
  let j = null; try { j = await r.json(); } catch { /* fallthrough */ }
  if (!r.ok || !j || !j.url) return json({ ok: false, error: (j && j.error) || 'No portal available.' }, r.status === 404 ? 404 : 502);
  return json({ ok: true, url: j.url }, 200);
}
