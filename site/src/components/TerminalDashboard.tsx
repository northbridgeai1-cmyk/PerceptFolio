import { useEffect, useRef } from 'react';
/* The real dashboard, not a drawing of it. /preview/dashboard.html is a static snapshot of the
   terminal's own markup and styles on the sandbox account, scripts removed, regenerated whenever the
   dashboard changes. Rendered at 1440px and scaled to the container so it looks as it does on a
   desktop at every viewport. */
export function TerminalDashboard() {
  const box = useRef<HTMLDivElement>(null); const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const fit = () => { if (!box.current || !frame.current) return; const k = Math.min(1, box.current.clientWidth / 1440); frame.current.style.transform = `scale(${k})`; box.current.style.height = Math.round(Math.min(900, 620 / Math.max(k, .45)) * k) + 'px'; };
    fit(); const ro = new ResizeObserver(fit); if (box.current) ro.observe(box.current); return () => ro.disconnect();
  }, []);
  return (
    <div className="relative mt-8 overflow-hidden pb-[var(--spacing-sec)] pl-[max(40px,calc((100%-1280px)/2+40px))] max-[900px]:px-[28px] max-[600px]:px-5">
      <div ref={box} className="relative h-[620px] w-[calc(100%+56px)] max-w-[1400px] overflow-hidden rounded-[16px] border border-tline bg-tbg shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_30px_80px_-20px_rgba(0,0,0,.7),0_10px_24px_-12px_rgba(0,0,0,.5),0_0_0_1px_rgba(59,130,246,.06)] max-[900px]:w-full">
        <iframe ref={frame} src="/preview/dashboard.html" title="The PerceptFolio dashboard on a sample account. Portfolio value, cash to invest, gain and loss, the track-record card, and the growth chart. Illustrative, not live." loading="eager" tabIndex={-1} sandbox="allow-same-origin allow-scripts" scrolling="no" className="block h-[900px] w-[1440px] origin-top-left border-0 bg-tbg pointer-events-none" />
        <div className="absolute right-4 top-[14px] z-[2] rounded-[6px] border border-tline bg-tbg px-[9px] py-[7px] font-mono text-[11px] uppercase tracking-[.06em] text-tmuted">Illustrative, not live</div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[120px] bg-gradient-to-r from-transparent to-[rgba(11,12,15,.55)] max-[900px]:hidden" />
      </div>
    </div>
  );
}
