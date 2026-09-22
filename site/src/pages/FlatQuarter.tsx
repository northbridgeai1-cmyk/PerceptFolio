import { useEffect } from 'react';
import { Link } from 'react-router-dom';

/* A2.7. Written before the first marks exist, on purpose. If the first quarter of marks reads flat
   or negative, this is what the site says, and the Command strip in the terminal says the short
   form of it. A record that is only shown when it flatters is not a record. */
export function FlatQuarter() {
  useEffect(() => { document.title = 'If the marks read flat | PerceptFolio'; }, []);
  const rows: string[][] = [
    ['What is measured', 'The rulebook as you set it, applied to public data, marked against the index on fixed horizons. Not you. Not the market. The bars.'],
    ['What a flat mark says', 'Over this sample, these bars did not beat the index by more than the noise. The interval beside the number says how little that sample can say.'],
    ['What a flat mark does not say', 'Anything about the next sample. A record that is a quarter old has not earned a verdict on the bars either way.'],
    ['What still holds', 'The sizing limits refused what they refused before the money moved. Every thesis was written before the price moved, not after. History shows how you actually behaved: hold times, early sales, days under your own cash floor.'],
    ['What we will do', 'Show it. Headline the 180- and 365-day marks; show the 30-day mark below them, because at that horizon it is mostly noise. Keep every mark. Never restart a record.'],
    ['What we will not do', 'Move the bars to flatter the past. Hide a horizon. Report a win rate. Write a new history.'],
  ];
  return (
    <main id="main" className="wrap max-w-[880px] pt-[var(--spacing-sec)] pb-[var(--spacing-sec)]">
      <h1 className="mb-3">If the first marks read flat.</h1>
      <p className="lede">Written on 21 September 2026, before any mark has landed, so that what the site says in a flat quarter was decided before the quarter.</p>
      <div className="mt-10 overflow-hidden rounded-[12px] border border-line" role="list">
        {rows.map(([t, d]) => <div key={t} className="grid grid-cols-[200px_1fr] gap-4 border-b border-line bg-panel px-5 py-4 last:border-b-0 max-[600px]:grid-cols-1 max-[600px]:gap-1" role="listitem"><h2 className="font-sans text-[15px] font-bold tracking-normal">{t}</h2><p className="text-[15px] leading-[1.6] text-dim">{d}</p></div>)}
      </div>
      <p className="mt-8 text-[14.5px] text-faint">The arithmetic behind the interval is on the <Link to="/#record">front page</Link>. The record itself can be checked on the <a href="/verify/">verify page</a>.</p>
    </main>
  );
}
