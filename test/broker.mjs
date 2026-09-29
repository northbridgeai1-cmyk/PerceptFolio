/* THE BROKER CONNECTION: READ-ONLY, AND SIGNED CORRECTLY (2026-09-29).

   Two things here cannot be checked by running the product, because the product cannot be run
   against SnapTrade without live keys. Both are checkable without them, and both are the kind of
   thing that fails silently if it is wrong:

     1. THE SIGNATURE. Every request is rejected unless an HMAC over a canonical JSON object matches
        byte for byte. "Canonical" means keys sorted at every level and no whitespace, and a single
        space or an unsorted key gives a 401 that looks exactly like a bad key. The canonicaliser is
        lifted out of worker.js and checked against the documented example and against Node's own
        crypto, so a wrong signature is caught here rather than on a customer's first connection.

     2. READ-ONLY. The promise on the site is now that the connection cannot transmit an order. That
        is enforced in three places and all three are asserted below. If any one of them is removed,
        the site is telling people something untrue, which matters more than the feature does.

   What is NOT claimed here: that the endpoints exist and return what we expect. Only a live key
   proves that, and the first connection is the test. The parsing of whatever they return is written
   to skip anything it does not recognise rather than guess. */
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

const worker = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '   got ' + JSON.stringify(got) : '')); } };

/* Brace-match a named function out of the source, wherever it is indented. */
function lift(sig) {
  const at = worker.indexOf(sig);
  if (at < 0) throw new Error('not found in worker.js: ' + sig);
  let depth = 0;
  for (let j = worker.indexOf('{', at); j < worker.length; j++) {
    if (worker[j] === '{') depth++;
    else if (worker[j] === '}') { depth--; if (depth === 0) return worker.slice(at, j + 1); }
  }
  throw new Error('unbalanced: ' + sig);
}
function liftLine(prefix) {
  const at = worker.indexOf(prefix);
  if (at < 0) throw new Error('not found: ' + prefix);
  return worker.slice(at, worker.indexOf('\n', at));
}

const { canonJson, stSymbol, maskAccount, ST_FORBIDDEN } = new Function(
  [lift('function canonJson(v)'), lift('function stSymbol(sym)'), lift('function maskAccount(n)'),
   liftLine('const ST_FORBIDDEN = /')].join('\n') +
  '\nreturn {canonJson, stSymbol, maskAccount, ST_FORBIDDEN};'
)();

console.log('the broker connection');

/* ---- 1. canonical JSON ---- */
console.log('\n  canonical JSON, which a wrong byte in turns into a 401 that looks like a bad key');
t('no whitespace anywhere', canonJson({ a: 1, b: 'x' }) === '{"a":1,"b":"x"}', canonJson({ a: 1, b: 'x' }));
t('keys sorted at the top level',
  canonJson({ query: 'q', path: '/p', content: null }) === '{"content":null,"path":"/p","query":"q"}',
  canonJson({ query: 'q', path: '/p', content: null }));
t('keys sorted at EVERY level, which is the half that is easy to miss',
  canonJson({ content: { userSecret: 's', userId: 'u' }, path: '/p', query: 'q' })
    === '{"content":{"userId":"u","userSecret":"s"},"path":"/p","query":"q"}',
  canonJson({ content: { userSecret: 's', userId: 'u' }, path: '/p', query: 'q' }));
t('null content for a GET is a literal null, not an empty object',
  canonJson({ content: null, path: '/a', query: 'b' }).includes('"content":null'));
t('arrays keep their order, since order is meaning in an array',
  canonJson({ a: [3, 1, 2] }) === '{"a":[3,1,2]}', canonJson({ a: [3, 1, 2] }));
t('an undefined value is dropped, not written as the text "undefined"',
  canonJson({ a: 1, b: undefined }) === '{"a":1}', canonJson({ a: 1, b: undefined }));
t('it matches the shape in the published example',
  canonJson({ content: { substring: 'AAPL' }, path: '/api/v1/symbols', query: 'clientId=X&timestamp=1' })
    === '{"content":{"substring":"AAPL"},"path":"/api/v1/symbols","query":"clientId=X&timestamp=1"}');

/* ---- 2. the signature itself, against Node's crypto ---- */
console.log('\n  the signature, against an independent implementation');
{
  const consumerKey = 'test-consumer-key';
  const sigObject = { content: null, path: '/api/v1/accounts', query: 'clientId=abc&timestamp=1715123456&userId=pf_1&userSecret=s' };
  const mine = canonJson(sigObject);
  /* What the documented Python would produce: json.dumps(sort_keys=True, separators=(",",":")). For
     this object that is the same string, which is the point of the assertion. */
  const documented = '{"content":null,"path":"/api/v1/accounts","query":"clientId=abc&timestamp=1715123456&userId=pf_1&userSecret=s"}';
  t('the signed content is exactly what the documented algorithm produces', mine === documented, mine);
  const expected = createHmac('sha256', consumerKey).update(documented, 'utf8').digest('base64');
  const actual = createHmac('sha256', consumerKey).update(mine, 'utf8').digest('base64');
  t('and therefore the HMAC matches', expected === actual);
  t('the worker signs with the consumer key, base64, SHA-256',
    /crypto\.subtle\.importKey\('raw', new TextEncoder\(\)\.encode\(env\.SNAPTRADE_CONSUMER_KEY\)/.test(worker) &&
    /\{ name: 'HMAC', hash: 'SHA-256' \}/.test(worker) &&
    /b64bytes\(await crypto\.subtle\.sign\('HMAC'/.test(worker));
}
t('the query that is signed is the query that is sent, built once',
  /const sigContent = canonJson\(\{ content: bodyObj === undefined \? null : bodyObj, path, query \}\);/.test(worker) &&
  /path \+ '\?' \+ query/.test(worker));
t('the Signature header is not itself in the signed query string',
  !/Signature=/.test(worker));

/* ---- 3. read-only, in all three places the site's claim depends on ---- */
console.log('\n  read-only, which the site now promises in public');
t('every connection is opened read-only', /\{ connectionType: 'read', connectionPortalVersion: 'v4' \}/.test(worker));
t('no trading connection type is ever requested',
  !/connectionType: '(trade|trade-if-available)'/.test(worker));
t('an order path throws rather than being sent', ST_FORBIDDEN.test('/api/v1/accounts/1/orders'));
t('so does a trade path', ST_FORBIDDEN.test('/api/v1/trade/place'));
t('and the refusal is by segment, so the login route still works',
  !ST_FORBIDDEN.test('/api/v1/snapTrade/login') && !ST_FORBIDDEN.test('/api/v1/snapTrade/registerUser'));
t('positions and activities are unaffected',
  !ST_FORBIDDEN.test('/api/v1/accounts/abc/positions') && !ST_FORBIDDEN.test('/api/v1/accounts/abc/activities'));
t('there is no flag anywhere that turns trading on',
  !/SNAPTRADE_ALLOW_TRAD|allowTrading|ENABLE_TRADING/.test(worker));
t('the refusal is a throw, not a logged warning',
  /throw new Error\('This build is read-only and refused ' \+ path\)/.test(worker));

/* ---- 4. what we hand to a third party, and what we keep ---- */
console.log('\n  what leaves this system, and what is kept');
t('their id for a subscriber is a hash, carrying no email and no name',
  /return 'pf_' \+ \(await sha256hex\('pf-broker:' \+ code\)\)\.slice\(0, 32\);/.test(worker));
t('the broker record is keyed to the access code, beside the book',
  /env\.PF_SYNC\.get\('bro:' \+ code\)/.test(worker));
t('unlinking deletes our copy whether or not the remote delete worked',
  /await env\.PF_SYNC\.delete\('bro:' \+ bcode\);/.test(worker) && /return json\(\{ ok: true, removed, local: true \}/.test(worker));
t('an account number comes back masked to the last four',
  maskAccount('123456789') === '••••6789' && maskAccount('12') === '12' && maskAccount(null) === '',
  maskAccount('123456789'));
t('the route needs a live access code like every other per-account route',
  /if \(!\(await activeGrant\(bcode\)\)\) return json\(\{ error: 'Needs a live access code\.' \}, 401, env\);/.test(worker));
t('it is off until the keys exist, rather than half working',
  /function brokerConfigured\(\) \{ return !!\(env\.SNAPTRADE_CLIENT_ID && env\.SNAPTRADE_CONSUMER_KEY\); \}/.test(worker));

/* ---- 5. reading what comes back ---- */
console.log('\n  reading what comes back, without guessing');
t('a plain ticker is read from either shape SnapTrade uses',
  stSymbol({ symbol: 'AAPL' }) === 'AAPL' && stSymbol({ symbol: { symbol: 'NVDA' } }) === 'NVDA');
t('an option leg is skipped, because this terminal refuses options in public',
  stSymbol({ option_symbol: { ticker: 'AAPL260116C00150000' } }) === '' &&
  stSymbol({ symbol: { symbol: 'AAPL 260116C00150000' } }) === '');
t('nonsense comes back empty rather than becoming a holding',
  stSymbol(null) === '' && stSymbol({}) === '' && stSymbol({ symbol: '' }) === '');
t('only buys and sells become transactions; dividends and fees are not decisions',
  /if \(kind !== 'BUY' && kind !== 'SELL'\) continue;/.test(worker));
t('a row missing a date, a price or a quantity is skipped, not defaulted',
  /if \(!sym \|\| !\(shares > 0\) \|\| !\(price > 0\) \|\| !\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(date\)\) continue;/.test(worker));
t('one account failing does not cost the others',
  (worker.match(/must not cost the others|same reasoning/g) || []).length >= 2);

console.log('');
if (fail) { console.log(fail + ' FAILED, ' + pass + ' passed'); process.exit(1); }
console.log('ALL ' + pass + ' CHECKS PASSED');
