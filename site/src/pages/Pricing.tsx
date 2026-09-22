import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PLAN } from '@/lib/config';

/* One plan. Who it is for comes before what it costs; one primary action; the price stated once,
   monthly or yearly, with the saving as a number. No product is named beside the price: the
   price rests on the record, the sizing and the verification, and those are what the page
   explains. Quote-first: the reply carries the exact figure. */
export function Pricing() {
  const [yearly, setYearly] = useState(true);
  useEffect(() => { document.title = 'Pricing | PerceptFolio'; return () => { document.title = 'PerceptFolio | A research terminal that keeps score on itself'; }; }, []);
  const perMonth = (PLAN.yearly / 12).toFixed(2);
  return (
    <main id="main" className="wrap pt-[var(--spacing-sec)] pb-[var(--spacing-sec)]">
      <h1 className="mb-4 max-w-[16ch]">One terminal. One price.</h1>
      <p className="lede">For the person who makes the call and stands behind it. The whole terminal, the record, sync across your own devices, and the evidence pack. Cancel any time; a 14-day refund, no questions. Ask for access and the reply carries your exact price.</p>

      <div className="mt-10 inline-flex rounded-[8px] border border-line2 p-1" role="group" aria-label="Billing period">
        {[['Yearly', true], ['Monthly', false]].map(([l, y]) => <button key={String(l)} type="button" onClick={() => setYearly(y as boolean)} aria-pressed={yearly === y} className={'rounded-[6px] px-4 py-2 text-[14px] font-semibold ' + (yearly === y ? 'bg-panel2 text-text' : 'text-dim hover:text-text')}>{l}</button>)}
      </div>
      <div className="mt-8 grid grid-cols-[minmax(0,560px)_1fr] gap-6 max-[780px]:grid-cols-1">
        <Card className="border-accent p-7 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_0_0_1px_rgba(59,130,246,.25),0_24px_60px_-24px_rgba(0,0,0,.6)]">
          <h2 className="text-[28px]">The terminal</h2>
          <p className="mt-2 text-dim">One person, one book, your own rules, a record nobody can edit.</p>
          <div className="mt-6 flex items-baseline gap-2"><span className="num font-display text-[48px] font-black leading-none tracking-[-.03em]">${yearly ? PLAN.yearly.toLocaleString() : PLAN.monthly}</span><span className="text-dim">{yearly ? '/ year' : '/ month'}</span></div>
          <p className="mt-2 text-[14px] text-faint">{yearly ? `$${perMonth} a month, $${(PLAN.monthly * 12 - PLAN.yearly).toLocaleString()} less than paying monthly.` : `Or $${PLAN.yearly.toLocaleString()} a year, one month free.`}</p>
          <ul className="mt-6 space-y-2 text-[15px] text-dim">{['The 22 checks, the record, sizing, the review and projections', 'Market data built in for US listings; your own Finnhub key if you prefer', 'Sync across your own devices under your code', 'The record\u2019s server copy, if you want it, and your evidence pack: calls, marks and the chain, verifiable without an account', 'Your code by email once you confirm the quote'].map(x => <li key={x} className="flex gap-3"><span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />{x}</li>)}</ul>
          <Button asChild variant="primary" size="lg" className="mt-8 w-full"><Link to="/#request">Request access</Link></Button>
        </Card>
        <dl className="mt-[6px]">
          {[['Who it is for', 'You hold a small number of positions with conviction and are expected to explain each one, sometimes months later. You would rather be shown the arithmetic than told the answer.'], ['Who it is not for', 'Anyone looking for a tip, a signal, or a number that says how often it wins. It does not place trades and is not investment advice.'], ['What the reply contains', 'A demo on your own positions, then the price above and your access code, by email. If it is not the right tool for your work, you will be told that plainly.']].map(([t, d]) => <div key={t} className="border-b border-line pb-5 mb-5 last:mb-0 last:border-b-0 last:pb-0"><dt className="mb-[6px] font-display text-[16px] font-bold tracking-[-.01em]">{t}</dt><dd className="max-w-[48ch] text-[15px] leading-[1.6] text-dim">{d}</dd></div>)}
        </dl>
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <h3 className="mb-5">What the price is for.</h3>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[12px] border border-line bg-line max-[780px]:grid-cols-1" role="list">
          {[['The record', 'Every verdict logged with the price and the index at that instant, marked on fixed horizons, hash-chained, and posted daily to a clock you do not control.'], ['The sizing', 'Five limits checked before money moves. Any one can say no, and the terminal shows which.'], ['The verification', 'Export the evidence pack and check it on the verify page: no account, and no need to trust NorthBridge.']].map(([t, d]) => <div key={t} className="bg-panel p-5" role="listitem"><h4 className="mb-2 font-display text-[16px] font-bold tracking-[-.01em]">{t}</h4><p className="text-[14.5px] leading-[1.6] text-dim">{d}</p></div>)}
        </div>
        <p className="mt-6 text-[14px] text-faint">Prices in USD, tax added at checkout where it applies. Research software, not advice; the <Link to="/terms">terms</Link> say so plainly. The price on this page is set in one place and matches the worker's quote.</p>
      </div>
    </main>
  );
}
