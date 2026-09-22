import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PLANS } from '@/lib/config';

/* A1.6, A2.8. Who each plan is for comes before what it costs. Two plans, one primary action per
   card, yearly highlighted, the saving stated as a number. No product is named beside the price:
   the price rests on the record, the sizing and the attribution, and those are what the page
   explains. A business acceptance link (?business=TOKEN&seats=N) still carries the seat count the
   quote was for. When billing is not open the worker answers 503 and the page says so. */
const fmtDate = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function Pricing() {
  const [sp] = useSearchParams();
  const seats = Math.max(PLANS.business.seatsIncluded, parseInt(sp.get('seats') || '0', 10) || PLANS.business.seatsIncluded);
  const [yearly, setYearly] = useState(true);
  useEffect(() => { document.title = 'Pricing | PerceptFolio'; return () => { document.title = 'PerceptFolio | A research terminal that keeps score on itself'; }; }, []);
  const p = PLANS.personal, b = PLANS.business; const perMonth = (y: number) => (y / 12).toFixed(2);
  const extra = seats - b.seatsIncluded;
  return (
    <main id="main" className="wrap pt-[var(--spacing-sec)] pb-[var(--spacing-sec)]">
      <h1 className="mb-4 max-w-[16ch]">Two plans. One rulebook.</h1>
      <p className="lede">Who each plan is for comes first; the price follows. Both include the whole terminal, the record, and sync across your own devices. Cancel any time; a 14-day refund on either plan, no questions. Ask for access and the reply carries your exact price.</p>

      <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line max-[780px]:grid-cols-1" role="list" aria-label="Who each plan is for">
        <div className="bg-panel p-6" role="listitem"><h2 className="mb-2 text-[22px]">Personal is for the person who makes the call.</h2><p className="text-dim">A small number of positions held with conviction, each one explained to someone months later. Your rulebook, your book, your record.</p></div>
        <div className="bg-panel p-6" role="listitem"><h2 className="mb-2 text-[22px]">Business is for the desk that needs one standard.</h2><p className="text-dim">Three or more people making calls under one rulebook set by whoever runs the desk, every call carrying the name of the person who made it, and a record the firm can export and verify.</p></div>
      </div>

      <div className="mt-10 inline-flex rounded-[8px] border border-line2 p-1" role="group" aria-label="Billing period">
        {[['Yearly', true], ['Monthly', false]].map(([l, y]) => <button key={String(l)} type="button" onClick={() => setYearly(y as boolean)} aria-pressed={yearly === y} className={'rounded-[6px] px-4 py-2 text-[14px] font-semibold ' + (yearly === y ? 'bg-panel2 text-text' : 'text-dim hover:text-text')}>{l}</button>)}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-6 max-[780px]:grid-cols-1">
        <Card className={'p-7 ' + (yearly ? 'border-accent shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_0_0_1px_rgba(59,130,246,.25),0_24px_60px_-24px_rgba(0,0,0,.6)]' : '')}>
          <div className="flex items-baseline justify-between gap-3"><h2 className="text-[28px]">Personal</h2><span className="rounded-[6px] border border-line2 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-faint">Founding price</span></div>
          <p className="mt-2 text-dim">One person, one book, your own rules.</p>
          <div className="mt-6 flex items-baseline gap-2"><span className="num font-display text-[48px] font-black leading-none tracking-[-.03em]">${yearly ? p.yearly.toLocaleString() : p.monthly}</span><span className="text-dim">{yearly ? '/ year' : '/ month'}</span></div>
          <p className="mt-2 text-[14px] text-faint">{yearly ? `$${perMonth(p.yearly)} a month, $${(p.monthly * 12 - p.yearly).toLocaleString()} less than paying monthly.` : `Or $${p.yearly.toLocaleString()} a year.`}</p>
          <p className="mt-2 text-[14px] text-faint">Held for anyone who has paid it. Rises for new accounts after {fmtDate(p.foundingUntil)}.</p>
          <ul className="mt-6 space-y-2 text-[15px] text-dim">{['The 22 checks, the record, sizing and projections', 'Market data built in for US listings; your own Finnhub key if you prefer', 'Sync across your own devices under your code', 'Your evidence pack: calls, marks and the chain, exportable and verifiable', 'Your code by email once you confirm the quote'].map(x => <li key={x} className="flex gap-3"><span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />{x}</li>)}</ul>
          <Button asChild variant="primary" size="lg" className="mt-8 w-full"><Link to="/#request">Request access</Link></Button>
        </Card>
        <Card className="p-7">
          <h2 className="text-[28px]">Business</h2>
          <p className="mt-2 text-dim">One rulebook for the desk, every call attributed, the firm's record exportable.</p>
          <div className="mt-6 flex items-baseline gap-2"><span className="num font-display text-[48px] font-black leading-none tracking-[-.03em]">${yearly ? b.yearly.toLocaleString() : b.monthly}</span><span className="text-dim">{yearly ? '/ year' : '/ month'}</span></div>
          <p className="mt-2 text-[14px] text-faint">{yearly ? `${b.seatsIncluded} seats included; one month free against paying monthly.` : `${b.seatsIncluded} seats included. Or $${b.yearly.toLocaleString()} a year.`}{extra > 0 ? ` Your quote covers ${seats} seats; the ${extra} beyond ${b.seatsIncluded} are priced in the reply.` : ' Seats beyond three are quoted in the reply.'}</p>
          <ul className="mt-6 space-y-2 text-[15px] text-dim">{['Everything in Personal, for every seat', 'The org rulebook, set once, applied to every analyst, every change logged', 'Every call carries the name of the seat that made it', 'A reviewer seat for a principal or compliance, read-only', 'The firm evidence pack: every seat, one export, verifiable'].map(x => <li key={x} className="flex gap-3"><span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />{x}</li>)}</ul>
          <Button asChild variant="secondary" size="lg" className="mt-8 w-full"><Link to="/apply">Request seats for a firm</Link></Button>
        </Card>
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <h3 className="mb-5">What the price is for.</h3>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[12px] border border-line bg-line max-[780px]:grid-cols-1" role="list">
          {[['The record', 'Every verdict logged with the price and the index at that instant, marked on fixed horizons, hash-chained, and posted daily to a clock you do not control.'], ['The sizing', 'Five limits checked before money moves. Any one can say no, and the terminal shows which.'], ['The attribution', 'On a desk, every call carries the seat that made it and the rulebook version it was made under.']].map(([t, d]) => <div key={t} className="bg-panel p-5" role="listitem"><h4 className="mb-2 font-display text-[16px] font-bold tracking-[-.01em]">{t}</h4><p className="text-[14.5px] leading-[1.6] text-dim">{d}</p></div>)}
        </div>
        <p className="mt-6 text-[14px] text-faint">Prices in USD, tax added at checkout where it applies. Research software, not advice; the <Link to="/terms">terms</Link> say so plainly. Every price on this page is set in one place and matches the worker's quote.</p>
      </div>
    </main>
  );
}
