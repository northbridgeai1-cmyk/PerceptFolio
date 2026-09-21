---
version: 1
name: PerceptFolio
description: The visual system as shipped on the public landing page and shared with the terminal, the legal pages and the refused-modules page. Dark by use scene (a desk with other terminals open), one cool-blue action colour, teal reserved for the mark, a self-hosted grotesk for headlines only. The terminal's own screen is the hero of the landing page; the landing page borrows the terminal's tokens for that facsimile rather than restyling it.
---

# PerceptFolio design system

Derived from index.html, terminal/index.html and the shared legal pages after the landing redesign
of 2026-09-13. Structure (type scale, spacing rhythm, radii, component anatomy) was calibrated
against the Notion reference kept at .impeccable/reference/notion-DESIGN.md; nothing of its colour
or brand was taken.

## Colour

Strategy: restrained. Neutrals plus one action colour. The surface is dark because the use scene
is a desk during market hours with other dark terminals open beside it, not because the category
is dark.

| token | value | role |
|---|---|---|
| --bg | #0b0c0f | page ground |
| --panel | #131519 | raised surface |
| --panel2 | #1a1d23 | second raise, inputs on panels |
| --line | #24272f | hairline |
| --line2 | #2f333c | stronger hairline, input borders |
| --text | #eef0f3 | primary text |
| --dim | #a9aeb8 | body on dark ground |
| --faint | #949aa6 | secondary; clears 4.5:1 on --panel2, the darkest surface it sits on |
| --accent | #3b82f6 | links, focus ring, the sizing bars |
| --accent-solid | #2563eb | primary button background; white on it is 5.17:1 |
| --brand2 | #1f9e8c | the F in the mark, the active rail in the terminal sidebar; nowhere else |
| --green / --red / --amber | #2ea043 / #e5534b / #d9a441 | pass / fail / watch, and the honest-note dot |

The terminal facsimile carries the terminal's own tokens (--tbg #0e0f12, --tpanel #16181d,
--tpanel2 #1e2128, --tline #2b2f38) scoped to itself, so it is the product and not a drawing of it.

Contrast is computed, not assumed: the test suite checks --faint against every ground and white
against --accent-solid, and Lighthouse accessibility is held at 100 on every public page.

## Type

Display: Archivo, variable 500–900, self-hosted at /fonts/Archivo.woff2 because the page CSP is
font-src 'self'. Used for h1, h2, h3, the ticker symbol in the facsimile, and the demo verdict.
Body: the system stack, matching the terminal. Mono: the system mono stack, only for data,
measurement, and labels inside the terminal facsimile; never as a costume on page copy.

| role | size | weight | tracking | leading |
|---|---|---|---|---|
| h1 | clamp(40px, 5.2vw, 74px) | 900 | -0.035em | 0.98 |
| h2 | clamp(32px, 3.4vw, 44px) | 800 | -0.025em | 1.05 |
| h2 on the "who" section | clamp(36px, 4.6vw, 60px) | 800 | -0.025em | 1.05 |
| h3 | 22px | 700 | -0.01em | 1.3 |
| lede | 19px (21px in the hero) | 400 | 0 | 1.55 |
| body | 16px | 400 | 0 | 1.6 |
| small / hint | 14px | 400 | 0 | 1.5 |
| data (mono) | 12–14px | 500–600 | 0.02–0.12em | 1 |

All px sizes are integers. Headings use text-wrap: balance. No eyebrow or kicker sits above any
heading; the heading carries its own weight. No section numbers.

## Spacing

Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40. Section rhythm: --sec 96px, --sec-lg 120px,
--sec-sm 64px; at ≤900px 72 / 88 / 48; at ≤600px 56 / 64. Content column --wrap 1280px with
--gutter 40px (28 at ≤900, 20 at ≤600). Body measure is capped at 64ch, ledes at 58ch, FAQ
answers at 66ch.

Composition rule for the landing page: no two adjacent sections share a layout. Shipped order is
bleed (hero) → left-heavy 7/5 → right-heavy 5/7 → centred narrow strip → wide type-only →
form + definition list → accordion. Card grids of icon + heading + text are not a page structure.

## Radius and depth

--r-md 8px for every control (buttons, inputs, selects, small tags), --r-lg 12px for panels,
--r-xl 16px for the terminal frame. The terminal facsimile keeps the terminal's own 10px.
The verdict pill is 6px, as in the terminal; nothing is pill-shaped.

Depth is a real drop shadow with offset and blur, used on the terminal frame and the two close-up
panels: 0 30px 80px -20px rgba(0,0,0,.7) plus 0 10px 24px -12px rgba(0,0,0,.5). No halos, no
hard offset shadows, no glass as decoration.

## Components

- Button: 10px 18px, --r-md, 600, 15px. Primary is --accent-solid with white; secondary is
  transparent with a --line2 border; large adds 13px 22px / 16px. Hover shifts background, active
  translates 1px. Disabled at .55 opacity.
- Panel: --panel, 1px --line, --r-lg. Padding 24 (form) or 20–22 (close-ups).
- Input: --bg on a panel, 1px --line2, --r-md, 12px 14px; focus is a 3px --accent glow at .18;
  :user-invalid turns the border --red.
- Ledger table: mono uppercase 12px headers on --tbg, 14px rows, tabular numerals, scrolls in its
  own box below 520px. Empty state is a footer sentence, not a placeholder graphic.
- Limits strip: five equal cells separated by 1px --line, each with a 6px bar, a 2px limit marker,
  and a mono caption; the refusing cell turns its bar and figure --red.
- Definition list (access terms): Archivo 16px terms, --dim 15px definitions, hairline between.
- Accordion: native details/summary, 17px 600 summary, a drawn plus icon that rotates 45° when
  open. No JS.
- Honest note: --panel box with an --amber dot, used once, for the statement that the record is new.

## Motion

One authored moment: on load the terminal's 22 check rows resolve top to bottom (42ms stagger,
600ms, cubic-bezier(.16,1,.3,1)) from .28 opacity, then the verdict and score land with a short
blur-to-sharp. Everything is visible from the first frame at reduced opacity, so an early scroller
or a reduced-motion user sees the finished screen. prefers-reduced-motion removes all of it and
smooth scrolling. Hover transitions are 180ms on the same curve. Nothing else moves.

## The terminal's surface (ledger pass, 2026-09-20)

The terminal is set like a statement, not a dashboard template. One block, `<style id="v3-ledger">`,
last in terminal/index.html, carries the whole decision and can be removed to revert it.

- Ground: flat --bg, no ambient gradient, and no boxes: a panel on the page is a 1px --border rule
  above its content, on the page's own ground. Only what floats over the page (the add sheet, a
  menu, the palette, a tooltip) keeps a background and an edge. No inset highlights, no drop
  shadows, no glow on the active tab. Quiet buttons are a --panel2 fill, not an outline; the
  sign-in toggle and the chart pickers are underlines.
- Type: Archivo for the page heading (the date), section titles, the hero figure and the stat
  figures; the system stack for everything else; mono only for tickers, tables and code. Labels are
  sentence case, 12px, --muted. No uppercase monospace kickers anywhere.
- Boxes: a card inside a card is a hairline row. The stat row is four figures separated by
  hairlines. The track record and marks schedule are hairline sections, not boxes.
- Colour: the primary button, the active tab's rule and links carry the accent; green and red are
  for numbers that moved and for a verdict word; nothing else is tinted. A verdict is a coloured
  word, not a chip. No halos on dots.
- Empty states are one sentence, left-aligned, no dashed frame.
- The sign-in screen shows the wordmark, the sentence and the form; the feature list stays on the
  landing page.

## Paper (2026-09-21)

The terminal's default is paper, not dark: a warm bone ground (#f4f1ea), ink text, hairlines in
warm grey, one blue for links, green and red only for numbers that moved. Dark remains under
Settings > Appearance and is kept only by a profile that chose it through the switch (the old
default value does not count as a choice). Fields are underlines; quiet actions are underlined
words; the one primary action on a screen is a solid ink button; the desktop sidebar is a list
of words (icons remain on the collapsed rail and the phone). Nothing on the page is framed or
filled; only what floats over it (sheets, menus, the palette, tooltips) has an edge. Section
headings are Archivo 15px. No paragraph on screen says what a thing is for; empty states are
one line; the folded notes are hidden (their text stays in the source).

## Soft (2026-09-21, later)

"Everything is still square; it got worse." The paper pass had set every radius to zero, which
read as sharper, not calmer. Now nothing on the page is a box and nothing that remains a shape
is sharp: fields are soft fills (--panel2, 10px), buttons are rounded (10px, not pills), the
search field is round, tiles and frames are 10–16px, the switch and the avatar are circles. The
rules that cut the page into bands are gone; space (30px) does the grouping and a section title
keeps its one rule. Row hairlines use --line, a shade lighter than --border. A keyless heat map
is one line, not fifty grey tiles.

## Browser surfaces

Selection is --accent at .35. Scrollbars are --line2 thumbs on the page ground. Caret is --accent.
Focus-visible is a 2px --accent outline with 3px offset. Link underlines sit at .18em with a
1px thickness in accent at .45, going solid on hover. Tabular numerals wherever a figure sits in a
column.

## Iconography

The terminal's own SVG sprite (i-dash … i-alerts) at 1.9 stroke, round caps and joins, reused
verbatim in the facsimile. Two additions drawn to match: i-search and i-plus. No emoji, no
unicode glyphs standing in for icons; the pass/fail marks inside rows are the exceptions, kept as
conventional monochrome dingbats.

## Accessibility floor

WCAG 2.2 AA verified by Lighthouse at 100 on every public page. Every screen, including sign-in,
has a main landmark; the skip link targets it. Touch targets grow to 44px on coarse pointers via
a display change, not padding alone. Live region on the form message. The facsimile is a single
role="img" with a full-sentence label; its internals are aria-hidden.
