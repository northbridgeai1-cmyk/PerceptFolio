import { Link } from 'react-router-dom';
import { Mark, Wordmark } from '@/components/Logo';
export function Footer() {
  const L = ({ to, children }: { to: string; children: React.ReactNode }) => <Link to={to} className="foot-link rounded-[8px] px-[10px] py-[6px] text-[14px] text-dim no-underline hover:bg-panel hover:text-text">{children}</Link>;
  return (
    <footer className="border-t border-line pt-10 pb-8">
      <div className="wrap">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <Link to="/" aria-label="PerceptFolio home" className="inline-flex items-center gap-[10px] text-text no-underline text-[17px]"><Mark /><Wordmark /></Link>
            <p className="mt-3 max-w-[70ch] text-[13.5px] leading-[1.6] text-faint">PerceptFolio is research software. It applies rules you set to public data and records the result. It is not a registered investment adviser or broker, takes no custody of assets, and nothing on this site or in the terminal is a recommendation to buy or sell any security.</p>
          </div>
          <div className="flex flex-wrap gap-[6px] md:justify-end"><L to="/#record">Record</L><L to="/#who">Who it's for</L><L to="/pricing">Pricing</L><L to="/#faq">Questions</L><L to="/#request">Request a demo</L></div>
        </div>
        <div className="mt-6 flex flex-wrap justify-between gap-4 border-t border-line pt-4 text-[13px] text-faint">
          <span>© {new Date().getFullYear()} NorthBridge Financial</span>
          <span><Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms of use</Link> · <Link to="/refunds">Refunds</Link></span>
        </div>
      </div>
    </footer>
  );
}
