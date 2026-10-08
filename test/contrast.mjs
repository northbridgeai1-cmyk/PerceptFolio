/* THE COLOURS OF THE FRIENDLY PASS, MEASURED (2026-10-06).

   The owner asked for the terminal to be friendlier and more usable for everyone, and "everyone"
   is where contrast stops being a nicety. DESIGN.md has said since the first pass that contrast on
   this product is computed rather than assumed; the friendly pass introduced four new tokens and a
   white card surface that several existing colours now sit on instead of the bone ground, so every
   one of those pairings is new and none of it was checked by anything.

   WHY A SUITE AND NOT A GLANCE. A colour that is comfortable on #f4f1ea can fail on #fffdf8, and
   the eye is a bad judge of a 4.5 ratio. It is also the kind of thing that silently regresses: the
   next person to warm up a grey has no way of knowing which greys were load-bearing.

   WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and for the boundary of a control. Meaning
   colours (green, red, amber) are held to 3:1 because none of them ever carries meaning alone in
   this terminal: the verdict is a WORD, the gain is a NUMBER with a sign, and the colour agrees
   with text that is already there. That exemption is the reason it is written down here. */
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../terminal/index.html', import.meta.url), 'utf8');

/* Pull a token's value out of a named rule block, so the suite reads what ships rather than a copy. */
function tokensIn(marker) {
  /* `marker` is text that appears inside the rule, not a selector, because this file has several
     rules for body.theme-light and the one that matters differs by which token it declares. */
  const at = src.indexOf(marker);
  if (at < 0) throw new Error('not found: ' + marker);
  const open = src.lastIndexOf('{', at);
  const body = src.slice(open, src.indexOf('}', at));
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) out[m[1]] = m[2].trim();
  return out;
}
const hex = h => {
  const s = h.replace('#', '');
  const f = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
};
const lum = h => {
  const [r, g, b] = hex(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

let pass = 0, fail = 0;
const t = (n, ok, got) => { if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (got !== undefined ? '   ' + got : '')); } };
const atLeast = (name, fg, bg, min) => {
  const r = ratio(fg, bg);
  t(`${name} is at least ${min}:1`, r >= min, `${r.toFixed(2)}:1  (${fg} on ${bg})`);
  return r;
};

/* The friendly pass's own tokens, light and dark. */
const v4Light = tokensIn('--pf-card:#fffdf8');   // the friendly block's light rule
const light = tokensIn("--bg:#f4f1ea");         // the paper palette
const v4Root = tokensIn('--pf-card:#16181d');   // the friendly block's root (dark) rule

console.log('\nTHE FRIENDLY PASS DEFINES BOTH THEMES');
for (const k of ['--pf-card', '--pf-cardline', '--pf-muted', '--pf-rowhover']) {
  t('light defines ' + k, !!v4Light[k], v4Light[k]);
  t('dark defines ' + k, !!v4Root[k], v4Root[k]);
}
/* The ordering bug this file was written after: the ROOT must hold the dark values, because
   custom properties on :root apply to anything rendered outside body too. A white card at the
   root over a near-black ground is invisible text, and it shipped for about ten minutes. */
t('the root default is the dark card, not the white one', ratio(v4Root['--pf-card'], '#ffffff') > 10,
  v4Root['--pf-card']);

console.log('\nPAPER: TEXT ON THE NEW CARD SURFACE');
const card = v4Light['--pf-card'];
atLeast('body text on the card', light['--text'], card, 4.5);
atLeast('quiet text on the card', v4Light['--pf-muted'], card, 4.5);
atLeast('quiet text on the page ground', v4Light['--pf-muted'], light['--bg'], 4.5);
atLeast('links on the card', light['--accent'], card, 4.5);

console.log('\nPAPER: THE COLOURS THAT CARRY MEANING, WHICH NEVER CARRY IT ALONE');
atLeast('a gain, green on the card', light['--green'], card, 3);
atLeast('a loss, red on the card', light['--red'], card, 3);
atLeast('a hold, amber on the card', light['--yellow'], card, 3);

console.log('\nPAPER: THE CARD MUST BE VISIBLE AS A SURFACE, AND ITS EDGE AS AN EDGE');
{
  /* Too close to the ground and the grouping this whole pass exists for does not read; the point
     of a card here is that a beginner can see where one idea stops. */
  const sep = ratio(card, light['--bg']);
  t('the card is distinguishable from the page', sep >= 1.04, sep.toFixed(3) + ':1');
  atLeast('the card border against the card', v4Light['--pf-cardline'], card, 1.1);
}

console.log('\nDARK: THE SAME PAIRS, ON ITS OWN GROUND');
{
  const dcard = v4Root['--pf-card'];
  atLeast('body text on the dark card', '#eef0f3', dcard, 4.5);
  atLeast('quiet text on the dark card', v4Root['--pf-muted'], dcard, 4.5);
  atLeast('a gain on the dark card', '#2ea043', dcard, 3);
  atLeast('a loss on the dark card', '#e5534b', dcard, 3);
  const sep = ratio(dcard, '#0b0c0f');
  t('the dark card is distinguishable from the dark page', sep >= 1.04, sep.toFixed(3) + ':1');
}

console.log('\nSIZES: NOTHING QUIET IS ALSO TINY');
{
  /* The pass raised the floor to 12.5px, because the old 11px and 12px greys were most of the
     screen and were the other half of why this was hard to read. */
  const v4 = src.slice(src.indexOf('<style id="v4-friendly">'));
  t('the floor is stated once, as a rule', /font-size:12\.5px !important/.test(v4));
  t('body text is 15px, not 14', /body\{font-size:15px\}/.test(v4));
  t('the small-text floor covers 11px, 11.5px and 12px', /font-size:11px/.test(v4) && /font-size:11\.5px/.test(v4) && /font-size:12px/.test(v4));
}

console.log('\nTARGETS: REACHABLE WITH A FINGER');
{
  const v4 = src.slice(src.indexOf('<style id="v4-friendly">'));
  t('buttons have a minimum height', /\.btn\{min-height:40px/.test(v4));
  t('and grow on a touch screen to the 44px floor', /@media \(pointer:coarse\)[\s\S]{0,200}min-height:44px/.test(v4));
  t('icon buttons too', /\.icon-btn\{width:44px;height:44px\}/.test(v4));
  t('and so do fields, which is where a mis-tap costs the most', /select,input,textarea\{min-height:44px\}/.test(v4));
}

console.log('\nAND THE PASS IS REVERTIBLE, LIKE THE THREE BEFORE IT');
{
  t('it is one named block', (src.match(/<style id="v4-friendly">/g) || []).length === 1);
  /* Counted as real tags, not as text: the note explaining the restored rates rules quotes the
     name of the block they came from, and an assertion that matches prose matches that too. */
  t('it is the last stylesheet in the file', (() => {
    const tags = [...src.matchAll(/\n<style id="([^"]+)">/g)].map(m => m[1]);
    return tags[tags.length - 1] === 'v4-friendly';
  })());
  t('it says what it reverses and why', /reverses part of the second and third on purpose/i.test(src));
}

console.log('\n' + (fail ? 'FAILED ' + fail + ', passed ' + pass : 'ALL ' + pass + ' CHECKS PASSED') + '\n');
process.exit(fail ? 1 : 0);
