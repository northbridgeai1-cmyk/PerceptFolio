/* WHY, NOT JUST WHAT (2026-10-05).

   A walkthrough on 2026-10-04 found two things wrong with the verdicts, and they were the same
   thing twice:

     - every row on the sell list read "Your rules say consider selling", which is the verdict
       restated, not a reason for it. The reader is told to think about selling a company and given
       nothing to think with.
     - INTC, up 165%, was flagged for selling off "Price 0/6 (1 had data)". Five of the six checks
       had no data on the owner's Finnhub plan, missing data was counted as a failure, and no screen
       said so. The verdict was about the data and read as a verdict about the company.

   So verdictOf now returns a `why` on every branch, and when the evidence is thin it says so
   FIRST, before the reason, because thin evidence is the most important fact about a verdict rather
   than a footnote to it.

   THIS SUITE RUNS THE FUNCTION. The pinning suite in run.mjs reads source text, which has already
   let a corrupted regex through once: node --check passed, the function matched nothing, and
   nothing noticed. Reasons are strings assembled from arithmetic, so the only way to know they are
   right is to call it and read what comes back. */
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

/* D and thesisFor are the terminal's globals. They are supplied rather than lifted: this suite is
   about the reasons, and a real D would drag in the whole 18k-line file. */
const build = (rules, thesis) => new Function('D', 'thesisFor',
  liftConst('const CHECK_COUNTS=', '};') + '\n' +
  lift('function thinNote(sc)') + '\n' +
  lift('function sellIsDataDriven(sc,r)') + '\n' +
  lift('function verdictOf(sc,isHolding,sym)') + '\n' +
  'return {verdictOf, thinNote, sellIsDataDriven};')
  ({ rules }, () => thesis || null);

/* The owner's own settings, as the walkthrough found them. */
const RULES = { qBuy: 8, pBuy: 4, qSell: 4, mBuy: 0 };
const { verdictOf, thinNote, sellIsDataDriven } = build(RULES);

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

/* A complete score: every check answered. */
const full = (q, p, m = 2) => ({ qScore: q, qTotal: 12, pScore: p, pTotal: 6, mScore: m, mTotal: 4 });
/* A thin score: `qt` and `pt` checks actually had data, the rest were blank. */
const thin = (q, qt, p, pt, m = 2) => ({ qScore: q, qTotal: qt, pScore: p, pTotal: pt, mScore: m, mTotal: 4 });

console.log('\nA REASON ON EVERY BRANCH');
for (const [name, sc, held] of [
  ['buy', full(10, 5), false],
  ['sell', full(3, 2), true],
  ['great business, pricey', full(10, 1), false],
  ['hold', full(6, 2), true],
  ['does not qualify', full(5, 1), false],
]) {
  const v = verdictOf(sc, held, 'AAPL');
  t(name + ': carries a why', typeof v.why === 'string' && v.why.length > 20, v.why);
  t(name + ': the why is not the label restated', !!v.why && v.why.toLowerCase() !== (v.label + '.').toLowerCase(), v.why);
  t(name + ': the why names a number from the score', /\d+\/\d+/.test(v.why || ''), v.why);
}

console.log('\nTHE SELL REASON NAMES THE LINE IT CROSSED');
{
  const v = verdictOf(full(3, 2), true, 'INTC');
  t('says the score', v.why.includes('3/12'), v.why);
  t('says the sell line', v.why.includes('sell line of 4'), v.why);
  t('no longer says only "your rules say"', !/^your rules say/i.test(v.why), v.why);
}

console.log('\nMISSING DATA IS NAMED, AND NAMED FIRST');
{
  /* The walkthrough's INTC: one of six price checks had data, and most quality rows read
     "Not available on your Finnhub plan". */
  const sc = thin(3, 7, 0, 1);
  const v = verdictOf(sc, true, 'INTC');
  t('the verdict is still a sell', v.key === 'sell', v.key);
  t('the reason opens with the warning, not the arithmetic', /^Careful:/.test(v.why), v.why);
  t('it counts the blank quality checks', v.why.includes('5 of 12 quality'), v.why);
  t('it counts the blank price checks', v.why.includes('5 of 6 price'), v.why);
  t('it says they could not pass', /could not pass/.test(v.why), v.why);
  t('the thin flag is set for the UI', v.thin === true, v.thin);
  t('and it says the missing data could have decided it', v.dataDriven === true, v.dataDriven);
  t('and says so in words', /about the data as much as the company/.test(v.why), v.why);
}
{
  /* The other case, and the one that must not cry wolf: data is missing, but the checks that DID
     answer already put it under the line, so the gaps changed nothing. */
  const v = verdictOf(thin(0, 8, 2, 6), true, 'XYZ');
  t('a sell that missing data could not have caused is not blamed on it', v.dataDriven === false, v.dataDriven);
  t('but the thin evidence is still disclosed', /^Careful:/.test(v.why), v.why);
}
{
  const v = verdictOf(full(3, 2), true, 'INTC');
  t('a complete score says nothing about missing data', !/Careful/.test(v.why), v.why);
  t('and does not set the thin flag', v.thin === false, v.thin);
  t('and is not called data-driven', v.dataDriven === false, v.dataDriven);
}

console.log('\nthinNote ON ITS OWN');
t('silent when everything answered', thinNote(full(8, 4)) === '', thinNote(full(8, 4)));
t('silent on an errored score', thinNote({ error: 'NO_DATA' }) === '', thinNote({ error: 'NO_DATA' }));
t('counts one gap', thinNote(thin(8, 11, 4, 6)).includes('1 of 12 quality'), thinNote(thin(8, 11, 4, 6)));
t('does not mention the section that is complete', !thinNote(thin(8, 11, 4, 6)).includes('price'), thinNote(thin(8, 11, 4, 6)));

console.log('\nA THESIS CONDITION STILL OUTRANKS THE GLOBAL RULE');
{
  const b = build(RULES, { sellBelow: 9 });
  const v = b.verdictOf(full(8, 5), true, 'AAPL'); // would otherwise be a BUY
  t('the thesis fires', v.key === 'sell' && v.viaThesis === true, v.label);
  t('and says whose number it was', v.why.includes('the 9 you set for this position'), v.why);
}

console.log('\nFAILURES STILL SPEAK FOR THEMSELVES');
for (const [err, word] of [['RATE_LIMIT', 'too many at once'], ['NO_KEY', 'Needs market data'], ['NO_DATA', 'No quote']]) {
  const v = verdictOf({ error: err }, true, 'AAPL');
  t(err + ' says its own thing', v.label.includes(word), v.label);
  t(err + ' is not dressed up as a verdict', v.key === 'na', v.key);
}

/* =============================================================================================
   THREE WORDS, AND OWNING IT IS NOT ONE OF THEM (2026-10-06).

   The owner's instruction: put buy, hold or sell on everything, whether I own it or not. Two of the
   six old labels depended on ownership rather than on the company, so the same score produced
   different words for different readers, and Compare put both vocabularies side by side.

   The property being asserted here is the one that is easy to lose in a later edit and impossible
   to see by reading: for any score at all, the WORD is identical held and unheld. Only the sentence
   under it differs. It is checked by sweeping every reachable score rather than by picking cases. */
console.log('\nTHE WORD NEVER DEPENDS ON WHETHER YOU OWN IT');
{
  const mismatches = [];
  for (let q = 0; q <= 12; q++) for (let pr = 0; pr <= 6; pr++) {
    const sc = full(q, pr);
    const held = verdictOf(sc, true, 'AAA'), free = verdictOf(sc, false, 'AAA');
    if (held.label !== free.label || held.key !== free.key) mismatches.push({ q, p: pr, held: held.label, free: free.label });
  }
  t('91 scores, held and unheld, give the same word every time', mismatches.length === 0, mismatches.slice(0, 4));
}
{
  const words = new Set();
  for (let q = 0; q <= 12; q++) for (let pr = 0; pr <= 6; pr++) words.add(verdictOf(full(q, pr), false, 'AAA').label);
  t('and there are only ever three of them', words.size === 3, [...words]);
  t('and they are BUY, HOLD and SELL', ['BUY', 'HOLD', 'SELL'].every(w => words.has(w)), [...words]);
  t('WATCH is not one of them any more', !words.has('WATCH') && ![...words].some(w => /watch/i.test(w)), [...words]);
  t('and neither is "doesn\'t qualify"', ![...words].some(w => /qualif/i.test(w)), [...words]);
}

console.log('\nTHE THREE THRESHOLDS IN SETTINGS ARE THE WHOLE DEFINITION');
{
  /* Nothing else may decide the word. If these three numbers do not predict it, the setting the
     owner asked for is not actually the thing in control. */
  const wrong = [];
  for (let q = 0; q <= 12; q++) for (let pr = 0; pr <= 6; pr++) {
    const got = verdictOf(full(q, pr), false, 'AAA').label;
    const want = (q >= RULES.qBuy && pr >= RULES.pBuy) ? 'BUY' : (q <= RULES.qSell) ? 'SELL' : 'HOLD';
    if (got !== want) wrong.push({ q, p: pr, got, want });
  }
  t('the buy line, the sell line and nothing else predict every verdict', wrong.length === 0, wrong.slice(0, 4));
}
{
  /* Move the lines; the answers must move with them. A score that was a HOLD under one rulebook is
     a BUY under a looser one, with no code change. */
  const loose = build({ qBuy: 5, pBuy: 2, qSell: 1, mBuy: 0 });
  const strict = build({ qBuy: 11, pBuy: 6, qSell: 9, mBuy: 0 });
  t('a middling name is a BUY under loose lines', loose.verdictOf(full(6, 3), false, 'A').label === 'BUY', loose.verdictOf(full(6, 3), false, 'A').label);
  t('the same name is a SELL under strict ones', strict.verdictOf(full(6, 3), false, 'A').label === 'SELL', strict.verdictOf(full(6, 3), false, 'A').label);
  t('and a HOLD exists in between', build({ qBuy: 9, pBuy: 4, qSell: 2, mBuy: 0 }).verdictOf(full(6, 5), false, 'A').label === 'HOLD');
}

console.log('\nWHAT OWNERSHIP DOES CHANGE IS THE INSTRUCTION, NOT THE JUDGEMENT');
{
  const held = verdictOf(full(2, 1), true, 'INTC'), free = verdictOf(full(2, 1), false, 'INTC');
  t('a bad company you own says SELL', held.label === 'SELL', held.label);
  t('a bad company you do not own also says SELL', free.label === 'SELL', free.label);
  t('but the owner is told it is a position to close', /position to think about closing/.test(held.why), held.why);
  t('and the non-owner is told to leave it alone', /to leave alone/.test(free.why), free.why);
  t('the two reasons are not the same sentence', held.why !== free.why);
}
{
  const held = verdictOf(full(10, 5), true, 'AAPL');
  t('a BUY you already hold says so', /already own it/.test(held.why), held.why);
  t('a BUY you do not hold does not', !/own it/.test(verdictOf(full(10, 5), false, 'AAPL').why));
}

console.log('\nA HOLD STILL SAYS WHICH KIND OF HOLD IT IS');
{
  t('pricey', verdictOf(full(10, 1), false, 'A').detail === 'good business, pricey', verdictOf(full(10, 1), false, 'A').detail);
  t('weak momentum', build({ qBuy: 8, pBuy: 4, qSell: 4, mBuy: 3 }).verdictOf(full(10, 5, 1), false, 'A').detail === 'good price, weak momentum');
  t('simply in between', verdictOf(full(6, 2), false, 'A').detail === 'in between your lines', verdictOf(full(6, 2), false, 'A').detail);
  t('and those details are not shown as the verdict', verdictOf(full(10, 1), false, 'A').label === 'HOLD');
}

console.log('\nTOO LITTLE DATA IS A HOLD, AND SAYS SO RATHER THAN PRETENDING');
{
  /* The guard used to apply only to names you held, so an unknown company with two answered checks
     was quietly given the benefit of the doubt while a held one was called a sell. */
  const sc = thin(0, 3, 0, 1);
  const held = verdictOf(sc, true, 'CYBR'), free = verdictOf(sc, false, 'CYBR');
  t('three answered checks is not enough to call a sell, held', held.key === 'hold', held.label);
  t('nor unheld', free.key === 'hold', free.label);
  t('and it says that is why', /not enough to judge this either way/.test(free.why), free.why);
  t('and marks itself as such', free.detail === 'not enough data', free.detail);
  t('six answered checks is enough', verdictOf(thin(0, 6, 0, 1), false, 'X').key === 'sell');
}

/* ---------------------------------------------------------------------------------------------
   HOW CLOSE IS CLOSE. The screener's near-miss list sorts by this, and the whole point of the
   list is that the three names it offers are genuinely the nearest to THIS person's bars. Sorted
   by raw score instead, a high-quality expensive company would beat a company one check short of
   both lines, and the list would stop answering the question it was built for. */
const shortfall = new Function('D',
  lift('function shortfall(sc)') + '\nreturn shortfall;')({ rules: RULES });

console.log('\nHOW FAR SHORT, IN CHECKS');
t('a name that clears both bars is zero short', shortfall(full(8, 4)) === 0, shortfall(full(8, 4)));
t('clearing them with room to spare is still zero', shortfall(full(12, 6)) === 0, shortfall(full(12, 6)));
t('one quality check short counts one', shortfall(full(7, 4)) === 1, shortfall(full(7, 4)));
t('short on both adds up', shortfall(full(6, 2)) === 4, shortfall(full(6, 2)));
t('an errored score is infinitely far', shortfall({ error: 'NO_DATA' }) === Infinity);
t('and so is nothing at all', shortfall(null) === Infinity);

console.log('\nAND THE THREE IT WOULD OFFER');
{
  /* GREAT is the highest-scoring name in the list and is NOT one of the three: it is four price
     checks short, which is further from this person's bars than any of CLOSE, NEAR or OK. That is
     the distinction the whole function exists to make. */
  const scanned = [
    { sym: 'GREAT', sc: full(12, 0) },   // 4 short, on price alone
    { sym: 'CLOSE', sc: full(8, 3) },    // 1 short
    { sym: 'NEAR', sc: full(7, 4) },     // 1 short
    { sym: 'OK', sc: full(6, 4) },       // 2 short
    { sym: 'FAR', sc: full(1, 1) },      // 10 short
    { sym: 'BROKEN', sc: { error: 'NO_DATA' } },
  ];
  const near = [...scanned].sort((a, b) => shortfall(a.sc) - shortfall(b.sc))
    .slice(0, 3).filter(r => isFinite(shortfall(r.sc))).map(r => r.sym);
  t('offers the three nearest the bars', near.length === 3, near);
  t('and they are the ones that are nearest', near.every(x => ['CLOSE', 'NEAR', 'OK'].includes(x)), near);
  t('the highest raw score is not offered just for being high', !near.includes('GREAT'), near);
  t('nothing with no data is offered', !near.includes('BROKEN'), near);
}
{
  /* A scan where everything failed to score must offer nothing rather than three blanks. */
  const scanned = [{ sym: 'A', sc: { error: 'NO_DATA' } }, { sym: 'B', sc: { error: 'RATE_LIMIT' } }];
  const near = [...scanned].sort((a, b) => shortfall(a.sc) - shortfall(b.sc))
    .slice(0, 3).filter(r => isFinite(shortfall(r.sc)));
  t('a scan that scored nothing offers nothing', near.length === 0, near);
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
