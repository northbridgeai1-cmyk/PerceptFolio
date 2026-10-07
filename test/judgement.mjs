/* WHO ANSWERS THE FOUR JUDGEMENT CHECKS (2026-10-07).

   Four of the thirty-six are not facts to look up: is the moat durable, is there a growth runway,
   did management raise guidance, is it cheaper than its peers. They sit blank for almost everybody,
   which is 15% of the weight permanently at unknown.

   The owner's rule and its one deliberate exception:

       A model never judges.  EXCEPT at beginner level, where it answers these four.

   A beginner cannot judge a moat, so a blank check helps nobody. Somebody who asked for ten or
   fifteen screens is saying they want to judge for themselves, and handing them a model's opinion
   inside their own rulebook would be the opposite of this product.

   What this suite defends is the boundary, because it is the kind that erodes quietly:
     - the level, and nothing else, decides whether a model may answer
     - a model answer is never written into the human's field
     - a human answer always wins, at every level
     - and whenever a model answered, the page and the verdict both say so */
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../terminal/index.html', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');

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

/* `level` is the account's experience level: 0 beginner, 1 intermediate, 2 advanced. */
const build = (level, D) => new Function('D', 'userLevel',
  liftConst('const JUDGE_FIELDS=', ';') + '\n' +
  lift('function manualFor(sym)') + '\n' + lift('function modelJudgedFor(sym)') + '\n' +
  lift('function modelMayJudge()') + '\n' + lift('function judgementFor(sym,field)') + '\n' +
  lift('function judgeNote(j,fallback)') + '\n' +
  'return {judgementFor, modelMayJudge, judgeNote};')(D, () => level);

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '\n        got ' + JSON.stringify(got) : '')); } };

const withModel = () => ({ manual: {}, modelJudged: { X: { moat: { value: 'yes', why: 'switching costs are high' },
  runway: { value: 'no', why: 'market is saturated' }, guidance: { value: 'unknown', why: '' }, comps: { value: 'yes', why: 'cheaper on earnings' } } } });

console.log('\nTHE LEVEL, AND NOTHING ELSE, DECIDES WHETHER A MODEL MAY ANSWER');
{
  t('a beginner gets the model\'s answer', build(0, withModel()).judgementFor('X', 'moat').value === 'yes');
  t('and it is labelled as the model\'s', build(0, withModel()).judgementFor('X', 'moat').by === 'model');
  for (const [lvl, name] of [[1, 'intermediate'], [2, 'advanced']]) {
    const j = build(lvl, withModel()).judgementFor('X', 'moat');
    t(`an ${name} does not`, j.value === 'unknown' && j.by === null, j);
  }
  t('modelMayJudge is true only at beginner',
    build(0, {}).modelMayJudge() === true && build(1, {}).modelMayJudge() === false && build(2, {}).modelMayJudge() === false);
}

console.log('\nA HUMAN ANSWER ALWAYS WINS');
{
  const D = withModel(); D.manual.X = { moat: 'no', runway: 'unknown', guidance: 'unknown', comps: 'unknown', fwdpe: null };
  const j = build(0, D).judgementFor('X', 'moat');
  t('the human answer beats the model\'s, even at beginner', j.value === 'no' && j.by === 'you', j);
  t('and a field they left alone still uses the model\'s', build(0, D).judgementFor('X', 'runway').by === 'model');
}
{
  /* The model's view must never be written into the human's field, or raising the level would
     inherit an opinion the person never formed. */
  const D = withModel();
  build(0, D).judgementFor('X', 'moat');
  t('reading a model answer does not write it into the human field',
    !D.manual.X || D.manual.X.moat === 'unknown', D.manual.X);
  t('the two are stored apart', /D\.modelJudged/.test(src) && !/D\.manual\[sym\]\[f\]=.*modelJudged/.test(src));
}

console.log('\nUNKNOWN STAYS UNKNOWN');
{
  t('a model answering unknown leaves the check unanswered',
    build(0, withModel()).judgementFor('X', 'guidance').value === 'unknown');
  t('a company the model was never asked about is unknown',
    build(0, { manual: {}, modelJudged: {} }).judgementFor('ZZZ', 'moat').value === 'unknown');
  t('and the worker is told that guessing is worse than unknown here',
    /Guessing is worse than unknown here/.test(worker));
  t('and that it must never say whether to buy or sell',
    /Never give investment advice and never say whether to buy or sell/.test(worker));
}

console.log('\nWHENEVER A MODEL ANSWERED, IT IS SAID');
{
  const B = build(0, withModel());
  const n = B.judgeNote(B.judgementFor('X', 'moat'), 'fallback');
  t('the check\'s note says the model answered it', /Answered by the model/.test(n), n);
  t('it says why that is happening', /because you are set to Starting out/.test(n), n);
  t('and that the reader can take it back', /Change it and your answer wins/.test(n), n);
  t('a human-answered check says so instead', /^Your answer\./.test(B.judgeNote({ value: 'yes', by: 'you' }, 'f')));
  t('and an unanswered one falls back to its own instruction', B.judgeNote({ value: 'unknown', by: null }, 'Check the call.') === 'Check the call.');
}
{
  t('the verdict discloses how many the model answered', /modelJudgedCount\+' of the four judgement checks were answered by the model/.test(src));
  t('it is counted from the same accessor the checks use', /out\.modelJudgedCount=JUDGE_FIELDS\.filter\(f=>judgementFor\(sym,f\)\.by==='model'\)\.length;/.test(src));
  t('and said before the arithmetic, with the other disclosures', /\+guessWarn\+judgedWarn;/.test(src));
  t('the dropdown shows the human answer, not the model\'s', /\(man\[field\]===o\?' selected':''\)/.test(src));
  t('with what the model said underneath it', /The model answered <b>/.test(src));
  t('and answering re-scores at once rather than next refresh', /if\(D\.analyses&&D\.analyses\[sym\]\)try\{ analyzeStock\(sym\); \}catch/.test(src));
}

console.log('\nTHE FETCH IS GUARDED IN ONE PLACE');
{
  t('judgeDrafts refuses unless the level allows it', /if\(!D\|\|isDemoUser\(\)\|\|!modelMayJudge\(\)\)return;/.test(src));
  t('holdings only, capped, once each', /\.slice\(0,6\);/.test(src) && /!D\.modelJudged\[sym\]&&!D\.judgeTried\[sym\]/.test(src));
  t('it runs in the catch-up beside the chain pre-fill', /try\{ await judgeDrafts\(\); \}catch/.test(src));
  t('the route is code-gated and cached', /url\.pathname === '\/judge'/.test(worker)
    && /grantIsLive\(env, code\)/.test(worker) && /expirationTtl: 604800/.test(worker));
  t('and honest when no model is configured', /No model is configured on the worker\./.test(worker));
}

console.log('\nGROQ IS A PROVIDER, NOT A NEW CONTRACT');
{
  t('groq is tried first when its key is set', /if \(env\.GROQ_API_KEY\) \{/.test(worker));
  t('it returns the same shape as the others', /return \{ text, model: 'groq' \};/.test(worker));
  t('and nothing changes when the key is unset', /GROQ_API_KEY \|\| env\.AI_API_KEY \|\| env\.AI/.test(worker));
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
