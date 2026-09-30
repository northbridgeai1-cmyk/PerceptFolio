import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StartButton } from '@/components/StartButton';
import { Mark, Wordmark } from '@/components/Logo';
import { SUPPORT } from '@/lib/config';

/* TWO BARS, ONE ACTION (2026-09-27, after reading how the enterprise terminals do it).

   A visitor and a subscriber want opposite things from this header, and mixing them cost both.
   "Have a code?" used to sit among the sales links, where a subscriber had to hunt for it and a
   prospect had to read past it. So the two audiences are split by row:

     utility row   the people who already pay: sign in, and support. Small, quiet, above the line.
     primary row   the people who do not: what the thing is, then ONE action.

   One action, everywhere, in one phrase: Start free. It is the only filled button on the site.
   Pricing has left the nav with the price itself; what a subscription includes is a product page
   now, not a number. A browser that has entered before gets Resume session in place of the demo
   button, because someone already inside is not being sold to. */
export function Nav() {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    try {
      if (/(^|; )pf_seen=1(;|$)/.test(document.cookie)) { setEntered(true); return; }
      const p = JSON.parse(localStorage.getItem('quantfolio_v1') || 'null'); setEntered(!!(p && p.profiles && Object.keys(p.profiles).length));
    } catch { /* not entered */ }
  }, []);
  const link = 'nav-link nav-sm-hide rounded-[8px] px-3 py-2 text-[15px] font-medium text-dim no-underline hover:bg-panel hover:text-text';
  return (
    <div className="sticky top-0 z-20">
      {/* The subscriber's row. Never the sales path. */}
      <div className="border-b border-line bg-[rgba(8,9,12,.92)] backdrop-blur-[10px]">
        <div className="wrap flex min-h-[34px] items-center justify-end gap-5 text-[12.5px]">
          {/* The full sentence wraps onto two rows on a phone, so the qualifier drops and the verb stays. */}
          <a href="/enter/" className="foot-link whitespace-nowrap text-faint no-underline hover:text-text"><span className="max-[480px]:hidden">Already have a code? </span>Sign in</a>
          <a href={'mailto:' + SUPPORT} className="foot-link text-faint no-underline hover:text-text max-[560px]:hidden">Support</a>
          <div role="group" aria-label="Language" className="inline-flex overflow-hidden rounded-[6px] border border-line2 font-mono text-[11px] font-semibold tracking-[.06em]">
            {(['en', 'es'] as const).map(l => <button key={l} type="button" data-lang-toggle={l} aria-pressed={l === 'en'} className="px-[7px] py-[3px] text-faint hover:text-text aria-pressed:bg-panel2 aria-pressed:text-text">{l.toUpperCase()}</button>)}
          </div>
        </div>
      </div>
      <nav aria-label="Primary" className="h-[60px] border-b border-line bg-[rgba(11,12,15,.86)] backdrop-blur-[10px] backdrop-saturate-[140%]">
        <div className="wrap flex h-full items-center justify-between gap-6">
          <Link to="/" aria-label="PerceptFolio home" className="inline-flex items-center gap-[10px] text-text no-underline text-[17px]"><Mark /><Wordmark /></Link>
          <div className="flex items-center gap-[6px]">
            <Link to="/subscription" className={link}>The terminal</Link>
            <Link to="/#record" className={link}>The record</Link>
            <Link to="/security" className={link}>Security</Link>
            {entered
              ? <Button asChild variant="primary" className="ml-2"><a href="/terminal/">Resume session</a></Button>
              : <StartButton size="sm" label="Start free" className="ml-2" />}
          </div>
        </div>
      </nav>
    </div>
  );
}
