/* Contract tests for the billing section of worker.js, run in Node with an in-memory KV and a
   stubbed Stripe. Nothing here touches the network or a real Stripe account; the point is that the
   webhook, provisioning, idempotency, grace and application flows behave before a key exists.

   Run:  node test/billing.mjs */

import fs from 'fs';
const read = f => fs.readFileSync(f, 'utf8');
import path from 'path';
import os from 'os';
import { createHmac } from 'crypto';

/* worker.js is an ES module but the repo has no package.json "type", so Node would read it as
   CommonJS; a temporary .mjs copy sidesteps that without touching the deployable file. */
const tmp = path.join(os.tmpdir(), 'pf-worker-' + process.pid + '.mjs');
fs.writeFileSync(tmp, fs.readFileSync('worker.js', 'utf8'));
const worker = (await import('file://' + tmp)).default;
fs.unlinkSync(tmp);

let failed = 0;
const t = (name, ok, note = '') => { console.log((ok ? '  PASS ' : '  FAIL ') + name + (note ? '   ' + note : '')); if (!ok) failed++; };

/* In-memory KV with the three methods the worker uses. */
const store = new Map();
const KV = { get: async k => store.has(k) ? store.get(k) : null, put: async (k, v) => { store.set(k, String(v)); }, delete: async k => { store.delete(k); } };

const env = {
  PF_SYNC: KV, SYNC_SECRET: 'op-secret', ALLOWED_ORIGIN: 'https://perceptfolio.com',
  STRIPE_SECRET_KEY: 'sk_test_stub', STRIPE_WEBHOOK_SECRET: 'whsec_stub',
  STRIPE_PRICE_PERSONAL_MONTHLY: 'price_pm', STRIPE_PRICE_PERSONAL_YEARLY: 'price_py',
  SITE_URL: 'https://perceptfolio.com', OPERATOR_EMAIL: 'ops@example.com', RESEND_API_KEY: 're_stub', MAIL_FROM: 'PerceptFolio <access@perceptfolio.com>',
};

/* Stub Stripe and Resend. Records every call so the tests can assert on the request shape. */
const calls = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url); const body = opts.body instanceof URLSearchParams ? Object.fromEntries(opts.body) : opts.body;
  calls.push({ url: u, method: opts.method, body, headers: opts.headers });
  if (u.includes('api.stripe.com/v1/checkout/sessions')) return new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }), { status: 200 });
  if (u.includes('api.stripe.com/v1/billing_portal/sessions')) return new Response(JSON.stringify({ url: 'https://billing.stripe.com/p/session/x' }), { status: 200 });
  if (u.includes('api.resend.com')) return new Response('{"id":"m"}', { status: 200 });
  return new Response('not stubbed', { status: 500 });
};

const W = 'https://worker.example';
const req = (p, init = {}) => worker.fetch(new Request(W + p, { headers: { 'content-type': 'application/json', origin: 'https://perceptfolio.com', ...(init.headers || {}) }, ...init }), env);
const post = (p, body, headers) => req(p, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers });
const signed = (event) => { const raw = JSON.stringify(event); const ts = Math.floor(Date.now() / 1000); const v1 = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${ts}.${raw}`).digest('hex'); return { raw, header: `t=${ts},v1=${v1}` }; };
const webhook = (event, header) => { const s = signed(event); return post('/stripe/webhook', s.raw, { 'stripe-signature': header || s.header }); };

console.log('billing: contract tests against a stubbed Stripe');

/* --- checkout --- */
let r = await post('/checkout', { plan: 'personal-yearly' }); let j = await r.json();
t('personal checkout returns a Stripe-hosted URL', r.status === 200 && j.url === 'https://checkout.stripe.com/c/pay/cs_test_1');
const cs = calls.find(c => c.url.includes('checkout/sessions'));
t('checkout is a subscription on the Price ID, tax on, no amount posted', cs && cs.body.mode === 'subscription' && cs.body['line_items[0][price]'] === 'price_py' && cs.body['automatic_tax[enabled]'] === 'true' && !Object.keys(cs.body).some(k => /amount|unit_amount/.test(k)));
t('checkout carries the plan and tier in metadata', cs.body['metadata[plan]'] === 'personal-yearly' && cs.body['metadata[tier]'] === 'personal');
t('checkout authenticates with the secret key from env', /Bearer sk_test_stub/.test(cs.headers.Authorization));
r = await post('/checkout', { plan: 'nope' }); t('unknown plan is refused (400)', r.status === 400);
{ const e2 = { ...env, STRIPE_SECRET_KEY: '' }; const rr = await worker.fetch(new Request(W + '/checkout', { method: 'POST', body: JSON.stringify({ plan: 'personal-monthly' }), headers: { 'content-type': 'application/json' } }), e2); t('with no Stripe key, checkout says billing is not open (503)', rr.status === 503); }
/* --- webhook: signature --- */
const completed = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { customer: 'cus_1', subscription: 'sub_1', customer_details: { email: 'buyer@example.com' }, metadata: { plan: 'personal-yearly', tier: 'personal' } } } };
r = await webhook(completed, 't=1,v1=deadbeef'); t('a bad signature is refused (400)', r.status === 400);
{ const s = signed(completed); const stale = s.header.replace(/t=\d+/, 't=' + (Math.floor(Date.now() / 1000) - 3600)); r = await post('/stripe/webhook', s.raw, { 'stripe-signature': stale }); t('a stale timestamp is refused (replay)', r.status === 400); }

/* --- webhook: provisioning --- */
r = await webhook(completed); j = await r.json();
t('checkout.session.completed provisions a code', r.status === 200 && j.provisioned && j.tier === 'personal' && j.mail === 'sent');
const sub = JSON.parse(store.get('sub:cus_1')); const code = sub.code;
t('the subscription record holds the customer, plan and code', sub.customerId === 'cus_1' && sub.plan === 'personal-yearly' && /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code));
t('code -> customer mapping exists for the portal', store.get('cust:' + code) === 'cus_1');
const mail = calls.filter(c => c.url.includes('resend')).pop(); const mailBody = JSON.parse(mail.body);
t('the code is emailed to the buyer', mailBody.to[0] === 'buyer@example.com' && mailBody.text.includes(code) && /\/enter\//.test(mailBody.text));
const before = store.size;
r = await webhook(completed); j = await r.json(); t('the same event replayed is ignored', j.duplicate === true && store.size === before);
r = await webhook({ ...completed, id: 'evt_1b' }); j = await r.json(); t('a second completion for the same customer does not mint a second code', j.duplicate === 'customer');

/* --- the code works at /invite and /status the same way an operator-issued one does --- */
r = await req('/invite?code=' + code, { method: 'POST' }); j = await r.json(); t('the purchased code redeems into a durable grant', r.status === 200 && j.valid && j.tier === 'personal');
r = await req('/status?code=' + code); j = await r.json(); t('/status: known, active, personal', j.known && j.active && j.tier === 'personal');

/* --- lapse: past_due gives a grace window, canceled turns it off --- */
r = await webhook({ id: 'evt_2', type: 'customer.subscription.updated', data: { object: { customer: 'cus_1', status: 'past_due', current_period_end: Math.floor(Date.now() / 1000) + 86400 * 20 } } });
r = await req('/status?code=' + code); j = await r.json();
t('past_due: still active inside the grace window, and says so', j.active === true && j.sub && j.sub.status === 'past_due' && j.sub.graceUntil > Date.now());
{ const g = JSON.parse(store.get('grant:' + code)); g.graceUntil = Date.now() - 1000; store.set('grant:' + code, JSON.stringify(g)); }
r = await req('/status?code=' + code); j = await r.json(); t('past the grace window the grant reads lapsed', j.active === false && j.reason === 'lapsed');
r = await webhook({ id: 'evt_3', type: 'customer.subscription.updated', data: { object: { customer: 'cus_1', status: 'active', current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30 } } });
r = await req('/status?code=' + code); j = await r.json(); t('a payment that lands restores access', j.active === true && j.reason === 'active');
r = await webhook({ id: 'evt_4', type: 'customer.subscription.deleted', data: { object: { customer: 'cus_1' } } });
r = await req('/status?code=' + code); j = await r.json(); t('cancellation pauses the grant', j.active === false && j.reason === 'paused');

/* --- portal --- */
r = await post('/portal', { code: code }); j = await r.json(); t('portal returns a Stripe-hosted billing URL for a known code', r.status === 200 && /billing\.stripe\.com/.test(j.url));
r = await post('/portal', { code: 'ZZZZZ-ZZZZZ' }); t('portal refuses an unknown code (404)', r.status === 404);

/* --- a live personal code, for the gated routes below --- */
r = await post('/request', { email: 'reader@example.com', who: 'One person, one book, twenty names.' }); j = await r.json();
const liveReqId = j.id;
r = await post('/decide', { id: liveReqId, decision: 'personal' }, { Authorization: 'Bearer op-secret' }); j = await r.json();
const liveCode = j.code;
t('a granted request mints exactly one code', r.status === 200 && /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(liveCode) && j.seatCodes === undefined);
r = await req('/invite?code=' + liveCode, { method: 'POST' }); j = await r.json();
t('the granted code redeems into a durable grant', r.status === 200 && j.valid && j.tier === 'personal');

/* --- one new sign-in a day a code (owner's rule, 2026-09-27) --- */
r = await post('/door', { code: liveCode }); j = await r.json();
t('door: the first sign-in goes through and is stamped', r.status === 200 && j.ok === true);
r = await post('/door', { code: liveCode }); j = await r.json();
t('door: the next one the same day waits, and says how long', r.status === 429 && j.ok === false && j.retryAfterHours >= 23 && j.retryAfterHours <= 24 && /One new sign-in a day/.test(j.error));
t('door: a device already signed in is never mentioned as blocked', /keeps working/.test(j.error));
r = await post('/door', { code: 'ZZZZZ-ZZZZZ' }); j = await r.json();
t('door: an unknown code is not held by another code\'s stamp', r.status === 200 && j.ok === true);
r = await post('/door', { code: 'nope' }); t('door: a malformed code is refused (400)', r.status === 400);
r = await post('/door/clear', { code: liveCode }); t('door: clearing the hold needs the operator secret (401)', r.status === 401);
r = await post('/door/clear', { code: liveCode }, { Authorization: 'Bearer op-secret' }); j = await r.json();
t('door: the operator lifts the hold', r.status === 200 && j.cleared === true && !store.has('door:' + liveCode));
r = await post('/door', { code: liveCode }); j = await r.json();
t('door: after the hold is lifted the next sign-in goes through', r.status === 200 && j.ok === true);
{ const d = JSON.parse(store.get('door:' + liveCode)); d.at = Date.now() - 25 * 3600000; store.set('door:' + liveCode, JSON.stringify(d)); }
r = await post('/door', { code: liveCode }); j = await r.json();
t('door: a day later it goes through on its own', r.status === 200 && j.ok === true);

/* --- webhook with no billing configured --- */
{ const e2 = { ...env, STRIPE_WEBHOOK_SECRET: '' }; const s = signed(completed); const rr = await worker.fetch(new Request(W + '/stripe/webhook', { method: 'POST', body: s.raw, headers: { 'stripe-signature': s.header } }), e2); t('webhook with no secret configured is refused, never trusted', rr.status === 503); }


/* --- audit finding 3: no Access-Control-Allow-Origin at all when the origin is not allowed --- */
{
  const rr = await worker.fetch(new Request(W + '/status?code=AAAAA-AAAAA', { headers: { origin: 'https://evil.example' } }), env);
  const acao = rr.headers.get('access-control-allow-origin');
  t('the allow-origin header is the configured site, never the requester, never null or *', acao === 'https://perceptfolio.com');
  const e2 = { ...env, ALLOWED_ORIGIN: '' }; const r2 = await worker.fetch(new Request(W + '/status?code=AAAAA-AAAAA', { headers: { origin: 'https://evil.example' } }), e2);
  t('with no configured origin the header is absent rather than the string null', r2.headers.get('access-control-allow-origin') === null);
}

/* M6's /kronos route and the Kronos service were removed on 2026-10-06 with the terminal's Model
   view, on the owner's instruction. The checks that lived here proved it was gated by a live code,
   cached per symbol and day, and honest about being unconfigured; there is nothing left to gate. */

/* --- history on day one, and the council --- */
{
  const prev = globalThis.fetch; const hits = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url); hits.push(u);
    if (u.includes('query1.finance.yahoo.com/v8')) { const n = 500; const t0 = Math.floor(Date.now() / 1000) - n * 86400; const ts = [...Array(n)].map((_, i) => t0 + i * 86400); const px = ts.map((_, i) => 400 + i * 0.1); return new Response(JSON.stringify({ chart: { result: [{ timestamp: ts, indicators: { quote: [{ open: px, high: px, low: px, close: px, volume: px }] } }] } }), { status: 200 }); }
    if (u.includes('finnhub.io/api/v1/stock/profile2')) return new Response(JSON.stringify({ name: 'NVIDIA Corp', finnhubIndustry: 'Semiconductors', marketCapitalization: 4500000, ipo: '1999-01-22', weburl: 'https://nvidia.com' }), { status: 200 });
    if (u.includes('finnhub.io/api/v1/stock/metric')) return new Response(JSON.stringify({ metric: { peTTM: 52.1, grossMarginTTM: 74.6, roeTTM: 91.9, beta: 1.7 } }), { status: 200 });
    if (u.includes('finnhub.io/api/v1/stock/recommendation')) return new Response(JSON.stringify([...Array(14)].map((_, i) => ({ period: '2026-' + String(9 - (i % 9)).padStart(2, '0') + '-01', strongBuy: 20 - i, buy: 30, hold: 6 + i, sell: 1, strongSell: 0 }))), { status: 200 });
    /* The council reads the price target from Finnhub now, nothing from Yahoo; the operator's key
       answers only a call that carries the sync secret. */
    if (u.includes('finnhub.io/api/v1/stock/price-target')) return new Response(JSON.stringify({ targetMean: 210, targetHigh: 250, targetLow: 150 }), { status: 200 });
    if (u.includes('api.anthropic.com')) return new Response(JSON.stringify({ content: [{ text: JSON.stringify({ lenses: [{ id: 'value', name: 'Value (after Buffett)', stance: 'cautious', reading: 'A wonderful business at a price that leaves no margin of safety at 52 times earnings.', whatWouldChangeMyMind: 'A multiple below 25.' }] }) }] }), { status: 200 });
    return prev(url, opts);
  };
  let rr = await req('/history?symbol=SPY'); let hj = await rr.json();
  t('history: two years of daily closes for any symbol, no key needed', rr.status === 200 && hj.closes.length === 500 && hj.dates.length === 500 && /^yahoo/.test(hj.source));
  const n1 = hits.filter(u => u.includes('yahoo')).length; rr = await req('/history?symbol=SPY'); await rr.json();
  t('history: cached for the day', hits.filter(u => u.includes('yahoo')).length === n1);
  rr = await req('/history?symbol=$$'); t('history: a bad symbol is refused', rr.status === 400);
  const e3 = { ...env, FINNHUB_API_KEY: 'fh', AI_API_KEY: 'ai' };
  const live = { code: liveCode };
  rr = await worker.fetch(new Request(W + '/council', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'ZZZZZ-ZZZZZ', symbol: 'NVDA' }) }), e3);
  t('council: refused without a live code', rr.status === 401);
  rr = await worker.fetch(new Request(W + '/council', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer op-secret' }, body: JSON.stringify({ code: live.code, symbol: 'NVDA' }) }), e3); const cj = await rr.json();
  t('council: profile, ratios, analyst counts and target from the free feeds', rr.status === 200 && cj.facts.name === 'NVIDIA Corp' && cj.facts.pe === 52.1 && cj.facts.analysts.buy === 30 && cj.facts.targetMean === 210);
  t('council: the analyst counts carry a twelve-month history, newest first', Array.isArray(cj.facts.analystsHistory) && cj.facts.analystsHistory.length === 12 && cj.facts.analystsHistory[0].strongBuy === 20 && cj.facts.analystsHistory[11].hold === 17 && cj.facts.analysts.buy === 30);
  t('council: six-lens readings arrive as structured JSON with a stance and a what-would-change line', Array.isArray(cj.lenses) && cj.lenses[0].stance === 'cautious' && /margin of safety/.test(cj.lenses[0].reading) && !!cj.lenses[0].whatWouldChangeMyMind);
  /* the Map's pre-fill from the model */
  {
    const inner = globalThis.fetch; const asked = [];
    globalThis.fetch = async (url, opts = {}) => {
      const u = String(url); asked.push(u);
      if (u.includes('api.anthropic.com')) return new Response(JSON.stringify({ content: [{ text: 'Here you go: ' + JSON.stringify({ suppliers: [{ name: 'Taiwan Semiconductor', ticker: 'TSM', weight: 40, note: 'makes the GPUs' }, { name: 'SK hynix', ticker: '', weight: 15, note: 'HBM memory' }, { name: 'NVIDIA itself', ticker: 'NVDA', weight: 5, note: 'self' }, { name: '', ticker: 'X', weight: 1, note: '' }], customers: [{ name: 'Microsoft', ticker: 'MSFT', weight: 150, note: 'Azure' }] }) }] }), { status: 200 });
      return inner(url, opts);
    };
    rr = await worker.fetch(new Request(W + '/map/prefill', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'ZZZZZ-ZZZZZ', symbol: 'NVDA' }) }), e3);
    t('map prefill: refused without a live code', rr.status === 401);
    /* The caller posts the name and industry from its own profile lookup; the worker no longer spends its key on them. */
    rr = await worker.fetch(new Request(W + '/map/prefill', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: live.code, symbol: 'NVDA', name: 'NVIDIA Corp', industry: 'Semiconductors' }) }), e3); const mj = await rr.json();
    t('map prefill: suppliers and customers from the model, tidied: no self-links, no nameless rows, weights clamped, tickers only when plausible', rr.status === 200 && mj.suppliers.length === 2 && mj.suppliers[0].ticker === 'TSM' && mj.suppliers[1].ticker === '' && !mj.suppliers.some(x => x.ticker === 'NVDA') && mj.customers[0].weight === 100 && mj.name === 'NVIDIA Corp');
    t('map prefill: labelled as the model’s knowledge, not filings, and editable', /general knowledge/.test(mj.disclaimer) && /not from filings/.test(mj.disclaimer) && /Edit anything/.test(mj.disclaimer) && /Never invent a company, a ticker or a number/.test(read('worker.js')));
    const n = asked.filter(u => u.includes('anthropic')).length; rr = await worker.fetch(new Request(W + '/map/prefill', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: live.code, symbol: 'NVDA' }) }), e3); const mj2 = await rr.json();
    t('map prefill: a real answer is cached thirty days, an empty one a day', asked.filter(u => u.includes('anthropic')).length === n && mj2.cached === true && /\(suppliers\.length \|\| customers\.length\) \? 30 \* 86400 : 86400/.test(read('worker.js')));
    /* no Anthropic credit: Workers AI answers instead */
    {
      const calls = []; const e4 = { ...e3, AI_API_KEY: 'ai', AI: { run: async (model, opts) => { calls.push(model); return { response: { suppliers: [{ name: 'Foxconn', ticker: 'HNHPF', weight: 30, note: 'assembly' }], customers: [] } }; } } };   /* Workers AI hands JSON back parsed */
      const noCredit = globalThis.fetch;
      globalThis.fetch = async (url, opts = {}) => { if (String(url).includes('api.anthropic.com')) return new Response(JSON.stringify({ error: { message: 'Your credit balance is too low' } }), { status: 400 }); return noCredit(url, opts); };
      rr = await worker.fetch(new Request(W + '/map/prefill', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: live.code, symbol: 'AAPL' }) }), e4); const fj = await rr.json();
      t('map prefill: when Anthropic refuses (no credit), Cloudflare Workers AI answers and the result says which model it was', rr.status === 200 && fj.suppliers.length === 1 && fj.suppliers[0].name === 'Foxconn' && fj.model === 'workers-ai' && calls[0] === '@cf/meta/llama-3.3-70b-instruct-fp8-fast' && fj.note === null);
      const e5 = { ...e3 }; delete e5.AI_API_KEY; e5.AI = e4.AI;
      rr = await worker.fetch(new Request(W + '/map/prefill', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: live.code, symbol: 'MSFT' }) }), e5); const gj = await rr.json();
      t('map prefill: with no Anthropic key at all, Workers AI is the model', rr.status === 200 && gj.model === 'workers-ai');
      store.delete('council:MSFT:' + new Date().toISOString().slice(0, 10));
      rr = await worker.fetch(new Request(W + '/council', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer op-secret' }, body: JSON.stringify({ code: live.code, symbol: 'MSFT' }) }), { ...e5, AI: { run: async () => ({ response: JSON.stringify({ lenses: [{ id: 'value', name: 'Value (after Buffett)', stance: 'favourable', reading: 'r', whatWouldChangeMyMind: 'w' }] }) }) } }); const hj = await rr.json();
      t('council: the six lenses come through Workers AI too', rr.status === 200 && Array.isArray(hj.lenses) && hj.lenses[0].stance === 'favourable' && hj.model === 'workers-ai');
      globalThis.fetch = noCredit;
    }
    globalThis.fetch = inner;
  }
  t('council: labelled as AI applications of published frameworks, never the people’s views, never a recommendation', /published framework/.test(cj.disclaimer) && /not those people/.test(cj.disclaimer) && /never say buy, sell, hold, or recommend/i.test(read('worker.js')));
  globalThis.fetch = prev;
}
/* --- the world: a company's plants from OpenStreetMap, through Nominatim --- */
{
  const prev = globalThis.fetch; const hits = []; let mode = 'ok';
  const osm = [
    { osm_type: 'way', osm_id: 1, lat: '24.7736', lon: '121.0121', category: 'landuse', type: 'industrial', name: 'TSMC Fab 12', display_name: 'TSMC Fab 12, Hsinchu, Taiwan', address: { country_code: 'tw' }, extratags: { operator: 'TSMC', product: 'semiconductor', website: 'https://www.tsmc.com', wikidata: 'Q713418' } },
    { osm_type: 'way', osm_id: 2, lat: '24.7740', lon: '121.0125', category: 'man_made', type: 'works', name: 'TSMC Fab 12', display_name: 'TSMC Fab 12', address: { country_code: 'tw' }, extratags: {} },
    { osm_type: 'node', osm_id: 3, lat: '33.3', lon: '-111.9', category: 'building', type: 'factory', name: 'TSMC Arizona', display_name: 'TSMC Arizona, Phoenix', address: { country_code: 'us' }, extratags: {} },
    { osm_type: 'node', osm_id: 4, lat: '25.0', lon: '121.5', category: 'office', type: 'company', name: 'TSMC headquarters', display_name: 'TSMC HQ', address: { country_code: 'tw' }, extratags: {} },
    { osm_type: 'node', osm_id: 5, lat: '25.1', lon: '121.6', category: 'highway', type: 'bus_stop', name: 'TSMC', display_name: 'TSMC bus stop', address: { country_code: 'tw' }, extratags: {} },
    { osm_type: 'relation', osm_id: 6, lat: 'x', lon: '1', category: 'man_made', type: 'works', name: 'no coordinates', display_name: 'no coordinates', extratags: {} },
  ];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url); hits.push({ u, headers: opts.headers || {} });
    if (u.includes('nominatim.openstreetmap.org/search')) {
      if (mode === 'busy') return new Response('Bandwidth limit exceeded', { status: 509 });
      if (mode === 'down') throw new Error('connect timeout');
      return new Response(JSON.stringify(osm), { status: 200 });
    }
    return prev(url, opts);
  };
  const live = [...store.keys()].filter(k => k.startsWith('code:')).map(k => JSON.parse(store.get(k))).find(g => g && g.code && !g.paused);
  const ask = (body) => worker.fetch(new Request(W + '/world', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env);
  let rr = await ask({ code: 'ZZZZZ-ZZZZZ', q: 'TSMC' }); t('world: refused without a live code (the geocoder is a shared resource)', rr.status === 401);
  rr = await ask({ code: live.code, q: 'a' }); t('world: a one-letter phrase is refused', rr.status === 400);
  rr = await ask({ code: live.code, q: 'TSMC"]; out;' }); t('world: query characters are refused, so the phrase is only ever a plain search term', rr.status === 400);
  rr = await ask({ code: live.code, q: '  tsmc   fab ' }); let wj = await rr.json();
  t('world: a company search answers from OpenStreetMap with compact features', rr.status === 200 && wj.count === 2 && wj.features[0].n === 'TSMC Fab 12' && wj.features[0].c === 'TW' && wj.features[0].w === 'https://www.tsmc.com' && wj.features[0].q === 'Q713418' && Math.abs(wj.features[0].la - 24.774) < 0.001);
  t('world: the same plant drawn twice (site and works polygon) is one feature; the better-tagged copy wins', wj.features.filter(f => f.n === 'TSMC Fab 12').length === 1 && wj.features.find(f => f.n === 'TSMC Fab 12').p === 'semiconductor');
  t('world: offices, bus stops and objects without coordinates are dropped; a factory building is kept', !wj.features.some(f => /headquarters|bus/.test(f.n)) && !wj.features.some(f => f.n === 'no coordinates') && wj.features.some(f => f.n === 'TSMC Arizona' && f.c === 'US'));
  const sent = hits.filter(h => h.u.includes('nominatim')).pop();
  t('world: the phrase is sent as a plain query, identified, English, capped, de-duplicated, with tags and address', /q=tsmc%20fab/.test(sent.u) && /limit=50/.test(sent.u) && /extratags=1/.test(sent.u) && /addressdetails=1/.test(sent.u) && /dedupe=1/.test(sent.u) && /PerceptFolio-world/.test(sent.headers['User-Agent']) && sent.headers['Accept-Language'] === 'en');
  t('world: labelled as OpenStreetMap via Nominatim, community-mapped and incomplete', /OpenStreetMap contributors/.test(wj.source) && /Nominatim/.test(wj.source) && /incomplete/.test(wj.source) && wj.cached === false);
  const n1 = hits.filter(h => h.u.includes('nominatim')).length; rr = await ask({ code: live.code, q: 'TSMC fab' }); wj = await rr.json();
  t('world: cached for a week, case-insensitively', hits.filter(h => h.u.includes('nominatim')).length === n1 && wj.cached === true);
  t('world: never more than one geocoder call a second across everyone (a timestamp in KV)', store.has('nominatim:last') && /nominatim:last/.test(read('worker.js')));
  mode = 'busy'; rr = await ask({ code: live.code, q: 'Foxconn' }); wj = await rr.json();
  t('world: a rate-limited geocoder is a plain 503 that says so', rr.status === 503 && /rate-limiting/.test(wj.error));
  mode = 'down'; rr = await ask({ code: live.code, q: 'Foxconn' }); wj = await rr.json();
  t('world: an unreachable geocoder is a 503, not a crash', rr.status === 503 && /did not answer/.test(wj.error));
  mode = 'ok'; rr = await ask({ code: live.code, q: 'Foxconn' }); wj = await rr.json();
  t('world: a failure is never cached; the next try asks again', rr.status === 200 && wj.cached === false);
  /* the holdings, one request */
  const askB = (body) => worker.fetch(new Request(W + '/world/batch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env);
  rr = await askB({ code: 'ZZZZZ-ZZZZZ', qs: ['TSMC'] }); t('batch: refused without a live code', rr.status === 401);
  rr = await askB({ code: live.code, qs: ['x', 'bad"]'] }); t('batch: nothing valid to ask is a 400', rr.status === 400);
  const before = hits.filter(h => h.u.includes('nominatim')).length;
  rr = await askB({ code: live.code, qs: ['TSMC fab', 'Foxconn', 'Foxconn', 'Micron'] }); let bj = await rr.json();
  t('batch: one request answers several names, de-duplicated, from the cache when it can', rr.status === 200 && Object.keys(bj.results).length === 3 && bj.results['TSMC fab'].cached === true && bj.results['Foxconn'].cached === true && bj.results['Micron'].cached === false && hits.filter(h => h.u.includes('nominatim')).length === before + 1);
  t('batch: the same compact features and the same source line', bj.results['TSMC fab'].features[0].n === 'TSMC Fab 12' && /Nominatim/.test(bj.source));
  rr = await askB({ code: live.code, qs: [...Array(25)].map((_, i) => 'Company ' + i) }); bj = await rr.json();
  t('batch: capped at twenty names', rr.status === 200 && Object.keys(bj.results).length === 20);
  globalThis.fetch = prev;
}
/* --- A2.1: the built-in data route and the DATA_TIERS switch --- */
{
  const prev = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => { const u = String(url); if (u.includes('finnhub.io/api/v1/quote')) return new Response(JSON.stringify({ c: 101.5, pc: 100 }), { status: 200 }); return prev(url, opts); };
  store.set('grant:DATAA-PERS1', JSON.stringify({ code: 'DATAA-PERS1', tier: 'personal', paused: false }));
  store.set('grant:DATAA-EMPL1', JSON.stringify({ code: 'DATAA-EMPL1', tier: 'employee', paused: false }));
  const eD = { ...env, FINNHUB_API_KEY: 'fh' };
  const ask = (code, e) => worker.fetch(new Request(W + '/data?code=' + code + '&path=/quote&symbol=AAPL'), e || eD);
  let rr = await ask('ZZZZZ-ZZZZZ'); t('data: refused without a live code (401)', rr.status === 401);
  rr = await ask('DATAA-PERS1'); let dj = await rr.json();
  t('data: with DATA_TIERS unset every live code rides the worker key (the owner\'s standing instruction)', rr.status === 200 && dj.c === 101.5);
  const eS = { ...eD, DATA_TIERS: 'employee, operator' };
  rr = await ask('DATAA-PERS1', eS); dj = await rr.json();
  t('data: with DATA_TIERS set, a plan outside it gets 402 and is told to connect its own key, not "bad key"', rr.status === 402 && dj.notIncluded === true && /own free Finnhub key/.test(dj.error));
  rr = await ask('DATAA-EMPL1', eS); dj = await rr.json();
  t('data: a plan inside DATA_TIERS is still served', rr.status === 200 && dj.c === 101.5);
  rr = await worker.fetch(new Request(W + '/status?code=DATAA-PERS1'), eS); dj = await rr.json();
  t('status: reports dataIncluded so the Settings card can say which it is before the first request', dj.known === true && dj.dataIncluded === false);
  rr = await worker.fetch(new Request(W + '/status?code=DATAA-PERS1'), eD); dj = await rr.json();
  t('status: dataIncluded is true when the switch is unset', dj.dataIncluded === true);
  globalThis.fetch = prev;
}
/* --- A2.3: the record's server copy --- */
{
  store.set('grant:RECRD-PERS1', JSON.stringify({ code: 'RECRD-PERS1', tier: 'personal', paused: false }));
  const put = (code, body) => worker.fetch(new Request(W + '/record?code=' + code, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), env);
  let rr = await put('ZZZZZ-ZZZZZ', { calls: [] }); t('record: refused without a live code (401)', rr.status === 401);
  const good = 'a'.repeat(64);
  rr = await put('RECRD-PERS1', { calls: [
    { id: '1:AAPL:checklist', sym: 'aapl', ts: 1700000000000, date: '2026-09-01', verdict: 'buy', price: 200, spy: 650, thesis: 'SECRET THESIS', notes: 'private', marks: { 30: { price: 210, spy: 655, at: 1, hash: good, seq: 0 }, 90: { price: 'x', hash: 'nothex', seq: 1 }, abc: { price: 1 } } },
    { id: '', sym: 'MSFT', ts: 1 } ],
    reviews: [{ sym: 'AAPL', at: 2, marks: [{ n: 1, mark: 'supported' }, { n: 2, mark: 'nonsense' }], hash: good, seq: 1 }],
    chain: { head: good, n: 2 }, holdings: [{ sym: 'AAPL', shares: 100 }] });
  let rj = await rr.json();
  t('record: stored, with the empty-id call dropped', rr.status === 200 && rj.calls === 1 && rj.reviews === 1);
  const rec = JSON.parse(store.get('rec:c:RECRD-PERS1'));
  t('record: thesis text, notes and holdings never reach the store', !('thesis' in rec.calls[0]) && !('notes' in rec.calls[0]) && !('holdings' in rec));
  t('record: the ticker is upper-cased, a bad hash is dropped, a non-numeric horizon is dropped, a bad review mark is dropped', rec.calls[0].sym === 'AAPL' && rec.calls[0].marks[30].hash === good && rec.calls[0].marks[90].hash === null && !rec.calls[0].marks.abc && rec.reviews[0].marks.length === 1);
  rr = await worker.fetch(new Request(W + '/record?code=RECRD-PERS1'), env); rj = await rr.json();
  t('record: read back by the same identity, with the chain state', rr.status === 200 && rj.chain.head === good && rj.chain.n === 2 && rj.calls.length === 1);
  rr = await worker.fetch(new Request(W + '/record?code=RECRD-PERS1', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(1024 * 1024 + 1) }), env);
  t('record: over a megabyte is refused (413)', rr.status === 413);
}
/* --- A4.3: notices --- */
{
  store.set('grant:NOTIF-PERS1', JSON.stringify({ code: 'NOTIF-PERS1', tier: 'personal', paused: false, email: 'p@example.com' }));
  const sent = []; const prev = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => { if (String(url).includes('api.resend.com')) { sent.push(JSON.parse(opts.body)); return new Response('{"id":"m"}', { status: 200 }); } return prev(url, opts); };
  let rr = await worker.fetch(new Request(W + '/notify?code=NOTIF-PERS1'), env); let nj = await rr.json();
  t('notify: off by default', rr.status === 200 && nj.marks === false && nj.reviews === false);
  rr = await worker.fetch(new Request(W + '/notify?code=NOTIF-PERS1', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ marks: true, reviews: true }) }), env); nj = await rr.json();
  t('notify: saved, and says whether an address exists for the code', nj.ok && nj.marks && nj.reviews && nj.address === true);
  const KVl = { ...env.PF_SYNC, list: async ({ prefix }) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) }) };
  const eL = { ...env, PF_SYNC: KVl };
  store.set('rec:c:NOTIF-PERS1', JSON.stringify({ calls: [], reviews: [], chain: null, due: [{ sym: 'AAPL', date: '2020-01-01' }, { sym: 'MSFT', date: '2999-01-01' }] }));
  /* runReviewNotices is module-private; drive it through scheduled(), which calls it after the marker. */
  await worker.scheduled({}, { ...eL, PRICE_FEED: '', PRICE_FEED_KEY: '' }, { waitUntil: p => p });
  await new Promise(r => setTimeout(r, 50));
  const due = sent.find(m => /review/.test(m.subject));
  t('reviews due: one notice for the overdue ticker, none for the future one, to the grant\'s address', !!due && due.to[0] === 'p@example.com' && /AAPL/.test(due.text) && !/MSFT/.test(due.text));
  const n1 = sent.length; await worker.scheduled({}, { ...eL }, { waitUntil: p => p }); await new Promise(r => setTimeout(r, 50));
  t('reviews due: not sent twice the same day', sent.length === n1);
  globalThis.fetch = prev;
}
/* --- A4.6, A4.7: share a call, read-only token --- */
{
  const eS = { ...env, SITE_URL: 'https://perceptfolio.com' };
  const good = 'b'.repeat(64);
  store.set('grant:SHARE-PERS1', JSON.stringify({ code: 'SHARE-PERS1', tier: 'personal', paused: false }));
  store.set('rec:c:SHARE-PERS1', JSON.stringify({ calls: [{ id: '5:NVDA:checklist', sym: 'NVDA', verdict: 'buy', label: 'BUY', date: '2026-06-01', ts: 5, price: 100, spy: 500, by: { seat: 2, name: 'Dana', sig: 'x', key: 'y' }, marks: { 30: { price: 110, spy: 505, at: 6, hash: good, seq: 3 } } }], reviews: [], chain: { head: good, n: 4 } }));
  store.set('chain:c:SHARE-PERS1', JSON.stringify([{ day: '2026-07-01', at: 1, head: good, n: 4 }]));
  let rr = await worker.fetch(new Request(W + '/share?code=SHARE-PERS1', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ callId: 'nope' }) }), eS);
  t('share: a call not in the server copy is refused (404)', rr.status === 404);
  rr = await worker.fetch(new Request(W + '/share?code=SHARE-PERS1', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ callId: '5:NVDA:checklist' }) }), eS); let sj = await rr.json();
  t('share: makes a public page id and a site URL', rr.status === 200 && /^[a-z0-9]{12}$/.test(sj.id) && sj.url === 'https://perceptfolio.com/call/?id=' + sj.id);
  rr = await worker.fetch(new Request(W + '/share/' + sj.id), eS); let pj = await rr.json();
  t('share: the public document carries the call, its marks with hashes, the chain state and the server heads, and never the identity', rr.status === 200 && pj.call.sym === 'NVDA' && pj.call.marks[30].hash === good && pj.chain.n === 4 && pj.serverHeads.length === 1 && !('ident' in pj) && pj.by.name === 'Dana' && !('sig' in pj.by));
  rr = await worker.fetch(new Request(W + '/share/' + sj.id + '?code=OTHER-CODE1', { method: 'DELETE' }), eS);
  t('share: another identity cannot withdraw it', rr.status === 401 || rr.status === 404);
  rr = await worker.fetch(new Request(W + '/share/' + sj.id + '?code=SHARE-PERS1', { method: 'DELETE' }), eS);
  t('share: the author withdraws it, and the page is gone', rr.status === 200 && (await worker.fetch(new Request(W + '/share/' + sj.id), eS)).status === 404);
  rr = await worker.fetch(new Request(W + '/token?code=SHARE-PERS1', { method: 'POST' }), eS); let tj = await rr.json();
  t('token: 48 hex characters, with JSON and CSV URLs', rr.status === 200 && /^[0-9a-f]{48}$/.test(tj.token) && /\/me\?token=/.test(tj.url) && /format=csv$/.test(tj.csv));
  rr = await worker.fetch(new Request(W + '/me?token=' + tj.token), eS); let mj = await rr.json();
  t('me: the token reads the record, read-only', rr.status === 200 && mj.readOnly === true && mj.calls.length === 1 && mj.calls[0].sym === 'NVDA');
  rr = await worker.fetch(new Request(W + '/me?token=' + tj.token + '&format=csv'), eS); const csv = await rr.text();
  t('me: CSV with one row per call and the marks as columns', rr.status === 200 && /^id,date,ticker/.test(csv) && /5:NVDA:checklist,2026-06-01,NVDA/.test(csv) && /mark30_hash/.test(csv) && csv.includes(good));
  rr = await worker.fetch(new Request(W + '/me?token=' + 'f'.repeat(48)), eS); t('me: an unknown token is refused (401)', rr.status === 401);
  rr = await worker.fetch(new Request(W + '/token?code=SHARE-PERS1', { method: 'DELETE' }), eS); const dj = await rr.json();
  t('token: revoked, and the URL stops working', dj.revoked === 1 && (await worker.fetch(new Request(W + '/me?token=' + tj.token), eS)).status === 401);
  const g = JSON.parse(store.get('grant:SHARE-PERS1')); g.paused = true; store.set('grant:SHARE-PERS1', JSON.stringify(g));
  rr = await worker.fetch(new Request(W + '/token?code=SHARE-PERS1', { method: 'POST' }), eS);
  t('token: a paused code cannot mint one', rr.status === 401);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL BILLING CHECKS PASSED');
process.exit(failed ? 1 : 0);
