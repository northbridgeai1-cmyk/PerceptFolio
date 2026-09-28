/* The quarter-hourly watcher: pools symbols across accounts, mails only what is new to each, and
   never re-sends a story it has already told someone about. */
import worker from '../worker.js';

const mk = () => {
  const store = new Map();
  return { store, env: {
    PF_SYNC: { get: async k => store.has(k) ? store.get(k) : null,
               put: async (k, v) => { store.set(k, v); },
               delete: async k => { store.delete(k); },
               list: async ({ prefix, limit = 1000 }) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).slice(0, limit).map(name => ({ name })) }) },
    FINNHUB_API_KEY: 'fh', RESEND_API_KEY: 'rk', MAIL_FROM: 'a@b.co', ALLOWED_ORIGIN: 'https://perceptfolio.com', SYNC_SECRET: 'op-secret' } };
};
let fails = 0; const t = (n, ok, x = '') => { console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (ok ? '' : '   ' + x)); if (!ok) fails++; };

const now = Date.now();
const rss = rows => '<rss><channel>' + rows.map(([t, u, ago]) =>
  '<item><title>' + t + '</title><link>' + u + '</link><source>Reuters</source><pubDate>' + new Date(now - ago).toUTCString() + '</pubDate></item>').join('') + '</channel></rss>';
const article = (id, headline, agoMs) => ({ id, headline, source: 'Reuters', url: 'https://r.co/' + id, datetime: Math.floor((now - agoMs) / 1000) });

function seed(store, { news = true } = {}) {
  store.set('grant:AAAAA-AAAAA', JSON.stringify({ code: 'AAAAA-AAAAA', email: 'one@example.com', paused: false }));
  store.set('grant:BBBBB-BBBBB', JSON.stringify({ code: 'BBBBB-BBBBB', email: 'two@example.com', paused: false }));
  store.set('notify:c:AAAAA-AAAAA', JSON.stringify({ marks: false, reviews: false, news }));
  store.set('notify:c:BBBBB-BBBBB', JSON.stringify({ marks: false, reviews: false, news }));
  store.set('uslot:AAAAA-AAAAA', JSON.stringify({ updatedAt: now, data: { holdings: [{ sym: 'AAPL' }], watchlist: ['MSFT'], cash: 1, thesis: 'secret' } }));
  store.set('uslot:BBBBB-BBBBB', JSON.stringify({ updatedAt: now, data: { holdings: [{ sym: 'AAPL' }], watchlist: [], cash: 1 } }));
}

/* One run: both accounts hear about AAPL, only the first hears about MSFT. */
{
  const { store, env } = mk(); seed(store);
  const mails = [], calls = [];
  globalThis.fetch = async (u, o = {}) => {
    const s = String(u);
    if (s.includes('feeds.finance.yahoo.com')) { const sym = new URL(s).searchParams.get('s'); calls.push(sym);
      return new Response(sym === 'AAPL'
        ? rss([['Apple sued over battery life', 'https://r.co/a1', 40 * 60000], ['Ancient story', 'https://r.co/old', 9 * 3600000]])
        : rss([['Microsoft signs cloud deal', 'https://r.co/m1', 20 * 60000]]), { status: 200 }); }
    if (s.includes('company_tickers_exchange')) return new Response(JSON.stringify({ data: [[320193, 'Apple', 'AAPL'], [789019, 'Microsoft', 'MSFT']] }), { status: 200 });
    if (s.includes('data.sec.gov/submissions')) return new Response(JSON.stringify({ filings: { recent: {
      form: ['8-K', '10-Q'], acceptanceDateTime: [new Date(now - 50 * 60000).toISOString(), new Date(now - 5 * 86400000).toISOString()],
      accessionNumber: ['0000320193-26-000101', '0000320193-26-000090'] } } }), { status: 200 });
    if (s.includes('resend')) { mails.push(JSON.parse(o.body)); return new Response('{}', { status: 200 }); }
    return new Response('{}', { status: 200 });
  };
  await worker.scheduled({ cron: '*/15 13-21 * * 1-5' }, env, { waitUntil: p => p });
  await new Promise(r => setTimeout(r, 60));
  const note = JSON.parse(store.get('cron:news'));
  t('one call per symbol, pooled across accounts', calls.length === 2 && calls.includes('AAPL') && calls.includes('MSFT'), calls.join(','));
  t('both watchers are mailed', mails.length === 2 && note.mailed === 2, 'mails=' + mails.length);
  const one = mails.find(m => m.to[0] === 'one@example.com'), two = mails.find(m => m.to[0] === 'two@example.com');
  t('the one watching MSFT hears about it; the one who is not, does not',
    /Microsoft signs cloud deal/.test(one.text) && !/Microsoft/.test(two.text));
  t('a story older than a few hours is not called news', !/Ancient story/.test(one.text));
  /* An 8-K is the filing the story is usually about, and it arrives before the coverage does. */
  t('a fresh 8-K is reported beside the headlines, with its EDGAR link',
    /Filed a 8-K with the SEC/.test(one.text) && /sec\.gov\/Archives\/edgar\/data\/320193\//.test(one.text), one.text.slice(0, 200));
  t('an older filing is not dressed up as news', !/10-Q/.test(one.text));
  t('every line carries a link now', /https:\/\/r\.co\/a1/.test(one.text));
  t('the mail carries headlines only, and says it is no verdict',
    /Apple sued over battery life/.test(one.text) && /nothing here is a verdict/.test(one.text) && !/secret/.test(one.text));

  /* Run again with nothing new: silence. */
  mails.length = 0;
  await worker.scheduled({ cron: '*/15 13-21 * * 1-5' }, env, { waitUntil: p => p });
  await new Promise(r => setTimeout(r, 60));
  t('the same story is never sent twice', mails.length === 0, 'mails=' + mails.length);
}

/* Opt-in, and a paused grant hears nothing. */
{
  const { store, env } = mk(); seed(store, { news: false });
  const mails = [];
  globalThis.fetch = async (u, o = {}) => { if (String(u).includes('resend')) { mails.push(1); } return new Response(rss([['Anything', 'https://r.co/x', 1000]]), { status: 200 }); };
  await worker.scheduled({ cron: '*/15 13-21 * * 1-5' }, env, { waitUntil: p => p });
  await new Promise(r => setTimeout(r, 60));
  t('nobody is mailed who did not ask', mails.length === 0);
}
{
  const { store, env } = mk(); seed(store);
  store.set('grant:AAAAA-AAAAA', JSON.stringify({ code: 'AAAAA-AAAAA', email: 'one@example.com', paused: true }));
  store.delete('uslot:BBBBB-BBBBB');
  const mails = [];
  globalThis.fetch = async (u, o = {}) => { if (String(u).includes('resend')) { mails.push(1); } return new Response(rss([['Anything', 'https://r.co/x', 1000]]), { status: 200 }); };
  await worker.scheduled({ cron: '*/15 13-21 * * 1-5' }, env, { waitUntil: p => p });
  await new Promise(r => setTimeout(r, 60));
  t('a paused grant is told nothing', mails.length === 0);
}

/* The nightly schedule must not run the watcher, and vice versa. */
{
  const { store, env } = mk(); seed(store);
  let newsCalls = 0;
  globalThis.fetch = async (u) => { if (String(u).includes('yahoo') || String(u).includes('sec.gov')) newsCalls++; return new Response(rss([]), { status: 200 }); };
  await worker.scheduled({ cron: '40 21 * * 1-5' }, env, { waitUntil: p => p });
  await new Promise(r => setTimeout(r, 60));
  t('the nightly schedule does not run the news watcher', newsCalls === 0 && !store.has('cron:news'));
}

/* The notices went nowhere on a worker with the NOTIFY binding and no Resend account, because
   sendPlainMail posted to Resend and nothing else. One path now.

   WHAT THIS CAN AND CANNOT PROVE IN NODE. The Email Routing branch does `await
   import('cloudflare:email')`, a module that exists only inside the Workers runtime, so it cannot
   complete here and the send is reported as failed. What IS provable, and is the whole of the bug,
   is the routing decision: with Resend unconfigured, Resend is not called and the Email Routing
   branch is the one taken. The delegation itself is pinned statically in test/run.mjs. */
{
  const { store, env } = mk(); seed(store);
  delete env.RESEND_API_KEY; delete env.MAIL_FROM;
  let resendCalls = 0;
  env.NOTIFY = { send: async () => {} };
  globalThis.fetch = async (u) => {
    const s = String(u);
    if (s.includes('yahoo')) return new Response(rss([['Something broke', 'https://r.co/n1', 30 * 60000]]), { status: 200 });
    if (s.includes('resend')) { resendCalls++; return new Response('{}', { status: 200 }); }
    return new Response('{}', { status: 200 });
  };
  await worker.scheduled({ cron: '*/15 13-21 * * 1-5' }, env, { waitUntil: p => p });
  await new Promise(r => setTimeout(r, 80));
  t('with no Resend configured, Resend is never called', resendCalls === 0, 'calls=' + resendCalls);
}

/* Neither configured: it must report a failure rather than claim to have sent. */
{
  const { store, env } = mk(); seed(store);
  delete env.RESEND_API_KEY; delete env.MAIL_FROM; delete env.NOTIFY;
  globalThis.fetch = async (u) => String(u).includes('yahoo')
    ? new Response(rss([['Something else broke', 'https://r.co/n2', 30 * 60000]]), { status: 200 })
    : new Response('{}', { status: 200 });
  await worker.scheduled({ cron: '*/15 13-21 * * 1-5' }, env, { waitUntil: p => p });
  await new Promise(r => setTimeout(r, 80));
  const note = JSON.parse(store.get('cron:news'));
  t('with no mail at all it counts nothing sent, rather than reporting a success', note.mailed === 0, 'mailed=' + note.mailed);
}

console.log(fails ? '\n' + fails + ' FAILED' : '\nALL NEWS WATCH CHECKS PASSED');
process.exit(fails ? 1 : 0);
