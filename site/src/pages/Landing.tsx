import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TerminalDashboard } from '@/components/TerminalDashboard';
import { Demo } from '@/components/Demo';
import { RequestForm } from '@/components/RequestForm';
import { Faq } from '@/components/Faq';
import { PLANS } from '@/lib/config';

/* Composition alternates, no two adjacent sections share a layout: bleed, stack, left-heavy,
   right-heavy, centred strip, wide type, form, accordion. No eyebrows, no section numbers. */
const Row = ({ ok, w, v }: { ok: 'ok' | 'no' | 'na'; w: number; v: number }) => (
  <div className="grid grid-cols-[22px_1fr_auto] items-center gap-[14px] border-b border-[rgba(43,47,56,.6)] py-[11px] last:border-b-0">
    <span className={'grid h-[22px] w-[22px] place-items-center rounded-full font-mono text-[12px] font-bold ' + (ok === 'ok' ? 'bg-[rgba(46,160,67,.18)] text-[#4ade80]' : ok === 'no' ? 'bg-[rgba(229,83,75,.18)] text-[#f87171]' : 'bg-tpanel2 text-tmuted')}>{ok === 'ok' ? '✓' : ok === 'no' ? '✕' : '?'}</span>
    <span className="flex items-center"><i className="block h-[9px] rounded-[4px] bg-gradient-to-r from-[#2b2f38] to-[#353a45]" style={{ width: w + '%' }} /></span>
    <span className="flex w-16 items-center justify-end"><i className="block h-[9px] rounded-[4px] bg-gradient-to-r from-[#2b2f38] to-[#353a45]" style={{ width: v + '%' }} /></span>
  </div>
);
const Lim = ({ name, fill, mark, stop, cap }: { name: string; fill: number; mark: number; stop?: boolean; cap: string }) => (
  <div className="bg-panel p-[18px] pt-5" role="listitem"><h3 className="mb-3 font-sans text-[15px] font-bold tracking-normal">{name}</h3>
    <div className="relative my-[10px] mb-3 h-[6px] border-b border-line"><i className={'absolute inset-y-0 left-0 rounded-[4px] ' + (stop ? 'bg-red' : 'bg-accent')} style={{ width: fill + '%' }} /><em className="absolute -top-[5px] -bottom-[5px] w-[2px] bg-text" style={{ left: mark + '%' }} /></div>
    <div className={'font-mono text-[12px] font-semibold ' + (stop ? 'text-[#f87171]' : 'text-text')}>{cap}</div></div>
);

export function Landing() {
  return (
    <main id="main">
      <header className="relative pt-[var(--spacing-sec)]">
        <div className="wrap"><div className="max-w-[920px]">
          <h1 className="mb-6">A research terminal that keeps score on itself.</h1>
          <p className="lede text-[21px] max-w-[56ch]">Twenty-two checks, one verdict, a record nobody can edit. For people who make the call and stand behind it.</p>
          <div className="mt-8 flex flex-wrap items-center gap-5"><Button asChild variant="primary" size="lg"><a href="#request">Request a demo</a></Button><a href="#demo" className="text-[15px] text-dim underline underline-offset-[.2em] decoration-line2 hover:text-text hover:decoration-current">or try it on real history first</a></div>
        </div></div>
        <TerminalDashboard />
      </header>

      <section id="try" className="sec" aria-labelledby="h-try"><div className="wrap">
        <div className="max-w-[64ch]"><h2 id="h-try" className="mb-4">Try it before anyone talks to you.</h2><p className="text-dim">Three years of real daily closes, ticker hidden. Make a call, set a horizon, and watch it get marked against the S&amp;P, the same arithmetic the terminal runs on every verdict it issues.</p></div>
        <Demo />
      </div></section>

      <section id="scorecard" className="sec" aria-labelledby="h-score"><div className="wrap grid grid-cols-[7fr_5fr] items-center gap-[clamp(40px,6vw,96px)] min-[781px]:max-[960px]:gap-[clamp(56px,9vw,96px)] max-[780px]:grid-cols-1 max-[780px]:gap-10">
        <div className="rounded-[12px] border border-tline bg-tpanel px-[22px] pb-3 pt-5 text-text shadow-[0_24px_60px_-24px_rgba(0,0,0,.6)]" aria-label="The Quality column of the scorecard, with the check names withheld">
          <h4 className="mb-[6px] flex justify-between border-b border-tline pb-3 font-mono text-[12px] font-semibold uppercase tracking-[.12em] text-tmuted">Quality <b className="text-text">9 / 10</b></h4>
          <Row ok="ok" w={72} v={36} /><Row ok="ok" w={64} v={28} /><Row ok="ok" w={80} v={44} /><Row ok="ok" w={60} v={32} /><Row ok="no" w={76} v={40} /><Row ok="na" w={68} v={36} />
        </div>
        <div><h2 id="h-score" className="mb-5">Every verdict shows its working.</h2>
          <p className="text-dim">Twelve checks on the quality of the business, six on the price, four on momentum. Each one names what it measured, the bar it had to clear, and whether it did. <b className="font-semibold text-text">A score is only a summary of the rows underneath it.</b> You read the ones that failed.</p>
          <p className="mt-4 text-dim">What each check measures, and where each bar sits, is the rulebook. It is inside the terminal, not on this page.</p>
          <p className="mt-6 max-w-[52ch] border-t border-line pt-5 text-[15px] text-faint">Two of the twenty-two are yours to answer, and the terminal leaves them unset rather than pretend to know.</p></div>
      </div></section>

      <section id="record" className="sec" aria-labelledby="h-record"><div className="wrap grid grid-cols-[5fr_7fr] items-center gap-[clamp(40px,6vw,96px)] min-[781px]:max-[960px]:gap-[clamp(56px,9vw,96px)] max-[780px]:grid-cols-1 max-[780px]:gap-10">
        <div className="max-[780px]:order-2"><h2 id="h-record" className="mb-5">It writes down what it said. Then it checks.</h2>
          <p className="text-dim">The moment a verdict changes it is logged with the price and the S&amp;P at that instant and given fixed anniversaries. On each one it is marked against the index. <b className="font-semibold text-text">The result is shown whether or not it flatters the system</b>, and nothing in the record can be edited afterwards.</p>
          <p className="mt-4 text-dim">You will not find a win rate here. A hit rate is the most manufacturable number in finance; what is reported is expectancy against the market, with an interval wide enough to show when the sample is too thin to mean anything. The calls needed to separate a real edge from luck is <span className="num">(1.96 × dispersion ÷ edge)²</span>: roughly 138 at a two-point edge with twelve-point dispersion.</p>
          <div className="mt-6 flex max-w-[58ch] items-start gap-[14px] rounded-[12px] border border-line bg-panel px-5 py-4"><span className="mt-2 h-[9px] w-[9px] shrink-0 rounded-full bg-amber shadow-[0_0_0_4px_rgba(217,164,65,.15)]" aria-hidden="true" /><p className="text-[15px] text-dim"><b className="font-semibold text-text">The record is new.</b> Calls are being logged now. The first marks land in about a quarter, and until then the scorecard is honestly empty.</p></div></div>
        <div className="overflow-x-auto rounded-[12px] border border-tline bg-tpanel text-text shadow-[0_24px_60px_-24px_rgba(0,0,0,.6)] max-[780px]:order-1" aria-label="The call log: ticker, call, held, versus index, result">
          <table className="w-full min-w-[520px] border-collapse text-[14px]"><thead><tr>{['Ticker', 'Call', 'Held', 'vs index', 'Result'].map(h => <th key={h} className="border-b border-tline bg-tbg px-[18px] py-[14px] text-left font-mono text-[12px] font-semibold uppercase tracking-[.12em] text-tmuted">{h}</th>)}</tr></thead>
            <tbody>{[['BUY', '90 d'], ['SELL', '90 d'], ['BUY', '180 d'], ['BUY', '30 d']].map(([c, h], i) => <tr key={i}><td className="border-b border-tline px-[18px] py-[14px] font-mono font-semibold" /><td className="border-b border-tline px-[18px] py-[14px]"><span className={'inline-block rounded-[6px] px-2 py-1 font-mono text-[12px] font-semibold ' + (c === 'BUY' ? 'bg-[rgba(46,160,67,.14)] text-[#4ade80]' : 'bg-[rgba(229,83,75,.14)] text-[#f87171]')}>{c}</span></td><td className="num border-b border-tline px-[18px] py-[14px] text-tmuted">{h}</td><td className="border-b border-tline px-[18px] py-[14px] text-tmuted" /><td className="border-b border-tline px-[18px] py-[14px] italic text-tmuted">awaiting mark</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={5} className="bg-tbg px-[18px] py-[14px] text-[13px] text-tmuted">Empty by design. A fixed-horizon record cannot be reconstructed backwards, so every account's record begins the day it begins.</td></tr></tfoot></table>
        </div>
      </div></section>

      <section id="sizing" className="sec" aria-labelledby="h-size"><div className="wrap max-w-[920px]">
        <h2 id="h-size" className="mb-4 text-center">Size, not just selection.</h2>
        <p className="lede mx-auto text-center">Before money moves, the position is checked against five limits. Any one of them can say no, and the terminal shows which.</p>
        <div className="mt-10 grid grid-cols-5 gap-px overflow-hidden rounded-[12px] border border-line bg-line max-[780px]:grid-cols-2 max-[600px]:grid-cols-1" role="list" aria-label="The five sizing limits, illustrative">
          <Lim name="Concentration" fill={58} mark={72} cap="within limit" /><Lim name="Cash" fill={44} mark={30} cap="within limit" /><Lim name="Market exposure" fill={81} mark={90} cap="within limit" /><Lim name="Liquidity" fill={100} mark={65} stop cap="refused" /><Lim name="Thesis deadline" fill={35} mark={100} cap="set" />
        </div>
        <p className="mx-auto mt-5 max-w-[60ch] text-center text-[14.5px] text-faint">Here, liquidity refuses the size. The terminal says so before the order, not after. Where each limit sits is yours to set, inside.</p>
      </div></section>

      <section id="who" className="sec" aria-labelledby="h-who"><div className="wrap">
        <h2 id="h-who" className="mb-10 max-w-[14ch] text-[clamp(36px,4.6vw,60px)]">Who this is for, and who it is not.</h2>
        <div className="grid grid-cols-2 items-start gap-[clamp(32px,5vw,80px)] max-[780px]:grid-cols-1 max-[780px]:gap-8">
          <div><h3 className="mb-3">The person who makes the call.</h3><p className="text-[17px] text-dim">You hold a small number of positions with conviction. You are expected to explain each one, sometimes months later, and you would rather be shown the arithmetic than told the answer. You want the reason written down before the price moves, not invented after it.</p></div>
          <div><h3 className="mb-3">The firm that needs one standard.</h3><p className="text-[17px] text-dim">Three or more analysts, one rulebook set by whoever runs the desk, and every call carrying the name of the person who made it. A record that cannot be tidied up is worth more to you than one that looks good.</p></div>
          <div className="col-span-full mt-6 grid grid-cols-2 items-start gap-[clamp(32px,5vw,80px)] border-t border-line pt-8 max-[780px]:grid-cols-1 max-[780px]:gap-8"><h3 className="text-faint">Who it is not for.</h3><p className="text-[17px] text-dim">Anyone looking for a tip, a signal, or a number that says how often it wins. It does not place trades, does not connect to a broker, and is not investment advice. Judgement stays with the person at the keyboard.</p></div>
        </div>
      </div></section>

      <section id="request" className="sec" aria-labelledby="h-access"><div className="wrap">
        <h2 id="h-access" className="mb-4">See it on your own book.</h2>
        <p className="lede mb-8">Tell us who you are and what you run. Someone at NorthBridge reads every request and replies personally to set up a demo. If it is not the right tool for your work, you will be told that plainly.</p>
        <div className="grid grid-cols-[minmax(0,560px)_1fr] items-start gap-[clamp(40px,6vw,96px)] min-[781px]:max-[960px]:gap-[clamp(56px,9vw,96px)] max-[780px]:grid-cols-1 max-[780px]:gap-12">
          <RequestForm />
          <dl className="mt-[6px]">
            {[['Reviewed by a person', 'Not a queue and not an autoresponder. Every request is read by someone in the financial branch who can act on it, and you get a straight answer, including no.'], ['A demo, then a decision', `You see the terminal on your own positions before anyone asks you for anything. If it suits the work, it is $${PLANS.personal.monthly} a month or $${PLANS.personal.yearly.toLocaleString()} a year, and your code arrives by email.`], ['Bring your own data key', 'The terminal does not resell market data. You connect a free Finnhub key of your own. Two minutes, no card.'], ['Thesis before position', 'Any position taken through the terminal carries a written thesis, a stop and a deadline, recorded when it is opened. A reason invented after the price moves is not a reason.']].map(([t, d]) => <div key={t} className="border-b border-line pb-5 mb-5 last:mb-0 last:border-b-0 last:pb-0"><dt className="mb-[6px] font-display text-[16px] font-bold tracking-[-.01em]">{t}</dt><dd className="max-w-[48ch] text-[15px] leading-[1.6] text-dim">{d}</dd></div>)}
          </dl>
        </div>
        <p className="mt-8 text-[15px] text-faint">Already convinced? <Link to="/pricing">See the plans</Link>.</p>
      </div></section>

      <section id="faq" className="sec" aria-labelledby="h-faq"><div className="wrap max-w-[900px]"><h2 id="h-faq" className="mb-8">Questions worth answering.</h2><Faq /></div></section>
    </main>
  );
}
