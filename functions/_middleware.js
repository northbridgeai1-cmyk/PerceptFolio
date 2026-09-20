/* The gate, and the headers GitHub Pages could never set.

   Runs on every request to the Pages site. Two jobs:

   1. Security headers on every response. A static host on GitHub could only ship a meta CSP,
      which cannot express frame-ancestors, HSTS or Permissions-Policy. Here they are real.

   2. The wall. Anything under the gated prefixes is served only to a request carrying a valid
      pf_session cookie whose grant the worker still reports as live. No cookie sends the visitor
      to /enter. A paused grant clears the cookie and sends them to /enter with the reason. The
      terminal file itself is never served without a session; that is the property the PRD asks
      for, and it holds at this layer rather than inside the terminal's own JavaScript.

   Re-checking with the worker. The cookie says when the grant was last confirmed (chk). Inside
   RECHECK_MS the cookie is trusted on its own, so the terminal's dozens of asset requests do not
   each cost a round trip. Past it, one GET to /status refreshes the confirmation and re-signs the
   cookie. A pause therefore takes effect within RECHECK_MS on any device, which is the "next
   request" the PRD promises to within five minutes. If the worker is unreachable the cookie is
   honoured for up to STALE_MS after its last confirmation and then refused: an outage neither
   locks every subscriber out immediately nor turns into a permanent free pass. */

import { verify, sign, readCookie, setCookie, clearCookie, LIFETIME } from './_lib/session.js';

const GATED = [/^\/terminal(\/|$)/, /^\/admin(\.html|\/|$)/, /^\/app(\.html|\/|$)/];
const FRAMEABLE = /^\/preview\//;
const ADMIN = [/^\/admin(\.html|\/|$)/];
const RECHECK_MS = 5 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;

const HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/* The terminal and admin are single files with inline script and style by design, so their CSP
   keeps 'unsafe-inline'; the meta CSP inside each file says why. worker-src 'self' is for
   the World view's globe (CesiumJS, vendored), whose geometry workers are same-origin module
   workers under /vendor/cesium/Workers; nothing else on the site makes a worker. The two arcgisonline hosts are Esri's World Imagery, the
   satellite layer the World view fades in as the camera descends; img-src for the tiles,
   connect-src for the service description. 'wasm-unsafe-eval'
   lets Cesium compile the mesh decoders it instantiates at load (unused here, noisy if refused);
   it permits WebAssembly compilation only, never string evaluation, which stays forbidden. The public site, built by Vite,
   gets the strict policy: no inline script, no inline style, nothing from anywhere but here and
   the worker. Stripe's hosted Checkout is a redirect, not an embed, so it needs no allowance. */
function csp(path, env) {
  const worker = (env.WORKER_URL || '').replace(/\/+$/, '');
  const connect = ["'self'", worker, 'https://*.workers.dev', 'https://finnhub.io', 'https://formsubmit.co'].filter(Boolean).join(' ');
  if (GATED.some(re => re.test(path))) {
    return `default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://services.arcgisonline.com https://server.arcgisonline.com; font-src 'self' data:; connect-src ${connect} https://services.arcgisonline.com https://server.arcgisonline.com; worker-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'`;
  }
  return `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src ${connect}; form-action 'self' https://checkout.stripe.com; base-uri 'self'; object-src 'none'; frame-src 'self'; frame-ancestors 'none'; upgrade-insecure-requests`;
}

function withHeaders(res, path, env, extraCookie) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(HEADERS)) h.set(k, v);
  h.set('Content-Security-Policy', csp(path, env));
  /* The dashboard snapshot is framed by our own landing page and by nothing else. */
  if (FRAMEABLE.test(path)) { h.set('X-Frame-Options', 'SAMEORIGIN'); h.set('Content-Security-Policy', csp(path, env).replace("frame-ancestors 'none'", "frame-ancestors 'self'")); }
  /* Nothing on this origin is a cross-origin API. The worker sets its own CORS; the site never
     answers a cross-origin request with anything but the browser's default refusal. */
  h.delete('Access-Control-Allow-Origin'); h.delete('Access-Control-Allow-Credentials');
  if (extraCookie) h.append('Set-Cookie', extraCookie);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

function toEnter(url, reason) {
  const to = new URL('/enter/', url);
  if (reason) to.searchParams.set('reason', reason);
  const next = url.pathname + url.search;
  if (next && next !== '/enter/') to.searchParams.set('next', next);
  return Response.redirect(to.toString(), 302);
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  /* One origin. An account lives in the browser's storage for the exact address, so www and the
     bare domain would be two terminals with two accounts. Everyone lands on the bare domain;
     this runs before the gate because Functions run before _redirects. */
  if (url.hostname === 'www.perceptfolio.com') {
    url.hostname = 'perceptfolio.com';
    return Response.redirect(url.toString(), 301);
  }

  if (!GATED.some(re => re.test(path))) {
    return withHeaders(await next(), path, env);
  }

  if (!env.SESSION_SECRET) {
    /* Misconfiguration must fail closed. A gate with no secret is no gate. */
    return withHeaders(new Response('Gate is not configured.', { status: 503 }), path, env);
  }

  const session = await verify(readCookie(request), env.SESSION_SECRET);
  if (!session) return toEnter(url);

  if (ADMIN.some(re => re.test(path)) && session.t !== 'operator' && session.t !== 'employee') {
    return withHeaders(new Response('Not found', { status: 404 }), path, env);
  }

  /* Operator sessions come from the secret, not a code; there is no grant to re-check. */
  let refreshed = null;
  const now = Date.now();
  if (session.t !== 'operator' && now - (session.chk || 0) > RECHECK_MS) {
    let live = null, why = 'paused';
    try {
      const r = await fetch(`${(env.WORKER_URL || '').replace(/\/+$/, '')}/status?code=${encodeURIComponent(session.c)}`, {
        headers: { 'Accept': 'application/json' }, cf: { cacheTtl: 0 },
      });
      if (r.ok) { const j = await r.json(); live = !!(j && j.known && j.active); if (live === false) why = (j && j.reason === 'lapsed') ? 'lapsed' : 'paused'; }
    } catch { live = null; }

    if (live === false) {
      /* lapsed: the subscription stopped paying and the grace window is over; the door offers the
         billing portal. paused: the operator turned it off; the door says to contact them. */
      return withHeaders(toEnter(url, why), path, env, clearCookie());
    }
    if (live === null && now - (session.chk || 0) > STALE_MS) {
      return withHeaders(toEnter(url, 'unavailable'), path, env, clearCookie());
    }
    if (live === true) {
      const life = LIFETIME[session.t] || LIFETIME.personal;
      const payload = { ...session, chk: now, exp: session.t === 'employee' ? session.exp : now + life };
      refreshed = setCookie(await sign(payload, env.SESSION_SECRET), payload.exp - now);
    }
  }

  return withHeaders(await next(), path, env, refreshed);
}
