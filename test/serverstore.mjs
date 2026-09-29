/* THE BOOK IS NOT KEPT IN THE BROWSER — run, not read (2026-09-28).

   test/run.mjs pins the shape of this in source, which catches a rewrite but cannot catch a mistake
   that is spelled correctly. The thing actually being claimed is a claim about bytes: after a push
   has landed, nothing resembling a book is left in this browser's storage. That is only provable by
   running writeStore against a storage object and looking at what is in it, which is what this does.

   The functions are lifted out of terminal/index.html by name rather than copied, so a change to them
   is a change to what is tested here. */
import { readFileSync } from 'node:fs';

const term = readFileSync(new URL('../terminal/index.html', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const t = (name, ok, got) => {
  if (ok) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (got !== undefined ? '   got ' + JSON.stringify(got) : '')); }
};

/* Pull a top-level `function name(){...}` or `const NAME=...;` out of the file by name. Brace
   counting rather than a regex, because these bodies contain both braces and comments. */
function lift(sig) {
  const at = term.indexOf(sig);
  if (at < 0) throw new Error('not found in terminal/index.html: ' + sig);
  let i = term.indexOf('{', at), depth = 0;
  for (let j = i; j < term.length; j++) {
    if (term[j] === '{') depth++;
    else if (term[j] === '}') { depth--; if (depth === 0) return term.slice(at, j + 1); }
  }
  throw new Error('unbalanced: ' + sig);
}
function liftLine(prefix) {
  const at = term.indexOf(prefix);
  if (at < 0) throw new Error('not found: ' + prefix);
  return term.slice(at, term.indexOf('\n', at));
}
/* SHELL_FIELDS is a list that wraps across lines, so it ends at its own `];`, not at a newline. */
function liftUpTo(prefix, close) {
  const at = term.indexOf(prefix);
  if (at < 0) throw new Error('not found: ' + prefix);
  const end = term.indexOf(close, at);
  if (end < 0) throw new Error('unterminated: ' + prefix);
  return term.slice(at, end + close.length);
}

const src = [
  liftLine("const PENDING_KEY='"),
  liftUpTo('const SHELL_FIELDS=[', '];'),
  lift('function shellDB()'),
  lift('function writeStore()'),
].join('\n');

/* A book with something in it, so "the book is gone" is a claim with teeth. */
const book = () => ({
  holdings: [{ sym: 'NVDA', qty: 40, cost: 118.25 }, { sym: 'ASML', qty: 12, cost: 690.1 }],
  cash: 21400,
  calls: [{ id: 'c1', sym: 'NVDA', dir: 'BUY', target: 260, marks: { m1: 0.11 } }],
  transactions: [{ ts: 1, sym: 'NVDA', action: 'BUY', qty: 40 }],
  history: [{ d: '2026-09-01', v: 100000 }],
  lastLocalEdit: 0,
  syncedAt: 0,
});

function harness({ home, user, D, profiles }) {
  const store = {};
  const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
  const STORE_KEY = 'quantfolio_v1';
  const DB = { profiles };
  const fn = new Function(
    'localStorage', 'STORE_KEY', 'DB', 'USER', 'D', 'serverIsHome',
    src + '\nreturn {writeStore, shellDB, PENDING_KEY};'
  )(localStorage, STORE_KEY, DB, user, D, () => home);
  return { store, fn, STORE_KEY };
}

const profilesWith = D => ({
  'w5mxr-efh5w@code.perceptfolio': {
    pinHash: '', accountType: 'personal', userId: 'u_1', invite: 'W5MXR-EFH5W',
    createdAt: 1, acceptedTerms: { at: 1 }, data: D,
  },
});

console.log('server-held storage');

/* ---- 1. sync on, edit not yet pushed ---- */
{
  const D = book(); D.lastLocalEdit = 2000; D.syncedAt = 1000;      // ahead: unsent
  const h = harness({ home: true, user: 'w5mxr-efh5w@code.perceptfolio', D, profiles: profilesWith(D) });
  h.fn.writeStore();
  const shell = JSON.parse(h.store[h.STORE_KEY]);
  const p = shell.profiles['w5mxr-efh5w@code.perceptfolio'];
  t('the shell keeps the identity the sign-in screen needs', p.invite === 'W5MXR-EFH5W' && p.userId === 'u_1' && 'pinHash' in p);
  t('the shell carries no book at all', !('data' in p), Object.keys(p));
  t('no holding, no cash and no mark can be found in the shell',
    !/NVDA|ASML|21400|0\.11/.test(h.store[h.STORE_KEY]));
  t('the unsent edit is kept, because losing it is the worse failure', !!h.store[h.fn.PENDING_KEY]);
  const pend = JSON.parse(h.store[h.fn.PENDING_KEY]);
  t('the unsent copy is the book, stamped with when it was edited',
    pend.data.holdings.length === 2 && pend.at === 2000 && pend.user === 'w5mxr-efh5w@code.perceptfolio');
}

/* ---- 2. the push landed: the browser must now hold nothing ---- */
{
  const D = book(); D.lastLocalEdit = 2000; D.syncedAt = 1000;
  const h = harness({ home: true, user: 'w5mxr-efh5w@code.perceptfolio', D, profiles: profilesWith(D) });
  h.fn.writeStore();
  t('precondition: the unsent copy is there', !!h.store[h.fn.PENDING_KEY]);
  D.syncedAt = 3000;                       // what syncPush does on the worker's acknowledgement
  h.fn.writeStore();
  t('once the account has it, the browser copy is gone', h.store[h.fn.PENDING_KEY] === undefined);
  const all = JSON.stringify(h.store);
  t('nothing book-shaped is left anywhere in this browser', !/NVDA|ASML|21400|0\.11|holdings/.test(all), all.slice(0, 400));
}

/* ---- 3. sync off: this browser IS the account, so nothing may be stripped ---- */
{
  const D = book(); D.lastLocalEdit = 2000; D.syncedAt = 0;
  const h = harness({ home: false, user: 'me@example.com', D, profiles: { 'me@example.com': { pinHash: 'x', data: D } } });
  h.fn.writeStore();
  const full = JSON.parse(h.store[h.STORE_KEY]);
  t('a device with no account behind it still keeps the whole book',
    full.profiles['me@example.com'].data.holdings.length === 2 && full.profiles['me@example.com'].data.cash === 21400);
  t('and writes no unsent copy, there being nowhere to send it', h.store[h.fn.PENDING_KEY] === undefined);
}

/* ---- 4. every profile is stripped, not just the signed-in one ---- */
{
  const a = book(), b = book();
  b.holdings = [{ sym: 'SECRET', qty: 1, cost: 1 }];
  const h = harness({
    home: true, user: 'one@code.perceptfolio', D: a,
    profiles: { 'one@code.perceptfolio': { userId: 'u1', data: a }, 'two@code.perceptfolio': { userId: 'u2', data: b } },
  });
  h.fn.writeStore();
  t('a second account on the same device is stripped too', !/SECRET/.test(h.store[h.STORE_KEY]));
  const shell = JSON.parse(h.store[h.STORE_KEY]);
  t('both accounts are still listed, so neither disappears from sign-in',
    Object.keys(shell.profiles).length === 2);
}

/* ---- 5. a field added to a profile later must not leak by default ---- */
{
  const D = book();
  const h = harness({
    home: true, user: 'one@code.perceptfolio', D,
    profiles: { 'one@code.perceptfolio': { userId: 'u1', data: D, brokerToken: 'tok_live_do_not_keep', avatar: 'data:image/png;base64,AAAA' } },
  });
  h.fn.writeStore();
  t('an unlisted field is left behind rather than written', !/tok_live_do_not_keep|base64/.test(h.store[h.STORE_KEY]));
}

console.log('');
if (fail) { console.log(fail + ' FAILED, ' + pass + ' passed'); process.exit(1); }
console.log('ALL ' + pass + ' CHECKS PASSED');
