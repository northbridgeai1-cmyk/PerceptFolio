# The standard every commit is judged against

You are working on PerceptFolio, a single-file HTML/CSS/JS research terminal for one
operator running their own book on US equities. Build Spec Version 2 governs. Read it in
the task prompt; it supersedes everything else.

## The one claim
It records what it told you, marks that record on a fixed horizon it cannot move
afterwards, and reports the result whether or not the result flatters the system.

**If a change would make the record easier to flatter, it is wrong regardless of how good
it looks.** This is the single most important rule here.

## Non-negotiable invariants
- I1  `STORE_KEY = 'quantfolio_v1'` is NEVER renamed. A boot assertion enforces this.
- I2  One HTML file. No build step, no framework, no bundler, no npm.
- I3  `resetTransientState()` clears every per-account cache on switch.
- I4  `cache.addAll(REQUIRED)` is atomic; one 404 aborts the install.
- I5  The service worker list stays a whitelist, never a blacklist.
- I6  Never cache authenticated requests or market data.
- I7  GitHub Pages is case-sensitive and has no rewrite rules.
- I8  Chart.js 4.4.1 cannot read CSS variables. Pass resolved colours.
- I9  CSS media queries add no specificity and must come last.
- I10 Finnhub free tier: US equities only, no options chain, 60 calls/min.
- I11 Marks are forward-only. NEVER backfill from an unobserved price.

## The standing contract
Every module ships with the sentence stating how it could be shown to be wrong, rendered
in the interface next to its output. A module that cannot state its own falsification does
not ship.

## Statistical honesty
- Every statistic must state when it is too early to read.
- Never report a raw n where an effective n is available: `effectiveN(calls)` exists.
- Never assume a parameter you could measure. A guessed input dressed as a measurement is
  the exact failure this product exists to expose.
- A confidence interval that straddles zero means NO measurable edge, not a small edge.
  Say so in those words.
- Report expectancy, never a win rate, as the headline.

## DO NOT BUILD (refusing these is correct)
Black-Scholes pricer / IV solver / Greeks / vol surface (N(d2) for thesis probability is
already shipped and is the whole usable part); any ML return predictor; backtesting
(negates I11 — M9 is the legitimate exception and varies SIZING ONLY); earnings-call
sentiment; RL hedging; neural vol forecasting; seasonality as a signal (context display
only); any news-derived buy/sell verdict; tracking error as a standalone figure;
mean-variance optimisation; broker connection or auto-execution; a public track record
page (SEC Marketing Rule 206(4)-1 — not without a securities attorney); anything
justified by "Bloomberg has it".

**Never mention Bloomberg in code, copy, or a commit message.** It is a kill-criterion.

## House style — this is a professional terminal, not a landing page
- No em dashes (—) in ANY rendered text. Comments may use them. The suite enforces this.
  Use a full stop, a colon, or a comma.
- No purple gradients, no pill-shaped buttons, no emoji icons, no fake metrics, no fake
  reviews, no vague hero copy, no over-the-top scroll animations.
- Tabular monospace numerals, right-aligned, fixed decimals per column.
- Colour for SIGN only. Never for emphasis or decoration.
- Density over whitespace. Professionals scan.
- Anything acting on a single ticker or row goes behind a vertical 3-dot overflow menu
  (`openMenu` / `ovfButton` already exist). Minimise visible chrome.
- Add buttons are `+ Add` at the top right of the tab, opening a small panel.
- Writing is plain, specific and calm. Explain WHY a number means what it means. Never
  hedge with marketing language. Friendly, never chirpy.

## Verification bar — this is where work gets rejected
"Verified by reading" is not verification and will be rejected outright.
1. `node test/run.mjs` must pass. Add assertions for what you built.
2. Drive it in a real browser against the SHIPPED file. A dev server config exists at
   `.claude/launch.json` (python3 http.server on 8788). Use the Browser pane tools:
   `preview_start {name:"perceptfolio"}` then navigate to
   `http://localhost:8788/terminal/index.html`, and exercise your code with
   `javascript_tool`. Note: top-level `let` bindings (D, DB, _spyPriceCache) are NOT on
   `window`; assign them bare.
3. Test your maths against a case where you KNOW the answer, and against a case where the
   code is deliberately broken, to prove the check can fail.
4. Clean up any test profiles you create (`delete DB.profiles['test1212']; persistDB({deleting:true})`).
5. Bump `CACHE_VERSION` in `sw.js`.
6. Add assertions to the shipped self-test (`SELFTESTS` / `ST(...)` in terminal/index.html)
   when your item has a pure function worth guarding. It runs at `?selftest=1` and its
   result appears on the AUDIT screen.

## Commit discipline
- One item per commit, prefixed with its ID (`M5:`, `P3:`).
- The commit body names the acceptance criterion it satisfies and how it was verified.
- Never change anything in the invariants list without flagging it explicitly.
- Author trailer: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- Do NOT push. The orchestrator pushes.

## Useful existing functions (grep for them)
effectiveN, expectancyStats, callEdge, jensenAlpha, betaVsSpy, alignedReturns,
markSchedule, markHeldDays, accruedYield, yieldPctFor, callRecord, scorecardRows,
requiredSample, annualScale, autocorr, canonicalJson, verifyChain, operatorMatrix,
shortfallStats, openMenu, ovfButton, renderAudit, toast, esc, fmt$, median, normCdf.
