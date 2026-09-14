/* Contract tests for the billing section of worker.js, run in Node with an in-memory KV and a
   stubbed Stripe. Nothing here touches the network or a real Stripe account; the point is that the
   webhook, provisioning, idempotency, grace and application flows behave before a key exists.

   Run:  node test/billing.mjs */

import fs from 'fs';
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
  STRIPE_PRICE_BUSINESS_MONTHLY: 'price_bm', STRIPE_PRICE_BUSINESS_YEARLY: 'price_by',
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
r = await post('/checkout', { plan: 'business-yearly', seats: 5 }); t('business checkout without an accepted application is refused (403)', r.status === 403);
{ const e2 = { ...env, STRIPE_SECRET_KEY: '' }; const rr = await worker.fetch(new Request(W + '/checkout', { method: 'POST', body: JSON.stringify({ plan: 'personal-monthly' }), headers: { 'content-type': 'application/json' } }), e2); t('with no Stripe key, checkout says billing is not open (503)', rr.status === 503); }

/* --- business application → acceptance → checkout with seats --- */
r = await post('/apply', { firm: 'Harbor Row Capital', size: 4, email: 'ops@harborrow.example', contact: 'Dana Whitfield', runs: 'A concentrated long book.' }); j = await r.json();
t('a business application is stored and acknowledged', r.status === 200 && /^app_/.test(j.id));
const appId = j.id;
r = await post('/apply', { firm: 'X', size: 2, email: 'a@b.co', contact: 'C', runs: 'r' }); t('fewer than three seats is refused', r.status === 400);
r = await post('/apply', { firm: 'X', size: 4, email: 'a@b.co', contact: 'C', runs: 'r', website: 'http://spam' }); j = await r.json(); t('honeypot submissions are swallowed silently', r.status === 200 && j.ok && !j.id);
r = await post('/apply/decide', { id: appId, decision: 'accept', seats: 4 }); t('deciding without the operator secret is refused (401)', r.status === 401);
r = await post('/apply/decide', { id: appId, decision: 'accept', seats: 4 }, { Authorization: 'Bearer op-secret' }); j = await r.json();
t('acceptance issues a single-use checkout link', r.status === 200 && j.status === 'accepted' && /\/pricing\/\?business=[A-Z0-9-]+&seats=4/.test(j.link));
const token = new URL(j.link).searchParams.get('business');
r = await post('/checkout', { plan: 'business-yearly', application: token, seats: 2 }); t('business checkout below three seats is refused', r.status === 400);
r = await post('/checkout', { plan: 'business-yearly', application: token, seats: 4 }); j = await r.json();
const bcs = calls.filter(c => c.url.includes('checkout/sessions')).pop();
t('business checkout carries the seat quantity and the firm', r.status === 200 && bcs.body['line_items[0][quantity]'] === '4' && bcs.body['metadata[seats]'] === '4' && bcs.body['metadata[firm]'] === 'Harbor Row Capital' && bcs.body['metadata[application]'] === appId);

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

/* --- business provisioning creates an org and marks the application paid --- */
r = await webhook({ id: 'evt_5', type: 'checkout.session.completed', data: { object: { customer: 'cus_2', subscription: 'sub_2', customer_details: { email: 'ops@harborrow.example' }, metadata: { plan: 'business-yearly', tier: 'business', seats: '4', application: appId, firm: 'Harbor Row Capital' } } } }); j = await r.json();
const sub2 = JSON.parse(store.get('sub:cus_2')); const org = JSON.parse(store.get('org:' + sub2.orgId) || 'null'); const app = JSON.parse(store.get('app:' + appId));
t('business completion creates an org with seats and an admin code', j.provisioned && org && org.seats === 4 && org.adminCode === sub2.code && org.status === 'active');
t('the application is marked paid and linked to the org', app.status === 'paid' && app.orgId === sub2.orgId);

/* --- portal --- */
r = await post('/portal', { code: sub2.code }); j = await r.json(); t('portal returns a Stripe-hosted billing URL for a known code', r.status === 200 && /billing\.stripe\.com/.test(j.url));
r = await post('/portal', { code: 'ZZZZZ-ZZZZZ' }); t('portal refuses an unknown code (404)', r.status === 404);

/* --- webhook with no billing configured --- */
{ const e2 = { ...env, STRIPE_WEBHOOK_SECRET: '' }; const s = signed(completed); const rr = await worker.fetch(new Request(W + '/stripe/webhook', { method: 'POST', body: s.raw, headers: { 'stripe-signature': s.header } }), e2); t('webhook with no secret configured is refused, never trusted', rr.status === 503); }

console.log(failed ? `\n${failed} FAILED` : '\nALL BILLING CHECKS PASSED');
process.exit(failed ? 1 : 0);
