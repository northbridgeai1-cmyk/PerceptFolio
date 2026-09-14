import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

/* The marking demo. Real closes, hidden ticker, fixed horizon, marked against SPY: the same
   arithmetic the terminal runs on its own verdicts, on a dataset small enough to ship. A port of
   the vanilla demo; the numbers and the words are unchanged. */
type Data = { dates: string[]; series: Record<string, number[]> };
declare global { interface Window { PF_DEMO?: Data } }
const VISIBLE = 120, HORIZONS = [30, 90, 180];

function loadData(): Promise<Data> {
  if (window.PF_DEMO) return Promise.resolve(window.PF_DEMO);
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/demo/data.js'; s.onload = () => window.PF_DEMO ? res(window.PF_DEMO) : rej(new Error('dataset empty')); s.onerror = () => rej(new Error('could not load the dataset')); document.head.appendChild(s); });
}
function draw(cv: HTMLCanvasElement, closes: number[], fwd: number[] | null, target: number | null) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; if (!(w > 0 && h > 0)) return;
  cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext('2d')!; g.scale(dpr, dpr); g.clearRect(0, 0, w, h);
  const all = closes.concat(fwd || []).concat(target ? [target] : []); let lo = Math.min(...all), hi = Math.max(...all); const pad = (hi - lo) * .12 || 1; lo -= pad; hi += pad;
  const total = closes.length + ((fwd && fwd.length) || 0); const X = (i: number) => 8 + (i / (total - 1)) * (w - 16), Y = (v: number) => h - 10 - ((v - lo) / (hi - lo)) * (h - 20);
  if (target) { g.strokeStyle = 'rgba(217,164,65,.55)'; g.setLineDash([4, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(0, Y(target)); g.lineTo(w, Y(target)); g.stroke(); g.setLineDash([]); }
  g.strokeStyle = '#3b82f6'; g.lineWidth = 1.6; g.beginPath(); closes.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
  if (fwd && fwd.length) {
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(closes.length - 1), 0); g.lineTo(X(closes.length - 1), h); g.stroke();
    const up = fwd[fwd.length - 1] >= closes[closes.length - 1]; g.strokeStyle = up ? '#2ea043' : '#e5534b'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(X(closes.length - 1), Y(closes[closes.length - 1])); fwd.forEach((v, i) => g.lineTo(X(closes.length + i), Y(v))); g.stroke();
  }
}
function say(edge: number, hit: boolean, stockRet: number, spyRet: number, dir: string) {
  if (edge > 0 && stockRet > 0 && spyRet > 0 && dir === 'BUY') return <>It rose <b>and</b> beat the index. Both halves are needed, a rise that trails the S&amp;P is a position you would have done better without.</>;
  if (edge > 0) return <>The call earned its place against the benchmark, which is the only comparison that decides whether holding it was worth doing.</>;
  if (stockRet > 0 && dir === 'BUY') return <>It went <b>up</b>, and you were still behind the index. This is the outcome that flatters every tool that reports raw return, and it is why the scorecard reports edge against the market instead.</>;
  if (!hit) return <>The target was never touched and the horizon expired. Neither right nor wrong, the thesis simply never happened, and the money sat there. That is the third outcome most tools never show you.</>;
  return <>Marked against the index and it did not work. Recorded as-is: this is the number the terminal would show you, whether or not it flattered the system.</>;
}
type Cur = { sym: string; cut: number; price: number };
type Mark = { stockRet: number; spyRet: number; edge: number; hit: boolean; hz: number; sym: string; tgt: number; path: number[] };

export function Demo() {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'dealt' | 'marked' | 'summary' | 'error'>('idle');
  const [data, setData] = useState<Data | null>(null);
  const [cur, setCur] = useState<Cur | null>(null);
  const [dir, setDir] = useState('BUY'); const [hz, setHz] = useState(90); const [tgt, setTgt] = useState('');
  const [mark, setMark] = useState<Mark | null>(null); const [marks, setMarks] = useState<number[]>([]); const [err, setErr] = useState('');
  const cv = useRef<HTMLCanvasElement>(null);
  const closes = data && cur ? data.series[cur.sym].slice(cur.cut - VISIBLE, cur.cut + 1) : null;

  const deal = (d: Data) => { const names = Object.keys(d.series).filter(t => t !== 'SPY'); const sym = names[Math.floor(Math.random() * names.length)]; const n = d.dates.length, maxH = Math.max(...HORIZONS); const lo = VISIBLE, hi = n - maxH - 1; const cut = lo + Math.floor(Math.random() * (hi - lo)); const price = d.series[sym][cut]; setCur({ sym, cut, price }); setTgt((price * 1.1).toFixed(2)); setDir('BUY'); setHz(90); setMark(null); setPhase('dealt'); };
  const start = async () => { setPhase('loading'); try { const d = await loadData(); setData(d); deal(d); } catch (e) { setErr((e as Error).message); setPhase('error'); } };
  const doMark = () => {
    if (!data || !cur) return; const t = parseFloat(tgt); if (!isFinite(t) || t <= 0) return;
    const end = cur.cut + hz, px = data.series[cur.sym], spy = data.series.SPY;
    const stockRet = (px[end] - px[cur.cut]) / px[cur.cut] * 100, spyRet = (spy[end] - spy[cur.cut]) / spy[cur.cut] * 100, alpha = stockRet - spyRet, edge = dir === 'BUY' ? alpha : -alpha;
    const path = px.slice(cur.cut + 1, end + 1); const hit = dir === 'BUY' ? Math.max(...path) >= t : Math.min(...path) <= t;
    setMarks(m => [...m, edge]); setMark({ stockRet, spyRet, edge, hit, hz, sym: cur.sym, tgt: t, path }); setPhase('marked');
  };
  useEffect(() => {
    if (!cv.current || !closes) return; const t = parseFloat(tgt);
    const paint = () => draw(cv.current!, closes, phase === 'marked' && mark ? mark.path : null, phase === 'marked' && mark ? mark.tgt : (isFinite(t) && t > 0 ? t : null));
    paint(); const ro = new ResizeObserver(paint); ro.observe(cv.current); return () => ro.disconnect();
  }, [closes, tgt, phase, mark]);

  const n = marks.length, mean = n ? marks.reduce((a, b) => a + b, 0) / n : 0, wins = marks.filter(e => e > 0).length;
  const sd = n > 1 ? Math.sqrt(marks.reduce((a, e) => a + (e - mean) ** 2, 0) / (n - 1)) : 0, se = n > 1 ? sd / Math.sqrt(n) : null, lo = se != null ? mean - 1.96 * se : null, hi = se != null ? mean + 1.96 * se : null;
  const fmt = (v: number, u = '%') => (v >= 0 ? '+' : '') + v.toFixed(1) + u;
  const Num = ({ v, l, tone }: { v: string; l: string; tone?: 'pos' | 'neg' }) => <div className="rounded-[8px] border border-line bg-bg px-4 py-[14px]"><div className={'num font-mono text-[20px] font-bold leading-none ' + (tone === 'pos' ? 'text-[#4ade80]' : tone === 'neg' ? 'text-[#f87171]' : '')}>{v}</div><div className="mt-2 font-mono text-[11px] uppercase tracking-[.1em] text-faint">{l}</div></div>;

  return (
    <Card id="demo" className="mt-8 overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-[18px]"><h3 className="text-[18px]">Make a call on real history</h3>
        {n > 0 && <span className="num font-mono text-[12px] text-faint">your record: <b>{wins}/{n}</b> · expectancy <b className={mean >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}>{fmt(mean, 'pts')}</b></span>}</div>
      <div className="p-6">
        {(phase === 'idle' || phase === 'loading' || phase === 'error') && (
          <>
            <div className="mb-5" aria-hidden="true"><div className="flex h-[180px] items-end gap-[6px] rounded-[8px] border border-line bg-bg p-3">{[38, 52, 46, 61, 55, 70, 64, 58, 74, 69, 80, 72, 66, 78, 84, 76].map((h, i) => <Skeleton key={i} className="flex-1 rounded-[4px_4px_0_0] bg-gradient-to-b from-panel2 to-line" style={{ height: h + '%' }} />)}</div><div className="mt-3 flex gap-3"><Skeleton className="h-3 w-[28%]" /><Skeleton className="h-3 w-[18%]" /><Skeleton className="h-3 w-[22%]" /></div></div>
            <Button variant="primary" onClick={start} disabled={phase === 'loading'}>{phase === 'loading' ? 'Loading three years of closes…' : 'Deal me a series'}</Button>
            {phase === 'error' && <p className="mt-3 text-[14px] text-red">Could not load the dataset ({err}). The rest of the page is unaffected.</p>}
          </>
        )}
        {(phase === 'dealt' || phase === 'marked') && cur && (
          <>
            <canvas ref={cv} className="block h-[240px] w-full rounded-[8px] border border-line bg-bg max-[600px]:h-[180px]" />
            {phase === 'dealt' ? (
              <>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  {[['Series', '#' + (cur.cut % 997 + 103)], ['Price now', cur.price.toFixed(2)]].map(([l, v]) => <label key={l} className="flex flex-col gap-[6px]"><span className="font-mono text-[12px] uppercase tracking-[.08em] text-faint">{l}</span><input value={v} disabled className="min-w-[120px] rounded-[8px] border border-line2 bg-bg px-3 py-[9px] text-text opacity-70" /></label>)}
                  <label className="flex flex-col gap-[6px]"><span className="font-mono text-[12px] uppercase tracking-[.08em] text-faint">Call</span><select value={dir} onChange={e => setDir(e.target.value)} className="min-w-[120px] rounded-[8px] border border-line2 bg-bg px-3 py-[9px]"><option>BUY</option><option>SELL</option></select></label>
                  <label className="flex flex-col gap-[6px]"><span className="font-mono text-[12px] uppercase tracking-[.08em] text-faint">Target $</span><input type="number" step="any" value={tgt} onChange={e => setTgt(e.target.value)} className="min-w-[120px] rounded-[8px] border border-line2 bg-bg px-3 py-[9px]" /></label>
                  <label className="flex flex-col gap-[6px]"><span className="font-mono text-[12px] uppercase tracking-[.08em] text-faint">Horizon</span><select value={hz} onChange={e => setHz(parseInt(e.target.value, 10))} className="min-w-[120px] rounded-[8px] border border-line2 bg-bg px-3 py-[9px]">{HORIZONS.map(h => <option key={h} value={h}>{h} days</option>)}</select></label>
                  <Button variant="primary" onClick={doMark}>Mark it</Button>
                </div>
                <p className="mt-3 max-w-[64ch] text-[13.5px] text-faint">Real daily closes, ticker hidden until the mark. The dashed line is your target. Nothing here is a recommendation about any security.</p>
              </>
            ) : mark && (
              <>
                <div className="mt-5"><div className={'font-display text-[24px] font-extrabold tracking-[-.02em] ' + (mark.edge > 0 ? 'text-[#4ade80]' : 'text-[#f87171]')}>{mark.edge > 0 ? 'Right, and ahead of the index.' : 'Wrong against the index.'}</div>
                  <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3"><Num v={fmt(mark.stockRet)} l={`the series, ${mark.hz}d`} tone={mark.stockRet >= 0 ? 'pos' : 'neg'} /><Num v={fmt(mark.spyRet)} l="S&P, same days" tone={mark.spyRet >= 0 ? 'pos' : 'neg'} /><Num v={fmt(mark.edge, 'pts')} l="your edge" tone={mark.edge > 0 ? 'pos' : 'neg'} /><Num v={mark.hit ? 'yes' : 'no'} l="target touched" /><Num v={mark.sym} l="it was" /></div>
                  <p className="mt-5 max-w-[64ch] text-dim">{say(mark.edge, mark.hit, mark.stockRet, mark.spyRet, dir)}</p></div>
                <div className="mt-4 flex flex-wrap items-center gap-4"><Button variant="primary" onClick={() => data && deal(data)}>Deal another</Button><Button variant="link" onClick={() => setPhase('summary')}>I have seen enough</Button></div>
              </>
            )}
          </>
        )}
        {phase === 'summary' && (
          <>
            <div className="font-display text-[24px] font-extrabold tracking-[-.02em]">{wins} of {n} right · expectancy <span className={mean >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}>{(mean >= 0 ? '+' : '') + mean.toFixed(2)}pts</span> per call</div>
            <p className="mt-3 max-w-[64ch] text-dim">{n < 3 ? `On ${n} call${n === 1 ? '' : 's'} this number means nothing at all, and it is worth sitting with that. ` : (lo! < 0 && hi! > 0 ? <>The 95% interval runs {lo!.toFixed(1)} to +{hi!.toFixed(1)} and <b>crosses zero</b>, so on this evidence you are indistinguishable from chance. </> : `The 95% interval is ${lo!.toFixed(1)} to ${hi!.toFixed(1)}, which does not cross zero. On this handful of calls that is a real signal, and a handful is still a handful. `)}That is the entire idea. The terminal does this to every verdict it issues, on fixed horizons set in advance that cannot be moved afterwards, and reports the answer whether or not it flatters the system. <b>Its own scorecard is empty</b>, because a record cannot be reconstructed backwards.</p>
            <p className="mt-3 max-w-[64ch] text-[12px] text-faint"><b>How this demo can mislead you:</b> ten large US listings over three particular years, and you chose the target knowing the chart. The terminal marks calls made before the outcome, on names you did not get to pick from a short list.</p>
            <div className="mt-4 flex flex-wrap items-center gap-4"><Button variant="primary" onClick={() => data && deal(data)}>Go again</Button><a href="#request" className="text-[15px] text-dim underline underline-offset-[.2em] decoration-line2 hover:text-text">or request a demo</a></div>
          </>
        )}
      </div>
    </Card>
  );
}
