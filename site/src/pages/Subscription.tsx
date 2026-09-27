import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SCREENS } from '@/lib/config';

/* WHAT A SUBSCRIPTION INCLUDES. No number (owner's decision, 2026-09-27).

   This replaced the pricing page. The terminals this one is measured against put no price on the
   web at all: the page sells what the thing does, and the figure arrives in a reply from a person
   who has read what you run. Two reasons that is the right trade here and not just imitation.

   The price is $760 a month. A number that size, read cold by someone who has not yet seen the
   record mark its own calls, is a reason to close the tab. The same number, after a demo on that
   person's own positions, is a different sentence.

   And the quote has always been the operator's to give. The site used to state the figure and then
   say the reply carried "your exact price", which invited exactly the haggling the one-plan
   decision existed to end. PLAN in lib/config.ts still holds the numbers, still matches the
   worker's quoteFor, and is still what the suite checks. It is simply not rendered here.

   Route: /subscription. /pricing still resolves to this page, because links and the sitemap
   carried that path for months and a 404 is a worse answer than a renamed page. */
export function Subscription() {
  useEffect(() => { document.title = 'The terminal | PerceptFolio'; return () => { document.title = 'PerceptFolio | A research terminal that keeps score on itself'; }; }, []);
  return (
    <main id="main" className="wrap pt-[var(--spacing-sec)] pb-[var(--spacing-sec)]">
      <p className="mb-3 font-mono text-[12px] font-semibold uppercase tracking-[.14em] text-accent">The terminal</p>
      <h1 className="mb-4 max-w-[18ch]">One subscription. One person. Everything in it.</h1>
      <p className="lede max-w-[62ch]">For the person who makes the call and is expected to explain it, sometimes months later. Ask for a demo and the reply carries the price, the terms, and a plain answer if this is not the right tool for your work.</p>
      <div className="mt-8"><Button asChild variant="primary" size="lg"><Link to="/#request">Request a demo</Link></Button></div>

      <section className="mt-16 border-t border-line pt-10" aria-labelledby="h-inc">
        <h2 id="h-inc" className="mb-2">What is included</h2>
        <p className="mb-8 max-w-[60ch] text-dim">Nothing is held back for a higher tier. There is no higher tier.</p>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[12px] border border-line bg-line max-[880px]:grid-cols-2 max-[600px]:grid-cols-1" role="list">
          {([
            ['The 22 checks', 'Twelve on quality, six on price, four on momentum. Each names what it measured, the bar it had to clear, and whether it cleared it.'],
            ['The record', 'Every verdict logged with the price and the index at that instant, marked on fixed horizons, hash-chained, and posted daily to a clock you do not control.'],
            ['Sizing', 'Five limits checked before money moves. Any one of them can say no, and the terminal shows you which one did.'],
            ['Market data', 'US listings, built in. Bring your own Finnhub key instead if you would rather.'],
            ['Two devices', 'A desk and a pocket, tied together by your access code. Your book follows you; nothing else does.'],
            ['The evidence pack', 'Calls, marks and the chain, exported as one file and checkable on the verify page by someone with no account and no reason to trust us.'],
          ] as const).map(([t, d]) => <div key={t} className="bg-panel p-5" role="listitem"><h3 className="mb-2 font-display text-[16px] font-bold tracking-[-.01em]">{t}</h3><p className="text-[14.5px] leading-[1.6] text-dim">{d}</p></div>)}
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-10" aria-labelledby="h-scr">
        <h2 id="h-scr" className="mb-2">{SCREENS.length} screens, each answering one question</h2>
        <p className="mb-8 max-w-[60ch] text-dim">A screen earns its place by answering a question you already have. If it cannot be written as a question, it is not in here.</p>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line max-[700px]:grid-cols-1" role="list">
          {SCREENS.map(s => <div key={s.id} className="bg-panel px-5 py-4" role="listitem"><h3 className="font-sans text-[15px] font-bold tracking-normal">{s.name}</h3><p className="mt-1 text-[14px] leading-[1.55] text-dim">{s.asks}</p></div>)}
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-10" aria-labelledby="h-not">
        <h2 id="h-not" className="mb-8">What it refuses to do</h2>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[12px] border border-line bg-line max-[780px]:grid-cols-1" role="list">
          {([
            ['It never places a trade', 'No broker is connected and none will be. The terminal reaches a verdict; moving money stays your act.'],
            ['It never quotes a win rate', 'A win rate hides the size of the wins. The record reports expectancy, with the interval around it, and says when there is not enough evidence yet.'],
            ['It never edits the past', 'A mark is hashed into a chain whose head is posted daily to a server clock. Rewriting yesterday is visible to anyone holding the pack.'],
          ] as const).map(([t, d]) => <div key={t} className="bg-panel p-5" role="listitem"><h3 className="mb-2 font-display text-[16px] font-bold tracking-[-.01em]">{t}</h3><p className="text-[14.5px] leading-[1.6] text-dim">{d}</p></div>)}
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-10" aria-labelledby="h-terms">
        <h2 id="h-terms" className="mb-8">Terms, before you ask</h2>
        <dl className="grid grid-cols-2 gap-x-10 max-[780px]:grid-cols-1">
          {([
            ['Billed', 'Monthly or yearly, in USD, by card. Tax added where it applies. The yearly rate is one month cheaper than twelve monthly ones.'],
            ['Refund', 'Fourteen days from any payment, no questions, including a renewal you meant to cancel.'],
            ['Cancel', 'Any time, from the billing portal in the terminal. Your export is yours to keep.'],
            ['Support', 'By email on weekdays, US Eastern, answered the same or the next business day. An incident reaches you by email, not a status page you have to remember to check.'],
          ] as const).map(([t, d]) => <div key={t} className="mb-5 border-b border-line pb-5 last:border-b-0"><dt className="mb-[6px] font-display text-[16px] font-bold tracking-[-.01em]">{t}</dt><dd className="max-w-[48ch] text-[15px] leading-[1.6] text-dim">{d}</dd></div>)}
        </dl>
        <p className="mt-2 text-[14px] text-faint">Research software, not investment advice, and not a broker-dealer. The <Link to="/terms">terms</Link> and the <Link to="/privacy">privacy policy</Link> say so plainly.</p>
      </section>

      <section className="mt-16 rounded-[12px] border border-line bg-panel p-8" aria-labelledby="h-cta">
        <h2 id="h-cta" className="mb-3 text-[28px]">See it on your own positions</h2>
        <p className="mb-6 max-w-[58ch] text-dim">A demo run on the names you actually hold, then the price and the terms by email. A person at NorthBridge reads every request.</p>
        <Button asChild variant="primary" size="lg"><Link to="/#request">Request a demo</Link></Button>
      </section>
    </main>
  );
}
