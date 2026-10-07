/* EVERYTHING, ON THE WAY IN (2026-10-07).

   The owner's instruction: whenever I enter the terminal it refreshes everything, so it is all up
   to date and I do not have to do more work.

   Most of it already happened: the book came down, a connected broker was read, prices and every
   score were refreshed. What did not was the news, the market's own readings and the "what needs
   you" list, each of which waited to be asked for; and the dashboard still opened by telling
   somebody to press Run review, which is the sentence this instruction exists to delete.

   WHAT THIS SUITE DEFENDS is not that it works. It is the four ways an automatic catch-up turns
   into a worse product than the manual one it replaced:

     - blocking the door on a slow network
     - running on every reload until the data provider starts refusing
     - overriding somebody who turned auto-refresh off, which would be making them work to stop work
     - one failing step killing the steps after it

   Every call is a stub that records what it was asked to do, so each assertion is about what
   actually ran rather than what the source appears to say. */
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

function harness(opts = {}) {
  const ran = [];
  const D = { rules: Object.assign({ autoRefresh: 'yes' }, opts.rules || {}), lastCatchUp: opts.lastCatchUp || 0 };
  const boom = name => async () => { ran.push(name); if ((opts.throws || []).includes(name)) throw new Error(name + ' failed'); };
  const env = {
    D,
    _newsAutoLoaded: false,
    hasMarketData: () => opts.marketData !== false,
    sessionAlive: () => (opts.aliveUntil === undefined ? true : ran.length < opts.aliveUntil),
    refreshAllSoon: boom('prices+scores'),
    renderCommand: () => ran.push('what-needs-you'),
    loadNews: boom('news'),
    loadMarketData: boom('market'),
    loadFearGreed: boom('feargreed'),
    renderAll: () => ran.push('render'),
    saveDB: () => ran.push('save'),
    document: { getElementById: () => null },
    setTimeout: () => {},
  };
  const names = Object.keys(env);
  const fn = new Function(...names,
    liftConst('const CATCH_UP_GAP_MS=', ';') + '\nlet _catchingUp=false;\n' +
    lift('function catchUpStatus(msg)') + '\n' + lift('async function catchUpEverything()') +
    '\nreturn catchUpEverything;')(...names.map(n => env[n]));
  return { run: fn, ran, D };
}

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

console.log('\nIT DOES THE WHOLE LOT, IN THE ORDER THAT MATTERS');
{
  const h = harness();
  await h.run();
  t('prices and every score run first', h.ran[0] === 'prices+scores', h.ran);
  t('then what needs you is redrawn', h.ran.indexOf('what-needs-you') === 1, h.ran);
  t('then the news', h.ran.indexOf('news') > h.ran.indexOf('what-needs-you'), h.ran);
  t('then the market readings', h.ran.indexOf('market') > h.ran.indexOf('news'), h.ran);
  t('and fear and greed', h.ran.includes('feargreed'));
  t('everything is redrawn at the end', h.ran.lastIndexOf('render') > h.ran.indexOf('market'), h.ran);
  t('and the result is saved', h.ran.includes('save'));
  /* The three that used to wait for somebody to open a tab. */
  t('the three that used to need a tab opened all ran', ['news', 'market', 'feargreed'].every(x => h.ran.includes(x)));
}

console.log('\nIT RESPECTS A NO');
{
  const h = harness({ rules: { autoRefresh: 'no' } });
  await h.run();
  t('auto-refresh off means none of it', h.ran.length === 0, h.ran);
  t('and the throttle is not spent either', h.D.lastCatchUp === 0, h.D.lastCatchUp);
}
{
  const h = harness({ marketData: false });
  await h.run();
  t('no market data means nothing to refresh', h.ran.length === 0, h.ran);
}

console.log('\nIT DOES NOT RUN ON EVERY RELOAD');
{
  const h = harness({ lastCatchUp: Date.now() - 60 * 1000 });
  await h.run();
  t('a minute ago is not repeated', h.ran.length === 0, h.ran);
}
{
  const h = harness({ lastCatchUp: Date.now() - 11 * 60 * 1000 });
  await h.run();
  t('eleven minutes later it runs again', h.ran.length > 0, h.ran.length);
}
{
  const h = harness();
  await Promise.all([h.run(), h.run(), h.run()]);
  t('three entries at once do the work once', h.ran.filter(x => x === 'prices+scores').length === 1, h.ran);
}
{
  const gap = liftConst('const CATCH_UP_GAP_MS=', ';');
  t('the gap is ten minutes, not a number buried in the body', /10\*60\*1000/.test(gap), gap);
}

console.log('\nONE FAILING STEP CANNOT STOP THE REST');
{
  const h = harness({ throws: ['prices+scores'] });
  await h.run();
  t('the news still loads when prices fail', h.ran.includes('news'), h.ran);
  t('and the market still loads', h.ran.includes('market'));
}
{
  const h = harness({ throws: ['news'] });
  await h.run();
  t('the market still loads when the news fails', h.ran.includes('market'), h.ran);
  t('and it still saves', h.ran.includes('save'));
}
{
  const h = harness({ throws: ['prices+scores', 'news', 'market', 'feargreed'] });
  await h.run();
  t('everything failing still finishes without throwing', h.ran.includes('save'), h.ran);
}

console.log('\nTHE SESSION CAN END WHILE IT WORKS');
{
  const h = harness({ aliveUntil: 1 });
  await h.run();
  t('a sign-out during the first step stops the rest', !h.ran.includes('news'), h.ran);
  t('and nothing is written', !h.ran.includes('save'), h.ran);
}

console.log('\nIT NEVER BLOCKS THE DOOR, AND IT SAYS WHAT IT IS DOING');
{
  const login = lift('async function finishLogin(');
  t('finishLogin calls it', /catchUpEverything\(\)/.test(login), login.slice(-300));
  t('without awaiting it', !/await\s+catchUpEverything/.test(login));
  t('and a throw in it cannot break the sign-in', /try\{ catchUpEverything\(\); \}catch/.test(login));
  const body = lift('async function catchUpEverything()');
  t('every step is individually wrapped', (body.match(/try\{/g) || []).length >= 5, (body.match(/try\{/g) || []).length);
  t('it says what it is doing while it works', /Bringing everything up to date/.test(body) && /Reading the news/.test(body));
  t('and says when it is finished and that nothing needs pressing', /Nothing needs pressing/.test(body));
  t('the finished line clears itself rather than sitting there', /setTimeout\(\(\)=>\{ try\{ catchUpStatus\(''\); \}catch\(e\)\{\} \}, 12000\)/.test(body));
  t('there is a line on the dashboard for it', /id="catchUpLine"/.test(src));
}
{
  /* The sentence this instruction exists to delete. */
  /* Checked as a rendered string, not as prose: the comment explaining the change necessarily
     quotes the sentence it replaced, and an assertion that bans the words bans its own reason. */
  t('the dashboard no longer tells anybody to press Run review',
    !/'Press Run review, at the foot of this screen/.test(src));
  t('it says the work is already happening', /Nothing for you to press/.test(src));
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
