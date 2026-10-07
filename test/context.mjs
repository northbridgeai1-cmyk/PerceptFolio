/* ANALYSING EVERYTHING, WITHOUT READING ANYTHING (2026-10-06).

   The owner's instruction: make sure it analyses everything, news, who they buy to, everything we
   do, that is how it analyses.

   THE PROMISE THIS HAD TO BE BUILT AROUND. The News screen states, at length, that this product
   never turns a headline into a buy or a sell, because a model asked to justify BUY from press
   coverage will always find a way. That promise is about INTERPRETATION, and counting does not
   break it: "two stories in thirty days matched a lawsuit keyword" is a fact about the press that
   the reader can verify by opening the tab, and it carries its own threshold on screen like the
   other twenty-two checks.

   So what this suite defends is not that the checks are clever. It is that they stay COUNTS:

     - nothing fetched is null, never a failure. Counting absent data as a fail is the bug that made
       INTC look like a sell on the 2026-10-04 walkthrough, and six new checks are six new chances
       to reintroduce it.
     - fetched-and-empty is not the same as never-fetched.
     - a company nobody has mapped has not failed a question about its customers.
     - one story that is both a lawsuit and a regulator counts once, not twice. */
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../terminal/index.html', import.meta.url), 'utf8');
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

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

/* NEWS_THEMES is lifted, not restated: these regexes are the actual classifier, and a suite that
   carried its own copy would pass while the page did something else. */
/* contextChecks gained a third argument on 2026-10-07: the scores, so a counterparty that carries
   a ticker can be judged by this terminal's own weighted score. weightedScore and sellAt come with
   it, lifted rather than stubbed, because what those two checks mean IS that score and that line. */
const CORE =
  liftConst('const CHECK_WEIGHT={', '\n};') + '\n' + liftConst('const DEFAULT_WEIGHT=', ';') + '\n' +
  liftConst('const SCORED_SECTIONS=', ';') + '\n' + lift('function allScoredChecks(sc)') + '\n' +
  lift('function weightOf(c)') + '\n' + lift('function weightedScore(sc)') + '\n' +
  lift('function sellAt()') + '\n';
const contextChecks = new Function('D',
  CORE + liftConst('const NEWS_THEMES=[', '\n];') + '\n' +
  lift('function contextChecks(newsItems,rel,scores)') + '\nreturn contextChecks;')({ rules: { sellAt: 40 } });

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

const story = h => ({ headline: h, summary: '' });
const by = (r, name) => r.checks.find(c => c.name === name);
const run = (news, rel, scores) => contextChecks(news, rel, scores || {});

console.log('\nNOT FETCHED IS NULL, NOT A FAILURE');
{
  /* During a bulk scan the headlines are never requested, so all three news checks must abstain.
     A scan that quietly marked every company down for news it never looked at would be the INTC
     bug again, at scale. */
  const r = run(null, null);
  const news = ['Legal and regulatory news', 'Layoffs or restructuring', 'Press coverage'];
  t('every news check abstains', news.every(n => by(r, n).pass === null), news.map(n => by(r, n).pass));
  t('none of them claims a value', news.every(n => by(r, n).value === null));
  t('and the count is null rather than zero', r.newsCount === null, r.newsCount);
  t('it says why it abstained', /No headlines loaded/.test(by(r, 'Legal and regulatory news').note));
  t('nothing counts toward the score at all', r.checks.every(c => c.pass === null), r.checks.map(c => c.pass));
}

console.log('\nFETCHED AND EMPTY IS NOT THE SAME THING');
{
  /* A real request that found nothing published. No lawsuits WERE reported, so those pass; the
     company genuinely is not being covered, so that one genuinely fails. */
  const r = run([], null);
  t('no bad news really is no bad news', by(r, 'Legal and regulatory news').pass === true);
  t('and no layoffs reported passes too', by(r, 'Layoffs or restructuring').pass === true);
  t('but nobody writing about it is a real fail', by(r, 'Press coverage').pass === false);
  t('and the count is zero, not null', r.newsCount === 0, r.newsCount);
}

console.log('\nTHE COUNTS ARE COUNTS');
{
  const r = run([
    story('Acme sued over patent dispute'),
    story('Acme faces antitrust probe in Europe'),
    story('Acme launches new chip'),
  ], null);
  t('two legal stories are counted', by(r, 'Legal and regulatory news').value === '2 stories', by(r, 'Legal and regulatory news').value);
  t('and the check fails', by(r, 'Legal and regulatory news').pass === false);
  t('three stories clears the coverage bar', by(r, 'Press coverage').pass === true);
  t('the note points at the tab rather than explaining the articles',
    /Open News to read them/.test(by(r, 'Legal and regulatory news').note));
  t('nothing anywhere claims to have read one',
    !r.checks.some(c => /sentiment|bearish|bullish|positive coverage|negative coverage/i.test(c.name + c.note + c.target)));
}
{
  const r = run([story('Regulator opens antitrust investigation into Acme')], null);
  /* One story matching two themes. Summed it would read "2 stories" off a single article, which is
     a count the reader could disprove by opening the tab. */
  t('a story that is both a lawsuit and a regulator counts once', by(r, 'Legal and regulatory news').value === '1 story',
    by(r, 'Legal and regulatory news').value);
}
{
  const r = run([story('Acme announces layoffs across its workforce')], null);
  t('layoffs are caught', by(r, 'Layoffs or restructuring').pass === false, by(r, 'Layoffs or restructuring').value);
  t('and a layoff story is not also counted as legal trouble', by(r, 'Legal and regulatory news').pass === true);
}
{
  const r = run([story('Acme beats earnings estimates'), story('Analyst upgrades Acme'), story('Acme ships new model')], null);
  t('ordinary good news trips nothing', by(r, 'Legal and regulatory news').pass === true && by(r, 'Layoffs or restructuring').pass === true);
  t('and the coverage check passes', by(r, 'Press coverage').pass === true);
}

console.log('\nAN UNMAPPED COMPANY HAS NOT FAILED ANYTHING');
{
  const r = run([], null);
  const chain = ['Who they sell to is mapped', 'Customer concentration', 'More than one customer',
    'Who they buy from is mapped', 'Supplier concentration', 'More than one supplier'];
  t('all six supply-chain checks abstain', chain.every(n => by(r, n).pass === null), chain.map(n => by(r, n).pass));
  t('and say what to do about it', /Supply chain screen/.test(by(r, 'Who they sell to is mapped').note));
}
{
  const r = run([], { suppliers: [], customers: [] });
  t('an empty record is still unmapped, not a failure',
    by(r, 'Who they sell to is mapped').pass === null, by(r, 'Who they sell to is mapped').pass);
}

console.log('\nAND A MAPPED ONE IS SCORED ON WHAT WAS ENTERED');
{
  const r = run([], {
    suppliers: [{ name: 'S1', weight: 40 }, { name: 'S2', weight: 30 }],
    customers: [{ name: 'C1', weight: 20 }, { name: 'C2', weight: 15 }],
  });
  t('customers recorded passes', by(r, 'Who they sell to is mapped').pass === true);
  t('two suppliers passes', by(r, 'More than one supplier').pass === true, by(r, 'More than one supplier').value);
  t('a spread customer base passes', by(r, 'Customer concentration').pass === true, by(r, 'Customer concentration').value);
  t('and it reports the largest', by(r, 'Customer concentration').value === 'largest 20%');
}
{
  const r = run([], { suppliers: [{ name: 'Only one', weight: 90 }], customers: [{ name: 'Big', weight: 60 }] });
  t('one customer at 60% fails concentration', by(r, 'Customer concentration').pass === false, by(r, 'Customer concentration').value);
  t('a single supplier fails', by(r, 'More than one supplier').pass === false, by(r, 'More than one supplier').value);
  t('the note says what the risk is', /single point of failure/.test(by(r, 'More than one supplier').note));
}
{
  /* Exactly on the line. A third is allowed; above it is not. */
  t('33% is not over a third', by(run([], { suppliers: [], customers: [{ name: 'C', weight: 33 }] }), 'Customer concentration').pass === true);
  t('34% is', by(run([], { suppliers: [], customers: [{ name: 'C', weight: 34 }] }), 'Customer concentration').pass === false);
}
{
  /* Weights are typed by hand, so some will be missing. A blank weight must not read as zero and
     make a concentrated book look diversified. */
  const r = run([], { suppliers: [], customers: [{ name: 'A' }, { name: 'B', weight: 50 }] });
  t('a missing weight does not hide a concentrated one', by(r, 'Customer concentration').pass === false, by(r, 'Customer concentration').value);
  t('suppliers mapped only on the customer side still counts as mapped', by(r, 'Who they sell to is mapped').pass === true);
}

console.log('\nTHE SHAPE scoreStock DEPENDS ON');
{
  const r = run([], null);
  t('eleven checks, always', r.checks.length === 11, r.checks.length);
  t('every one carries a name, a target and a note', r.checks.every(c => c.name && c.target && typeof c.note === 'string'));
  t('pass is only ever true, false or null', r.checks.every(c => c.pass === true || c.pass === false || c.pass === null));
  /* scoreStock tallies cScore/cTotal exactly as it does the other sections. */
  const score = r.checks.filter(c => c.pass === true).length, total = r.checks.filter(c => c.pass !== null).length;
  t('it tallies like every other section', score === 2 && total === 3, { score, total });

  /* ---- WHO THEY BUY FROM (2026-10-07) ---- */
  console.log('\nSUPPLIERS ARE CHECKED LIKE CUSTOMERS, NOT COUNTED LIKE FURNITURE');
  {
    const m = run([], { suppliers: [{ name: 'Sole', weight: 80 }], customers: [{ name: 'A', weight: 20 }, { name: 'B', weight: 20 }] });
    t('one supplier at 80% fails concentration', by(m, 'Supplier concentration').pass === false, by(m, 'Supplier concentration').value);
    t('and the note says it is the one that stops production', /stops production/.test(by(m, 'Supplier concentration').note));
    t('a single supplier fails the count', by(m, 'More than one supplier').pass === false);
    t('two spread customers pass theirs', by(m, 'Customer concentration').pass === true && by(m, 'More than one customer').pass === true);
    t('and both sides report being mapped', by(m, 'Who they buy from is mapped').pass === true && by(m, 'Who they sell to is mapped').pass === true);
  }
  {
    const m = run([], { suppliers: [{ name: 'A', weight: 30 }, { name: 'B', weight: 30 }], customers: [{ name: 'Only', weight: 90 }] });
    t('the mirror holds: spread suppliers pass, one customer fails', by(m, 'Supplier concentration').pass === true && by(m, 'Customer concentration').pass === false);
    t('one customer fails the count too', by(m, 'More than one customer').pass === false, by(m, 'More than one customer').value);
  }
  {
    t('33% is not over a third for suppliers either',
      by(run([], { suppliers: [{ name: 'S', weight: 33 }], customers: [] }), 'Supplier concentration').pass === true);
    t('34% is', by(run([], { suppliers: [{ name: 'S', weight: 34 }], customers: [] }), 'Supplier concentration').pass === false);
  }

  console.log('\nA COUNTERPARTY IS JUDGED BY THIS TERMINAL\'S OWN SCORE');
  {
    /* Build a score object that comes out at 100% and one that comes out at 0%. */
    const Q = ['Free Cash Flow', 'Cash vs Debt', 'Revenue Growth (YoY)', 'Gross Margin', 'Operating Margin', 'ROE'];
    const good = { error: null, quality: Q.map(n => ({ name: n, pass: true })) };
    const bad = { error: null, quality: Q.map(n => ({ name: n, pass: false })) };
    const rel = { suppliers: [{ name: 'Sick', ticker: 'SICK', weight: 20 }, { name: 'Fine', ticker: 'FINE', weight: 20 }],
                  customers: [{ name: 'Fine2', ticker: 'FINE', weight: 20 }, { name: 'B', weight: 20 }] };
    const m = run([], rel, { SICK: bad, FINE: good });
    t('a supplier scoring under the sell line fails the check', by(m, 'Suppliers you would not own').pass === false, by(m, 'Suppliers you would not own').value);
    t('and it names which one', /SICK/.test(by(m, 'Suppliers you would not own').note), by(m, 'Suppliers you would not own').note);
    t('a healthy customer passes', by(m, 'Customers you would not own').pass === true, by(m, 'Customers you would not own').value);
    t('counterparties with no ticker are not counted either way', by(m, 'Customers you would not own').value === '0 of 1 scored');
  }
  {
    const rel = { suppliers: [{ name: 'NoTicker', weight: 50 }], customers: [] };
    t('a map with no tickers abstains rather than passing for free',
      by(run([], rel, {}), 'Suppliers you would not own').pass === null);
    t('and says why', /no mapped supplier has a ticker/i.test(by(run([], rel, {}), 'Suppliers you would not own').note));
  }
  {
    const rel = { suppliers: [{ name: 'X', ticker: 'X', weight: 50 }], customers: [] };
    t('a ticker that errored is not counted', by(run([], rel, { X: { error: 'NO_DATA' } }), 'Suppliers you would not own').pass === null);
  }

  console.log('\nAN AI ADDS INFORMATION, IT NEVER GIVES THE VERDICT');
{
  /* The owner's rule, 2026-10-07: a model may supply a fact claim; the judgement stays the user's
     thresholds applied to it. The supply-chain map is the only place in the terminal that sits on
     this line, because a model can fill it and five checks read it. Permitted, but never invisible. */
  const confirmed = { suppliers: [{ name: 'A', ticker: 'A', weight: 20 }], customers: [{ name: 'B', weight: 20 }] };
  const guessed = { suppliers: [{ name: 'A', ticker: 'A', weight: 20, prefilled: true }], customers: [{ name: 'B', weight: 20, prefilled: true }] };
  const mixed = { suppliers: [{ name: 'A', weight: 20, prefilled: true }], customers: [{ name: 'B', weight: 20 }] };
  t('a map the user confirmed is reported as nothing guessed', run([], confirmed).chainGuessed === 0, run([], confirmed).chainGuessed);
  t('a map a model filled is counted', run([], guessed).chainGuessed === 2, run([], guessed).chainGuessed);
  t('and a mixed map counts only the suggested rows', run([], mixed).chainGuessed === 1 && run([], mixed).chainRows === 2,
    { guessed: run([], mixed).chainGuessed, rows: run([], mixed).chainRows });
  t('an empty map guesses nothing', run([], null).chainGuessed === 0 && run([], null).chainRows === 0);
  /* The checks themselves must not care: a suggested supplier is scored exactly like a confirmed
     one, because the model supplied the fact and the threshold still does the judging. */
  t('a suggested entry is scored the same as a confirmed one',
    by(run([], guessed), 'Supplier concentration').pass === by(run([], confirmed), 'Supplier concentration').pass);
}
{
  /* And the verdict has to say so, before the arithmetic rather than after it. */
  t('the verdict discloses a model-suggested chain', /rests on a supply chain a model suggested/.test(src));
  t('it counts how many entries were suggested', /sc\.chainGuessed\+' of '\+sc\.chainRows\+' entries\)/.test(src));
  t('it points at the screen to correct them', /Correct it on Supply chain and the answer follows/.test(src));
  t('and it is said before the score, not appended', /const warn=\(thin\?[\s\S]{0,200}\)\+guessWarn;/.test(src));
  t('the rule itself is written down', /An AI adds information\. It never tells the user what to buy/.test(read('ANALYSIS-AUDIT.md')));
}

console.log('\nAND THE MAP FILLS ITSELF FOR WHAT YOU OWN');
  {
    t('the pre-fill runs on the way in', /try\{ await prefillChains\(\); \}catch/.test(src));
    t('holdings only, not the watchlist', /\(D\.holdings\|\|\[\]\)\.filter\(h=>h\.sym&&h\.type==='Stock'\)/.test(src)
      && !/prefillChains[\s\S]{0,400}watchlist/.test(src));
    t('only for a company with nothing mapped at all',
      /return !r\|\|\(\(r\.suppliers\|\|\[\]\)\.length\+\(r\.customers\|\|\[\]\)\.length\)===0;/.test(src));
    t('a company it could not answer for is not asked again every sign-in', /D\.chainTried\[sym\]=Date\.now\(\);/.test(src));
    t('and what it writes is marked as the model\'s guess', /prefilled:true/.test(src));
    t('it never overwrites something a person filled in meanwhile',
      /if\(\(rel\.suppliers\.length\+rel\.customers\.length\)>0\)continue;/.test(src));
    t('and it is capped per sign-in', /\.slice\(0,6\);/.test(src));
  }
}
{
  t('scoreStock calls it and stores both halves',
    /const ctx=contextChecks\(newsItems,\(D\.relations&&D\.relations\[sym\]\)\|\|null,D\.analyses\|\|\{\}\);/.test(src)
    && /out\.context=ctx\.checks; out\.newsCount=ctx\.newsCount;/.test(src));
  t('and tallies it beside the others',
    /out\.cScore=out\.context\.filter\(c=>c\.pass===true\)\.length;/.test(src)
    && /out\.cTotal=out\.context\.filter\(c=>c\.pass!==null\)\.length;/.test(src));
  t('a bulk scan reads the cache and never fetches', /else if\(typeof screenerRunning==='undefined'\|\|!screenerRunning\)newsItems=await fhNews\(sym,30\);/.test(src));
  /* IT NO LONGER NEEDS A GATE OF ITS OWN (2026-10-06). These six used to sit behind an opt-in
     threshold, cBuy, defaulting to 0, which meant they were computed, displayed and ignored. The
     owner's instruction was that the whole analysis uses the whole thing, so they now count like
     every other check, weighted by what each is worth. The weights are in ANALYSIS-AUDIT.md and
     checked by test/weights.mjs. */
  /* Checked against code, not prose: the delete that clears the old key necessarily names it. */
  t('the separate context gate is gone',
    !/const cOk=/.test(src) && !/r\.cBuy/.test(src) && !/id="setCBuy"/.test(src));
  t('context is one of the scored sections', /const SCORED_SECTIONS=\['quality','priceChecks','momentum','context','wallStreet'\];/.test(src));
  t('every one of the six is weighted', ['Legal and regulatory news','Customer concentration',
    'Layoffs or restructuring','More than one supplier','Press coverage','Who they sell to is mapped']
    .every(n => new RegExp("'" + n + "':\\d").test(src)));
  t('and the screen says it counts, rather than that it does not',
    /These count toward the verdict like every other check/.test(src)
    && !/does not affect the verdict until you set a minimum/.test(src));
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
