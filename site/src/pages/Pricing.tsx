import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PLANS, COMPARISONS, WORKER, type PlanId } from '@/lib/config';

/* Two plans. One primary action per card, yearly highlighted, the saving stated as a number, the
   three named comparisons. A business acceptance link (?business=TOKEN&seats=N) turns the Business
   card's Apply into Pay. When billing is not open the worker answers 503 and the page says so. */
export function Pricing() {
  const [sp] = useSearchParams(); const token = sp.get('business'); const seats = Math.max(PLANS.business.minSeats, parseInt(sp.get('seats') || '0', 10) || PLANS.business.minSeats);
  const [yearly, setYearly] = useState(true); const [busy, setBusy] = useState<PlanId | null>(null); const [msg, setMsg] = useState('');
  useEffect(() => { document.title = 'Pricing | PerceptFolio'; return () => { document.title = 'PerceptFolio | A research terminal that keeps score on itself'; }; }, []);
  const checkout = async (plan: PlanId) => {
    setBusy(plan); setMsg('');
    try {
      const r = await fetch(WORKER + '/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, seats: plan.startsWith('business') ? seats : undefined, application: token || undefined }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) { location.href = j.url; return; }
      setMsg(j.error || 'Checkout is not available right now.');
    } catch { setMsg('Checkout is not reachable right now. Try again in a minute.'); }
    finally { setBusy(null); }
  };
  const p = PLANS.personal, b = PLANS.business; const perMonth = (y: number) => (y / 12).toFixed(2);
  return (
    <main id="main" className="wrap pt-[var(--spacing-sec)] pb-[var(--spacing-sec)]">
      <h1 className="mb-4 max-w-[16ch]">Two plans. One rulebook.</h1>
      <p className="lede">Both include the whole terminal, sync across your own devices, and the record. Yearly is two months free. Cancel any time; a 14-day refund on either plan, no questions.</p>
      <div className="mt-8 inline-flex rounded-[8px] border border-line2 p-1" role="group" aria-label="Billing period">
        {[['Yearly', true], ['Monthly', false]].map(([l, y]) => <button key={String(l)} type="button" onClick={() => setYearly(y as boolean)} aria-pressed={yearly === y} className={'rounded-[6px] px-4 py-2 text-[14px] font-semibold ' + (yearly === y ? 'bg-panel2 text-text' : 'text-dim hover:text-text')}>{l}</button>)}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
        <Card className={'p-7 ' + (!token && yearly ? 'border-accent shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_0_0_1px_rgba(59,130,246,.25),0_24px_60px_-24px_rgba(0,0,0,.6)]' : '')}>
          <h2 className="text-[28px]">Personal</h2>
          <p className="mt-2 text-dim">One person, one book, your own rules.</p>
          <div className="mt-6 flex items-baseline gap-2"><span className="num font-display text-[48px] font-black leading-none tracking-[-.03em]">${yearly ? p.yearly.toLocaleString() : p.monthly}</span><span className="text-dim">{yearly ? '/ year' : '/ month'}</span></div>
          <p className="mt-2 text-[14px] text-faint">{yearly ? `$${perMonth(p.yearly)} a month, $${(p.monthly * 12 - p.yearly).toLocaleString()} less than paying monthly.` : `Or $${p.yearly.toLocaleString()} a year.`}</p>
          <ul className="mt-6 space-y-2 text-[15px] text-dim">{['The 22 checks, the record, sizing and projections', 'Sync across your own devices under your code', 'Your own free Finnhub key, connected in a guided first step', 'Access within a minute of paying'].map(x => <li key={x} className="flex gap-3"><span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />{x}</li>)}</ul>
          <Button variant={token ? 'secondary' : 'primary'} size="lg" className="mt-8 w-full" onClick={() => checkout(yearly ? 'personal-yearly' : 'personal-monthly')} disabled={!!busy}>{busy?.startsWith('personal') ? 'Opening checkout…' : `Buy ${yearly ? 'yearly' : 'monthly'} access`}</Button>
        </Card>
        <Card className={'p-7 ' + (token ? 'border-accent shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_0_0_1px_rgba(59,130,246,.25),0_24px_60px_-24px_rgba(0,0,0,.6)]' : '')}>
          <h2 className="text-[28px]">Business</h2>
          <p className="mt-2 text-dim">Three seats or more. One rulebook for the desk, every call attributed.</p>
          <div className="mt-6 flex items-baseline gap-2"><span className="num font-display text-[48px] font-black leading-none tracking-[-.03em]">${yearly ? b.yearly.toLocaleString() : b.monthly}</span><span className="text-dim">/ seat {yearly ? '/ year' : '/ month'}</span></div>
          <p className="mt-2 text-[14px] text-faint">{token ? `Accepted for ${seats} seats: $${((yearly ? b.yearly : b.monthly) * seats).toLocaleString()} ${yearly ? 'a year' : 'a month'}.` : `Minimum ${b.minSeats} seats. By application; you pay after acceptance.`}</p>
          <ul className="mt-6 space-y-2 text-[15px] text-dim">{['Everything in Personal, for every seat', 'The org rulebook, set once, applied to every analyst', 'Every call carries the name of who made it', 'Client books, seat management, compliance export'].map(x => <li key={x} className="flex gap-3"><span className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />{x}</li>)}</ul>
          {token ? <Button variant="primary" size="lg" className="mt-8 w-full" onClick={() => checkout(yearly ? 'business-yearly' : 'business-monthly')} disabled={!!busy}>{busy?.startsWith('business') ? 'Opening checkout…' : `Pay for ${seats} seats, ${yearly ? 'yearly' : 'monthly'}`}</Button>
                 : <Button asChild variant="secondary" size="lg" className="mt-8 w-full"><Link to="/apply">Apply for seats</Link></Button>}
        </Card>
      </div>
      {msg && <p role="status" className="mt-4 text-[14.5px] text-[#f7c66b]">{msg}</p>}
      <div className="mt-12 max-w-[64ch] border-t border-line pt-8">
        <h3 className="mb-3">What it sits beside.</h3>
        <p className="text-dim">Priced in the professional tier, not the institutional one. {COMPARISONS.map((c, i) => <span key={c.name}>{c.name} is {typeof c.monthly === 'number' ? `$${c.monthly}` : c.monthly} a month{c.note ? ` (${c.note})` : ''}{i < COMPARISONS.length - 1 ? '; ' : '.'}</span>)} None of them keeps a record of their own verdicts and marks it against the index. That is what the price is for.</p>
        <p className="mt-4 text-[14px] text-faint">Prices in USD, tax added at checkout where it applies. Research software, not advice; the <Link to="/terms">terms</Link> say so plainly.</p>
      </div>
    </main>
  );
}
