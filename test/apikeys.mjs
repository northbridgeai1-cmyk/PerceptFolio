/* API KEYS, SO SOMEBODY ELSE'S SOFTWARE CAN READ THIS (2026-09-29)

   The owner asked for keys so people can point their own AI at the terminal. What existed was one
   unnamed token for a spreadsheet. The gap between those two is the whole of this suite:

     - a key has a NAME and an ID, and revoking one does not revoke the others;
     - a key has a SCOPE, because the record is the published thing and the book is what somebody
       owns. Reading the record must not silently also read the positions;
     - a key works as a BEARER HEADER, while the query string keeps working for Google Sheets, which
       cannot send one;
     - the API says, in its own schema and in the payload, that imported rows are history and not
       calls this terminal made. An agent that gets that wrong reports somebody's broker CSV as this
       product's track record, which is the single worst thing this API could cause.

   Run:  node test/apikeys.mjs */

import fs from 'fs';
import path from 'path';
import os from 'os';

const tmp = path.join(os.tmpdir(), 'pf-apikeys-' + process.pid + '.mjs');
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
const CODE = 'AAAAA-BBBBB';
const env = { PF_SYNC: KV, SYNC_SECRET: 'op-secret', ALLOWED_ORIGIN: 'https://perceptfolio.com' };
store.set('grant:' + CODE, JSON.stringify({ code: CODE, tier: 'personal', paused: false }));
store.set('rec:c:' + CODE, JSON.stringify({ calls: [{ id: 'c1', sym: 'NVDA', date: '2026-03-02', price: 118.25, spy: 500, marks: {} }], reviews: [], chain: null }));
store.set('uslot:' + CODE, JSON.stringify({ updatedAt: 1, data: {
  cash: 21400, syncedAt: 1790000000000,
  holdings: [{ sym: 'NVDA', shares: 40, cost: 118.25, type: 'Stock', broker: 'Robinhood' }],
  watchlist: ['ASML', { sym: 'VOO' }],
} }));

globalThis.fetch = async () => new Response('{}', { status: 200 });

const W = 'https://worker.example';
const call = (p, init = {}) => worker.fetch(new Request(W + p, {
  headers: { origin: 'https://perceptfolio.com', ...(init.headers || {}) }, ...init }), env);

console.log('API keys');

/* ---- minting ---- */
console.log('\n  minting');
let recordKey, bookKey, recordId;
{
  const r = await call('/token?code=' + CODE, { method: 'POST', body: JSON.stringify({ name: 'My assistant' }), headers: { 'content-type': 'application/json' } });
  const j = await r.json();
  recordKey = j.token; recordId = j.id;
  t('a key is minted', r.status === 200 && /^[0-9a-f]{48}$/.test(j.token || ''), JSON.stringify(j).slice(0, 120));
  t('it carries the name it was given', j.name === 'My assistant');
  t('and defaults to the record, not the book', j.scope === 'record');
  t('the reply shows how to send it as a header', String(j.bearer || '').startsWith('Authorization: Bearer '));
  t('and points at a schema the agent can read', String(j.schema || '').includes('/me/schema'));
}
{
  const r = await call('/token?code=' + CODE, { method: 'POST', body: JSON.stringify({ name: 'Sheet', scope: 'book' }), headers: { 'content-type': 'application/json' } });
  const j = await r.json();
  bookKey = j.token;
  t('a book-scoped key can be asked for explicitly', j.scope === 'book');
  t('the two keys are different', bookKey !== recordKey);
}
{
  const r = await call('/token?code=' + CODE, { method: 'POST', body: JSON.stringify({ scope: 'everything' }), headers: { 'content-type': 'application/json' } });
  const j = await r.json();
  t('an unknown scope falls back to the narrow one rather than the wide one', j.scope === 'record');
  await call('/token?id=' + j.id + '&code=' + CODE, { method: 'DELETE' });
}

/* ---- listing ---- */
console.log('\n  listing');
{
  const r = await call('/token?code=' + CODE, { method: 'GET' });
  const j = await r.json();
  t('keys are listed with name, scope and id', (j.tokens || []).length === 2 && j.tokens.every(k => k.id && k.name && k.scope));
  t('only the tail is shown, never the key again', j.tokens.every(k => !k.tok && String(k.tail).length === 6));
  t('the scopes on offer are named', Array.isArray(j.scopes) && j.scopes.join(',') === 'record,book');
}

/* ---- authentication ---- */
console.log('\n  how a key may be sent');
{
  const r = await call('/me', { headers: { Authorization: 'Bearer ' + recordKey } });
  const j = await r.json();
  t('a bearer header works', r.status === 200 && Array.isArray(j.calls), String(r.status));
}
{
  const r = await call('/me?token=' + recordKey);
  t('the query string still works, because Google Sheets cannot send a header', r.status === 200);
}
{
  const r = await call('/me?format=csv&token=' + recordKey);
  const body = await r.text();
  t('CSV still works for a spreadsheet', r.status === 200 && body.startsWith('id,date,ticker'));
}
{
  const r = await call('/me', { headers: { Authorization: 'Bearer ' + 'f'.repeat(48) } });
  t('an unknown key is refused', r.status === 401);
}
{
  const r = await call('/me?token=nonsense');
  t('a malformed key is refused before any lookup', r.status === 400);
}

/* ---- scope ---- */
console.log('\n  scope, which is the point of having more than one key');
{
  const r = await call('/me?include=book', { headers: { Authorization: 'Bearer ' + recordKey } });
  const j = await r.json();
  t('a record key CANNOT read the book', r.status === 403, String(r.status) + ' ' + (j.error || ''));
}
{
  const r = await call('/me?include=book', { headers: { Authorization: 'Bearer ' + bookKey } });
  const j = await r.json();
  t('a book key can', r.status === 200 && (j.holdings || []).length === 1, String(r.status));
  t('holdings come through with cost and broker', j.holdings[0].sym === 'NVDA' && j.holdings[0].cost === 118.25 && j.holdings[0].broker === 'Robinhood');
  t('cash comes through', j.cash === 21400);
  t('the watchlist is flattened to tickers whichever shape it was stored in',
    (j.watchlist || []).join(',') === 'ASML,VOO', JSON.stringify(j.watchlist));
  t('and the payload itself says imported rows are not the record',
    /imported/.test(j.note || '') && /not calls this terminal made/.test(j.note || ''));
}
{
  const r = await call('/me?include=all', { headers: { Authorization: 'Bearer ' + bookKey } });
  const j = await r.json();
  t('include=all returns the book and the record together', (j.holdings || []).length === 1 && (j.calls || []).length === 1);
}

/* ---- the schema an agent reads ---- */
console.log('\n  the schema an agent reads before it guesses');
{
  const r = await call('/me/schema', { headers: { Authorization: 'Bearer ' + recordKey } });
  const j = await r.json();
  t('the schema is behind the key, not public', r.status === 200);
  t('it names the endpoints', (j.endpoints || []).some(e => e.path === '/me'));
  t('it tells this key what it may NOT do', (j.endpoints || []).some(e => e.requiresScope === 'book' && e.available === false));
  t('it warns that imported rows are not the terminal’s calls',
    /not calls this terminal made/i.test(JSON.stringify(j.readingTheRecord || {})));
  t('it says marks are forward-only and never backfilled', /forward-only/i.test(JSON.stringify(j.readingTheRecord || {})));
  t('it says there is no win rate on purpose', /win rate/i.test(JSON.stringify(j.readingTheRecord || {})));
  t('it states the API is read-only', /read-only/i.test(JSON.stringify(j)));
}
{
  const r = await call('/me/schema', { headers: { Authorization: 'Bearer ' + bookKey } });
  const j = await r.json();
  t('and a book key is told the book IS available to it', (j.endpoints || []).some(e => e.requiresScope === 'book' && e.available === true));
}
{
  const r = await call('/me/schema');
  t('without a key the schema is refused', r.status === 400 || r.status === 401);
}

/* ---- revocation ---- */
console.log('\n  revoking one without revoking the rest');
{
  const r = await call('/token?id=' + recordId + '&code=' + CODE, { method: 'DELETE' });
  const j = await r.json();
  t('one key is revoked by id', r.status === 200 && j.revoked === 1);
  const dead = await call('/me', { headers: { Authorization: 'Bearer ' + recordKey } });
  t('that key stops working immediately', dead.status === 401);
  const alive = await call('/me', { headers: { Authorization: 'Bearer ' + bookKey } });
  t('THE OTHER KEY STILL WORKS, which is the whole reason for ids', alive.status === 200);
}
{
  const r = await call('/token?id=k_deadbeef&code=' + CODE, { method: 'DELETE' });
  t('revoking a key that is not there says so rather than pretending', r.status === 404);
}
{
  const r = await call('/token?code=' + CODE, { method: 'DELETE' });
  const j = await r.json();
  t('and the panic button still revokes everything', r.status === 200 && j.revoked === 1);
  const dead = await call('/me', { headers: { Authorization: 'Bearer ' + bookKey } });
  t('after which nothing reads', dead.status === 401);
}

/* ---- a paused account ---- */
console.log('\n  a paused account');
{
  const r = await call('/token?code=' + CODE, { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } });
  const k = (await r.json()).token;
  store.set('grant:' + CODE, JSON.stringify({ code: CODE, paused: true }));
  const after = await call('/me', { headers: { Authorization: 'Bearer ' + k } });
  t('a key stops reading the moment the account is paused', after.status === 401);
  store.set('grant:' + CODE, JSON.stringify({ code: CODE, paused: false }));
}

/* ---- backward compatibility ---- */
console.log('\n  the key the old build minted');
{
  const oldTok = 'a'.repeat(48);
  store.set('tok:' + oldTok, 'c:' + CODE);            /* a bare ident, as the previous build wrote it */
  const r = await call('/me?token=' + oldTok);
  t('an older token still reads the record', r.status === 200);
  const b = await call('/me?include=book&token=' + oldTok);
  t('and is treated as record scope, so it cannot reach the book', b.status === 403);
}

/* ---- the limit ---- */
console.log('\n  the limit');
{
  await call('/token?code=' + CODE, { method: 'DELETE' });
  let last;
  for (let i = 0; i < 11; i++) last = await call('/token?code=' + CODE, { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } });
  t('ten keys is the ceiling, and the eleventh is refused with a reason', last.status === 409, String(last.status));
}

console.log('');
if (failed) { console.log(failed + ' FAILED, ' + passed + ' passed'); process.exit(1); }
console.log('ALL ' + passed + ' CHECKS PASSED');
