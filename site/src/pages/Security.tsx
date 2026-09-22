import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT } from '@/lib/config';

/* A2.6. The security sheet: the answers a firm's questionnaire asks for, in the order it asks
   them, each row something SECURITY.md already evidences or the shipped code already does.
   Tables, not prose, so a compliance reader can scan it. Nothing here is a promise about the
   future; every row is a description of what is built. */
const T = ({ rows, head }: { rows: string[][]; head: string[] }) => (
  <div className="overflow-x-auto rounded-[12px] border border-line"><table className="w-full min-w-[560px] border-collapse text-[14.5px]">
    <thead><tr>{head.map(h => <th key={h} className="border-b border-line bg-panel2 px-4 py-3 text-left font-mono text-[11.5px] font-semibold uppercase tracking-[.1em] text-faint">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={'border-b border-line px-4 py-3 align-top leading-[1.55] last:border-b-0 ' + (j === 0 ? 'font-semibold text-text whitespace-nowrap' : 'text-dim')}>{c}</td>)}</tr>)}</tbody>
  </table></div>
);
export function Security() {
  useEffect(() => { document.title = 'Security | PerceptFolio'; }, []);
  return (
    <main id="main" className="wrap max-w-[960px] pt-[var(--spacing-sec)] pb-[var(--spacing-sec)] [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-[24px]">
      <h1 className="mb-3">Security and data handling.</h1>
      <p className="lede">What is stored, where, by whom, for how long, and how you would check. One page, so the questionnaire can be answered before it is sent. Last updated 21 September 2026.</p>

      <h2>Where your data lives</h2>
      <T head={['Data', 'Where', 'Who can read it']} rows={[
        ['Holdings, notes, thesis text', 'Your browser, on each device you use. Never sent to us.', 'You.'],
        ['Sync (optional)', 'Cloudflare KV, under your access code, so two of your devices share one book.', 'Anyone holding the code; NorthBridge does not read it. Settings turns it off.'],
        ['The record’s server copy', 'Cloudflare KV, under your code: calls, marks and chain heads. Your choice on Personal; always on for Business seats.', 'You, through your evidence pack; the firm’s admin seat for its own seats.'],
        ['Account', 'Email, plan, status, access code, Stripe customer id.', 'The operator. Stripe holds the card; we never see it.'],
        ['Requests and applications', 'What you wrote on the form, twelve months.', 'The operator.'],
      ]} />

      <h2>Encryption and credentials</h2>
      <T head={['Item', 'What is built']} rows={[
        ['In transit', 'TLS everywhere; HSTS with preload on the site; every URL in the code is https.'],
        ['At rest', 'Cloudflare encrypts KV at rest. Your browser’s storage is under your operating system’s protection.'],
        ['Terminal password', 'PBKDF2-SHA256, 16-byte random salt per profile, 150,000 iterations, constant-time compare. The server stores no passwords.'],
        ['Session', 'HMAC-SHA256 signed cookie, HttpOnly, Secure, SameSite=Strict; re-checked against the grant every five minutes, so a paused code stops within five minutes on every device.'],
        ['Access codes', 'Ten characters from a 31-symbol alphabet; lookups rate-limited per address; compared in constant time.'],
        ['Secrets', 'Only as Worker secrets; none in any shipped file; a secret-shape scan runs with every test run and gitleaks runs in CI.'],
      ]} />

      <h2>The record</h2>
      <T head={['Property', 'How']} rows={[
        ['Cannot be edited quietly', 'Every mark carries the hash of the mark before it; a change breaks every later hash.'],
        ['Cannot be backdated', 'The chain head is posted once a day to our service and stamped with its clock; one entry per server day, never rewritten.'],
        ['Can be checked by you', 'Export the evidence pack (calls, marks, chain, server head log) and run it through the verify page, without an account.'],
        ['On a desk', 'Every call carries the seat that made it and the version of the rulebook it was made under; rulebook changes are logged.'],
      ]} />

      <h2>Who else touches anything</h2>
      <T head={['Service', 'What it receives', 'Why']} rows={[
        ['Cloudflare', 'Everything above; page-view counts without cookies.', 'Hosts the site, runs the access service and the store, counts visits.'],
        ['Finnhub', 'The ticker you ask about.', 'Quotes, fundamentals, news, insider filings. Through our service for signed-in accounts, or through a key of your own.'],
        ['Price feed vendor (EODHD or Tiingo, when set)', 'The ticker and a date range.', 'Daily closes for the record’s marks and the history. Until one is set, history comes from Yahoo’s public endpoint and is labelled as interim.'],
        ['SEC EDGAR, FRED, UN Comtrade, OpenStreetMap, Esri', 'A ticker, a series id, a country, a map tile. Nothing about you.', 'Statements, macro, trade, plants, imagery. Public data.'],
        ['Modal', 'A ticker and its closes.', 'Runs the Kronos forecasting model.'],
        ['Anthropic, or Cloudflare Workers AI', 'Headlines and public company facts. Never your holdings, notes or record.', 'News summaries where every claim must cite a headline; the six investor lenses.'],
        ['Resend', 'Your email address and the message.', 'Sends your code, quotes and replies.'],
        ['FormSubmit', 'The access request you typed.', 'Delivers it to our inbox; keeps no copy.'],
        ['Stripe', 'Card and billing details, which we never see.', 'Payment.'],
      ]} />

      <h2>Headers, limits, and the code</h2>
      <T head={['Item', 'What is built']} rows={[
        ['Headers', 'HSTS, nosniff, X-Frame-Options DENY, no-referrer, Permissions-Policy, COOP, CORP, and a Content-Security-Policy with no inline script on public pages.'],
        ['Rate limits', 'Per address per minute on every public route; per code per day on model routes; access requests ten a day per address.'],
        ['Least privilege', 'Every route is public, code-scoped, or operator-only. A code reads and writes only its own keyspace.'],
        ['Tests', 'Nearly a thousand static and behavioural checks run on every push; CI deploys only when they pass.'],
        ['Source', 'The site, the terminal and the worker are one public repository; the record’s chain and the daily head are in the code that ships.'],
      ]} />

      <h2>Retention, deletion, incidents</h2>
      <T head={['Item', 'What happens']} rows={[
        ['While you subscribe', 'Account details, sync data and the record’s server copy are kept.'],
        ['When you leave', 'Access runs to the end of the period paid for. Export stays available from the entry page. Payment records are kept for the period the law requires.'],
        ['On request', 'Ask and we show you what we hold, correct it, or delete it: email, code, sync data and the server copy. Your export is yours.'],
        ['If something goes wrong', 'You are told by email, at the address on the account, what was affected and what was done. Write to the address below at any time.'],
      ]} />
      <p className="mt-8 text-[14.5px] text-dim">Questions, or a questionnaire to fill: <a href={'mailto:' + SUPPORT}>{SUPPORT}</a>. The <Link to="/privacy">privacy policy</Link> and <Link to="/terms">terms</Link> say the same things in their own words.</p>
    </main>
  );
}
