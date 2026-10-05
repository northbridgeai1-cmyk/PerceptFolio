/* "DOWN $33.30 TODAY", ON A SUNDAY (2026-10-05).

   A walkthrough opened the dashboard on a Sunday and was told the book was down today. The number
   was right and the word was wrong: a quote's day change is measured against the previous close, so
   when the market has been shut for two days it describes the Friday. Software that does not know
   what day it is undermines every other number on the screen beside it.

   lastSessionPhrase answers which session the figure belongs to, built on the isTradingDay this
   file already had for grading marks against a market that was open.

   THIS SUITE RUNS IT AGAINST A FIXED CLOCK. Date arithmetic is the one thing in this codebase that
   cannot be checked by reading: an off-by-one in a weekend walk-back reads perfectly and is wrong
   two days in seven, and on the other five days a broken version and a correct one are identical.
   So today is injected, and the days chosen are the ones that break it: a Saturday, a Sunday, the
   Fourth of July, the Friday after Thanksgiving, and a Monday holiday whose previous session is
   three days back. */
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../terminal/index.html', import.meta.url), 'utf8');

function lift(sig) {
  const at = src.indexOf(sig);
  if (at < 0) throw new Error('not found: ' + sig);
  let depth = 0;
  for (let j = src.indexOf('{', at); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(at, j + 1); }
  }
  throw new Error('unbalanced: ' + sig);
}
const body = [
  'function dayNum(ds)', 'function dayStr(n)', 'function addDays(ds,n)', 'function dowOf(ds)',
  'function easterSunday(y)', 'function nthDow(y,mo,dow,n)', 'function lastDow(y,mo,dow)',
  'function observedHoliday(ds)', 'function holidaysFor(y)', 'function isTradingDay(ds)',
  'function lastSessionPhrase()',
].map(lift).join('\n')
  /* Two module-level declarations that are not inside any function body. _pad is lifted from the
     source rather than rewritten here, so a change to how it pads is a change to this suite too;
     the holiday memo cache has no behaviour and is simply supplied. */
  + '\n' + (src.match(/^const _pad=.*$/m) || [''])[0]
  + '\nconst _holCache={};';

/* `today` is the injected clock: lastSessionPhrase calls etDate(Date.now()) and nothing else time
   dependent, so replacing etDate is the whole of the fixture. */
const at = day => new Function('etDate', body + '\nreturn {lastSessionPhrase, isTradingDay};')(() => day);

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

console.log('\nAN ORDINARY TRADING DAY STILL SAYS TODAY');
for (const d of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']) {
  t(d + ' (a weekday) says today', at(d).lastSessionPhrase() === 'today', at(d).lastSessionPhrase());
}

console.log('\nTHE WEEKEND, WHICH IS WHAT THE WALK FOUND');
{
  /* 2026-10-04 is the Sunday the walkthrough happened on. */
  const sun = at('2026-10-04').lastSessionPhrase();
  t('Sunday does not say today', sun !== 'today', sun);
  t('Sunday names the Friday', sun === 'on Friday, the last day the market traded', sun);
  const sat = at('2026-10-03').lastSessionPhrase();
  t('Saturday names the Friday too', sat === 'on Friday, the last day the market traded', sat);
}

console.log('\nHOLIDAYS, WHERE THE WALK-BACK IS MORE THAN ONE DAY');
{
  /* Independence Day 2026 falls on a Saturday, so the market observes it on Friday 3 July. On that
     Friday the last session is Thursday 2 July; on the Saturday itself it is still that Thursday,
     which is a two-day walk, and on the Sunday a three-day one. */
  t('the observed Fourth of July is not a session', !at('2026-07-03').isTradingDay('2026-07-03'));
  t('the observed holiday names the Thursday before',
    at('2026-07-03').lastSessionPhrase() === 'on Thursday, the last day the market traded', at('2026-07-03').lastSessionPhrase());
  t('and the Sunday after it walks back three days, not one',
    at('2026-07-05').lastSessionPhrase() === 'on Thursday, the last day the market traded', at('2026-07-05').lastSessionPhrase());
}
{
  /* Christmas Day 2026 is a Friday. On the Saturday the last session is Thursday 24 December. */
  t('Christmas Day 2026 is not a session', !at('2026-12-25').isTradingDay('2026-12-25'));
  t('the Saturday after Christmas names the Thursday',
    at('2026-12-26').lastSessionPhrase() === 'on Thursday, the last day the market traded', at('2026-12-26').lastSessionPhrase());
}
{
  /* A Monday holiday: Memorial Day 2026 is 25 May. The last session is the Friday before, which is
     a three-day walk and the case an off-by-one most easily gets wrong. */
  t('Memorial Day is not a session', !at('2026-05-25').isTradingDay('2026-05-25'));
  t('a Monday holiday names the Friday before',
    at('2026-05-25').lastSessionPhrase() === 'on Friday, the last day the market traded', at('2026-05-25').lastSessionPhrase());
}
{
  /* New Year's Day 2027 is a Friday, so the walk-back crosses a year boundary into 2026, which
     means holidaysFor is asked about a different year than the one it started in. */
  t("New Year's Day 2027 is not a session", !at('2027-01-01').isTradingDay('2027-01-01'));
  t('and the walk-back crosses the year end correctly',
    at('2027-01-02').lastSessionPhrase() === 'on Thursday, the last day the market traded', at('2027-01-02').lastSessionPhrase());
}

console.log('\nIT ALWAYS SAYS SOMETHING');
{
  /* Never an empty string, never undefined, and never the word "today" on a day the market was
     shut: those are the three ways this could put a wrong date next to a real number. */
  const days = [];
  for (let i = 0; i < 400; i++) days.push(new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10));
  const out = days.map(d => ({ d, p: at(d).lastSessionPhrase(), open: at(d).isTradingDay(d) }));
  t('every day of a year and a bit gets a phrase', out.every(x => typeof x.p === 'string' && x.p.length > 4));
  t('no shut day claims to be today', out.filter(x => !x.open).every(x => x.p !== 'today'),
    out.filter(x => !x.open && x.p === 'today').slice(0, 3));
  t('no open day says anything but today', out.filter(x => x.open).every(x => x.p === 'today'),
    out.filter(x => x.open && x.p !== 'today').slice(0, 3));
  t('nothing ever falls through to the last resort', out.every(x => x.p !== 'in the last session'),
    out.filter(x => x.p === 'in the last session').slice(0, 3));
  t('and a shut day never names a weekend as the last session',
    out.filter(x => !x.open).every(x => !/Saturday|Sunday/.test(x.p)),
    out.filter(x => !x.open && /Saturday|Sunday/.test(x.p)).slice(0, 3));
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
