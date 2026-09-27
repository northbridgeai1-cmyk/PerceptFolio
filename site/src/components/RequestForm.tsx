import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WORKER, CONTACT } from '@/lib/config';

/* Access is by request. FormSubmit delivers the form to NorthBridge's inbox and the worker keeps its
   own copy for admin, so the visitor sends nothing: no mail app is ever opened, on success or on
   failure. A failure says so and leaves the form filled in. */
export function RequestForm() {
  const nav = useNavigate(); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<React.ReactNode>(null);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const v = (k: string) => String(f.get(k) || '').trim();
    const name = v('name'), role = v('role'), email = v('email'), firm = v('firm'), book = v('book'), who = v('who'), call = v('call').slice(0, 300), when = v('when');
    const subject = 'PerceptFolio access request: ' + name + (firm ? ', ' + firm : '');
    try { fetch(WORKER + '/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, who: [name, role, firm, '', book, '', who].filter(Boolean).join('\n'), call, at: Date.now() }), keepalive: true }).catch(() => {}); } catch { /* the email is the request */ }
    const fields: Record<string, string> = { Name: name, Role: role || '-', Email: email, Firm: firm || '-', 'The book': book, 'What they want the terminal to do': who, 'A call they would stand behind': call || '-', 'Best time to talk': when || '-' };
    /* FormSubmit delivers the request to the inbox and the worker keeps its own copy, so there is
       nothing for the visitor to send. A failure says so and leaves the form filled in; it never
       opens a mail app, which looked like the request had not arrived when it had. */
    const failed = () => setMsg(<>That did not go through. Try again in a moment; if it keeps failing, write to <b>{CONTACT}</b>.</>);
    setBusy(true); setMsg('Sending…');
    try {
      const r = await fetch('https://formsubmit.co/ajax/' + CONTACT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ _subject: subject, _template: 'table', _replyto: email, _honey: '', ...fields }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && String(j.success) === 'true') { nav('/thanks?type=request'); return; }
      failed();
    } catch { failed(); } finally { setBusy(false); }
  };
  const F = ({ id, label, opt, children }: { id: string; label: string; opt?: boolean; children?: React.ReactNode }) => <div><Label htmlFor={id}>{label} {opt ? <span className="font-normal text-faint">(optional)</span> : <span className="text-red" aria-hidden="true">*</span>}</Label>{children}</div>;
  return (
    <Card><form onSubmit={onSubmit} autoComplete="off" className="p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1"><F id="name" label="Your name"><Input id="name" name="name" required maxLength={120} autoComplete="name" /></F><F id="role" label="Your role" opt><Input id="role" name="role" maxLength={120} placeholder="Portfolio manager, analyst, principal" /></F></div>
      <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1"><F id="email" label="Email"><Input id="email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" inputMode="email" /></F><F id="firm" label="Firm" opt><Input id="firm" name="firm" maxLength={120} autoComplete="organization" /></F></div>
      <F id="book" label="The book"><Textarea id="book" name="book" required rows={2} className="min-h-[72px]" placeholder="Roughly how large, how many positions, what style: concentrated long, long/short, income, sector focus." /></F>
      <F id="who" label="What you want the terminal to do for it"><Textarea id="who" name="who" required placeholder="The decision you keep having to make, and what a written record of it would change." /></F>
      <F id="call" label="A call you would stand behind" opt><Textarea id="call" name="call" rows={2} className="min-h-[64px]" placeholder="e.g. BUY NVDA, target 260, stop 190, by 2027-03-01" /></F>
      <F id="when" label="Best time to talk" opt><Input id="when" name="when" maxLength={120} placeholder="Weekday mornings, US Eastern" /></F>
      <Button type="submit" variant="primary" size="lg" disabled={busy}>{busy ? 'Sending…' : 'Send the request'}</Button>
      <p className="text-[13.5px] leading-normal text-faint">This goes straight to NorthBridge's inbox when you press the button. Nothing else to send.</p>
      <p role="status" aria-live="polite" className="min-h-[1.5em] text-[14.5px] leading-normal text-[#4ade80]">{msg}</p>
    </form></Card>
  );
}
