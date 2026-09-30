import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WORKER, PLAN, SUPPORT } from '@/lib/config';

/* THE ONLY WAY IN, AS OF 2026-09-30.

   WHAT THIS REPLACED, AND WHY. There used to be two questionnaires. One on this site asked a
   stranger their role, their firm, the size of their book and the decision they keep having to make,
   so a person could read it and reply with a quote. The other is inside the terminal and asks the
   five questions that set their rules. The owner's point is unarguable: the first exists to qualify
   a buyer for a price that is now printed on the page, so it asks people to apply for something that
   is simply for sale.

   So: no demo, no queue, no quote, nobody reading anything. Card, three free days, then it bills.
   The operator does not approve accounts any more; Stripe's webhook mints the code and emails it,
   which it has done since the billing work landed and which nothing here changes.

   The price is on the page now. That reverses the quote-only decision of 2026-09-27, on purpose and
   on the owner's instruction: that decision was made for a $760 product sold to a narrow audience,
   and at $39 hiding the number only makes it look like there is something to hide.

   FAILURE IS SAID PLAINLY. Stripe can be misconfigured, the worker unreachable, a card refused.
   Each of those used to be an email going unanswered; now it is somebody who wanted to pay and
   could not, so the error names the support address rather than showing a spinner. */
export function StartButton({ plan = 'personal-monthly', size = 'lg', label, className }:
  { plan?: 'personal-monthly' | 'personal-yearly'; size?: 'lg' | 'sm'; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(WORKER + '/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || 'Checkout did not open.');
      window.location.href = j.url;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <Button variant="primary" size={size} onClick={go} disabled={busy}>
        {busy ? 'Opening…' : (label || 'Start, 3 days free')}
      </Button>
      {err ? <p className="mt-[8px] text-[13.5px] text-red">{err} Write to <b>{SUPPORT}</b> and it will be sorted by hand.</p> : null}
    </div>
  );
}

/* The price, in one place, said the same way everywhere. Two months free on the year is arithmetic
   ($39 x 12 = $468 against $390), not a slogan, so it is computed rather than written and cannot
   drift from the numbers beside it. */
export function PriceLine({ className }: { className?: string }) {
  const monthsFree = Math.round((PLAN.monthly * 12 - PLAN.yearly) / PLAN.monthly);
  return (
    <p className={className}>
      <b>${PLAN.monthly} a month</b>, or <b>${PLAN.yearly} a year</b>
      {monthsFree > 0 ? <> ({monthsFree === 1 ? 'one month' : monthsFree + ' months'} free)</> : null}.
      {' '}The first three days are free. Card up front, nothing charged until day four, cancel in one click before then.
    </p>
  );
}
