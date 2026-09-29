import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { WORKER, SUPPORT, PLAN } from '@/lib/config';

/* THE PAGE STRIPE SENDS A BUYER TO (route: /welcome).

   What was here before was /thanks?type=purchase: a heading, one paragraph, and a button. It had two
   problems, and only one of them was that it looked thin.

   THE REAL PROBLEM WAS THAT IT GUESSED. It said "your code is on its way" because it had been loaded,
   which is not evidence of anything. A success URL is guessable, it stays in browser history, and a
   completed session can still have a payment that fails afterwards. So it said the same confident
   sentence whether the money arrived or not, and, while mail was unconfigured, it said "check your
   email" about an email that was never sent.

   So this page asserts nothing. It asks the worker at /checkout/confirm, which asks Stripe whether
   the session was paid and asks KV whether the webhook has minted a code and whether the code email
   actually went out. Three facts, three ticks, each one either true or visibly not.

   THE WEBHOOK RACE IS A STATE, NOT AN ERROR. Stripe can redirect a buyer here before the webhook has
   landed, which is a gap of a second or two. Showing "something went wrong" for that would be a lie
   in the other direction, so paid-but-not-yet-provisioned polls quietly, and only after 30 seconds
   does it become something worth telling support about.

   NO CODE ON THIS PAGE. It would be the nicest touch available and it is not allowed: the code is the
   only credential for the account, and anything this page can show is reachable by anyone who has the
   session id out of a URL bar, a shared screen or a referrer header. The code goes to the address that
   paid. The page names that address, masked, which answers the question the buyer actually has, which
   is "which of my inboxes".

   No paragraphs of explanation on screen: a status strip, a tile grid, and a source line. */

type Confirm = { ok?: boolean; paid?: boolean; provisioned?: boolean; mailed?: boolean | null; email?: string; plan?: string; trialDays?: number; trialEnd?: number | null; status?: string | null; error?: string };

const PLAN_LABEL: Record<string, string> = {
  'personal-monthly': 'The terminal, monthly',
  'personal-yearly': 'The terminal, yearly',
};

/* Three ticks with three states each, because "not yet" and "no" must not look the same. */
function Tick({ state }: { state: 'yes' | 'wait' | 'no' }) {
  const glyph = state === 'yes' ? '✔' : state === 'no' ? '✘' : '·';
  const tone = state === 'yes' ? 'text-[#4ade80]' : state === 'no' ? 'text-red' : 'text-faint';
  return <span aria-hidden="true" className={'font-mono text-[15px] leading-none ' + tone}>{glyph}</span>;
}

export function Welcome() {
  const [sp] = useState(() => new URLSearchParams(window.location.search));
  const sid = sp.get('session_id') || '';
  const [c, setC] = useState<Confirm | null>(null);
  const [tries, setTries] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.title = 'Welcome | PerceptFolio';
    return () => { document.title = 'PerceptFolio | A research terminal that keeps score on itself'; };
  }, []);

  /* One fetch, then a poll only while the answer is "paid, nothing minted yet". Fifteen tries at two
     seconds is thirty seconds, after which the page stops asking and says so rather than spinning
     against a webhook that is not coming. */
  useEffect(() => {
    if (!sid) return;
    let dead = false;
    (async () => {
      try {
        const r = await fetch(WORKER + '/checkout/confirm?session_id=' + encodeURIComponent(sid));
        const j: Confirm = await r.json();
        if (dead) return;
        setC(j);
        if (j && j.paid && !j.provisioned && tries < 15) timer.current = window.setTimeout(() => setTries(t => t + 1), 2000);
      } catch {
        if (!dead) setC({ error: 'network' });
      }
    })();
    return () => { dead = true; if (timer.current) window.clearTimeout(timer.current); };
  }, [sid, tries]);

  const loading = !!sid && c === null;
  const paid = !!(c && c.paid);
  const minted = !!(c && c.provisioned);
  const mailed = c && c.mailed;
  const stalled = paid && !minted && tries >= 15;
  /* A trial that turns into $760 on its own has to say so on the page it lands on, not only in an
     email that may go unopened for three days. The date is written out, and the amount is taken from
     the plan rather than hard-coded, so it cannot drift from what Stripe will actually charge. */
  const trialing = !!(c && c.status === 'trialing' && c.trialEnd);
  const yearly = !!(c && c.plan && c.plan.includes('yearly'));
  const amount = yearly ? '$' + PLAN.yearly.toLocaleString() : '$' + PLAN.monthly;
  const chargeOn = trialing && c && c.trialEnd
    ? new Date(c.trialEnd).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  /* The headline is the one thing on the page that changes shape, because it is the answer to "did
     that work", and every other element reads differently underneath each version of it. */
  const head = !sid ? 'Welcome to PerceptFolio.'
    : loading ? 'Checking your payment…'
    : c && c.error ? 'We could not reach the billing service.'
    : !paid ? 'That payment has not completed.'
    : minted && mailed === false ? 'Thank you. Your code needs one more step.'
    : minted && trialing ? 'Thank you. Your ' + ((c && c.trialDays) || 3) + ' days start now.'
    : minted ? 'Thank you. Your terminal is ready.'
    : stalled ? 'Payment received. Setting up is taking longer than it should.'
    : 'Payment received. Setting up your terminal…';

  const eyebrow = !sid ? 'Sign in' : !paid ? 'Checkout' : 'Payment received';

  return (
    <main id="main" className="wrap pt-[var(--spacing-sec)] pb-[var(--spacing-sec)]">
      <p className="mb-3 font-mono text-[12px] font-semibold uppercase tracking-[.14em] text-accent">{eyebrow}</p>
      <h1 className="mb-4 max-w-[20ch]">{head}</h1>

      {/* ---- the three facts, when there is a session to check them against ---- */}
      {sid && !loading && !(c && c.error) && (
        <ul className="mt-8 grid max-w-[560px] gap-px overflow-hidden rounded-[12px] border border-line bg-line" role="list">
          <li className="flex items-baseline gap-3 bg-panel px-5 py-[14px]">
            <Tick state={paid ? 'yes' : 'no'} />
            <span className="text-[15px]">{paid ? 'Payment taken' : 'Payment not completed'}</span>
            <span className="ml-auto font-mono text-[12.5px] text-faint">{(c && c.plan && PLAN_LABEL[c.plan]) || ''}</span>
          </li>
          <li className="flex items-baseline gap-3 bg-panel px-5 py-[14px]">
            <Tick state={minted ? 'yes' : paid && !stalled ? 'wait' : paid ? 'no' : 'wait'} />
            <span className="text-[15px]">{minted ? 'Access code created' : stalled ? 'Access code not created' : 'Creating your access code'}</span>
          </li>
          <li className="flex items-baseline gap-3 bg-panel px-5 py-[14px]">
            {/* null is "not recorded", which is not the same as "failed". The webhook always attempts
                the send, so only an explicit false is evidence of a failure; records written before
                the flag existed would otherwise show a waiting dot that never resolves. */}
            <Tick state={minted && mailed === false ? 'no' : minted ? 'yes' : 'wait'} />
            {/* The address goes in the middle of the failure sentence and at the end of the success
                one, so each reads as English rather than as a label with a value bolted on. */}
            <span className="text-[15px]">
              {minted && mailed === false
                ? <>The email to {c && c.email ? <b className="font-mono text-[13.5px] font-bold">{c.email}</b> : 'you'} did not go out</>
                : <>{minted ? 'Code emailed to' : 'Code will be emailed to'}{c && c.email ? <b className="ml-[6px] font-mono text-[13.5px] font-bold">{c.email}</b> : null}</>}
            </span>
          </li>
        </ul>
      )}

      {/* ---- the charge, said before anything else is offered ---- */}
      {minted && trialing && (
        <div className="mt-6 max-w-[560px] rounded-[12px] border border-[#5c4a1f] bg-[#221c0e] px-5 py-4">
          <p className="text-[15px] leading-[1.6] text-[#f0d79a]">
            Nothing has been charged. <b>{amount} on {chargeOn}</b>, unless you cancel before then.
          </p>
          <p className="mt-[6px] text-[13.5px] leading-[1.6] text-[#c8b285]">
            Cancelling is one click in your billing portal, in the terminal's settings. Cancel and you keep the terminal until the {(c && c.trialDays) || 3} days are up.
          </p>
        </div>
      )}

      {/* ---- what to do next, and it is always the same door ---- */}
      <div className="mt-9 flex flex-wrap items-center gap-4">
        <Button asChild variant="primary" size="lg"><a href="/enter/">Sign in with your code</a></Button>
        {!sid && <Button asChild variant="secondary" size="lg"><Link to="/#request">Request a demo</Link></Button>}
      </div>

      {/* ---- the one line that is allowed to be a sentence, because it is an instruction ---- */}
      <p className="mt-5 max-w-[62ch] text-[14.5px] leading-[1.6] text-dim">
        {!sid ? <>Type your access code at the door and choose a password for this device. Your book is kept on your account, not in this browser, so it follows you to the second device.</>
          : !paid && !loading ? <>Nothing has been charged. If you believe it was, write to <b>{SUPPORT}</b> with the time you paid and it will be checked against Stripe directly.</>
          : minted && mailed === false ? <>Your code exists and your account is live, but the email carrying it failed to send. Write to <b>{SUPPORT}</b> from <b>{c && c.email}</b> and it will be sent by hand, usually within the hour.</>
          : stalled ? <>Your payment is safe and nothing is lost. Write to <b>{SUPPORT}</b> with this page open and your code will be issued by hand.</>
          : minted ? <>The email takes under a minute, and carries the code and the charge date. Type the code at the door and choose a password for this device; the code works on two devices, and your book is kept on your account rather than in this browser.</>
          : <>This normally takes a second or two. The page is checking on its own; there is nothing to press.</>}
      </p>

      {/* ---- first three things worth doing, once they are in ---- */}
      {minted && (
        <section className="mt-16 border-t border-line pt-10" aria-labelledby="h-first">
          <h2 id="h-first" className="mb-8">Three things worth doing first</h2>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[12px] border border-line bg-line max-[880px]:grid-cols-1" role="list">
            {([
              ['Bring your history in', 'Export a CSV from your broker and drop it on the Positions screen. Headers are read automatically, whichever broker wrote them, so a year of trades becomes a year of marked calls.'],
              ['Make one call you will be held to', 'A direction, a target, a stop and a date. The terminal stores the price and the index at that instant, so being right cannot be re-decided later.'],
              ['Add the second device', 'Your phone, using the same code. The book is on your account, so both screens show the same thing without anything being exported.'],
            ] as const).map(([t, d]) => (
              <div key={t} className="bg-panel p-5" role="listitem">
                <h3 className="mb-2 font-display text-[16px] font-bold tracking-[-.01em]">{t}</h3>
                <p className="text-[14.5px] leading-[1.6] text-dim">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 font-mono text-[12px] text-faint">
            The record needs marked calls before it can say anything about your decisions. It will tell you how many, and how far off it is, on the day you start.
          </p>
        </section>
      )}

      {/* ---- the source line: what this page checked, and where ---- */}
      {sid && (
        <p className="mt-14 border-t border-line pt-5 font-mono text-[11.5px] leading-[1.7] text-faint">
          Checked against Stripe and your account
          {loading ? ', now' : c && c.error ? ' · unreachable' : ''}
          {tries > 0 && !minted ? ' · re-checked ' + tries + (tries === 1 ? ' time' : ' times') : ''}
          {' · your access code is never shown on this page, only emailed to the address that paid'}
        </p>
      )}
    </main>
  );
}
