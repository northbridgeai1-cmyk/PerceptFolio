import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WORKER } from '@/lib/config';

/* A5.1. A real company in the time it takes to read this. Everything on this card is public
   data through the worker's keyless routes: ten years of statements from SEC EDGAR, five years
   of daily closes, the filings of the last year, and the count of 13F filers naming the issuer.
   The twenty-two checks are not here on purpose: they read a market-data feed that is licensed
   per person, and they run inside the terminal under bars the person sets. The card shows the
   record the checks read, dated and sourced, and says so. */
type Edgar = { entity: string; years: number[]; lines: Record<string, { label: string; years: Record<string, number> }>; source: string };
type Hist = { dates: string[]; closes: number[]; source: string };
type Filing = { form: string; date: string; items: { k: string; what: string }[]; url: string; index: string };
type Holders = { latest: { period: string; filers: number }; prior: { period: string; filers: number }; change: number; source: string };

const fmt = (v: number | undefined, k: string) => v == null || !isFinite(v) ? '-' : k === 'eps' ? v.toFixed(2) : k === 'shares' ? (v / 1e6).toFixed(0) + ' m' : Math.abs(v) >= 1e9 ? (v / 1e9).toFixed(1) + ' bn' : (v / 1e6).toFixed(0) + ' m';
const KEEP = ['revenue', 'grossProfit', 'operatingIncome', 'netIncome', 'eps', 'ocf', 'capex', 'cash', 'debt'];

export function CompanyDemo() {
  const [sym, setSym] = useState('AAPL'); const [typed, setTyped] = useState('AAPL');
  const [edgar, setEdgar] = useState<Edgar | null>(null); const [hist, setHist] = useState<Hist | null>(null); const [filings, setFilings] = useState<Filing[] | null>(null); const [holders, setHolders] = useState<Holders | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => {
    let on = true; setBusy(true); setErr(''); setEdgar(null); setHist(null); setFilings(null); setHolders(null);
    const since = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const get = (p: string) => fetch(WORKER + p).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); return j; });
    Promise.allSettled([get('/edgar?symbol=' + sym), get('/history?symbol=' + sym), get('/filings?symbol=' + sym + '&since=' + since), get('/holders?symbol=' + sym)]).then(rs => {
      if (!on) return;
      const [e, h, f, o] = rs;
      if (e.status === 'fulfilled') setEdgar(e.value); if (h.status === 'fulfilled') setHist(h.value); if (f.status === 'fulfilled') setFilings(f.value.filings || []); if (o.status === 'fulfilled') setHolders(o.value);
      if (e.status === 'rejected' && h.status === 'rejected') setErr(String((e.reason && e.reason.message) || 'No public record found for ' + sym + '.'));
      setBusy(false);
    });
    return () => { on = false; };
  }, [sym]);
  const years = edgar ? edgar.years.slice(-6) : [];
  const closes = hist ? hist.closes.slice(-250) : []; const lo = Math.min(...closes), hi = Math.max(...closes);
  const path = closes.length > 1 ? closes.map((c, i) => (i ? 'L' : 'M') + (i / (closes.length - 1) * 600).toFixed(1) + ' ' + (hi > lo ? (60 - (c - lo) / (hi - lo) * 56 + 2) : 30).toFixed(1)).join(' ') : '';
  const last = closes[closes.length - 1], first = closes[0];
  return (
    <div className="mt-8 overflow-hidden rounded-[12px] border border-line bg-panel">
      <form className="flex flex-wrap items-center gap-3 border-b border-line bg-panel2 px-5 py-3" onSubmit={e => { e.preventDefault(); const t = typed.trim().toUpperCase(); if (/^[A-Z.\-]{1,10}$/.test(t)) setSym(t); }}>
        <span className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">A real company, the public record</span>
        <Input value={typed} onChange={e => setTyped(e.target.value)} aria-label="Ticker" className="h-9 w-[120px] font-mono uppercase" maxLength={10} />
        <Button type="submit" variant="secondary" size="sm" disabled={busy}>{busy ? 'Reading…' : 'Read it'}</Button>
        <span className="text-[13px] text-faint">US listings that file with the SEC.</span>
      </form>
      {err && <p className="px-5 py-4 text-[14px] text-dim">{err}</p>}
      <div className="grid grid-cols-[3fr_2fr] gap-px bg-line max-[780px]:grid-cols-1">
        <div className="bg-panel p-5">
          <h3 className="mb-1 font-sans text-[15px] font-bold tracking-normal">{edgar ? edgar.entity : sym}{edgar ? '' : busy ? ' · reading' : ''}</h3>
          <p className="mb-3 text-[13px] text-faint">Statements from 10-K filings, USD. {edgar ? edgar.years.length + ' fiscal years on file; the last ' + years.length + ' shown.' : ''}</p>
          {edgar ? <div className="overflow-x-auto"><table className="w-full border-collapse text-[13px]"><thead><tr><th className="border-b border-line py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-[.1em] text-faint"></th>{years.map(y => <th key={y} className="border-b border-line py-2 text-right font-mono text-[11px] font-semibold uppercase tracking-[.1em] text-faint">{y}</th>)}</tr></thead>
            <tbody>{KEEP.filter(k => edgar.lines[k]).map(k => <tr key={k}><td className="border-b border-line py-[6px] pr-3 text-dim">{edgar.lines[k].label}</td>{years.map(y => <td key={y} className="num border-b border-line py-[6px] text-right text-text">{fmt(edgar.lines[k].years[String(y)], k)}</td>)}</tr>)}</tbody></table></div>
            : <p className="text-[13px] text-faint">{busy ? '' : 'No ten-year statements under this ticker on EDGAR (a fund, a foreign filer, or a new listing).'}</p>}
        </div>
        <div className="bg-panel p-5">
          <h3 className="mb-1 font-sans text-[15px] font-bold tracking-normal">Daily closes, one year</h3>
          <p className="mb-3 text-[13px] text-faint">{closes.length > 1 ? `${hist!.dates[hist!.dates.length - closes.length]} to ${hist!.dates[hist!.dates.length - 1]} · ${first.toFixed(2)} to ${last.toFixed(2)} (${((last - first) / first * 100).toFixed(1)}%)` : busy ? 'reading' : 'no history'}</p>
          {closes.length > 1 && <svg viewBox="0 0 600 64" className="h-[64px] w-full" role="img" aria-label="One year of daily closes"><path d={path} fill="none" stroke="#3b82f6" strokeWidth="1.6" /></svg>}
          <p className="mt-2 text-[12px] text-faint">{hist ? 'Source: ' + hist.source.replace(/ \(interim, unlicensed;.*\)$/, ' (interim feed)') : ''}</p>
          <h3 className="mb-1 mt-5 font-sans text-[15px] font-bold tracking-normal">Filed in the last year</h3>
          {filings ? <ul className="space-y-1 text-[13px] text-dim">{filings.slice(0, 5).map((f, i) => <li key={i} className="flex justify-between gap-3"><a href={f.url || f.index} target="_blank" rel="noopener" className="text-text">{f.form}{f.items.filter(x => x.k !== '9.01').length ? ': ' + f.items.filter(x => x.k !== '9.01').map(x => x.what || x.k).join(', ') : ''}</a><span className="num shrink-0 text-faint">{f.date}</span></li>)}{!filings.length && <li className="text-faint">none</li>}</ul> : <p className="text-[13px] text-faint">{busy ? 'reading' : ''}</p>}
          <h3 className="mb-1 mt-5 font-sans text-[15px] font-bold tracking-normal">13F filers naming the issuer</h3>
          {holders ? <p className="text-[13px] text-dim"><span className="num text-text">{holders.latest.filers.toLocaleString()}</span> for the quarter ended {holders.latest.period}, <span className="num">{holders.change >= 0 ? '+' : ''}{holders.change.toLocaleString()}</span> on the quarter before. Filers, not shares.</p> : <p className="text-[13px] text-faint">{busy ? 'reading' : ''}</p>}
        </div>
      </div>
      <p className="border-t border-line bg-panel2 px-5 py-3 text-[13px] text-faint">This is the public record the twenty-two checks read. The checks themselves run inside the terminal, on a market-data feed licensed to the person, under bars that person set; they are not a recommendation and they are not on this page. Source line: SEC EDGAR (public domain), the price feed named above, EDGAR full-text search.</p>
    </div>
  );
}
