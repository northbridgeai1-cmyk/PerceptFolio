import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PLANS, COMPARISONS, BUSINESS_DISCOUNT } from '@/lib/config';

/* Two plans. One primary action per card, yearly highlighted, the saving stated as a number, the
   three named comparisons. A business acceptance link (?business=TOKEN&seats=N) turns the Business
   card's Apply into Pay. When billing is not open the worker answers 503 and the page says so. */
export function Pricing() {
  const [sp] = useSearchParams(); const seats = Math.max(PLANS.business.minSeats, parseInt(sp.get('seats') || '0', 10) || PLANS.business.minSeats); const disc = seats >= BUSINESS_DISCOUNT.minSeats ? BUSINESS_DISCOUNT.pct : 0;
  const [yearly, setYearly] = useState(true);
  useEffect(() => { document.title = 'Pricing | PerceptFolio'; return () => { document.title = 'PerceptFolio | A research terminal that keeps score on itself'; }; }, []);
  const p = PLANS.personal, b = PLANS.business; const perMonth = (y: number) => (y / 12).toFixed(2);
  return (
    <main id="main" className="wrap pt-[var(--spacing-sec)] pb-[var(--spacing-sec)]">
      <h1 className="mb-4 max-w-[16ch]">Two plans. One rulebook.</h1>
      <p className="lede">Both include the whole terminal, sync across your own devices, and the record. Yearly is two months free. Cancel any time; a 14-day refund on either plan, no questions. Ask for access and the reply carries your exact price.</p>
      <div className="mt-8 inline-flex rounded-[8px] border border-line2 p-1" role="group" aria-label="Billing period">
        {[['Yearly', true], ['Monthly', false]].map(([l, y]) => <button key={String(l)} type="button" onClick={() => setYearly(y as boolean)} aria-pressed={yearly === y} className={'rounded-[6px] px-4 py-2 text-[14px] font-semibold ' + (yearly === y ? 'bg-panel2 text-text' : 'text-dim hover:text-text')}>{l}</button>)}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-6 max-[780px]:grid-cols-1">
        <Card className={'p-7 ' + (yearly ? 'border-accent shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_0_0_1px_rgba(59,130,246,.25),0_24px_60px_-24px_rgba(0,0,0,.6)]' : '')}>
          <h2 className="text-[28px]">Personal</h2>
          <p className="mt-2 text-dim">One person, one book, your own rules.</p>
          <div className="mt-6 flex items-baseline gap-2"><span className="num font-display text-[48px] font-black leading-none tracking-[-.03em]">${yearly ? p.yearly.toLocaleString() : p.monthly}</span><span className="text-dim">{yearly ? '/ year' : '/ month'}</span></div>
          <p className="mt-2 text-[14px] text-faint">{yearly ? `$${perMonth(p.yearly)} a month, $${(p.monthly * 12 - p.yearly).toLocaleString()} less than paying monthly.` : `Or $${p.yearly.toLocaleString()} a year.`}</p>
          <ul className="mt-6 space-y-2 text-[15px] text-dim">{['The 22 checks, the record, sizing and projections', 'Sync across your own devices under your code', 'Your own free Finnhub key, connected in a guided first step', 'Your code by email once you confirm the quote'].map(x => <li key={x} className="flex gap-3"><span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />{x}</li>)}</ul>
          <Button asChild variant="primary" size="lg" className="mt-8 w-full"><Link to="/#request">Request access</Link></Button>
        </Card>
        <Card className="p-7">
          <h2 className="text-[28px]">Business</h2>
          <p className="mt-2 text-dim">Three seats or more. One rulebook for the desk, every call attributed.</p>
          <div className="mt-6 flex items-baseline gap-2"><span className="num font-display text-[48px] font-black leading-none tracking-[-.03em]">${yearly ? b.yearly.toLocaleString() : b.monthly}</span><span className="text-dim">/ seat {yearly ? '/ year' : '/ month'}</span></div>
          <p className="mt-2 text-[14px] text-faint">Minimum {b.minSeats} seats. {BUSINESS_DISCOUNT.minSeats} or more members: {BUSINESS_DISCOUNT.pct}% off every seat{disc ? `, so ${seats} seats is $${Math.round((yearly ? b.yearly : b.monthly) * (1 - disc / 100)).toLocaleString()} per seat` : ''}. The quote states it.</p>
          <ul className="mt-6 space-y-2 text-[15px] text-dim">{['Everything in Personal, for every seat', 'The org rulebook, set once, applied to every analyst', 'Every call carries the name of who made it', 'Client books, seat management, compliance export'].map(x => <li key={x} className="flex gap-3"><span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />{x}</li>)}</ul>
          <Button asChild variant="secondary" size="lg" className="mt-8 w-full"><Link to="/apply">Request seats for a firm</Link></Button>
        </Card>
      </div>
      <div className="mt-12 max-w-[64ch] border-t border-line pt-8">
        <h3 className="mb-3">What it sits beside.</h3>
        <p className="text-dim">Priced in the professional tier, not the institutional one. {COMPARISONS.map((c, i) => <span key={c.name}>{c.name} is {typeof c.monthly === 'number' ? `$${c.monthly}` : c.monthly} a month{c.note ? ` (${c.note})` : ''}{i < COMPARISONS.length - 1 ? '; ' : '.'}</span>)} None of them keeps a record of their own verdicts and marks it against the index. That is what the price is for.</p>
        <p className="mt-4 text-[14px] text-faint">Prices in USD, tax added at checkout where it applies. Research software, not advice; the <Link to="/terms">terms</Link> say so plainly.</p>
      </div>
    </main>
  );
}
