/* "MSFT HAS NO ROOM LEFT UNDER YOUR LIMITS" (2026-10-05).

   A walkthrough on 2026-10-04 reported two things about the How much should I put in card, and they
   turned out to be one thing:

     - typing a ticker and an amount showed nothing
     - "Largest size your policy allows" said MSFT had no room, with no reason, on an account with
       $5,000 in cash and a 10% per-name limit

   The button sizes to the largest allowed amount, writes it into the amount field, and the panel
   blanked itself whenever that amount was not positive. So a limit working exactly as designed
   emptied the screen at the moment it had something to explain, and the explanation went into a
   toast that disappears. The landing page promises this terminal tells you which limit said no.

   THIS SUITE RUNS sizingHeadroomHtml against a built D. The thing that must never happen again is
   the panel returning nothing, and the thing that must always happen is the binding limit being
   named, so both are asserted against every shape of account: no score, five limits, a zero gate,
   cash smaller than the limit, and no cash at all. */
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
const liftConst = (name, close) => {
  const at = src.indexOf(name);
  if (at < 0) throw new Error('not found: ' + name);
  return src.slice(at, src.indexOf(close, at) + close.length);
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* sizingLimits is stubbed rather than lifted: it reaches into scores, theses, strategies and a
   liquidity model, and what is under test is what the panel SAYS about a set of limits, not how
   those limits are computed. The stub returns exactly the shape sizingLimits returns. */
const build = (limits, cash) => new Function('D', 'esc', 'pmask', 'fmt$', 'sizingLimits',
  liftConst('const LIMIT_WORDS=', '\n};') + '\n' +
  lift('function sizingHeadroomHtml(sym,fromCash)') + '\nreturn sizingHeadroomHtml;')
  ({ cash }, esc, x => x, n => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }), () => limits);

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

/* The walkthrough's own account: $5,000 cash, a 10% per-name limit, and the Herizen momentum rule
   allowing no position, so the gate is zero and the gate is what said no. */
const WALK = { cap: 1200, vol: 3000, gate: 0, binding: 'momentum gate', limit: 0 };

console.log('\nTHE CASE THAT WAS REPORTED');
{
  const html = build(WALK, 5000)('MSFT', true);
  t('the panel is not empty', html.length > 100, html.length);
  t('it says the rules allow nothing', /allow nothing in MSFT/.test(html), html.slice(0, 200));
  t('and it names what said no', /What said no/.test(html), html);
  t('in words, not a variable name', html.includes('a strategy you have switched on') && !html.includes('momentum gate</td><td style="text-align:right">$0 <span') === false || html.includes('a strategy you have switched on'), html.slice(0, 400));
  t('and it says what would change it', /Retire the strategy in Settings/.test(html), html);
  t('it lists the other limits too, so the zero is in context', html.includes('$1,200') && html.includes('$3,000'), html);
  t('and marks which one is smallest', html.includes('smallest'), html);
}

console.log('\nWHEN THERE IS ROOM');
{
  const html = build({ cap: 1200, vol: 3000, binding: 'policy cap', limit: 1200 }, 5000)('AAPL', true);
  t('it says the amount', /up to <b>\$1,200<\/b>/.test(html), html.slice(0, 220));
  t('and what stops it going higher', /What stops it going higher/.test(html), html);
  t('named in plain words', html.includes('your limit on how much goes into one name'), html);
  t('it does not say anything was refused', !/allow nothing/.test(html), html);
}

console.log('\nCASH IS A LIMIT TOO, AND USED NOT TO REACH THE PANEL');
{
  /* sizingLimits never knew about the cash balance: tiUseMax clipped to it afterwards, so the panel
     could offer headroom larger than the money in the account. */
  const html = build({ cap: 9000, vol: 20000, binding: 'policy cap', limit: 9000 }, 500)('AAPL', true);
  t('the headroom is the cash, not the policy cap', /up to <b>\$500<\/b>/.test(html), html.slice(0, 220));
  t('and the cash is what it names', html.includes('the cash you have'), html);
  t('it says how much cash there is', html.includes('You have $500 in cash'), html);
  /* The quotes around the checkbox name are curly, and esc() turns straight ones into &quot;, so
     this looks for the instruction rather than the punctuation. */
  t('and offers the way round it', /Untick [^<]*Funded from cash/.test(html), html);
  t('and the table names cash as the smallest, not the policy cap',
    /the cash you have<\/td><td[^>]*>\$500 <span[^>]*>smallest/.test(html), html);
  t('so the badge is not on a number that is not binding',
    !/\$9,000 <span[^>]*>smallest/.test(html), html);
}
{
  /* Not funded from cash: the cash balance is irrelevant and must not be named. */
  const html = build({ cap: 9000, vol: 20000, binding: 'policy cap', limit: 9000 }, 0)('AAPL', false);
  t('new money is not clipped to the cash balance', /up to <b>\$9,000<\/b>/.test(html), html.slice(0, 220));
  t('and cash is not blamed', !html.includes('the cash you have'), html);
}
{
  const html = build({ cap: 9000, binding: 'policy cap', limit: 9000 }, 0)('AAPL', true);
  t('no cash at all allows nothing from cash', /allow nothing in AAPL/.test(html), html.slice(0, 220));
  t('and says it is the cash', html.includes('the cash you have'), html);
}

console.log('\nNOTHING SCORED YET IS ITS OWN ANSWER, NOT A REFUSAL');
{
  const html = build({ binding: undefined, limit: undefined }, 5000)('CYBR', true);
  t('the panel is still not empty', html.length > 100, html.length);
  t('it says nothing has been scored', /nothing has been scored for it/.test(html), html);
  t('and it does not claim the rules refused it', !/allow nothing/.test(html), html);
  t('and it says what to do', /Analyze it first/.test(html), html);
}

console.log('\nEVERY LIMIT HAS WORDS, AND EVERY SHAPE RENDERS');
{
  const words = new Function(liftConst('const LIMIT_WORDS=', '\n};') + '\nreturn LIMIT_WORDS;')();
  /* The keys must match the labels sizingLimits sorts by, or a limit binds and the panel prints a
     variable name at the reader. This is the pairing that cannot be checked by reading one of them. */
  const candidates = (src.match(/const candidates=\[\[[\s\S]*?\]\n?\s*\.filter/) || [''])[0];
  for (const k of ['policy cap', 'volatility budget', 'stop distance', 'momentum gate', 'liquidity']) {
    t('"' + k + '" is a label sizingLimits really uses', candidates.includes("'" + k + "'"), candidates.slice(0, 200));
    t('"' + k + '" has plain words and a way out', !!words[k] && words[k].length === 2 && words[k][0].length > 8, words[k]);
  }
  for (const [name, lim, cash] of [
    ['one limit only', { cap: 100, binding: 'policy cap', limit: 100 }, 9e9],
    ['every limit at once', { cap: 1, vol: 2, stop: 3, gate: 4, liq: 5, binding: 'policy cap', limit: 1 }, 9e9],
    ['a limit with no binding named', { cap: 50, limit: 50 }, 9e9],
    ['every limit zero', { cap: 0, vol: 0, stop: 0, gate: 0, liq: 0, binding: 'liquidity', limit: 0 }, 9e9],
  ]) {
    const html = build(lim, cash)('X', true);
    t(name + ': renders something', html.length > 100, html.length);
    t(name + ': never shows an undefined', !/undefined/.test(html), html.slice(0, 300));
  }
}

console.log('\nAND THE PANEL NO LONGER BLANKS ITSELF ON A ZERO AMOUNT');
{
  const r = lift('function renderTradeImpact()');
  t('an empty ticker still clears it', /if\(!sym\)\{ el\.innerHTML=''; return; \}/.test(r), r.slice(0, 1200).match(/if\(!sym\)[^\n]*/));
  t('but a ticker with no amount gets the headroom', /el\.innerHTML=sizingHeadroomHtml\(sym,fromCash\);/.test(r));
  t('the old blanket blank is gone', !/if\(!sym\|\|!isFinite\(amt\)\|\|amt<=0\)\{\s*el\.innerHTML='';/.test(r));
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
