import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mark, Wordmark } from '@/components/Logo';

/* Two orientation links and one action (Hick's law). The terminal link is not a choice a prospect
   needs, so it appears only when this browser already holds a profile. On /pricing the page owns
   the primary action, so the nav carries none. */
export function Nav() {
  const { pathname } = useLocation();
  const [hasProfile, setHasProfile] = useState(false);
  useEffect(() => {
    try { const p = JSON.parse(localStorage.getItem('quantfolio_v1') || 'null'); setHasProfile(!!(p && p.profiles && Object.keys(p.profiles).length)); } catch { /* no profile */ }
  }, []);
  const onPricing = pathname.startsWith('/pricing');
  return (
    <nav aria-label="Primary" className="sticky top-0 z-20 h-[60px] border-b border-line bg-[rgba(11,12,15,.86)] backdrop-blur-[10px] backdrop-saturate-[140%]">
      <div className="wrap flex h-full items-center justify-between gap-6">
        <Link to="/" aria-label="PerceptFolio home" className="inline-flex items-center gap-[10px] text-text no-underline text-[17px]"><Mark /><Wordmark /></Link>
        <div className="flex items-center gap-[6px]">
          <Link to="/#record" className="nav-link rounded-[8px] px-3 py-2 text-[15px] font-medium text-dim no-underline hover:bg-panel hover:text-text">Record</Link>
          <Link to="/pricing" className="nav-link rounded-[8px] px-3 py-2 text-[15px] font-medium text-dim no-underline hover:bg-panel hover:text-text">Pricing</Link>
          {hasProfile && <a href="/terminal/" className="nav-link rounded-[8px] px-3 py-2 text-[15px] font-medium text-dim no-underline hover:bg-panel hover:text-text">Resume session</a>}
          {!onPricing && <Button asChild variant="primary" className="ml-2"><Link to="/#request">Request a demo</Link></Button>}
        </div>
      </div>
    </nav>
  );
}
