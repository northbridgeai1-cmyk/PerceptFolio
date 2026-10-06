/* THE THREE NAMES A SCAN OFFERS WHEN IT FOUND NOTHING (was test/verdict.mjs).

   A walkthrough scanned twenty names, scored twelve, and every one came back as "not yet". The
   screen showed twelve rows of the same words and no statement that the answer was none, so the
   screener now says so and offers the three that came closest, with one press to watch them all.

   WHY THIS SUITE SURVIVED AND THE REST OF verdict.mjs DID NOT. Everything that file asserted about
   verdictOf moved to test/weights.mjs on 2026-10-06, when the verdict stopped being a count of
   checks and became a weighted percentage. These assertions did not move, because they are about
   ranking rather than about the verdict, and because shortfall() was quietly broken by that same
   change: it added up how many quality and price CHECKS a name was short, and the moment those
   bars became percentages it computed zero for everything. Every scan would have offered whichever
   three names it happened to score first, which looks exactly like working software. */
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../terminal/index.html', import.meta.url), 'utf8');

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
  liftConst('const CHECK_WEIGHT={', '\n};') + '\n' + liftConst('const DEFAULT_WEIGHT=', ';') + '\n' +
  liftConst('const SCORED_SECTIONS=', ';') + '\n' + lift('function allScoredChecks(sc)') + '\n' +
  lift('function weightOf(c)') + '\n' + lift('function weightedScore(sc)') + '\n' +
  lift('function buyAt()') + '\n' + lift('function sellAt()') + '\n';

const shortfall = new Function('D', CORE + lift('function shortfall(sc)') + '\nreturn shortfall;')({ rules: { buyAt: 75, sellAt: 40 } });

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

/* A score object whose weighted score comes out at roughly `pct`, built from one section so the
   arithmetic is easy to follow. Quality weights sum to 71. */
const Q = ['Free Cash Flow','Cash vs Debt','Revenue Growth (YoY)','Gross Margin','Operating Margin','ROE','Insider Buying','Current Ratio','EPS Beats','Competitive Moat','Clear Growth Runway','Revenue Guidance'];
const at = passCount => ({ error: null, quality: Q.map((n, i) => ({ name: n, pass: i < passCount })) });

console.log('\nHOW FAR SHORT, IN SCORE POINTS');
{
  t('a name on the buy line is zero short', shortfall(at(12)) === 0, shortfall(at(12)));
  t('a name above it is still zero', shortfall(at(12)) === 0);
  const mid = shortfall(at(6));
  t('a middling name is some way short', mid > 0 && mid < 100, mid);
  t('a name that fails everything is furthest', shortfall(at(0)) > mid, { none: shortfall(at(0)), mid });
  t('an errored score is infinitely far', shortfall({ error: 'NO_DATA' }) === Infinity);
  t('and so is nothing at all', shortfall(null) === Infinity);
  /* The regression this file exists to prevent: if shortfall reads a bar that no longer exists it
     returns 0 for every input, and the ranking silently becomes arbitrary. */
  /* Chosen below the buy line on purpose: anything at or above it is legitimately 0 short, so
     including such a case would test nothing. Quality weights sum to 71, so these land well under. */
  const spread = new Set([0, 2, 4, 6].map(n => shortfall(at(n))));
  t('different companies get different distances', spread.size === 4, [...spread]);
  t('and a name already clearing the line is zero, not negative', shortfall(at(11)) === 0, shortfall(at(11)));
}

console.log('\nAND THE THREE IT WOULD OFFER');
{
  const scanned = [
    { sym: 'CLOSE', sc: at(11) }, { sym: 'NEAR', sc: at(10) }, { sym: 'OK', sc: at(9) },
    { sym: 'FAR', sc: at(2) }, { sym: 'BROKEN', sc: { error: 'NO_DATA' } },
  ];
  const near = [...scanned].sort((a, b) => shortfall(a.sc) - shortfall(b.sc))
    .slice(0, 3).filter(r => isFinite(shortfall(r.sc))).map(r => r.sym);
  t('it offers three', near.length === 3, near);
  t('and they are the nearest three', near.join() === 'CLOSE,NEAR,OK', near);
  t('nothing with no data is offered', !near.includes('BROKEN'));
  const none = [{ sym: 'A', sc: { error: 'NO_DATA' } }, { sym: 'B', sc: { error: 'RATE_LIMIT' } }];
  t('a scan that scored nothing offers nothing',
    none.sort((a, b) => shortfall(a.sc) - shortfall(b.sc)).slice(0, 3).filter(r => isFinite(shortfall(r.sc))).length === 0);
}

console.log('\nTHE SCREEN SAYS IT IN THE UNITS THE BAR IS IN');
{
  t('the near-miss row counts points, not checks',
    /\+' point'\+\(d===1\?'':'s'\)\+' short/.test(src) && !/' check'\+\(d===1\?'':'s'\)\+' short/.test(src));
  t('and shows the score it got', /scored '\+\(weightedScore\(n\.sc\)\|\|\{\}\)\.score/.test(src));
  t('the no-buys message names the buy line', /Your buy line is '\+buyAt\(\)\+'%/.test(src));
  t('one press watches all three', /function watchNearMisses\(\)/.test(src));
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
