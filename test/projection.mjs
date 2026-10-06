/* ALL THE RISKS, ALL THE PROJECTIONS, FOR ONE COMPANY (2026-10-06).

   The owner's instruction: when analysing, check all the risks, go through all the projections,
   everything.

   The Analyze screen already had this stock's expected return, its volatility and its beta, and
   showed a one-year range as three bare percentages. The dollar answer lived on another tab and
   would not do a single company without being asked again.

   WHY CLOSED FORM RATHER THAN SAMPLING. The Monte Carlo tool draws ten thousand paths. For the
   percentiles of a lognormal there is an exact answer, and an exact answer can be checked:

       multiple = exp( (mu - sigma^2/2) * T  +  z * sigma * sqrt(T) )

   so this suite can assert against the closed form rather than against a tolerance band that
   quietly hides an error. The properties below are the ones that would be wrong if somebody later
   dropped the -sigma^2/2, mixed up sigma and sigma^2, or forgot the sqrt on time, each of which
   reads perfectly and is badly wrong by year ten. */
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
const projectStock = new Function(lift('function projectStock(mu,sigma,years)') + '\nreturn projectStock;')();
const exitDays = new Function(lift('function exitDays(dollars,price,advShares)') + '\nreturn exitDays;')();

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

console.log('\nIT IS THE CLOSED FORM, EXACTLY');
{
  const mu = 0.08, sigma = 0.25;
  for (const T of [1, 5, 10, 0.5, 30]) {
    const p = projectStock(mu, sigma, T);
    const drift = (mu - sigma * sigma / 2) * T, sd = sigma * Math.sqrt(T);
    t(T + 'y median is exp(drift)', near(p.mid, Math.exp(drift)), { got: p.mid, want: Math.exp(drift) });
    t(T + 'y bad end is the 5th percentile', near(p.lo, Math.exp(drift - 1.645 * sd)), { got: p.lo, want: Math.exp(drift - 1.645 * sd) });
    t(T + 'y good end is the 95th', near(p.hi, Math.exp(drift + 1.645 * sd)), { got: p.hi, want: Math.exp(drift + 1.645 * sd) });
  }
}

console.log('\nTHE THREE MISTAKES THAT READ PERFECTLY AND ARE WRONG BY YEAR TEN');
{
  const mu = 0.08, sigma = 0.4, T = 10;
  const p = projectStock(mu, sigma, T);
  /* 1. Dropping the -sigma^2/2 convexity term. With sigma 0.4 it is worth 8% a year, which at this
        mu is the entire drift: the median must NOT be exp(mu*T). */
  t('the convexity term is there', !near(p.mid, Math.exp(mu * T), 1e-6), { mid: p.mid, naive: Math.exp(mu * T) });
  t('and with sigma this high the median barely moves', Math.abs(p.mid - 1) < 0.01, p.mid);
  /* 2. sigma vs sigma^2 in the band. */
  t('the band uses sigma, not sigma squared',
    near(Math.log(p.hi / p.mid), 1.645 * sigma * Math.sqrt(T)), Math.log(p.hi / p.mid));
  /* 3. Time enters the band as a square root, not linearly: ten years is sqrt(10) wider, not 10. */
  const a = projectStock(mu, sigma, 1), b = projectStock(mu, sigma, 10);
  t('the band widens with the square root of time',
    near(Math.log(b.hi / b.mid) / Math.log(a.hi / a.mid), Math.sqrt(10)),
    Math.log(b.hi / b.mid) / Math.log(a.hi / a.mid));
}

console.log('\nTHINGS THAT MUST ALWAYS HOLD');
{
  for (const [mu, sigma, T] of [[0.08, 0.2, 1], [-0.05, 0.6, 10], [0.2, 0.05, 5], [0, 0.3, 3]]) {
    const p = projectStock(mu, sigma, T);
    t(`mu=${mu} sigma=${sigma} T=${T}: ordered low < mid < high`, p.lo < p.mid && p.mid < p.hi, p);
    t(`mu=${mu} sigma=${sigma} T=${T}: a price can never go negative`, p.lo > 0, p.lo);
  }
  t('a bigger sigma always widens the band',
    projectStock(0.08, 0.5, 5).hi / projectStock(0.08, 0.5, 5).lo > projectStock(0.08, 0.2, 5).hi / projectStock(0.08, 0.2, 5).lo);
  t('a negative expected return projects a median loss', projectStock(-0.1, 0.2, 5).mid < 1);
}

console.log('\nAND IT REFUSES RATHER THAN INVENTING');
for (const [name, args] of [
  ['no volatility', [0.08, 0, 5]], ['negative volatility', [0.08, -0.2, 5]],
  ['no horizon', [0.08, 0.2, 0]], ['negative horizon', [0.08, 0.2, -1]],
  ['missing mu', [null, 0.2, 5]], ['missing sigma', [0.08, null, 5]],
  ['NaN', [NaN, 0.2, 5]], ['undefined', [undefined, undefined, undefined]],
]) t(name + ' returns null', projectStock(...args) === null, projectStock(...args));

console.log('\nGETTING OUT');
{
  /* 100,000 of a $50 stock is 2,000 shares; at 1,000 shares a day that is two days of its entire
     trading. The number that only matters on the day it matters. */
  t('two days of the whole stock\'s volume', near(exitDays(100000, 50, 1000), 2), exitDays(100000, 50, 1000));
  t('a liquid name is a fraction of a day', exitDays(10000, 50, 1e6) < 0.001);
  t('unknown volume refuses', exitDays(10000, 50, null) === null);
  t('unknown price refuses', exitDays(10000, null, 1000) === null);
  t('a zero position refuses', exitDays(0, 50, 1000) === null);
  t('a zero-volume stock refuses rather than dividing by zero', exitDays(10000, 50, 0) === null);
}

console.log('\nIT IS ON THE SCREEN, AND IT SAYS WHAT IT IS');
{
  const html = lift('function riskAndProjectionHtml(sc,sym,isHolding)');
  t('renderAnalysis calls it', /riskAndProjectionHtml\(sc,sym,isHolding\)/.test(src));
  t('it projects one, five and ten years', /\[1,5,10\]\.map/.test(html));
  t('it answers in dollars', /pmask\(fmt\$\(base\*x\.p\.mid\)\)/.test(html));
  t('the bad end comes before the good one', html.indexOf('Bad end') < html.indexOf('Good end'));
  t('an unheld company is projected on a labelled round number, not on nothing',
    /because you do not own it/.test(html) && /held>0\?held:10000/.test(html));
  t('it shows how much the stock swings, its beta and how long it takes to get out',
    /How much it moves/.test(html) && /Versus the market/.test(html) && /Getting out/.test(html));
  t('it says a projection is not a forecast', /not a forecast of this company/.test(html));
  t('it names its assumptions rather than hiding them', /4\.5% risk-free, 8% expected market return/.test(html));
  t('it admits real markets are not lognormal', /crashes cluster and tails are fatter/.test(html));
  t('and it says when a holding is over the owner\'s own limit', /Over your own limit/.test(html));
  t('it needs no extra network call', !/await |fetch\(/.test(html));
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
