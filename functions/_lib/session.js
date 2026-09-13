/* Session cookies for the Pages gate.

   One signed cookie, pf_session, carries everything the gate needs to decide without a lookup:
   the access code it was issued for, the tier, when it was issued, when it expires, and when the
   grant behind it was last confirmed live with the worker. HMAC-SHA256 over the payload with
   SESSION_SECRET; base64url on both halves; no third-party library.

   Why a cookie and not a bearer token: the terminal is a static file. The browser asks for it with
   a plain GET, and the only credential a plain GET carries automatically is a cookie. HttpOnly so
   script cannot read it, Secure so it never travels in clear, SameSite=Strict so no other site can
   ride it, Path=/ so /api/enter and /terminal/ share it.

   Tiers and lifetimes. personal and business sessions live 30 days and slide on use. employee and
   operator sessions are permanent: sign in once on a device and it stays yours until the operator
   pauses the grant. "Permanent" is ten years; a cookie needs some expiry to be stored at all. */

export const COOKIE = 'pf_session';
const DAY = 86400000;
export const LIFETIME = { personal: 30 * DAY, business: 30 * DAY, employee: 3650 * DAY, operator: 3650 * DAY };

const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function key(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function sign(payload, secret) {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await key(secret), enc.encode(body));
  return body + '.' + b64u(sig);
}

/* Returns the payload or null. A bad signature, a malformed cookie and an expired session all
   return null; the caller treats every null the same way, as "not signed in". */
export async function verify(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot), sig = token.slice(dot + 1);
  let ok = false;
  try { ok = await crypto.subtle.verify('HMAC', await key(secret), unb64u(sig), enc.encode(body)); } catch { return null; }
  if (!ok) return null;
  let p;
  try { p = JSON.parse(new TextDecoder().decode(unb64u(body))); } catch { return null; }
  if (!p || typeof p !== 'object' || !p.c || !p.t || !p.exp) return null;
  if (Date.now() > p.exp) return null;
  return p;
}

export function readCookie(request) {
  const h = request.headers.get('Cookie') || '';
  const m = h.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  return m ? m[1] : null;
}

export function setCookie(token, maxAgeMs) {
  return `${COOKIE}=${token}; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

/* Constant-time string compare for the operator secret. Length leaks are accepted; the secret is
   long and random, so its length says nothing useful. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
