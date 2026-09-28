import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WORKER, CONTACT } from '@/lib/config';

/* THE DEMO REQUEST, IN THREE STAGES (2026-09-27).

   The order is taken in shape, not in words, from how the enterprise terminals qualify: route the
   person first, ask who they are second, ask what they are trying to do last.

   Stage 1 is the one that was missing. Someone who already holds a code was being handed a sales
   form; now the first question sends them to the door instead, and they never see the rest. It also
   separates a firm that already subscribes from a stranger, which is the difference between a reply
   and a different reply.

   Stage 2 asks for a business email, a role and what they run. Free text was friendlier and told
   the operator almost nothing; a role and a book type is what makes the reply specific.

   Stage 3 is the only question that matters: the problem. One box, no format, stored verbatim.

   Delivery is unchanged and deliberate: FormSubmit puts it in NorthBridge's inbox and the worker
   keeps its own copy for admin, so the visitor sends nothing. No mail app is opened, on success or
   on failure. A failure says so and leaves the form filled in. */

const ROLES = ['Portfolio manager', 'Analyst', 'Principal or founder', 'Adviser', 'Private investor', 'Other'] as const;
const BOOKS = ['My own capital', 'A family office', 'A registered advisory', 'A fund', 'Other'] as const;

export function RequestForm() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<React.ReactNode>(null);
  /* null = not answered yet, so stage 2 stays closed and the form cannot be submitted blind. */
  const [holder, setHolder] = useState<string | null>(null);
  /* THE ADDRESS HAS TO BE ABLE TO RECEIVE A CODE. The whole flow ends in an email, so a typo costs
     the sale twice: they never get their code, and nobody learns why, because a bounce to our
     sender is not something anyone watches. Checked on blur rather than on every keystroke, which
     would call the worker once a letter, and again on the server at /request so a stale page or a
     script cannot get past it. */
  const [mailWarn, setMailWarn] = useState<React.ReactNode>(null);
  const checkEmail = async (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value.trim();
    setMailWarn(null);
    if (!v || !v.includes('@')) return;
    try {
      const r = await fetch(WORKER + '/checkemail?email=' + encodeURIComponent(v));
      const j = await r.json();
      if (j && j.ok === false) setMailWarn(j.suggest
        ? <>Did you mean <button type="button" className="underline" onClick={() => { e.target.value = j.suggest; setMailWarn(null); }}>{j.suggest}</button>?</>
        : j.why);
    } catch { /* the server checks again on submit */ }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget); const v = (k: string) => String(f.get(k) || '').trim();
    const name = v('name'), role = v('role'), email = v('email'), firm = v('firm'), runs = v('runs'), book = v('book'), who = v('who'), call = v('call').slice(0, 300), when = v('when');
    const subject = 'PerceptFolio demo request: ' + name + (firm ? ', ' + firm : '');
    try { fetch(WORKER + '/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, who: [name, role, firm, runs, '', book, '', who].filter(Boolean).join('\n'), call, at: Date.now() }), keepalive: true }).catch(() => {}); } catch { /* the delivery below is the request */ }
    const fields: Record<string, string> = { Name: name, Role: role || '-', Email: email, Firm: firm || '-', 'Used it before': holder || '-', 'What they run': runs || '-', 'The book': book, 'The problem': who, 'A call they would stand behind': call || '-', 'Best time to talk': when || '-' };
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
  const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <fieldset className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <p className="mb-5 flex items-center gap-3"><span className="inline-grid h-[22px] w-[22px] place-items-center rounded-full bg-panel2 font-mono text-[12px] font-bold text-dim">{n}</span><span className="font-display text-[17px] font-bold tracking-[-.01em]">{title}</span></p>
      <div className="space-y-5">{children}</div>
    </fieldset>
  );
  const sel = 'w-full rounded-[8px] border border-line2 bg-panel2 px-3 py-[10px] text-[15px] text-text';

  /* Someone who already holds a code is sent to the door, not sold to. */
  if (holder === 'code') return (
    <Card><div className="p-8">
      <h3 className="mb-3 font-display text-[22px] font-bold tracking-[-.01em]">Your code is the way in.</h3>
      <p className="mb-6 max-w-[54ch] text-[15px] leading-[1.6] text-dim">Type it at the door and choose a password for this device. If you have mislaid it, write to {CONTACT} from the address on the account and it will be sent again.</p>
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild variant="primary" size="lg"><a href="/enter/">Sign in with your code</a></Button>
        <button type="button" onClick={() => setHolder(null)} className="text-[14.5px] text-dim underline underline-offset-[.2em] decoration-line2 hover:text-text">No, I am asking for access</button>
      </div>
    </div></Card>
  );

  return (
    <Card><form onSubmit={onSubmit} autoComplete="off" className="space-y-8 p-6">
      <Step n={1} title="Have you used PerceptFolio before?">
        <div role="radiogroup" aria-label="Have you used PerceptFolio before?" className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
          {([['new', 'No, this is the first time'], ['seen', 'I have seen a demo'], ['firm', 'Someone I work with subscribes'], ['code', 'Yes, I already have an access code']] as const).map(([k, l]) =>
            <button key={k} type="button" role="radio" aria-checked={holder === k} onClick={() => setHolder(k)}
              className={'rounded-[8px] border px-4 py-3 text-left text-[14.5px] ' + (holder === k ? 'border-accent bg-panel2 text-text' : 'border-line2 text-dim hover:border-line hover:text-text')}>{l}</button>)}
        </div>
      </Step>

      {holder && holder !== 'code' && <>
        <Step n={2} title="Tell us about yourself">
          <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
            <F id="name" label="Your name"><Input id="name" name="name" required maxLength={120} autoComplete="name" /></F>
            <F id="role" label="Your role"><select id="role" name="role" required defaultValue="" className={sel}><option value="" disabled>Choose one</option>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></F>
          </div>
          <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
            <F id="email" label="Business email"><Input id="email" name="email" type="email" required placeholder="you@firm.com" autoComplete="email" inputMode="email" onBlur={checkEmail} />
              {mailWarn ? <p className="mt-[6px] text-[13.5px] text-red">{mailWarn}</p> : null}</F>
            <F id="firm" label="Firm" opt><Input id="firm" name="firm" maxLength={120} autoComplete="organization" /></F>
          </div>
          <F id="runs" label="What you run"><select id="runs" name="runs" required defaultValue="" className={sel}><option value="" disabled>Choose one</option>{BOOKS.map(b => <option key={b} value={b}>{b}</option>)}</select></F>
        </Step>

        <Step n={3} title="Tell us what you are trying to do">
          <F id="book" label="The book"><Textarea id="book" name="book" required rows={2} className="min-h-[72px]" placeholder="Roughly how large, how many positions, what style: concentrated long, long/short, income, sector focus." /></F>
          <F id="who" label="The decision you keep having to make"><Textarea id="who" name="who" required placeholder="What you keep having to decide, and what a written record of it would change." /></F>
          <F id="call" label="A call you would stand behind" opt><Textarea id="call" name="call" rows={2} className="min-h-[64px]" placeholder="e.g. BUY NVDA, target 260, stop 190, by 2027-03-01" /></F>
          <F id="when" label="Best time to talk" opt><Input id="when" name="when" maxLength={120} placeholder="Weekday mornings, US Eastern" /></F>
        </Step>

        <div className="space-y-4 border-t border-line pt-6">
          <Button type="submit" variant="primary" size="lg" disabled={busy}>{busy ? 'Sending…' : 'Request a demo'}</Button>
          <p className="text-[13.5px] leading-normal text-faint">This goes straight to NorthBridge's inbox when you press the button. Nothing else to send.</p>
        </div>
      </>}

      <p role="status" aria-live="polite" className="min-h-[1.5em] text-[14.5px] leading-normal text-[#4ade80]">{msg}</p>
    </form></Card>
  );
}
