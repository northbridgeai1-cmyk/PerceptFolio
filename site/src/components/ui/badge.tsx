import { cn } from '@/lib/utils';
/* Verdict badges use the terminal's own 6px radius and its semantic colours; green and red are
   reserved for outcomes, amber for watch. */
export function Badge({ tone = 'hold', className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'buy' | 'watch' | 'hold' }) {
  const tones = { buy: 'text-[#4ade80] border-[rgba(46,160,67,.4)] bg-[rgba(46,160,67,.08)]', watch: 'text-amber border-[rgba(217,164,65,.45)] bg-[rgba(217,164,65,.08)]', hold: 'text-tmuted border-tline bg-tpanel2' };
  return <span className={cn('inline-block rounded-[6px] border px-2 py-[5px] font-mono text-[11px] font-semibold leading-none tracking-[.02em]', tones[tone], className)} {...p} />;
}
