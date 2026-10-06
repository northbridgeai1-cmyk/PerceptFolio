/* SIMPLER WORDS, NEVER A SIMPLER ANSWER (2026-10-06).

   The owner's instruction: as a beginner it will be hard to understand everything, so keep it
   simple. The jargon audit in test/personas.mjs counts what a level-0 reader meets before anybody
   explains anything.

   THE PROPERTY THAT MATTERS MOST IS THE ONE THAT IS EASIEST TO BREAK LATER. It is tempting, having
   built a beginner level, to start simplifying the substance too: round a number, hide a warning,
   soften a SELL. That would make the terminal tell different people different things about the same
   company, which is the opposite of keeping score on itself. So this suite asserts that the plain
   layer touches WORDS and nothing else, and that the swap runs in the right direction: a beginner
   sees the plain phrase with the term in the tooltip, not the term with the plain phrase hidden
   behind a hover they will never perform. */
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

const build = level => new Function('userLevel', 'esc',
  liftConst('const PLAIN_WORDS={', '\n};') + '\n' +
  lift('function word(term)') + '\n' + lift('function w(term)') + '\n' + lift('function glossaryHtml()') + '\n' +
  'return {word, w, glossaryHtml, PLAIN_WORDS};')(() => level, esc);

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

const beg = build(0), mid = build(1), adv = build(2);

console.log('\nTHE SWAP RUNS THE RIGHT WAY ROUND');
{
  t('a beginner sees the plain phrase', beg.word('volatility').show === 'how much it moves', beg.word('volatility'));
  t('with the real term kept in the tooltip', /Professionals call this "volatility"/.test(beg.word('volatility').tip), beg.word('volatility').tip);
  t('an intermediate sees the term', mid.word('volatility').show === 'volatility', mid.word('volatility'));
  t('with the plain phrase in the tooltip', mid.word('volatility').tip === 'how much it moves');
  t('and so does an advanced reader', adv.word('volatility').show === 'volatility');
  t('nobody is left without a way to learn the other word',
    [beg, mid, adv].every(b => b.word('volatility').tip.length > 0));
}

console.log('\nEVERY TERM HAS A PLAIN PHRASE, AND IT IS ACTUALLY PLAINER');
{
  const W = beg.PLAIN_WORDS;
  const keys = Object.keys(W);
  t('the table is not empty', keys.length >= 15, keys.length);
  t('every value is a phrase, not a restatement', keys.every(k => W[k] && W[k].toLowerCase() !== k.toLowerCase()));
  /* A "plain" phrase that contains the jargon it is explaining has explained nothing. */
  t('no definition uses the word it defines', keys.every(k => !new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(W[k])),
    keys.filter(k => new RegExp('\\b' + k + '\\b', 'i').test(W[k])));
  t('the worst offenders from the audit are all covered',
    ['verdict', 'position', 'momentum', 'volatility', 'beta', 'horizon', 'watchlist', 'concentration'].every(k => W[k]),
    ['verdict', 'position', 'momentum', 'volatility', 'beta', 'horizon', 'watchlist', 'concentration'].filter(k => !W[k]));
}

console.log('\nAN UNKNOWN WORD IS LEFT ALONE, NOT MANGLED');
{
  t('a term with no entry passes through', beg.word('EBITDA').show === 'EBITDA', beg.word('EBITDA'));
  t('and gets no tooltip rather than an empty one', beg.word('EBITDA').tip === '');
  t('w() renders it bare, with no dotted underline promising an explanation', beg.w('EBITDA') === 'EBITDA', beg.w('EBITDA'));
  t('lookups are case-insensitive', beg.word('Volatility').show === 'how much it moves' && beg.word('VOLATILITY').show === 'how much it moves');
}

console.log('\nIT ESCAPES WHAT IT RENDERS');
{
  const out = beg.w('<img src=x onerror=alert(1)>');
  t('an unknown term is escaped', !out.includes('<img'), out);
  t('and the tooltip is escaped too', !beg.w('volatility').includes('"Professionals call this "volatility"."'));
  t('a known term renders a titled span', /^<span title="[^"]*" style="border-bottom:1px dotted/.test(beg.w('volatility')), beg.w('volatility'));
}

console.log('\nTHE GLOSSARY IS THE WHOLE TABLE, IN ONE PLACE');
{
  const g = beg.glossaryHtml();
  const keys = Object.keys(beg.PLAIN_WORDS);
  t('every term is printed', keys.every(k => g.includes('<b>' + k + '</b>')), keys.filter(k => !g.includes('<b>' + k + '</b>')));
  t('every definition is printed', keys.every(k => g.includes(esc(beg.PLAIN_WORDS[k]))));
  t('it is sorted, so a word can be scanned for', (() => {
    const order = [...g.matchAll(/<b>([^<]+)<\/b>/g)].map(m => m[1]);
    return order.join('|') === [...order].sort().join('|');
  })());
  t('the glossary does not itself change with level', g === adv.glossaryHtml());
  t('it is on the Settings screen and filled when Settings opens',
    /id="glossaryCard"/.test(src) && /id="glossaryBody"/.test(src) && /g\.innerHTML=glossaryHtml\(\)/.test(src));
}

console.log('\nWORDS ONLY: NO NUMBER, THRESHOLD OR VERDICT DEPENDS ON THE LEVEL');
{
  /* The whole risk of a beginner mode. verdictOf and the score must never consult userLevel. */
  const v = lift('function verdictOf(sc,isHolding,sym)');
  t('verdictOf never asks what level the reader is', !/userLevel/.test(v));
  const score = lift('async function scoreStock(sym)');
  t('scoreStock never asks either', !/userLevel/.test(score));
  const ctx = lift('function contextChecks(newsItems,rel)');
  t('nor do the context checks', !/userLevel/.test(ctx));
  const proj = lift('function projectStock(mu,sigma,years)');
  t('nor the projection arithmetic', !/userLevel/.test(proj));
  /* Where the level IS allowed to appear: which tabs show, whether the working is folded, and which
     word is printed. Nothing that computes an answer. */
  const uses = [...src.matchAll(/userLevel\(\)/g)].length;
  t('the level is consulted in only a handful of places', uses > 0 && uses <= 12, uses);
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
