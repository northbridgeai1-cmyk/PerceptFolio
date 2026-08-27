/**
 * PerceptFolio sync worker — Cloudflare Workers + KV.
 *
 * Deliberately minimal: it stores one JSON blob per slot and hands it back. It has no idea what a
 * portfolio is, does no merging, and makes no decisions. All the sync logic lives in the app.
 *
 * SECURITY MODEL — read this before you deploy.
 * This is built for ONE person syncing their OWN devices. Access is gated by a single shared secret
 * (SYNC_SECRET) that you set in the Cloudflare dashboard and paste into each of your devices.
 * Anyone holding that secret can read and overwrite everything in every slot.
 *
 * That is an acceptable trade for personal use. It is NOT acceptable for letting clients or anyone
 * else sync their own data — that needs per-user accounts and real authentication. Don't extend this
 * to other people without replacing this file.
 *
 * Required bindings (set in the Cloudflare dashboard):
 *   KV namespace binding : PF_SYNC
 *   Secret               : SYNC_SECRET   (a long random string you generate)
 *   Variable             : ALLOWED_ORIGIN (e.g. https://perceptfolio.com)
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
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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

    // Auth: Authorization: Bearer <SYNC_SECRET>
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!safeEqual(token, env.SYNC_SECRET)) {
      return json({ error: 'Bad or missing sync key.' }, 401, env);
    }

    const url = new URL(request.url);

    /* ---- FRED proxy ----
       The St. Louis Fed's API sends no CORS headers, so a browser cannot call it directly no matter
       what the app does. This route fetches it server-side and hands the result back with headers the
       browser will accept. The FRED key stays here in the Worker and is never exposed to the page.

       Results are cached in KV for 12 hours. Macro series update monthly or quarterly, so caching
       costs nothing in freshness and keeps this comfortably inside the free tier's write limit. */
    if (url.pathname === '/fred') {
      if (!env.FRED_API_KEY) {
        return json({ error: 'Worker is missing FRED_API_KEY. Get a free key at fred.stlouisfed.org/docs/api/api_key.html and add it under Settings > Variables and Secrets, then Deploy.' }, 500, env);
      }
      const series = (url.searchParams.get('series') || '').trim();
      // FRED series IDs are alphanumeric; restricting the charset stops this being used as an
      // open proxy to arbitrary URLs.
      if (!/^[A-Za-z0-9_]{2,40}$/.test(series)) {
        return json({ error: 'Missing or malformed series parameter.' }, 400, env);
      }
      const limit = Math.min(2000, Math.max(1, parseInt(url.searchParams.get('limit') || '1', 10) || 1));
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

    // Slot id keeps separate profiles from overwriting each other. Restricted charset so it can't be
    // used to wander outside the intended keyspace.
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
