import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WORKER, PLANS } from '@/lib/config';

/* A firm applies; Pierce accepts; the checkout link arrives with the acceptance. One action. */
export function Apply() {
  const nav = useNavigate(); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { document.title = 'Apply for seats | PerceptFolio'; }, []);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setErr('');
    try {
      const r = await fetch(WORKER + '/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firm: f.get('firm'), size: Number(f.get('size')), email: f.get('email'), contact: f.get('contact'), runs: f.get('runs'), website: f.get('website') }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { nav('/thanks?type=apply'); return; }
      setErr(j.error || 'That did not go through. Try again in a minute.');
    } catch { setErr('The application service is not reachable right now. Try again in a minute.'); }
    finally { setBusy(false); }
  };
  return (
    <main id="main" className="wrap pt-[var(--spacing-sec)] pb-[var(--spacing-sec)]">
      <div className="grid grid-cols-[minmax(0,560px)_1fr] items-start gap-[clamp(40px,6vw,96px)] max-[780px]:grid-cols-1">
        <div>
          <h1 className="mb-4">Seats for a firm.</h1>
          <p className="lede mb-8">Tell us about the desk. Someone reads every application and replies personally. If it fits, the reply carries a checkout link for the seats you need, ${PLANS.business.yearly.toLocaleString()} a seat yearly or ${PLANS.business.monthly} monthly, minimum {PLANS.business.minSeats}.</p>
          <Card><form onSubmit={onSubmit} autoComplete="off" className="p-6">
            <div className="mb-5"><Label htmlFor="firm">Firm</Label><Input id="firm" name="firm" required maxLength={120} placeholder="Harbor Row Capital" /></div>
            <div className="mb-5 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1"><div><Label htmlFor="contact">Your name</Label><Input id="contact" name="contact" required maxLength={120} autoComplete="name" /></div><div><Label htmlFor="size">Seats</Label><Input id="size" name="size" type="number" min={PLANS.business.minSeats} max={200} required defaultValue={PLANS.business.minSeats} inputMode="numeric" /></div></div>
            <div className="mb-5"><Label htmlFor="email">Work email</Label><Input id="email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@firm.com" /></div>
            <div className="mb-5"><Label htmlFor="runs">What the desk runs</Label><Textarea id="runs" name="runs" required maxLength={1500} placeholder="Size and style of the book, how many people make calls, and what you want one rulebook to change." /></div>
            <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <Button type="submit" variant="primary" size="lg" disabled={busy}>{busy ? 'Sending…' : 'Send application'}</Button>
            <p role="status" aria-live="polite" className="mt-4 min-h-[1.5em] text-[14.5px] text-[#f87171]">{err}</p>
          </form></Card>
        </div>
        <dl className="mt-2 max-[780px]:mt-0">
          {[['One rulebook', 'Whoever runs the desk sets the checks, the limits and the horizons once. Every analyst works inside them and can see them, not change them.'], ['Every call has a name', 'The record shows who made each call, when, at what price, and how it marked. Per-analyst and whole-firm views.'], ['Client books', 'Each seat can hold several client books, kept separate, each with its own record.'], ['Compliance export', 'Every call with its stamp, its checks and its mark, as CSV or JSON, whenever you need it.']].map(([t, d]) => <div key={t} className="mb-5 border-b border-line pb-5 last:mb-0 last:border-b-0 last:pb-0"><dt className="mb-[6px] font-display text-[16px] font-bold tracking-[-.01em]">{t}</dt><dd className="max-w-[48ch] text-[15px] leading-[1.6] text-dim">{d}</dd></div>)}
        </dl>
      </div>
    </main>
  );
}
