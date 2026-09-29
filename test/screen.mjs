/* WHAT A REQUEST SAYS IT IS FOR (2026-09-29).

   Anyone may ask. What is screened is never who is asking, only what they say the terminal would be
   used for. The filter flags; it never refuses by itself, because keyword matching on free text is
   wrong often enough that a silent automatic refusal would lose real customers and tell nobody.

   So the two halves of this suite matter equally, and the SECOND one matters more:
     - does it catch a plain statement of illegal intent
     - does it leave alone the careful professional who writes the same words to say the opposite

   The function is lifted out of worker.js rather than copied, so a change to it is a change here. */
import { readFileSync } from 'node:fs';
const worker = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');

function lift(sig) {
  const at = worker.indexOf(sig);
  if (at < 0) throw new Error('not found: ' + sig);
  let depth = 0;
  for (let j = worker.indexOf('{', at); j < worker.length; j++) {
    if (worker[j] === '{') depth++;
    else if (worker[j] === '}') { depth--; if (depth === 0) return worker.slice(at, j + 1); }
  }
  throw new Error('unbalanced: ' + sig);
}
function liftConst(name, close) {
  const at = worker.indexOf(name);
  if (at < 0) throw new Error('not found: ' + name);
  const end = worker.indexOf(close, at);
  return worker.slice(at, end + close.length);
}

const screenRequest = new Function(
  liftConst('const ILLEGAL_PATTERNS = [', '\n];') + '\n' +
  liftConst('const NOT_INTENT = /', '/i;') + '\n' +
  lift('function screenRequest(text)') + '\nreturn screenRequest;'
)();

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '   got ' + JSON.stringify(got) : '')); } };
const flagged = s => screenRequest(s).level === 'review';

console.log('screening what a request is for');

console.log('\n  it catches a plain statement of intent');
[
  ['insider dealing', 'I get insider information from a friend at the company and I want to size the trades properly.'],
  ['non-public', 'I trade on material non-public information and need somewhere to keep the record.'],
  ['pump and dump', 'Running a pump and dump on small caps, need to track the names.'],
  ['manipulation', 'I do some price manipulation on thin order books and want to measure it.'],
  ['wash trading', 'We use wash trading to make the volume look better.'],
  ['front-running', 'I front-run my clients and want to see how it is doing.'],
  ['laundering', 'Need to move money through trades, basically laundering it.'],
  ['sanctions', 'Looking for a way to bypass sanctions on a few counterparties.'],
  ['concealing', 'I need to hide the funds from my ex-wife before the hearing.'],
  ['illicit funds', 'Investing stolen crypto and tracking the returns.'],
  ['ponzi', 'I run a ponzi and need better reporting for the investors.'],
  ['tax evasion', 'This is mostly for tax evasion, I need the numbers to look consistent.'],
  ['unregistered', 'I am an unregistered broker taking money from about forty people.'],
].forEach(([label, text]) => t(label, flagged(text), screenRequest(text)));

console.log('\n  it leaves the careful professional alone, which is the half that matters');
[
  ['compliance officer', 'I am a compliance officer and I need to detect insider dealing among our traders.'],
  ['avoiding it', 'I want to be certain I never front-run my own clients, so I need a timestamped record.'],
  ['prevention', 'Our mandate is to prevent money laundering, and I want to test screening ideas.'],
  ['a victim', 'I was the victim of a pump and dump and want to analyse what happened.'],
  ['sanctions compliance', 'We must not breach sanctions, so I check every counterparty before trading.'],
  ['regulated', 'We are a regulated adviser and manage client money under licence.'],
  ['plain private investor', 'I am a retired teacher investing my own savings and I keep making the same mistake.'],
  ['a fund', 'Concentrated long book, about thirty positions, mostly semis and industrials.'],
  ['no text at all', ''],
  ['ordinary words', 'I want to stop selling my winners too early and I want proof either way.'],
].forEach(([label, text]) => t(label, !flagged(text), screenRequest(text)));

console.log('\n  and it reports enough for a person to judge');
{
  const r = screenRequest('I trade on insider information and also run a pump and dump.');
  t('every match is listed, not just the first', r.hits.length === 2, r.hits);
  t('each carries a label and the words that matched', r.hits.every(h => h.label && h.phrase), r.hits);
  t('a clear request says clear with no hits', screenRequest('Just my own savings.').level === 'clear');
}

console.log('\n  the worker wires it the way the design says');
t('the request is stored whatever the verdict, so nobody is refused at the door',
  /screen: screenRequest\(\[who, call\]\.filter\(Boolean\)\.join\('\\n'\)\),/.test(worker));
t('the visitor gets the same reply either way, so the filter cannot be probed',
  /AND NOTHING ABOUT THE SCREENING IS ECHOED EITHER/.test(worker) &&
  !/screen(?:ed|ing)?: *(?:true|record\.screen)/.test(worker.slice(worker.indexOf("return json({ ok: true, id, notified:"), worker.indexOf("return json({ ok: true, id, notified:") + 300)));
t('no code is issued for a flagged request without an explicit override',
  /if \(flagged && decision !== 'denied' && !body\.override\)/.test(worker));
t('denying a flagged request needs no override, because denying is the safe direction',
  /decision !== 'denied'/.test(worker));
t('the override is recorded on the request', /rec\.overriddenAt = Date\.now\(\)/.test(worker));
t('the operator is told in the subject line, not only in the body',
  /\$\{flagged \? '\[FLAGGED\] ' : ''\}Demo request from/.test(worker));

console.log('');
if (fail) { console.log(fail + ' FAILED, ' + pass + ' passed'); process.exit(1); }
console.log('ALL ' + pass + ' CHECKS PASSED');
