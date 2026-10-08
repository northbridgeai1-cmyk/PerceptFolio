/* EVERYTHING COUNTS, IN PROPORTION (2026-10-06).

   The owner's instruction: the whole analysis should use the whole thing, everything should give a
   verdict on the stock. ANALYSIS-AUDIT.md scores all 31 checks 1 to 10 and those scores ARE the
   weights, so this suite's first job is to make sure the document and the code cannot drift apart:
   a weight changed in one and not the other is a document that has quietly become decoration.

   Its second and more important job is the defect this replaces. The buy bar was an absolute count
   of nine from twelve quality checks, four of which are questions the user types. Their total was
   eight, and eight out of eight could never reach nine, so a company passing every check it was
   possible to pass could not be a BUY. That is asserted here directly, because it is the kind of
   thing that is invisible until somebody computes it and obvious forever afterwards. */
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../terminal/index.html', import.meta.url), 'utf8');
const doc = readFileSync(new URL('../ANALYSIS-AUDIT.md', import.meta.url), 'utf8');

function lift(sig) {
  const at = src.indexOf(sig);
  if (at < 0) throw new Error('not found: ' + sig);
  let d = 0;
  for (let j = src.indexOf('{', at); j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (!d) return src.slice(at, j + 1); }
  }
  throw new Error('unbalanced: ' + sig);
}
const liftConst = (n, c) => { const at = src.indexOf(n); return src.slice(at, src.indexOf(c, at) + c.length); };

const CORE =
  liftConst('const CHECK_WEIGHT={', '\n};') + '\n' +
  liftConst('const DEFAULT_WEIGHT=', ';') + '\n' +
  liftConst('const SCORED_SECTIONS=', ';') + '\n' +
  lift('function allScoredChecks(sc)') + '\n' + lift('function weightOf(c)') + '\n' +
  lift('function weightedScore(sc)') + '\n' + lift('function sectionBreakdown(sc)') + '\n';

const { CHECK_WEIGHT, weightedScore, sectionBreakdown } =
  new Function('D', CORE + 'return {CHECK_WEIGHT, weightedScore, sectionBreakdown};')({ rules: {} });

const build = rules => new Function('D', 'thesisFor',
  CORE + liftConst('const THIN_BELOW_DEFAULT=', ';') + '\n' + lift('function thinBelow()') + '\n' + liftConst('const JUDGE_ABOVE_DEFAULT=', ';') + '\n' + lift('function judgeAbove()') + '\n' +
  lift('function buyAt()') + '\n' + lift('function sellAt()') + '\n' +
  lift('function verdictOf(sc,isHolding,sym)') + '\nreturn verdictOf;')({ rules }, () => null);

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

/* Build a score object from section -> [pass|null, ...], using the real check names so the real
   weights apply. */
const NAMES = {
  quality: ['Free Cash Flow','Cash vs Debt','Revenue Growth (YoY)','Gross Margin','Operating Margin','ROE','Insider Buying','Current Ratio','EPS Beats','Competitive Moat','Clear Growth Runway','Revenue Guidance'],
  priceChecks: ['P/E vs Own History','PEG Ratio','P/E','Forward P/E','DCF Value','Comp Analysis'],
  momentum: ['Beating the Market','6-Month Return','12-Month Return','Near 52-Week High'],
  context: ['Legal and regulatory news','Customer concentration','Layoffs or restructuring','More than one supplier','Press coverage','Who they sell to is mapped'],
  wallStreet: ['Price Target Upside','Analyst Consensus','Volume Trend'],
};
const MANUAL = ['Competitive Moat','Clear Growth Runway','Revenue Guidance','Comp Analysis','Customer concentration','More than one supplier','Who they sell to is mapped'];
/* `set` maps a section to a function(name, index) -> true | false | null. */
function mk(set) {
  const sc = { error: null };
  for (const [k, names] of Object.entries(NAMES)) sc[k] = names.map((n, i) => ({ name: n, pass: set(n, k, i) }));
  return sc;
}
const allPass = mk(() => true);
const allFail = mk(() => false);
/* The real-world shape: everything typed is blank, everything automatic passes. */
const noHomework = mk(n => MANUAL.includes(n) ? null : true);

console.log('\nTHE DOCUMENT AND THE CODE ARE THE SAME TABLE');
{
  const inDoc = {};
  for (const m of doc.matchAll(/\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*\*\*(\d+)\*\*\s*\|/g)) inDoc[m[1].trim()] = +m[2];
  t('the audit lists weights at all', Object.keys(inDoc).length >= 25, Object.keys(inDoc).length);
  /* Names differ slightly in prose (the doc spells out "P/E under 30"), so match on the number
     for every code key that the doc also names verbatim, and require most of them to line up. */
  const codeKeys = Object.keys(CHECK_WEIGHT);
  const matched = codeKeys.filter(k => inDoc[k] !== undefined);
  t('most checks are named identically in both', matched.length >= 24, { matched: matched.length, of: codeKeys.length });
  /* The five added on 2026-10-07 must reach ANALYSIS-AUDIT.md too, or the document stops being the
     table and becomes a snapshot of what it used to be. */
  for (const k of ['Supplier concentration', 'Who they buy from is mapped', 'More than one customer',
                   'Suppliers you would not own', 'Customers you would not own'])
    t('the audit documents "' + k + '"', inDoc[k] === CHECK_WEIGHT[k], { doc: inDoc[k], code: CHECK_WEIGHT[k] });
  const wrong = matched.filter(k => inDoc[k] !== CHECK_WEIGHT[k]);
  t('and every one of those carries the same number', wrong.length === 0,
    wrong.map(k => ({ check: k, doc: inDoc[k], code: CHECK_WEIGHT[k] })));
  t('every weight is on the 1 to 10 scale', codeKeys.every(k => CHECK_WEIGHT[k] >= 1 && CHECK_WEIGHT[k] <= 10));
  /* 36 since 2026-10-07: suppliers gained the three checks customers already had, and both sides
     gained a health check that reads this terminal's own score for any counterparty with a ticker. */
  t('all 36 checks are weighted', codeKeys.length === 36, codeKeys.length);
  /* Every check the terminal actually adds must have a weight, or it silently counts as 5. */
  const added = [...src.matchAll(/add\(out\.(?:quality|priceChecks|momentum|wallStreet),'([^']+)'/g)].map(m => m[1]);
  const ctx = [...src.matchAll(/^  add\('([^']+)'/gm)].map(m => m[1]);
  const missing = [...new Set([...added, ...ctx])].filter(n => CHECK_WEIGHT[n] === undefined);
  t('no check the terminal computes is left unweighted', missing.length === 0, missing);
}

console.log('\nTHE DEFECT: A PERFECT COMPANY COULD NOT BE A BUY');
{
  const V = build({ buyAt: 75, sellAt: 40 });
  const v = V(noHomework, false, 'X');
  t('everything answerable passes and nothing was typed', weightedScore(noHomework).score === 100,
    weightedScore(noHomework).score);
  t('it is now a BUY', v.label === 'BUY', { label: v.label, why: v.why });
  t('and it says how much of the evidence it had', v.confidence > 0 && v.confidence < 100, v.confidence);
  /* The old code: qScore 8, qTotal 8, qBuy 9 -> impossible. Asserted as arithmetic so the
     regression is named rather than remembered. */
  t('under the old absolute bar this same company scored 8 of 8 against a bar of 9', 8 < 9);
}

console.log('\nSCORE IS A SHARE OF WHAT ANSWERED, CONFIDENCE IS HOW MUCH THAT WAS');
{
  t('everything passes is 100', weightedScore(allPass).score === 100);
  t('everything fails is 0', weightedScore(allFail).score === 0);
  t('everything answered is 100% confidence', weightedScore(allPass).confidence === 100);
  const half = mk((n, k, i) => i % 2 === 0 ? true : null);
  t('half the checks blank lowers confidence, not the score', half && weightedScore(half).score === 100
    && weightedScore(half).confidence < 100, weightedScore(half));
  const none = mk(() => null);
  t('nothing answered gives no score at all', weightedScore(none).score === null, weightedScore(none));
  t('and zero confidence', weightedScore(none).confidence === 0);
  t('an errored score has no weighted score', weightedScore({ error: 'NO_DATA' }) === null);
}

console.log('\nWEIGHT ACTUALLY CHANGES THE ANSWER');
{
  /* Free Cash Flow is a 9 and Press coverage is a 2. Failing the first must cost more than four
     times what failing the second costs, or the scores in the audit are decoration. */
  const failFcf = mk(n => n !== 'Free Cash Flow');
  const failPress = mk(n => n !== 'Press coverage');
  const a = weightedScore(failFcf).score, b = weightedScore(failPress).score;
  t('failing a 9 hurts more than failing a 2', a < b, { failedFreeCashFlow: a, failedPressCoverage: b });
  t('and roughly in proportion to the weights', (100 - a) / (100 - b) > 3.5, ((100 - a) / (100 - b)).toFixed(2));
}

console.log('\nEVERY SECTION IS IN THE VERDICT NOW, INCLUDING THE THREE THAT GATED NOTHING');
{
  for (const [section, label] of [['momentum', 'momentum'], ['context', 'the news'], ['wallStreet', 'Wall Street']]) {
    const good = mk(() => true);
    const bad = mk((n, k) => k === section ? false : true);
    t(label + ' moves the score', weightedScore(bad).score < weightedScore(good).score,
      { with: weightedScore(good).score, without: weightedScore(bad).score });
  }
  t('dividend is deliberately not scored', !/SCORED_SECTIONS=\[[^\]]*dividend/.test(src));
  t('and the audit says why it is held out', /Dividend yield, payout/.test(doc) && /Shown, never scored/.test(doc));
}

console.log('\nTHE TWO LINES IN SETTINGS ARE THE WHOLE RULEBOOK');
{
  const strict = build({ buyAt: 95, sellAt: 60 });
  const loose = build({ buyAt: 40, sellAt: 10 });
  const mid = mk((n, k, i) => i % 2 === 0);
  const m = weightedScore(mid).score;
  t('a middling company is a SELL under strict lines', strict(mid, false, 'X').label === 'SELL', m);
  t('and a BUY under loose ones', loose(mid, false, 'X').label === 'BUY', m);
  t('the bar is named in the reason', /the 40% you buy at/.test(loose(mid, false, 'X').why), loose(mid, false, 'X').why);
}
{
  /* Migration: somebody who moved their old counts keeps the intent of where they put them. */
  const migrated = build({ qBuy: 6, qSell: 3 });
  t('an old rulebook migrates to the same proportions', migrated(mk(() => true), false, 'X').why.includes('50% you buy at'),
    migrated(mk(() => true), false, 'X').why);
  const fresh = build({});
  t('a brand new account defaults to 75 and 40', fresh(mk(() => true), false, 'X').why.includes('75% you buy at'));
}

console.log('\nIT STILL NAMES A REASON, NOT JUST A NUMBER');
{
  const V = build({ buyAt: 75, sellAt: 40 });
  /* Failing every price check leaves the overall score at 79%, because price is honestly about a
     fifth of the weight. That alone would have read BUY, which is how the price floor came to
     exist: found by this suite, not by reading. */
  const weakPrice = mk((n, k) => k === 'priceChecks' ? false : true);
  const v = V(weakPrice, false, 'X');
  t('a company that is good but expensive is not a BUY', v.label === 'HOLD', { label: v.label, why: v.why });
  t('and it says that is why', /A good company is not a good buy at any price/.test(v.why), v.why);
  t('naming the price number and the bar it missed', /price checks are 0%, under the 50%/.test(v.why), v.why);
  t('and carrying it as a detail', v.detail === 'good business, too expensive', v.detail);
  /* The floor is a rule the owner controls, not a thumb on the scale. */
  const noFloor = build({ buyAt: 75, sellAt: 40, priceFloor: 0 });
  t('switching the floor off lets it through', noFloor(weakPrice, false, 'X').label === 'BUY');
  const midWeak = mk((n, k, i) => k === 'priceChecks' ? false : (i % 2 === 0));
  t('an ordinary hold still names the section holding it back',
    /is what is holding it back/i.test(V(midWeak, false, 'X').why), V(midWeak, false, 'X').why);
  const buy = V(allPass, false, 'X');
  t('a buy names its strongest section', /Strongest on/.test(buy.why), buy.why);
  t('ownership changes the instruction, not the word',
    V(allFail, true, 'X').label === V(allFail, false, 'X').label);
  t('the owner is told it is a position to close', /position to think about closing/.test(V(allFail, true, 'X').why));
}

console.log('\nTHE SPLIT: BUY, HOLD, SELL AS PERCENTAGES');
{
  /* The owner's shape: "70% buy, 30% hold, 0% sell". The whole weight divided three ways:
     passed is buy, failed is sell, and could-not-answer is the neutral middle. */
  const all = weightedScore(allPass).split;
  t('everything passing is 100% buy', all.buy === 100 && all.hold === 0 && all.sell === 0, all);
  const none = weightedScore(allFail).split;
  t('everything failing is 100% sell', none.sell === 100 && none.buy === 0, none);
  /* The owner's own example: everything answerable passes, the manual ones are blank. */
  const nh = weightedScore(noHomework).split;
  t('passes-all-with-blanks reads as buy plus hold, no sell', nh.sell === 0 && nh.buy > 0 && nh.hold > 0, nh);
  t('and it matches the confidence, since hold IS the unanswered weight',
    nh.buy === weightedScore(noHomework).confidence, { buy: nh.buy, confidence: weightedScore(noHomework).confidence });
  /* The property that matters most: three numbers a reader can add up. */
  const cases = [allPass, allFail, noHomework, mk(() => null), mk((n, k, i) => i % 3 === 0 ? true : i % 3 === 1 ? false : null)];
  t('the three always sum to exactly 100', cases.every(c => { const s = weightedScore(c).split; return s.buy + s.hold + s.sell === 100; }),
    cases.map(c => weightedScore(c).split));
  t('and none of them is ever negative', cases.every(c => { const s = weightedScore(c).split; return s.buy >= 0 && s.hold >= 0 && s.sell >= 0; }));
  t('nothing answered is 100% hold', weightedScore(mk(() => null)).split.hold === 100);
  /* Shown as one bar in three colours, with the numbers written beside it so colour is never the
     only carrier. */
  t('it renders as a three-colour bar', /function splitBarHtml\(ws\)/.test(src)
    && /var\(--green\)/.test(src) && /var\(--yellow\)/.test(src) && /var\(--red\)/.test(src));
  t('with each number in words beside it', /% buy<\/b>/.test(src) && /% hold<\/b>/.test(src) && /% sell<\/b>/.test(src));
  t('and the middle one says it means cannot tell', /can\\u2019t tell/.test(src) || /can’t tell/.test(src));
}

console.log('\nTHE WHOLE-BOOK REVIEW IS RED, ORANGE, GREEN');
{
  t('sell is red, look is orange, keep is green',
    /const TONE=\{sell:'var\(--red\)',look:'var\(--yellow\)',keep:'var\(--green\)'/.test(src));
  t('the colour is a bar and the ticker, never the row background',
    /border-left:3px solid '\+TONE\[key\]/.test(src) && !/background:'\+TONE/.test(src));
  t('and the heading still says the word, so colour is never the only signal',
    /block\('Think about selling','sell'/.test(src) && /block\('Keep','keep'/.test(src));
}

console.log('\nTHE WEIGHTS ARE A DEFAULT, AND THE OWNER\'S NUMBER WINS');
{
  /* "Some things are more important than others" and which ones is the owner's call. Every weight
     in CHECK_WEIGHT is a default that a number in Settings overrides. */
  const weighted = rules => new Function('D', CORE + 'return weightedScore;')({ rules });
  const sc = mk((n, k, i) => (k === 'quality' && i < 2) ? false : (k === 'quality' ? true : null));
  const shipped = weighted({})(sc).score;
  /* Free Cash Flow is a 9 by default. Set it to 0 and failing it must stop costing anything. */
  const ignored = weighted({ weights: Object.assign({}, CHECK_WEIGHT, { 'Free Cash Flow': 0 }) })(sc).score;
  t('a user weight overrides the shipped default', ignored !== shipped, { shipped, ignored });
  t('and zeroing a failed check raises the score', ignored > shipped, { shipped, ignored });
  /* A zero weight is "I do not care", not "delete": the check still answers and still shows. */
  const z = weighted({ weights: Object.assign({}, CHECK_WEIGHT, { 'Free Cash Flow': 0 }) })(sc);
  t('a zero-weight check still counts as answered for confidence', z.confidence > 0, z.confidence);
  /* An unlisted check still falls back to the shipped default rather than vanishing. */
  const partial = weighted({ weights: { 'Free Cash Flow': 1 } })(sc);
  t('checks the user did not touch keep their shipped weight', partial.score !== null && partial.answered > 1, partial);
}
{
  /* Changing a weight is a system change, so it goes through the same gate as moving a bar. */
  t('the weights editor uses the same rule-change gate as the bars',
    /if\(rulesDiffer\(before,after\)&&!recordRuleChange\(before,after\)\)return;/.test(src));
  t('the gate is one shared implementation, not two copies', (src.match(/function recordRuleChange\(before,after\)/g) || []).length === 1);
  t('the snapshot can see the weights, or a change would be unattributable', /weights:w\?Object\.keys\(w\)\.sort\(\)/.test(src));
  t('and everything at zero is refused rather than silently kept',
    /Every weight is zero, so nothing could be scored/.test(src));
  t('the editor shows each section\'s share as you type', /function renderWeightShares\(\)/.test(src)
    && /oninput="renderWeightShares\(\)"/.test(src));
  t('all 36 checks are listed in the editor', /const CHECK_NAMES=\{/.test(src)
    && ['quality', 'priceChecks', 'momentum', 'context', 'wallStreet'].every(k => new RegExp(k + ':\\[').test(src)));
  t('and each one shows what it asks for', /const CHECK_TARGET=\{/.test(src));
  t('both confidence thresholds are editable too', /id="setJudgeAbove"/.test(src) && /id="setThinBelow"/.test(src));
  t('and the warning line cannot be pushed below the refusal line',
    /The warning line cannot sit below the refuse-to-judge line/.test(src));
}

console.log('\nBELOW THE FLOOR THERE IS NO VERDICT AT ALL');
{
  /* Found by a council review and verified by running it: one answered check that passed scored
     100% and printed BUY at 13% confidence. The warning fired; the word still said BUY. A warning
     is not a gate, and nobody reads past a verdict they like. */
  const V = build({ buyAt: 75, sellAt: 40, priceFloor: 50 });
  const oneCheck = mk((n, k, i) => (k === 'quality' && i === 0) ? true : null);
  const v = V(oneCheck, false, 'X');
  t('one answered check does not print BUY', v.label !== 'BUY', { label: v.label, confidence: v.confidence });
  t('it refuses to judge instead', v.label === 'NOT ENOUGH TO JUDGE', v.label);
  t('and it is not dressed up as a HOLD', v.key === 'na', v.key);
  t('it says how little it had', /Only \d+% of the checks could be answered/.test(v.why), v.why);
  t('and names the sections that came back with nothing', /Nothing came back for/.test(v.why), v.why);
  t('and refuses all three words explicitly', /not a buy, a hold or a sell/i.test(v.why), v.why);
  t('the score is still reported, so nothing is hidden', v.score === 100 && v.confidence < 40, { s: v.score, c: v.confidence });
}
{
  /* The two thresholds are deliberately different and must not collapse into one. */
  const V = build({ buyAt: 75, sellAt: 40, priceFloor: 50 });
  /* Between the floor and the warning line: a real verdict, disclaimed. */
  const some = mk((n, k, i) => (k === 'quality') ? true : (k === 'priceChecks' && i < 3 ? true : null));
  const v = V(some, false, 'X');
  t('between the floor and the warning a verdict is still given', ['BUY', 'HOLD', 'SELL'].includes(v.label),
    { label: v.label, confidence: v.confidence });
  t('and it is above the floor', v.confidence >= 40, v.confidence);
  const floor = liftConst('const JUDGE_ABOVE_DEFAULT=', ';'), warn = liftConst('const THIN_BELOW_DEFAULT=', ';');
  t('the floor is lower than the warning line', /40/.test(floor) && /55/.test(warn), { floor, warn });
}
{
  const V = build({ buyAt: 75, sellAt: 40, priceFloor: 50 });
  t('a fully answered company is judged normally', ['BUY', 'HOLD', 'SELL'].includes(V(allPass, false, 'X').label));
}

console.log('\nTHIN EVIDENCE IS DISCLOSED, FIRST');
{
  const V = build({ buyAt: 75, sellAt: 40 });
  /* Between the floor (40) and the warning line (55): enough to form an opinion, little enough
     that the opinion needs disclaiming. Below 40 it refuses outright, which is tested above. */
  /* Quality (71 of 188) plus two price checks (15) is 46%: above the floor of 40, below the warning
     line of 55. Quality alone is 38% and would be refused outright; quality plus all of price is
     56% and would not warn at all. The window is narrow on purpose and this sits inside it. */
  const sparse = mk((n, k, i) => k === 'quality' ? true : (k === 'priceChecks' && i < 2) ? true : null);
  const v = V(sparse, false, 'X');
  t('a verdict on very little evidence warns first', /^Careful: only \d+% of the checks/.test(v.why), v.why);
  t('and flags itself', v.thin === true);
  t('a complete score does not cry wolf', !/Careful/.test(V(allPass, false, 'X').why));
  t('nothing answered at all refuses to judge', /nothing to judge it on either way/.test(V(mk(() => null), false, 'X').why));
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
