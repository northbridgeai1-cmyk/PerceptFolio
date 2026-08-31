/**
 * PerceptFolio worker — Cloudflare Workers + KV.
 *
 * Four jobs, one file:
 *   1. Device sync      — stores one JSON blob per slot and hands it back.
 *   2. FRED proxy       — FRED sends no CORS headers, so a browser cannot call it directly.
 *   3. Access requests  — the front page posts applications here; you review and decide.
 *   4. Invite codes     — issued on approval, validated on redemption.
 *
 * SECURITY MODEL — read this before you deploy.
 * Sync and the admin routes are gated by a single shared secret (SYNC_SECRET) that you set in the
 * Cloudflare dashboard and paste into each of your devices. Anyone holding it can read and overwrite
 * everything. That is an acceptable trade for one operator syncing their own devices. It is NOT
 * acceptable for letting clients sync their own data — that needs per-user accounts.
 *
 * AND BE CLEAR ABOUT THE INVITE GATE. It is a workflow control, not a security boundary. app.html is
 * a public file on a public host; anyone can save it and run the terminal locally with no code at
 * all. What genuinely cannot be bypassed is this worker: the sync store and the FRED proxy live
 * behind the secret. Gate the worker, not the HTML.
 *
 * Required bindings (set in the Cloudflare dashboard):
 *   KV namespace binding : PF_SYNC
 *   Secret               : SYNC_SECRET     (a long random string you generate)
 *   Secret               : FRED_API_KEY    (optional, for the Market tab)
 *   Variable             : ALLOWED_ORIGIN  (e.g. https://perceptfolio.com)
 */

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB ceiling; a portfolio blob is normally a few KB

/* Compares two strings in constant time. A naive === bails out at the first differing character,
   which leaks the secret one character at a time to anyone willing to measure response times. */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    // charset must be explicit or browsers guess the encoding and mangle non-ASCII characters.
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(env) }
  });
}

/* Short, unambiguous invite code. The alphabet deliberately excludes 0, O, 1, I and L, because
   these get read down a phone line and typed by hand. */
function makeCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let s = '';
  for (let i = 0; i < 10; i++) {
    s += alphabet[bytes[i] % alphabet.length];
    if (i === 4) s += '-';
  }
  return s;
}

/* Strips control characters and clamps length. Everything stored here is later rendered into the
   admin page, which escapes on the way out too — this is the first of two layers, not the only one.
   The range is expressed with String.fromCharCode so no literal control byte ever appears in this
   source file. */
const CTRL = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + ']', 'g');
function clean(v, max) {
  return String(v == null ? '' : v).replace(CTRL, ' ').slice(0, max).trim();
}

export default {
  async fetch(request, env) {
    /* Everything is wrapped so that ANY failure still returns CORS headers. Without this an
       unhandled exception produces Cloudflare's own error page, which has no CORS headers, and the
       browser reports a useless "Load failed" instead of what actually went wrong. */
    try {
      return await handle(request, env);
    } catch (err) {
      return json({ error: 'Worker crashed: ' + (err && err.message ? err.message : String(err)) }, 500, env);
    }
  }
};

async function handle(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(env) });
  }

  /* Config checks return real messages rather than throwing, so a misconfigured binding shows up
     in the app as text you can act on. */
  if (!env.SYNC_SECRET) {
    return json({ error: 'Worker is missing SYNC_SECRET. Add it under Settings > Variables and Secrets, then Deploy.' }, 500, env);
  }
  if (!env.PF_SYNC || typeof env.PF_SYNC.get !== 'function') {
    return json({ error: 'Worker is missing the PF_SYNC KV binding. Add it under Settings > Bindings > KV namespace, with the variable name PF_SYNC, then Deploy.' }, 500, env);
  }

  const url = new URL(request.url);

  /* ================= PUBLIC ROUTES =================
     These sit ABOVE the auth check because they are the only things someone without credentials is
     allowed to touch. Everything below still requires the secret. */

  /* ---- POST /request — an access request from the front page ----
     Rate limited by IP at three per day. Not a serious defence against a determined flood, but it
     stops an idle person filling the store from a loop, and KV writes are the scarce resource on
     the free tier at 1,000 a day. */
  if (url.pathname === '/request' && request.method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const day = new Date().toISOString().slice(0, 10);
    const rlKey = 'rl:' + day + ':' + ip;
    const seen = parseInt((await env.PF_SYNC.get(rlKey)) || '0', 10);
    if (seen >= 3) {
      return json({ error: 'Too many requests from this address today. Email instead.' }, 429, env);
    }

    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: 'Body is not valid JSON.' }, 400, env); }

    const email = clean(body.email, 160);
    const who = clean(body.who, 2000);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400, env);
    if (who.length < 10) return json({ error: 'Tell us who you are and why, in a sentence or two.' }, 400, env);

    /* The three calls are the point of the form, so they are validated rather than accepted as free
       text. A call with no target or no stop is not a falsifiable claim, and refusing it here is
       what makes the whole approach work. */
    const raw = Array.isArray(body.calls) ? body.calls.slice(0, 3) : [];
    if (raw.length !== 3) return json({ error: 'Three calls are required.' }, 400, env);
    const calls = [];
    for (const c of raw) {
      const sym = clean(c.sym, 8).toUpperCase();
      const dir = (clean(c.dir, 4).toUpperCase() === 'SELL') ? 'SELL' : 'BUY';
      const target = parseFloat(c.target), stop = parseFloat(c.stop);
      const by = clean(c.by, 10);
      if (!/^[A-Z.\-]{1,8}$/.test(sym)) return json({ error: 'One of the tickers is not a ticker.' }, 400, env);
      if (!isFinite(target) || target <= 0 || !isFinite(stop) || stop <= 0) {
        return json({ error: 'Every call needs a target and a stop, both above zero.' }, 400, env);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(by)) return json({ error: 'Every call needs a date.' }, 400, env);
      calls.push({ sym, dir, target, stop, by });
    }

    const id = Date.now().toString(36) + '-' + makeCode().slice(0, 4).toLowerCase();
    const record = {
      id, email, who, calls,
      status: 'pending',
      createdAt: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      ip: ip.slice(0, 45),
      ua: clean(request.headers.get('User-Agent'), 200)
    };
    await env.PF_SYNC.put('req:' + id, JSON.stringify(record));
    // Two-day TTL on the counter; the date in the key already scopes it to today.
    await env.PF_SYNC.put(rlKey, String(seen + 1), { expirationTtl: 172800 });
    return json({ ok: true, id }, 200, env);
  }

  /* ---- /invite?code=XXXXX-XXXXX — validate an issued code ----
     GET checks it. POST checks it and burns it. Public, because the person redeeming does not yet
     have credentials. See the security note at the top of this file for what this does and does
     not protect. */
  if (url.pathname === '/invite') {
    const code = clean(url.searchParams.get('code'), 12).toUpperCase();
    if (!/^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code)) return json({ valid: false, error: 'Malformed code.' }, 400, env);
    const stored = await env.PF_SYNC.get('code:' + code);
    if (!stored) return json({ valid: false, error: 'Unknown code.' }, 404, env);
    const inv = JSON.parse(stored);
    if (inv.usedAt) return json({ valid: false, error: 'That code has already been redeemed.' }, 409, env);
    if (inv.expiresAt && Date.now() > inv.expiresAt) return json({ valid: false, error: 'That code has expired.' }, 410, env);
    if (request.method === 'POST') {
      inv.usedAt = Date.now();
      await env.PF_SYNC.put('code:' + code, JSON.stringify(inv));
    }
    return json({ valid: true, tier: inv.tier, email: inv.email }, 200, env);
  }

  // Auth: Authorization: Bearer <SYNC_SECRET>. Everything past this point is yours alone.
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!safeEqual(token, env.SYNC_SECRET)) {
    return json({ error: 'Bad or missing sync key.' }, 401, env);
  }

  /* ---- GET /requests — the approval queue ---- */
  if (url.pathname === '/requests' && request.method === 'GET') {
    const list = await env.PF_SYNC.list({ prefix: 'req:', limit: 500 });
    const out = [];
    for (const k of list.keys) {
      const v = await env.PF_SYNC.get(k.name);
      if (v) { try { out.push(JSON.parse(v)); } catch (e) {} }
    }
    out.sort((a, b) => b.createdAt - a.createdAt);
    return json({ requests: out }, 200, env);
  }

  /* ---- DELETE /requests?id=... — clear a decided record ---- */
  if (url.pathname === '/requests' && request.method === 'DELETE') {
    const id = clean(url.searchParams.get('id'), 40);
    if (!id) return json({ error: 'Missing id.' }, 400, env);
    await env.PF_SYNC.delete('req:' + id);
    return json({ ok: true }, 200, env);
  }

  /* ---- POST /decide — grant personal, grant business, or deny ----
     Approval mints a single-use code with a 30-day expiry. Denial keeps the record: knowing who you
     turned down, and why, is worth as much later as knowing who you let in. */
  if (url.pathname === '/decide' && request.method === 'POST') {
    let body;
    try { body = await request.json(); }
    catch (e) { return json({ error: 'Body is not valid JSON.' }, 400, env); }
    const id = clean(body.id, 40);
    const decision = clean(body.decision, 12).toLowerCase();
    const note = clean(body.note, 1000);
    if (!['personal', 'business', 'denied'].includes(decision)) {
      return json({ error: 'decision must be personal, business or denied.' }, 400, env);
    }
    const stored = await env.PF_SYNC.get('req:' + id);
    if (!stored) return json({ error: 'No such request.' }, 404, env);
    const rec = JSON.parse(stored);

    rec.status = decision;
    rec.decidedAt = Date.now();
    rec.note = note;

    let code = null;
    if (decision !== 'denied') {
      code = makeCode();
      rec.code = code;
      await env.PF_SYNC.put('code:' + code, JSON.stringify({
        code, tier: decision, email: rec.email, requestId: id,
        issuedAt: Date.now(), expiresAt: Date.now() + 30 * 86400000, usedAt: null
      }), { expirationTtl: 40 * 86400 });
    }
    await env.PF_SYNC.put('req:' + id, JSON.stringify(rec));
    return json({ ok: true, decision, code }, 200, env);
  }

  /* ---- FRED proxy ----
     The St. Louis Fed's API sends no CORS headers, so a browser cannot call it directly no matter
     what the app does. This route fetches it server-side and hands the result back with headers the
     browser will accept. The FRED key stays here in the worker and is never exposed to the page.

     Results are cached in KV for 12 hours. Macro series update monthly or quarterly, so caching
     costs nothing in freshness and keeps this comfortably inside the free tier's write limit. */
  if (url.pathname === '/fred') {
    if (!env.FRED_API_KEY) {
      return json({ error: 'Worker is missing FRED_API_KEY. Get a free key at fred.stlouisfed.org/docs/api/api_key.html and add it under Settings > Variables and Secrets, then Deploy.' }, 500, env);
    }
    const series = (url.searchParams.get('series') || '').trim();
    // FRED series IDs are alphanumeric; restricting the charset stops this being used as an open
    // proxy to arbitrary URLs.
    if (!/^[A-Za-z0-9_]{2,40}$/.test(series)) {
      return json({ error: 'Missing or malformed series parameter.' }, 400, env);
    }
    /* 3000 rather than 2000: FRED's licence caps the S&P and Dow daily series at exactly 10 years of
       history, which is about 2,520 trading days. The old ceiling silently threw away the oldest two
       years of a series that is already short, and those are the years the drawdown bootstrap most
       needs. Requests above the cap are clamped rather than rejected. */
    const limit = Math.min(3000, Math.max(1, parseInt(url.searchParams.get('limit') || '1', 10) || 1));
    const cacheKey = 'fred:' + series + ':' + limit;

    const cached = await env.PF_SYNC.get(cacheKey);
    if (cached !== null) {
      const parsedCache = JSON.parse(cached);
      if (Date.now() - parsedCache.fetchedAt < 12 * 60 * 60 * 1000) {
        return json({ series, cached: true, fetchedAt: parsedCache.fetchedAt, observations: parsedCache.observations }, 200, env);
      }
    }

    const fredUrl = 'https://api.stlouisfed.org/fred/series/observations'
      + '?series_id=' + encodeURIComponent(series)
      + '&api_key=' + encodeURIComponent(env.FRED_API_KEY)
      + '&file_type=json&sort_order=desc&limit=' + limit;
    const res = await fetch(fredUrl);
    if (!res.ok) {
      // Surface FRED's own message; a bad series ID is the most common cause and worth seeing.
      let detail = '';
      try { const e = await res.json(); detail = e.error_message || ''; } catch (e) {}
      return json({ error: 'FRED rejected the request (' + res.status + ')' + (detail ? ': ' + detail : '') + '. Check the series ID exists.' }, 502, env);
    }
    const data = await res.json();
    // Drop FRED's "." placeholders for missing readings rather than letting NaN reach the app.
    const observations = (data.observations || [])
      .filter(o => o.value !== '.' && o.value !== '' && isFinite(parseFloat(o.value)))
      .map(o => ({ date: o.date, value: parseFloat(o.value) }));
    const payload = { fetchedAt: Date.now(), observations };
    await env.PF_SYNC.put(cacheKey, JSON.stringify(payload), { expirationTtl: 86400 });
    return json({ series, cached: false, fetchedAt: payload.fetchedAt, observations }, 200, env);
  }

  /* ---- Device sync ----
     Slot id keeps separate profiles from overwriting each other. Restricted charset so it can't be
     used to wander outside the intended keyspace. */
  const slot = (url.searchParams.get('slot') || '').trim();
  if (!/^[A-Za-z0-9_-]{4,128}$/.test(slot)) {
    return json({ error: 'Missing or malformed slot parameter.' }, 400, env);
  }
  const key = 'slot:' + slot;

  if (request.method === 'GET') {
    const stored = await env.PF_SYNC.get(key);
    if (stored === null) return json({ empty: true }, 200, env);
    return new Response(stored, {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env) }
    });
  }

  if (request.method === 'PUT') {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) {
      return json({ error: 'Payload too large.' }, 413, env);
    }
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { return json({ error: 'Body is not valid JSON.' }, 400, env); }
    if (!parsed || typeof parsed !== 'object' || typeof parsed.updatedAt !== 'number') {
      return json({ error: 'Body must be an object with a numeric updatedAt.' }, 400, env);
    }
    await env.PF_SYNC.put(key, raw);
    return json({ ok: true, updatedAt: parsed.updatedAt }, 200, env);
  }

  return json({ error: 'Method not allowed.' }, 405, env);
}
