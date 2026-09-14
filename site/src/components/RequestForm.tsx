import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WORKER, CONTACT } from '@/lib/config';

/* Access is by email. The form composes a structured message and opens the visitor's own mail app,
   so the request always arrives and nothing on this side has to send. A copy goes to the worker so
   admin lists it with plan and seats; if that fails, nothing is lost. */
export function RequestForm() {
  const nav = useNavigate(); const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<'personal' | 'business'>('personal'); const [msg, setMsg] = useState<React.ReactNode>(null);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const v = (k: string) => String(f.get(k) || '').trim();
    const name = v('name'), role = v('role'), email = v('email'), firm = v('firm'), book = v('book'), who = v('who'), call = v('call').slice(0, 300), when = v('when');
    const seats = plan === 'business' ? parseInt(v('seats'), 10) || 3 : 1;
    const lines = ['Name: ' + name, 'Role: ' + (role || '-'), 'Email: ' + email, 'Firm: ' + (firm || '-'), 'For: ' + (plan === 'business' ? 'a firm, ' + seats + ' seats' : 'myself'), '', 'The book:', book, '', 'What I want the terminal to do:', who, call ? '\nA call I would stand behind:\n' + call : '', when ? '\nBest time to talk: ' + when : '', '', '(Sent from perceptfolio.com)'];
    const subject = 'PerceptFolio access request: ' + name + (firm ? ', ' + firm : '') + (plan === 'business' ? ' (' + seats + ' seats)' : '');
    try { fetch(WORKER + '/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, who: [name, role, firm, '', book, '', who].filter(Boolean).join('\n'), call, plan, seats, at: Date.now() }), keepalive: true }).catch(() => {}); } catch { /* the email is the request */ }
    const fields: Record<string, string> = { Name: name, Role: role || '-', Email: email, Firm: firm || '-', For: plan === 'business' ? 'a firm, ' + seats + ' seats' : 'myself', 'The book': book, 'What they want the terminal to do': who, 'A call they would stand behind': call || '-', 'Best time to talk': when || '-' };
    const mailFallback = () => { setMsg(<>Opening your mail app with the request filled in. Press send there. If nothing opened, email <b>{CONTACT}</b> with the same details.</>); location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n')); };
    setBusy(true); setMsg('Sending…');
    try {
      const r = await fetch('https://formsubmit.co/ajax/' + CONTACT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ _subject: subject, _template: 'table', _replyto: email, _honey: '', ...fields }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && String(j.success) === 'true') { nav('/thanks?type=request'); return; }
      mailFallback();
    } catch { mailFallback(); } finally { setBusy(false); }
  };
  const F = ({ id, label, opt, children }: { id: string; label: string; opt?: boolean; children?: React.ReactNode }) => <div><Label htmlFor={id}>{label} {opt ? <span className="font-normal text-faint">(optional)</span> : <span className="text-red" aria-hidden="true">*</span>}</Label>{children}</div>;
  return (
    <Card><form onSubmit={onSubmit} autoComplete="off" className="p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1"><F id="name" label="Your name"><Input id="name" name="name" required maxLength={120} autoComplete="name" /></F><F id="role" label="Your role" opt><Input id="role" name="role" maxLength={120} placeholder="Portfolio manager, analyst, principal" /></F></div>
      <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1"><F id="email" label="Email"><Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" inputMode="email" /></F><F id="firm" label="Firm" opt><Input id="firm" name="firm" maxLength={120} autoComplete="organization" /></F></div>
      <fieldset><legend className="mb-2 block text-[14px] font-semibold">For</legend>
        <div className="flex flex-wrap gap-[18px]">{(['personal', 'business'] as const).map(p => <label key={p} className="inline-flex cursor-pointer items-center gap-2 text-[15px]"><input type="radio" name="plan" value={p} checked={plan === p} onChange={() => setPlan(p)} className="h-4 w-4 accent-accent" />{p === 'personal' ? 'Myself' : 'A firm'}</label>)}</div>
        {plan === 'business' && <div className="mt-[14px]"><Label htmlFor="seats">How many people will use it</Label><Input id="seats" name="seats" type="number" min={1} max={500} defaultValue={3} inputMode="numeric" autoFocus /><p className="mt-2 text-[13.5px] leading-normal text-faint">Three or more. Eight or more members get a lower price per seat; the quote will say so.</p></div>}
      </fieldset>
      <F id="book" label="The book"><Textarea id="book" name="book" required rows={2} className="min-h-[72px]" placeholder="Roughly how large, how many positions, what style: concentrated long, long/short, income, sector focus." /></F>
      <F id="who" label="What you want the terminal to do for it"><Textarea id="who" name="who" required placeholder="The decision you keep having to make, and what a written record of it would change." /></F>
      <F id="call" label="A call you would stand behind" opt><Textarea id="call" name="call" rows={2} className="min-h-[64px]" placeholder="e.g. BUY NVDA, target 260, stop 190, by 2027-03-01" /></F>
      <F id="when" label="Best time to talk" opt><Input id="when" name="when" maxLength={120} placeholder="Weekday mornings, US Eastern" /></F>
      <Button type="submit" variant="primary" size="lg" disabled={busy}>{busy ? 'Sending…' : 'Send the request'}</Button>
      <p className="text-[13.5px] leading-normal text-faint">Delivered to NorthBridge by email. Prefer to write it yourself? Email <a href={'mailto:' + CONTACT + '?subject=PerceptFolio%20access%20request'}>{CONTACT}</a> with the same details.</p>
      <p role="status" aria-live="polite" className="min-h-[1.5em] text-[14.5px] leading-normal text-[#4ade80]">{msg}</p>
    </form></Card>
  );
}
