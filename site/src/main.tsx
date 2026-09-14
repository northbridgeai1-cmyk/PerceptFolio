import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import './index.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Landing } from '@/pages/Landing';
import { Pricing } from '@/pages/Pricing';
import { Apply } from '@/pages/Apply';
import { Thanks } from '@/pages/Thanks';
import { Terms, Privacy, Refunds, NotFound } from '@/pages/Legal';

/* Hash links inside a client-routed page need a hand: on navigation, scroll to the hash if there
   is one, otherwise to the top. */
function Scroll() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (hash) { const el = document.querySelector(hash); if (el) { el.scrollIntoView({ block: 'start' }); return; } } window.scrollTo(0, 0); }, [pathname, hash]);
  return null;
}
/* The terminal's icon sprite, reused verbatim in the dashboard facsimile. */
const Sprite = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs>
    <symbol id="i-dash" viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/></symbol>
    <symbol id="i-portfolio" viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="13.5" rx="2.2"/><path d="M8.5 7V5.2A1.7 1.7 0 0 1 10.2 3.5h3.6a1.7 1.7 0 0 1 1.7 1.7V7"/><line x1="2.5" y1="12.5" x2="21.5" y2="12.5"/></symbol>
    <symbol id="i-history" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 6.8 12 12 15.6 14"/></symbol>
    <symbol id="i-analyzer" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.2" y2="16.2"/></symbol>
  </defs></svg>
);
function App() {
  return (
    <BrowserRouter>
      <a href="#main" className="absolute -left-[9999px] top-3 z-[100] rounded-[8px] bg-text px-4 py-[10px] font-semibold text-bg focus:left-3">Skip to content</a>
      <Sprite /><Scroll /><Nav />
      <Routes>
        <Route path="/" element={<Landing />} /><Route path="/pricing" element={<Pricing />} /><Route path="/apply" element={<Apply />} /><Route path="/thanks" element={<Thanks />} />
        <Route path="/terms" element={<Terms />} /><Route path="/privacy" element={<Privacy />} /><Route path="/refunds" element={<Refunds />} /><Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
