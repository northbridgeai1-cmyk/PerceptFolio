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
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    if (!env.SYNC_SECRET) {
      return json({ error: 'Worker is missing SYNC_SECRET. Set it in the Cloudflare dashboard.' }, 500, env);
    }

    // Auth: Authorization: Bearer <SYNC_SECRET>
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!safeEqual(token, env.SYNC_SECRET)) {
      return json({ error: 'Bad or missing sync key.' }, 401, env);
    }

    // Slot id keeps separate profiles from overwriting each other. Restricted charset so it can't be
    // used to wander outside the intended keyspace.
    const url = new URL(request.url);
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
};
