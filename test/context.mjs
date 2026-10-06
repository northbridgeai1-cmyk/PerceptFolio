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
const contextChecks = new Function(
  liftConst('const NEWS_THEMES=[', '\n];') + '\n' +
  lift('function contextChecks(newsItems,rel)') + '\nreturn contextChecks;')();

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

const story = h => ({ headline: h, summary: '' });
const by = (r, name) => r.checks.find(c => c.name === name);
const run = (news, rel) => contextChecks(news, rel);

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
  const chain = ['Who they sell to is mapped', 'Customer concentration', 'More than one supplier'];
  t('all three supply-chain checks abstain', chain.every(n => by(r, n).pass === null), chain.map(n => by(r, n).pass));
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
  t('six checks, always', r.checks.length === 6, r.checks.length);
  t('every one carries a name, a target and a note', r.checks.every(c => c.name && c.target && typeof c.note === 'string'));
  t('pass is only ever true, false or null', r.checks.every(c => c.pass === true || c.pass === false || c.pass === null));
  /* scoreStock tallies cScore/cTotal exactly as it does the other sections. */
  const score = r.checks.filter(c => c.pass === true).length, total = r.checks.filter(c => c.pass !== null).length;
  t('it tallies like every other section', score === 2 && total === 3, { score, total });
}
{
  t('scoreStock calls it and stores both halves',
    /const ctx=contextChecks\(newsItems,\(D\.relations&&D\.relations\[sym\]\)\|\|null\);/.test(src)
    && /out\.context=ctx\.checks; out\.newsCount=ctx\.newsCount;/.test(src));
  t('and tallies it beside the others',
    /out\.cScore=out\.context\.filter\(c=>c\.pass===true\)\.length;/.test(src)
    && /out\.cTotal=out\.context\.filter\(c=>c\.pass!==null\)\.length;/.test(src));
  t('a bulk scan reads the cache and never fetches', /else if\(typeof screenerRunning==='undefined'\|\|!screenerRunning\)newsItems=await fhNews\(sym,30\);/.test(src));
  t('it gates a BUY only when asked to', /const cOk=\(r\.cBuy\|\|0\)<=0\|\|\(sc\.cScore\|\|0\)>=r\.cBuy;/.test(src));
  t('and it defaults to not gating', /cBuy:0,/.test(src));
  t('the setting exists, is bounded, and is logged when it changes',
    /id="setCBuy"/.test(src) && /cBuy:Math\.min\(6,Math\.max\(0,parseInt\(document\.getElementById\('setCBuy'\)\.value\)\|\|0\)\)/.test(src)
    && /return\{qBuy:r\.qBuy,pBuy:r\.pBuy,mBuy:r\.mBuy,cBuy:r\.cBuy,qSell:r\.qSell\};/.test(src));
  t('the screen says whether it is affecting the verdict',
    /does not affect the verdict until you set a minimum in Settings/.test(src));
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
