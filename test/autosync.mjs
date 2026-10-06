/* READING THE BROKER ON THE WAY IN (2026-10-06).

   The owner's instruction: whenever I enter, it syncs to the broker and reloads everything. Before
   this, a connected broker moved only when somebody opened Settings, found the card and pressed
   Sync now, so the book on screen was as old as the last time they remembered to.

   THIS IS A REQUEST MADE TO SOMEBODY'S BANK WITHOUT THEM ASKING FOR IT THAT TIME, which is why it
   gets its own suite rather than a line in the pinning file. The things that must hold are not
   about whether it works; they are about what it refuses to do:

     - it must never run on the demo account, whose whole promise is that nothing in it is real
     - it must never run without an access code
     - it must obey the switch
     - it must not poll a broker every time somebody refreshes a tab
     - it must stop if the account went away while a request was in flight
     - it must stay silent when it found nothing, because most of them will find nothing

   Every call is a stub that RECORDS what was asked of it, so each assertion is about what actually
   reached the network rather than about what the source appears to say. */
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../terminal/index.html', import.meta.url), 'utf8');

function lift(sig) {
  const at = src.indexOf(sig);
  if (at < 0) throw new Error('not found: ' + sig);
  let depth = 0;
  for (let j = src.indexOf('{', at); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(at, j + 1); }
  }
  throw new Error('unbalanced: ' + sig);
}
const liftConst = (name, close) => {
  const at = src.indexOf(name);
  if (at < 0) throw new Error('not found: ' + name);
  return src.slice(at, src.indexOf(close, at) + close.length);
};

/* A whole fake terminal around the two functions under test. Everything the real ones touch is a
   recorder, so a test can ask "what did it fetch" rather than "does the code contain a string". */
function harness(opts = {}) {
  const log = { urls: [], toasts: [], saved: 0, refreshed: 0, rendered: 0 };
  const D = {
    rules: Object.assign({ autoRefresh: 'yes' }, opts.rules || {}),
    brokerAutoAt: opts.brokerAutoAt || 0,
    holdings: [], transactions: [], watchlist: [], analyses: {},
  };
  const env = {
    D,
    INVITE_WORKER: 'https://w.test',
    isDemoUser: () => !!opts.demo,
    brokerCode: () => (opts.code === undefined ? 'ABCDE-FGHIJ' : opts.code),
    sessionAlive: () => (opts.aliveUntil === undefined ? true : log.urls.length < opts.aliveUntil),
    saveDB: () => { log.saved++; },
    renderAll: () => { log.rendered++; },
    showBrokerState: () => {},
    toast: m => log.toasts.push(m),
    hasMarketData: () => opts.marketData !== false,
    mergeBrokerData: () => ({ text: opts.mergeText || '2 holdings added, 3 trades imported.', changed: opts.changed !== false }),
    refreshAll: async () => { log.refreshed++; },
    refreshing: false,
    fetch: async (url, init) => {
      log.urls.push((init && init.method ? init.method + ' ' : 'GET ') + url);
      if (url.includes('/broker/status')) {
        if (opts.statusHttp === 503) return { ok: false, status: 503, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => ({ connected: opts.connected !== false }) };
      }
      if (opts.syncHttp && opts.syncHttp !== 200) return { ok: false, status: opts.syncHttp, json: async () => ({ error: 'no' }) };
      if (opts.syncThrows) throw new Error('network down');
      return { ok: true, status: 200, json: async () => ({ accounts: [], syncedAt: 1 }) };
    },
    setTimeout: (fn) => fn(),
  };
  const names = Object.keys(env);
  const fn = new Function(...names,
    liftConst('const BROKER_AUTO_GAP_MS=', ';') + '\n' +
    lift('function brokerAutoOn()') + '\n' +
    lift('async function autoBrokerSync()') + '\n' +
    lift('async function refreshAllSoon()') + '\n' +
    'return autoBrokerSync;')(...names.map(n => env[n]));
  return { run: fn, log, D };
}

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

console.log('\nTHE HAPPY PATH: IT SYNCS, THEN IT REPRICES');
{
  const h = harness();
  await h.run();
  t('it asks whether a broker is connected first', /GET .*\/broker\/status/.test(h.log.urls[0]), h.log.urls);
  t('then it syncs', /POST .*\/broker\/sync/.test(h.log.urls[1] || ''), h.log.urls);
  t('it carries the access code', h.log.urls.every(u => u.includes('code=ABCDE-FGHIJ')), h.log.urls);
  t('it makes exactly those two calls', h.log.urls.length === 2, h.log.urls);
  t('it saves what came back', h.log.saved === 1, h.log.saved);
  t('and it reprices, which is the "reloads everything" half', h.log.refreshed === 1, h.log.refreshed);
  t('it says what arrived', h.log.toasts.some(m => /From your broker/.test(m)), h.log.toasts);
  t('and it remembers when it ran', h.D.brokerAutoAt > 0, h.D.brokerAutoAt);
}

console.log('\nWHAT IT REFUSES TO DO');
{
  const h = harness({ demo: true });
  await h.run();
  t('the demo account never reaches the network', h.log.urls.length === 0, h.log.urls);
}
{
  const h = harness({ code: '' });
  await h.run();
  t('no access code, no request', h.log.urls.length === 0, h.log.urls);
}
{
  const h = harness({ rules: { brokerAutoSync: 'no' } });
  await h.run();
  t('the switch is obeyed', h.log.urls.length === 0, h.log.urls);
}
{
  const h = harness({ rules: { brokerAutoSync: 'yes' } });
  await h.run();
  t('and an explicit yes still runs', h.log.urls.length === 2, h.log.urls);
}
{
  /* The default has to be on, because the owner asked for it to happen on entry. A missing key is
     not a refusal. */
  const h = harness({ rules: {} });
  await h.run();
  t('a profile that has never seen the setting defaults to on', h.log.urls.length === 2, h.log.urls);
}
{
  const h = harness({ brokerAutoAt: Date.now() - 60 * 1000 });
  await h.run();
  t('a sync a minute ago is not repeated', h.log.urls.length === 0, h.log.urls);
}
{
  const h = harness({ brokerAutoAt: Date.now() - 11 * 60 * 1000 });
  await h.run();
  t('eleven minutes later it runs again', h.log.urls.length === 2, h.log.urls);
}
{
  const h = harness({ connected: false });
  await h.run();
  t('a broker that is not linked is not synced', h.log.urls.length === 1, h.log.urls);
  t('and nothing is said about it', h.log.toasts.length === 0, h.log.toasts);
  t('and the throttle is not spent on it', h.D.brokerAutoAt === 0, h.D.brokerAutoAt);
}
{
  const h = harness({ statusHttp: 503 });
  await h.run();
  t('the operator not having switched broker connections on is not an error here',
    h.log.urls.length === 1 && h.log.toasts.length === 0, { urls: h.log.urls, toasts: h.log.toasts });
}

console.log('\nFAILURE IS SILENT, BECAUSE NOBODY ASKED FOR THIS');
{
  const h = harness({ syncHttp: 502 });
  await h.run();
  t('a refusal says nothing', h.log.toasts.length === 0, h.log.toasts);
  t('and changes nothing', h.log.saved === 0 && h.log.refreshed === 0, h.log);
}
{
  const h = harness({ syncThrows: true });
  await h.run();
  t('a thrown request says nothing either', h.log.toasts.length === 0, h.log.toasts);
}
{
  const h = harness({ changed: false });
  await h.run();
  t('a sync that found nothing stays quiet', h.log.toasts.length === 0, h.log.toasts);
  t('but it still reprices', h.log.refreshed === 1, h.log.refreshed);
}

console.log('\nTHE SESSION CAN END MID-FLIGHT');
{
  /* Signing out, switching account or deleting it while a broker request is on the wire. The
     continuation would otherwise resume against a D that is gone. */
  const h = harness({ aliveUntil: 1 });
  await h.run();
  t('a session that ended during the status call writes nothing', h.log.saved === 0, h.log);
  t('and does not spend a throttle slot it cannot use', h.D.brokerAutoAt === 0, h.D.brokerAutoAt);
}
{
  const h = harness({ aliveUntil: 2 });
  await h.run();
  t('a session that ended during the sync writes nothing', h.log.saved === 0, h.log);
}

console.log('\nREPRICING OBEYS ITS OWN SETTINGS');
{
  const h = harness({ marketData: false });
  await h.run();
  t('no market data, no repricing attempt', h.log.refreshed === 0, h.log.refreshed);
  t('but the broker was still read', h.log.saved === 1, h.log.saved);
}
{
  const h = harness({ rules: { autoRefresh: 'no' } });
  await h.run();
  t('somebody who turned auto-refresh off is not overridden', h.log.refreshed === 0, h.log.refreshed);
  t('and the broker sync still happened', h.log.urls.length === 2, h.log.urls);
}

console.log('\nAND IT IS ACTUALLY CALLED ON THE WAY IN');
{
  const login = lift('async function finishLogin(');
  t('finishLogin calls it', /autoBrokerSync\(\)/.test(login), login.slice(-400));
  t('without awaiting it, so a slow broker cannot block entry', !/await\s+autoBrokerSync/.test(login));
  t('and a throw in it cannot break the sign-in', /try\{ autoBrokerSync\(\); \}catch/.test(login));
}
{
  const gap = liftConst('const BROKER_AUTO_GAP_MS=', ';');
  t('the gap is ten minutes, not a magic number in the body', /10\*60\*1000/.test(gap), gap);
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
