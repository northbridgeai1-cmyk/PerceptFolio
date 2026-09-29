/* DOES THE BROKER CONNECTION ACTUALLY WORK? (2026-09-29)

   test/broker.mjs checks the signing algorithm and the read-only guards by lifting functions out of
   the source. That proves the parts are right. It does not prove the whole thing runs, and the owner
   asked whether it actually works, which is a different question.

   So this drives the real worker, over the real routes, against a MOCK SNAPTRADE THAT VERIFIES THE
   SIGNATURE THE WAY SNAPTRADE DOES. The mock recomputes the HMAC from the request it actually
   received, using its own canonicaliser written separately from the worker's, and answers 401 if it
   disagrees. That is the point: if our signing is wrong in any way, every test below fails, exactly
   as a live key would fail, and we find out here instead of in front of a paying customer.

   WHAT THIS STILL DOES NOT PROVE: that SnapTrade's live endpoints are shaped the way the mock is.
   Only a real key proves that. What it does prove is that if they are, this works.

   Run:  node test/brokerlive.mjs */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { createHmac } from 'crypto';

const tmp = path.join(os.tmpdir(), 'pf-broker-' + process.pid + '.mjs');
fs.writeFileSync(tmp, fs.readFileSync('worker.js', 'utf8'));
const worker = (await import('file://' + tmp)).default;
fs.unlinkSync(tmp);

let failed = 0, passed = 0;
const t = (name, ok, note = '') => { console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (note ? '   ' + note : '')); ok ? passed++ : failed++; };

const store = new Map();
const KV = {
  get: async k => store.has(k) ? store.get(k) : null,
  put: async (k, v) => { store.set(k, String(v)); },
  delete: async k => { store.delete(k); },
};

const CONSUMER_KEY = 'ck_test';
const CODE = 'AAAAA-BBBBB';
const env = {
  PF_SYNC: KV, SYNC_SECRET: 'op-secret', ALLOWED_ORIGIN: 'https://perceptfolio.com',
  SNAPTRADE_CLIENT_ID: 'pf-client', SNAPTRADE_CONSUMER_KEY: CONSUMER_KEY,
};
/* A live, unpaused grant, which is what every per-account route demands. */
store.set('grant:' + CODE, JSON.stringify({ code: CODE, tier: 'personal', paused: false }));

/* ---- the mock's OWN canonicaliser, written independently of the worker's ---- */
function canon(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined)
    .map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}

const seen = { signed: 0, rejected: 0, paths: [], loginBody: null, deleted: false };

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(String(url));
  const pathname = u.pathname;
  const query = u.search.replace(/^\?/, '');
  const body = opts.body ? JSON.parse(opts.body) : undefined;
  seen.paths.push(opts.method + ' ' + pathname);

  /* VERIFY, exactly as the documented algorithm says. */
  const expect = createHmac('sha256', CONSUMER_KEY)
    .update(canon({ content: body === undefined ? null : body, path: pathname, query }), 'utf8')
    .digest('base64');
  const got = (opts.headers || {})['Signature'];
  if (got !== expect) {
    seen.rejected++;
    return new Response(JSON.stringify({ detail: 'Signature mismatch' }), { status: 401 });
  }
  seen.signed++;

  if (pathname === '/api/v1/snapTrade/registerUser')
    return new Response(JSON.stringify({ userId: body.userId, userSecret: 'us_stub_secret' }), { status: 200 });

  if (pathname === '/api/v1/snapTrade/login') {
    seen.loginBody = body;
    return new Response(JSON.stringify({ redirectURI: 'https://app.snaptrade.com/portal/xyz', sessionId: 's1' }), { status: 200 });
  }

  if (pathname === '/api/v1/snapTrade/deleteUser') {
    seen.deleted = true;
    return new Response(JSON.stringify({ status: 'deleted' }), { status: 200 });
  }

  if (pathname === '/api/v1/accounts')
    return new Response(JSON.stringify([
      { id: 'acc1', name: 'Individual', institution_name: 'Robinhood', number: '123456789' },
      { id: 'acc2', name: 'Roth IRA', institution_name: 'Webull', number: '55' },
    ]), { status: 200 });

  if (pathname === '/api/v1/accounts/acc1/positions')
    return new Response(JSON.stringify([
      { symbol: { symbol: { symbol: 'NVDA' } }, units: 40, average_purchase_price: 118.25 },
      { symbol: { symbol: { symbol: 'ASML' } }, units: 12, average_purchase_price: 690.1 },
      /* an option leg, which this terminal refuses in public and must skip */
      { symbol: { symbol: { symbol: 'AAPL 260116C00150000' } }, units: 5, average_purchase_price: 3.2 },
      /* junk that must not become a holding */
      { symbol: null, units: 9, average_purchase_price: 1 },
      { symbol: { symbol: { symbol: 'TSLA' } }, units: 0, average_purchase_price: 200 },
    ]), { status: 200 });

  if (pathname === '/api/v1/accounts/acc2/positions')
    return new Response(JSON.stringify([{ symbol: { symbol: { symbol: 'VOO' } }, units: 3, average_purchase_price: 500 }]), { status: 200 });

  if (pathname === '/api/v1/accounts/acc1/activities')
    return new Response(JSON.stringify([
      { id: 'a1', type: 'BUY', symbol: { symbol: { symbol: 'NVDA' } }, units: 40, price: 118.25, trade_date: '2026-03-02T14:30:00Z' },
      { id: 'a2', type: 'SELL', symbol: { symbol: { symbol: 'ASML' } }, units: 4, price: 710.5, trade_date: '2026-05-11T15:00:00Z' },
      /* not decisions: must be skipped */
      { id: 'a3', type: 'DIVIDEND', symbol: { symbol: { symbol: 'NVDA' } }, units: 0, price: 0, amount: 12.4, trade_date: '2026-06-01T00:00:00Z' },
      { id: 'a4', type: 'FEE', symbol: null, units: 0, price: 0, amount: -1, trade_date: '2026-06-02T00:00:00Z' },
      /* malformed: no price, and no date. Skipped, not defaulted. */
      { id: 'a5', type: 'BUY', symbol: { symbol: { symbol: 'AMD' } }, units: 10, price: 0, trade_date: '2026-06-03T00:00:00Z' },
      { id: 'a6', type: 'BUY', symbol: { symbol: { symbol: 'AMD' } }, units: 10, price: 90, trade_date: null, settlement_date: null },
    ]), { status: 200 });

  if (pathname === '/api/v1/accounts/acc2/activities')
    return new Response(JSON.stringify({ data: [
      { id: 'b1', type: 'BUY', symbol: { symbol: { symbol: 'VOO' } }, units: 3, price: 480, trade_date: '2026-01-09T14:30:00Z' },
    ] }), { status: 200 });

  return new Response(JSON.stringify({ detail: 'no such route ' + pathname }), { status: 404 });
};

const W = 'https://worker.example';
const call = (p, init = {}) => worker.fetch(new Request(W + p, {
  headers: { origin: 'https://perceptfolio.com', ...(init.headers || {}) }, ...init }), env);

console.log('the broker connection, driven end to end against a signature-checking mock');

/* ---- 1. the gate ---- */
console.log('\n  who is allowed through');
{
  const r = await call('/broker/status?code=' + CODE, { method: 'GET' });
  t('a live code is let in', r.status === 200, 'got ' + r.status);
}
{
  const r = await call('/broker/status?code=ZZZZZ-ZZZZZ', { method: 'GET' });
  t('an unknown code is refused', r.status === 401);
}
{
  store.set('grant:PAUSE-DCODE', JSON.stringify({ code: 'PAUSE-DCODE', paused: true }));
  const r = await call('/broker/sync?code=PAUSE-DCODE', { method: 'POST' });
  t('a paused account cannot reach the broker at all', r.status === 401);
}
{
  /* Everything the worker needs to boot, minus only the two SnapTrade keys: leaving out SYNC_SECRET
     as well would get a 500 from the boot check and prove nothing about the broker gate. */
  const r = await worker.fetch(new Request(W + '/broker/status?code=' + CODE),
    { PF_SYNC: KV, SYNC_SECRET: env.SYNC_SECRET, ALLOWED_ORIGIN: env.ALLOWED_ORIGIN });
  t('with no keys configured it is off, not half working', r.status === 503, 'got ' + r.status);
}

/* ---- 2. linking ---- */
console.log('\n  linking, and the signature the mock checks on every call');
{
  const before = seen.rejected;
  const r = await call('/broker/link?code=' + CODE, { method: 'POST' });
  const j = await r.json();
  t('the portal URL comes back', r.status === 200 && j.url === 'https://app.snaptrade.com/portal/xyz', JSON.stringify(j));
  t('SNAPTRADE ACCEPTED OUR SIGNATURE, which is the whole ballgame', seen.rejected === before,
    seen.rejected > before ? 'the mock rejected ' + (seen.rejected - before) + ' request(s)' : '');
  t('the connection is opened read-only', seen.loginBody && seen.loginBody.connectionType === 'read', JSON.stringify(seen.loginBody));
  t('the user was registered first, once', seen.paths.filter(p => p.includes('registerUser')).length === 1);
  t('the userSecret is kept under the access code', !!JSON.parse(store.get('bro:' + CODE)).userSecret);
  t('and their id for us is a hash, not an email',
    /^pf_[0-9a-f]{32}$/.test(JSON.parse(store.get('bro:' + CODE)).userId), JSON.parse(store.get('bro:' + CODE)).userId);
}
{
  const n = seen.paths.filter(p => p.includes('registerUser')).length;
  await call('/broker/link?code=' + CODE, { method: 'POST' });
  t('linking again reuses the same user rather than making a second', seen.paths.filter(p => p.includes('registerUser')).length === n);
}

/* ---- 3. status ---- */
console.log('\n  what is connected');
{
  const r = await call('/broker/status?code=' + CODE, { method: 'GET' });
  const j = await r.json();
  t('it reports connected, read-only', j.connected === true && j.readOnly === true);
  t('both accounts are listed', (j.accounts || []).length === 2);
  t('the account number is masked to the last four', j.accounts[0].number === '••••6789', j.accounts[0].number);
  t('a short number is not padded into a fake one', j.accounts[1].number === '55', j.accounts[1].number);
  t('the broker name comes through', j.accounts[0].institution === 'Robinhood');
}

/* ---- 4. the sync, which is the thing the owner actually asked for ---- */
console.log('\n  reading the account and handing back rows to merge');
let sync;
{
  const r = await call('/broker/sync?code=' + CODE, { method: 'POST' });
  sync = await r.json();
  t('the sync succeeds', r.status === 200 && sync.ok === true, JSON.stringify(sync).slice(0, 200));
  const syms = (sync.holdings || []).map(h => h.sym).sort();
  t('real positions come back', syms.join(',') === 'ASML,NVDA,VOO', syms.join(','));
  t('an option leg is not turned into a holding', !syms.includes('AAPL'));
  t('a zero-quantity position is skipped', !syms.includes('TSLA'));
  t('a position with no symbol is skipped', (sync.holdings || []).every(h => h.sym));
  t('the cost basis comes through', (sync.holdings.find(h => h.sym === 'NVDA') || {}).cost === 118.25);
  t('so does which broker it is at', (sync.holdings.find(h => h.sym === 'VOO') || {}).broker === 'Webull');

  const tx = (sync.transactions || []);
  t('buys and sells become transactions', tx.length === 3, 'got ' + tx.length + ': ' + tx.map(x => x.sym + ':' + x.action).join(','));
  t('a dividend is not a decision and is skipped', !tx.some(x => x.sym === 'NVDA' && x.action === 'DIVIDEND'));
  t('a fee is skipped', !tx.some(x => x.action === 'FEE'));
  t('a row with no price is skipped, not defaulted to zero', !tx.some(x => x.price === 0));
  t('a row with no date at all is skipped', tx.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date)));
  t('the date is the trade date, cut to the day', (tx.find(x => x.sym === 'NVDA') || {}).date === '2026-03-02');
  t('an activities response wrapped in {data:[...]} is read too', tx.some(x => x.sym === 'VOO'));
  t('the sync is stamped', typeof sync.syncedAt === 'number' && sync.syncedAt > 0);
  t('and it says read-only in the answer as well', sync.readOnly === true);
}
{
  const rec = JSON.parse(store.get('bro:' + CODE));
  t('the last read is remembered', typeof rec.lastSyncAt === 'number');
}
t('every SnapTrade call so far was signed correctly', seen.rejected === 0, seen.rejected + ' rejected');

/* ---- 5. nothing that could place an order was ever called ---- */
console.log('\n  nothing that could move money was ever called');
t('no order or trade path was requested',
  !seen.paths.some(p => /\/(trade|trading|orders?)(\/|$)/i.test(p)), seen.paths.join(' | '));
t('only the endpoints this feature needs were used',
  seen.paths.every(p => /(registerUser|login|deleteUser|\/api\/v1\/accounts)/.test(p)), seen.paths.join(' | '));

/* ---- 6. disconnecting ---- */
console.log('\n  disconnecting');
{
  const r = await call('/broker/unlink?code=' + CODE, { method: 'POST' });
  const j = await r.json();
  t('it reports removed', r.status === 200 && j.removed === true);
  t('the remote user was deleted', seen.deleted === true);
  t('and our copy of the credential is gone', store.get('bro:' + CODE) === undefined);
}
{
  const r = await call('/broker/status?code=' + CODE, { method: 'GET' });
  const j = await r.json();
  t('after disconnecting it reads as not connected', j.connected === false);
}
{
  const r = await call('/broker/sync?code=' + CODE, { method: 'POST' });
  t('and a sync has nothing to sync', r.status === 400);
}

/* ---- 7. the three things the safety review changed ---- */
console.log('\n  what the safety review changed');
{
  /* Relink so there is a record to inspect. */
  await call('/broker/link?code=' + CODE, { method: 'POST' });
  const raw = store.get('bro:' + CODE);
  t('the userSecret is NOT stored in the clear', !raw.includes('us_stub_secret'), raw.slice(0, 90));
  t('it is sealed, and says which scheme sealed it', /"userSecret":"v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+"/.test(raw));
  t('the userId is still readable, because it identifies nobody', raw.includes('"userId":"pf_'));
  /* The proof that the seal is reversible is that the next call works at all: sync cannot sign a
     request without the plaintext secret, and the mock would reject it. */
  const before = seen.rejected;
  const r = await call('/broker/sync?code=' + CODE, { method: 'POST' });
  t('and it can still be opened, since the sync signs with it', r.status === 200 && seen.rejected === before);
}
{
  /* A cancelled subscription must take the brokerage credential with it. Driven through the real
     webhook rather than by calling the helper, because the point is that the wiring fires. */
  const { createHmac: hmac } = await import('crypto');
  const benv = Object.assign({}, env, { STRIPE_SECRET_KEY: 'sk_stub', STRIPE_WEBHOOK_SECRET: 'whsec_stub' });
  store.set('sub:cus_1', JSON.stringify({ customerId: 'cus_1', code: CODE, status: 'active', tier: 'personal' }));
  t('precondition: a broker connection exists', !!store.get('bro:' + CODE));
  const ev = { id: 'evt_cancel_1', type: 'customer.subscription.deleted', data: { object: { customer: 'cus_1', status: 'canceled' } } };
  const rawEv = JSON.stringify(ev), ts = Math.floor(Date.now() / 1000);
  const sig = 't=' + ts + ',v1=' + hmac('sha256', 'whsec_stub').update(ts + '.' + rawEv).digest('hex');
  const r = await worker.fetch(new Request(W + '/stripe/webhook', {
    method: 'POST', body: rawEv,
    headers: { 'content-type': 'application/json', 'stripe-signature': sig, origin: 'https://perceptfolio.com' },
  }), benv);
  t('the webhook is accepted', r.status === 200, String(r.status));
  t('CANCELLING TAKES THE BROKER CREDENTIAL WITH IT', store.get('bro:' + CODE) === undefined);
}
{
  /* A paused account keeps its connection: pausing lapses by itself and they will be back. This is
     the other half of the rule above, and getting it backwards would make people reconnect for a
     failed card. */
  store.set('bro:' + CODE, JSON.stringify({ userId: 'pf_x', userSecret: 'v1:AA:BB' }));
  store.set('sub:cus_2', JSON.stringify({ customerId: 'cus_2', code: CODE, status: 'active' }));
  const { createHmac: hmac } = await import('crypto');
  const benv = Object.assign({}, env, { STRIPE_SECRET_KEY: 'sk_stub', STRIPE_WEBHOOK_SECRET: 'whsec_stub' });
  const ev = { id: 'evt_pastdue_1', type: 'invoice.payment_failed', data: { object: { customer: 'cus_2' } } };
  const rawEv = JSON.stringify(ev), ts = Math.floor(Date.now() / 1000);
  const sig = 't=' + ts + ',v1=' + hmac('sha256', 'whsec_stub').update(ts + '.' + rawEv).digest('hex');
  await worker.fetch(new Request(W + '/stripe/webhook', { method: 'POST', body: rawEv,
    headers: { 'content-type': 'application/json', 'stripe-signature': sig, origin: 'https://perceptfolio.com' } }), benv);
  t('a missed payment does NOT tear the connection down', !!store.get('bro:' + CODE));
}
{
  /* The GET used to be unlimited while calling SnapTrade on every hit. */
  let limited = false;
  for (let i = 0; i < 45 && !limited; i++) {
    const r = await call('/broker/status?code=' + CODE, { method: 'GET' });
    if (r.status === 429) limited = true;
  }
  t('reads are rate limited too, not just writes', limited);
}

console.log('');
console.log('SnapTrade calls made: ' + seen.signed + ' signed and accepted, ' + seen.rejected + ' rejected');
if (failed) { console.log(failed + ' FAILED, ' + passed + ' passed'); process.exit(1); }
console.log('ALL ' + passed + ' CHECKS PASSED');
