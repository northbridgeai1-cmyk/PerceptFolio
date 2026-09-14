import { Badge } from '@/components/ui/badge';

/* The dashboard, as the hero. Built from the terminal's own tokens and the real sidebar (four tabs
   and More), showing the shape of the product and not its method: no check name, no threshold, no
   profit figure. Illustrative values, labelled. */
const Icon = ({ id }: { id: string }) => <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-current stroke-[1.9] [stroke-linecap:round] [stroke-linejoin:round]" aria-hidden="true"><use href={`#${id}`} /></svg>;

export function TerminalDashboard() {
  const tiles = [
    { l: 'Cash to invest', v: '$31,200', dot: '#3b82f6' },
    { l: 'Positions', v: '9', dot: '#949aa6' },
    { l: 'Market exposure', v: '0.78 β', dot: '#8b5cf6' },
    { l: 'Open calls', v: '6', dot: '#d9a441' },
  ];
  const rows: Array<[string, string, 'buy' | 'watch' | 'hold', string, string]> = [
    ['NVDA', '14.2%', 'watch', 'WATCH', 'since Jun'], ['MSFT', '11.8%', 'buy', 'BUY candidate', 'since Feb'], ['COST', '9.4%', 'hold', 'HOLD', 'since 2025'], ['LLY', '8.1%', 'buy', 'BUY candidate', 'since Aug'], ['ASML', '7.6%', 'watch', 'WATCH', 'since Mar'],
  ];
  return (
    <div className="stage relative mt-8 overflow-hidden pb-[var(--spacing-sec)] pl-[max(40px,calc((100%-1280px)/2+40px))] max-[900px]:pl-[28px] max-[900px]:pr-[28px] max-[600px]:px-5">
      <div role="img" aria-label="The PerceptFolio terminal on its dashboard. Portfolio value, cash to invest, positions, market exposure and open calls; a track-record card that says the first marks are still to come; and a list of positions, each with its verdict. Illustrative, not live data."
        className="relative w-[calc(100%+56px)] max-w-[1400px] overflow-hidden rounded-[16px] border border-tline bg-tbg text-[14px] leading-[1.45] text-text shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_30px_80px_-20px_rgba(0,0,0,.7),0_10px_24px_-12px_rgba(0,0,0,.5),0_0_0_1px_rgba(59,130,246,.06)] max-[900px]:w-full">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[120px] bg-gradient-to-r from-transparent to-[rgba(11,12,15,.55)] max-[900px]:hidden" />
        <div className="flex h-14 items-center gap-5 border-b border-tline pl-5 pr-[84px] max-[900px]:pr-4">
          <div className="flex items-center gap-[10px] font-mono text-[13px] font-bold uppercase tracking-[.08em]"><svg viewBox="0 0 40 40" width="24" height="24" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="37" rx="9" fill="none" stroke="#2b2f38" strokeWidth="1.5"/><text x="5" y="28" fontFamily="ui-monospace,Menlo,monospace" fontSize="21" fontWeight="700" fill="#f2f3f5">P</text><text x="20" y="28" fontFamily="ui-monospace,Menlo,monospace" fontSize="21" fontWeight="700" fill="#1f9e8c">F</text></svg><span>Percept<span className="text-brand2">Folio</span></span><span className="mx-1 h-[18px] w-px bg-tline" /><span className="font-semibold text-tmuted">Dashboard</span></div>
          <div className="mx-auto flex h-9 max-w-[520px] flex-1 items-center gap-[10px] rounded-[10px] border border-tline bg-tpanel px-[14px] text-tmuted max-[900px]:hidden"><svg viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-none stroke-current stroke-2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.2" y2="16.2"/></svg>Search a ticker… <span className="ml-auto opacity-60">/</span></div>
          <div className="ml-auto rounded-[6px] border border-tline bg-tbg px-[9px] py-[7px] font-mono text-[11px] uppercase tracking-[.06em] text-tmuted max-[600px]:hidden">Illustrative, not live</div>
          <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-tline font-mono text-[13px] font-semibold">T</div>
        </div>
        <div className="grid min-h-[560px] grid-cols-[230px_1fr] max-[900px]:grid-cols-1">
          <aside className="flex flex-col gap-[2px] border-r border-tline px-[10px] py-[14px] max-[900px]:hidden" aria-hidden="true">
            {[['i-dash', 'Dashboard', true], ['i-portfolio', 'Portfolio', false], ['i-analyzer', 'Analyzer', false], ['i-history', 'History', false]].map(([id, label, on]) => (
              <a key={String(label)} className={'relative flex items-center gap-3 rounded-[8px] px-3 py-[9px] font-mono text-[12px] font-semibold uppercase tracking-[.1em] no-underline ' + (on ? 'bg-tpanel2 text-text shadow-[inset_0_0_0_1px_rgba(31,158,140,.28),0_0_22px_-8px_rgba(31,158,140,.4)] before:absolute before:-left-[10px] before:top-2 before:bottom-2 before:w-[3px] before:bg-brand2 before:content-[""]' : 'text-tmuted')}><Icon id={String(id)} />{label}</a>
            ))}
            <a className="mt-[6px] flex items-center gap-3 rounded-[8px] px-3 py-[9px] font-mono text-[12px] font-semibold uppercase tracking-[.1em] text-tmuted no-underline"><svg viewBox="0 0 24 24" className="h-4 w-4 -rotate-90 fill-none stroke-current stroke-[1.9]" aria-hidden="true"><polyline points="14.5 18 8.5 12 14.5 6"/></svg>More</a>
          </aside>
          <div className="py-5 pl-[22px] pr-[84px] max-[900px]:px-4" aria-hidden="true">
            <div className="mb-4 mt-1"><h3 className="font-display text-[24px] font-extrabold leading-[1.1] tracking-[-.02em]">Good afternoon.</h3><p className="text-[14px] text-tmuted">Here's where things stand today.</p></div>
            <div className="grid grid-cols-[1.35fr_1fr] gap-[14px] max-[1100px]:grid-cols-1">
              <div className="rounded-[10px] border border-tline bg-tpanel px-5 py-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
                <span className="block font-mono text-[11px] uppercase tracking-[.12em] text-tmuted">Portfolio value</span>
                <b className="num mt-[10px] block font-mono text-[34px] font-bold leading-none tracking-[-.02em]">$248,310.55</b>
                <span className="mt-[6px] block text-[12px] text-tmuted">across 9 positions and cash</span>
                <div className="mt-4 grid grid-cols-2 gap-[10px]">
                  {tiles.map((t, i) => (
                    <div key={t.l} className="resolve relative rounded-[10px] border border-tline bg-tbg py-3 pl-[26px] pr-3 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]" style={{ ['--i' as string]: i }}>
                      <i className="absolute left-[11px] top-[15px] h-[6px] w-[6px] rounded-full" style={{ background: t.dot, boxShadow: `0 0 0 3px color-mix(in srgb, ${t.dot} 18%, transparent)` }} />
                      <span className="block font-mono text-[11px] uppercase tracking-[.12em] text-tmuted">{t.l}</span><b className="num mt-2 block font-mono text-[18px] font-bold leading-none">{t.v}</b>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col rounded-[10px] border border-tline bg-tpanel px-5 py-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
                <span className="block font-mono text-[11px] uppercase tracking-[.12em] text-tmuted"><i className="mr-2 inline-block h-[6px] w-[6px] rounded-full bg-amber align-[1px] shadow-[0_0_0_3px_rgba(217,164,65,.18)]" />Track record, 90-day marks</span>
                <b className="land mt-[14px] font-display text-[20px] font-bold leading-[1.2] tracking-[-.01em]">Awaiting first marks</b>
                <p className="mt-[10px] max-w-[34ch] text-[13px] leading-[1.55] text-tmuted">Six calls are logged. The first is marked on its own anniversary in December. Nothing is estimated from a shorter window to fill the space.</p>
                <div className="relative mt-auto h-[6px] border-b border-tline pt-[14px]"><i className="absolute -bottom-px left-0 h-[6px] w-[4%] rounded-[4px] bg-amber" /></div>
                <span className="num mt-[6px] block text-[12px] text-tmuted">0 of ~139 marked calls</span>
              </div>
            </div>
            <div className="mt-[14px] rounded-[10px] border border-tline bg-tpanel px-4 pb-[6px] pt-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
              <h4 className="mb-1 flex justify-between border-b border-tline pb-[10px] font-mono text-[11px] font-semibold uppercase tracking-[.12em] text-tmuted">Positions <b className="text-text">9</b></h4>
              {rows.map(([t, w, tone, label, s], i) => (
                <div key={t} className="resolve grid grid-cols-[70px_70px_1fr_auto] items-center gap-[14px] border-b border-[rgba(43,47,56,.6)] py-[9px] text-[13px] last:border-b-0 max-[600px]:grid-cols-[60px_56px_1fr] max-[600px]:gap-[10px]" style={{ ['--i' as string]: i + 4 }}>
                  <span className="font-mono text-[13px] font-bold">{t}</span><span className="num font-mono text-[13px] text-tmuted">{w}</span><span className="justify-self-start"><Badge tone={tone}>{label}</Badge></span><span className="text-[12px] text-tmuted max-[600px]:hidden">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
