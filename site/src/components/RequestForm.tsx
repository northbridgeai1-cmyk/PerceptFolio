import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WORKER, CONTACT } from '@/lib/config';

/* The demo request. Posts to the worker; if the worker is unreachable the typed text goes to a
   mailto so nothing a visitor wrote is lost. Browser validation gates the submit. */
export function RequestForm() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: React.ReactNode } | null>(null);
  const [plan, setPlan] = useState<'personal' | 'business'>('personal');
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = e.currentTarget; const email = (f.elements.namedItem('email') as HTMLInputElement).value.trim(); const who = (f.elements.namedItem('who') as HTMLTextAreaElement).value.trim(); const call = ((f.elements.namedItem('call') as HTMLTextAreaElement).value || '').trim().slice(0, 300); const seats = plan === 'business' ? parseInt((f.elements.namedItem('seats') as HTMLInputElement).value, 10) || 3 : 1;
    const mailFallback = (note: string) => { location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent('PerceptFolio demo request') + '&body=' + encodeURIComponent('Email: ' + email + '\nFor: ' + (plan === 'business' ? 'a firm, ' + seats + ' seats' : 'myself') + '\n\nWho and what they run:\n' + who + (call ? '\n\nA call they would stand behind:\n' + call : '')); setMsg({ kind: 'ok', text: <>{note}Opening your mail client. If nothing happened, send the details to <b>{CONTACT}</b> directly.</> }); };
    setBusy(true); setMsg({ kind: 'ok', text: 'Sending…' });
    try {
      const r = await fetch(WORKER + '/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, who, call, plan, seats, at: Date.now() }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok !== false) { nav('/thanks?type=request'); return; }
      setMsg({ kind: 'err', text: j.error || 'That did not go through. Try again, or email us.' });
    } catch { mailFallback('The request queue is not reachable right now. '); }
    finally { setBusy(false); }
  };
  return (
    <Card><form onSubmit={onSubmit} autoComplete="off" className="p-6">
      <div className="mb-5"><Label htmlFor="email">Email <span className="text-red" aria-hidden="true">*</span></Label><Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" inputMode="email" /></div>
      <fieldset className="mb-5"><legend className="mb-2 block text-[14px] font-semibold">For</legend>
        <div className="flex flex-wrap gap-[18px]">{(['personal', 'business'] as const).map(v => <label key={v} className="inline-flex cursor-pointer items-center gap-2 text-[15px]"><input type="radio" name="plan" value={v} checked={plan === v} onChange={() => setPlan(v)} className="h-4 w-4 accent-accent" />{v === 'personal' ? 'Myself' : 'A firm'}</label>)}</div>
        {plan === 'business' && <div className="mt-[14px]"><Label htmlFor="seats">How many people will use it</Label><Input id="seats" name="seats" type="number" min={1} max={500} defaultValue={3} inputMode="numeric" autoFocus /><p className="mt-2 text-[13.5px] leading-normal text-faint">Three or more. Eight or more members get a lower price per seat; the quote will say so.</p></div>}
      </fieldset>
      <div className="mb-5"><Label htmlFor="who">Who you are, and what you run <span className="text-red" aria-hidden="true">*</span></Label><Textarea id="who" name="who" required placeholder="Your role, the size and style of the book, and what you want the terminal to do for it." /></div>
      <div className="mb-5"><Label htmlFor="call">A call you would stand behind <span className="font-normal text-faint">(optional)</span></Label><Textarea id="call" name="call" rows={2} placeholder="e.g. BUY NVDA, target 260, stop 190, by 2027-03-01, or leave blank" className="min-h-[64px]" /><p className="mt-2 text-[13.5px] leading-normal text-faint">Not required, and not scored. A claim with a target, a stop and a date is simply harder to argue with later than a paragraph is.</p></div>
      <Button type="submit" variant="primary" size="lg" disabled={busy}>Request a demo</Button>
      <p role="status" aria-live="polite" className={'mt-4 min-h-[1.5em] text-[14.5px] leading-normal ' + (msg?.kind === 'err' ? 'text-[#f87171]' : 'text-[#4ade80]')}>{msg?.text}</p>
    </form></Card>
  );
}
