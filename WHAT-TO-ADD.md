# PerceptFolio, what to add

**Date:** 2026-09-21 · **Status:** PROPOSED, drafted from the council of 2026-09-21 and three outside reviews (P, G, C) of the site at $760 a month
**Owner:** NorthBridge · Financial (Pierce) · **Author:** drafted with Claude

> How to read this. Every line is an addition. Nothing here removes a screen, a check or a rule. Each item says what to add, what it is built from (so the size is honest), why, a size, and a gate. Items are numbered so they can be referred to in commits.

**Sizes.** S: a day or less. M: a week. L: a month or more.

**Gates.** NOW: this week. INVOICE: before the first paying customer. MARKS: after the first 90-day marks land, about December 2026. FORTY: after forty marked calls; the hold was lifted on 2026-09-13 (PRD D8), so this gate is statistical, not a rule: below forty marks these displays show intervals too wide to read. LICENCE: needs a licensed data feed. FIRM: with the first paying firm.

**What the three reviews got right and wrong, in one line each.** P could not load the site (the hero defect below is why), and reviewed a generic "cheaper Bloomberg" checklist. G read an older site and priced a product that is not for sale ($760; the site says $149). C read the older site too, and gave the one idea worth building: the review that says what changed since you last looked. None of the three opened the terminal. Most of what they listed as missing is already inside it (VaR and Expected Shortfall, GARCH, block-bootstrap drawdowns, DCF, insider clusters, analyst consensus counts, ten years of EDGAR statements, FRED macro, cited news summaries, push alerts, home-screen install, EN/ES). What they could not see is the problem the site has, not the terminal.

---

## 0. The sentence

| ID | Add | Where | Size | Gate |
|---|---|---|---|---|
| A0.0 | One positioning sentence, used everywhere: **Bloomberg tells you everything that is happening. PerceptFolio tells you whether your decisions worked.** The goal "a cheaper Bloomberg that anyone can use" is replaced by this line in the PRD (§1) and on the landing page. | PRD.md, site | S | NOW |

The price in the question ($760 a month, $8,360 a year) is a firm's number, not a person's. Everything below that carries the FIRM gate is what earns it.

---

## 1. Fix this week

| ID | Add | Built from | Why | Size | Gate |
|---|---|---|---|---|---|
| A1.1 | A Content-Security-Policy for `/preview/` that its inline styles and script satisfy, in `csp()` in [functions/_middleware.js](functions/_middleware.js) (the `FRAMEABLE` branch), or the preview's CSS and JS moved into files under `/preview/`. Add a test in [test/run.mjs](test/run.mjs) that the preview policy allows what the preview uses. | Existing middleware | The hero iframe renders as an unstyled page with a black circle in production. It is the first thing every visitor sees, and the reason P "could not load the site". | S | NOW |
| A1.2 | The analytics beacon allowed (`https://static.cloudflareinsights.com` in `script-src`, `https://cloudflareinsights.com` in `connect-src`), or the injection turned off in the Pages project. | Same file | Blocked today. No funnel data exists, so no price or copy change can be judged. | S | NOW |
| A1.3 | `/refused/` removed from `sitemap.xml` (D12 keeps the page off the site; the sitemap still advertises it and it returns Not found). | sitemap.xml | A 404 in the sitemap on a site that sells care. | S | NOW |
| A1.4 | The data copy corrected. The landing FAQ and the "Bring your own data key" tile in [site/src/pages/Landing.tsx](site/src/pages/Landing.tsx) say the terminal does not resell data and you connect your own key; commit `cbf4197` made market data built in for any signed-in account by access code. Say what is true, for whom, and state coverage (US listings) and latency plainly. | Site copy | Every reviewer's first objection was "I pay and still bring my own data". Half of it is already untrue. | S | NOW |
| A1.5 | A support address on the domain, and a status line on the site (the worker already sends mail through Resend, so the inbox is the only new piece). | Resend, domain | A Gmail address on the sales path caps the price at prosumer by itself. | S | NOW |
| A1.6 | The pricing page rewritten in this order: who it is for, then what it costs. The named comparison (Koyfin $79, Godel $118, YCharts $400) comes out. | Pricing page | Nobody pays five times a product that compared itself to it by name. | S | NOW |

---

## 2. Before the first invoice

| ID | Add | Built from | Why | Size | Gate |
|---|---|---|---|---|---|
| A2.1 | **A licensed price feed** whose terms allow display to subscribers, replacing Yahoo's public endpoint in `/history` and `/popular`, and replacing the personal-plan Finnhub key behind the built-in data route for paying accounts. Candidates: Finnhub's commercial tier, Polygon, Tiingo, EODHD, Databento; read the display and redistribution terms before the price. Until it lands, the built-in route serves employee codes only and subscribers connect their own key, as the site says. | worker.js `/history`, `/popular`, `/data`, `priceFeed` | The one item every voice, both rounds, called the blocker. Revenue on a personal-use key and an unlicensed endpoint is a takedown exposure, and the marking engine dies with the endpoint. | L | INVOICE |
| A2.2 | Terms of use updated for the data: whose it is, what latency, what a subscriber may do with it. | terms/ | Follows A2.1. | S | INVOICE |
| A2.3 | **The full record kept server-side** under the account's identity: calls and marks alongside the daily chain head the worker already stores in `/chain`, and the registry in `/callreg`. Opt-in for Personal (the local copy stays primary), always on for Business seats. | worker.js `/callreg`, `/chain`, KV | A record that lives only in a browser is lost with the browser and cannot be attested. A compliance officer will ask who holds the copy that is not the analyst's. | M | INVOICE |
| A2.4 | **The evidence pack**: one export containing calls, marks, the hash chain and the server's head log, as JSON and CSV. | `exportData()`, `chainRecord()` at [terminal/index.html:15445](terminal/index.html:15445), `/chain` | Today the export is a backup. This is proof. | S | INVOICE |
| A2.5 | **A verifier**: a static page (no login) that takes an evidence pack, recomputes the chain with the same `chainRecord()` the terminal uses, and checks each day's head against the server log. Linked from the site as "Verify a record". | A2.4, the chain code | The site claims "a record nobody can edit" and shows no mechanism. This is the mechanism, checkable by someone who does not trust NorthBridge. | M | INVOICE |
| A2.6 | **A security sheet**, one page, from [SECURITY.md](SECURITY.md): where data lives, what is encrypted, retention, the subprocessors (Cloudflare, the data vendor, Modal for Kronos, Resend, FormSubmit, the model vendor behind summaries), the incident contact. | SECURITY.md | The first question a firm's questionnaire asks. Answer it before it is asked. | S | INVOICE |
| A2.7 | **The flat-quarter statement**, written now: what the site and the Command strip say if the first marks read flat or negative. The claim is the record, not the edge; a flat mark is information; the sizing limits and the History findings hold whether or not the rulebook beat the index. The 180- and 365-day marks are the headline; the 30-day mark is shown but not headlined, because at that horizon it is mostly noise. | PRODUCT.md, Command strip | The honest record is a churn engine unless the product's value is stated independently of the mark, before the mark exists. | S | INVOICE |
| A2.8 | **Two plans, restated.** Personal stays $149 a month / $1,490 a year, labelled Founding, with the date it rises printed and honoured for those who paid. Business becomes $760 a month, three seats included, $8,360 a year, quote-first as now. Price per seat above three: OPEN. | Pricing page, worker billing tiers | $760 is a desk's number. Ten firms at $8,360 is $83,600 with ten relationships; the same revenue is 56 individuals. | S | INVOICE |

---

## 3. The review: what changed since you last looked

The one build to come out of the outside reviews (C). It is composition of data the terminal already fetches, not a model, so it needs no marks to be useful. The user grades; the terminal never does.

| ID | Add | Built from | Why | Size | Gate |
|---|---|---|---|---|---|
| A3.1 | **"Since your last review" on every holding**, and as the body of Command's REVIEW row. Lines, each with its source and date: verdict and check flips since the review date (verdict log); price against the stop and days to the thesis deadline (the thesis record); new filings since (A6.1); insider cluster changes (`getInsiders`); analyst consensus count changes (Finnhub recommendation trend); headlines since, cited (`/summarise`); Kronos path against the path recorded at the last review (`/kronos`); supplier and country links touched by news (Map, World). No line says what it means. | Everything listed exists except A6.1 | Turns the record from a ledger you consult into the reason you open the terminal. | M | MARKS |
| A3.2 | **"Nothing changed" as a line**, with the date and the list of what was checked. | A3.1 | On free-tier data most holdings change little most weeks. An empty flagship reads as broken; a dated "checked, unchanged" reads as diligence. | S | MARKS |
| A3.3 | **A thesis as numbered assumptions.** When a thesis is written, up to six numbered lines, each optionally naming the figure it rests on. The free-text thesis stays. | Thesis form | A thesis that cannot be broken cannot be checked. | S | MARKS |
| A3.4 | **Assumption marks, by hand.** At each review the user marks every assumption supported, broken or uncertain. The marks enter the hash chain with the review date. The terminal never marks an assumption itself. | A3.3, `chainRecord()` | Critic's line: a machine verdict of "assumption broken, review required" on a named holding is where "software, never advice" stops holding. A hand mark in a chained record is a diary entry. | S | MARKS |
| A3.5 | **"Last reviewed" on every holding**, a review cadence the user sets per holding, and REVIEW firing on cadence as well as on the thesis deadline (which it does today, [terminal/index.html:12344](terminal/index.html:12344)). A review closes with its assumption marks. | Command queue | A review that is never due is never done. | S | MARKS |
| A3.6 | **History gains "the assumptions you get wrong"**: which kinds of assumption (growth, margin, multiple, management, macro) break most often, with the count. | A3.4, History | A behavioural fact, like sell-too-early. Not a prediction. Needs volume; shows the count until then. | S | FORTY |

---

## 4. The record made legible

| ID | Add | Built from | Why | Size | Gate |
|---|---|---|---|---|---|
| A4.1 | **A calls-per-quarter meter** on the Command strip and on the site: at this watchlist size and this rulebook, about N verdict changes a quarter, against the ~138 the interval needs. | Verdict log flip rate | G's objection: a five-trades-a-year investor gets "don't know" forever. The answer is that the record fills from the rulebook's verdicts across the whole watchlist and from Kronos, not from trades. Say it with a number. | S | MARKS |
| A4.2 | **CSV export** of calls, marks and holdings, next to the JSON backup. | `exportData()` | P and C asked for Excel. This is Excel. | S | MARKS |
| A4.3 | **Email for marks landing and reviews due**, opt-in, through Resend; browser push exists already (`enablePush`). | worker mail path | A mark not read on the day is a mark not learned from. | S | MARKS |
| A4.4 | **A quarterly record statement**: one generated, printable page per quarter: calls made, marks landed, expectancy with its interval, sizing refusals, the History findings. Print styles exist (`@media print`). Business: one per seat and one for the firm. | Record, print CSS | A brokerage sends a statement. A record should too. | M | MARKS |
| A4.5 | **A company sheet**: one screen that stacks what the Analyzer already shows (the 22 checks with their bars, statements, insiders, consensus, cited news, Kronos, the thesis) into one printable page. | Analyzer, `/edgar`, `/summarise`, `/kronos` | C: stop counting modules, show one company in 90 seconds. This is the screen that does it. | M | MARKS |
| A4.6 | **Share a call**: opt-in public page for one call with its marks and its chain proof, verifiable without an account. | A2.5, A2.3 | The seed of a network effect without a chat network. A colleague or a client verifies one call, then asks for a seat. | M | MARKS |
| A4.7 | **A read-only personal token** returning the account's record and holdings as JSON and CSV, for Sheets (`IMPORTDATA`) and Excel (Power Query). | A2.3, worker | The whole of the "API and Excel" ask, at the cost of one route. | S | MARKS |

---

## 5. The site

| ID | Add | Built from | Why | Size | Gate |
|---|---|---|---|---|---|
| A5.1 | **One company in 90 seconds** as the landing demo: the company sheet (A4.5) on a real ticker, checks visible, with the line "these are checks against bars you set, not a recommendation". The hidden-ticker marking game stays as the second demo. | A4.5 | The current demo hides the ticker to avoid a claim, and in doing so hides the product. | M | MARKS |
| A5.2 | **The record mechanism, on the page**: the hash chain, the server-clocked daily heads, the verifier link. Tiles, not paragraphs. | A2.5 | The most sellable fact the product has appears nowhere on the site. | S | INVOICE |
| A5.3 | **A tour of the screens** with illustrative data, one still per screen, captioned with the decision each screen answers. | preview/ | The site shows the dashboard and nothing else; the reviewers guessed at the rest and guessed low. | M | NOW |
| A5.4 | **"How a desk uses it"**: three seats, one rulebook, one record, one statement, in tiles. | Business mode | The firm page does not exist; the firm is the $760 buyer. | S | INVOICE |
| A5.5 | **The time-to-evidence line** under the empty scorecard: "at a watchlist of N, about M calls a quarter; the interval narrows at about 138." | A4.1 | Turns "honestly empty" into "filling at this rate". | S | MARKS |
| A5.6 | **The security sheet** (A2.6) and the flat-quarter statement (A2.7) published. | A2.6, A2.7 | Buyers read them before they write. | S | INVOICE |

---

## 6. Data: keyless first, licensed after

| ID | Add | Built from | Why | Size | Gate |
|---|---|---|---|---|---|
| A6.1 | **A filings feed per holding** from SEC EDGAR's submissions index (public, keyless, same door as `/edgar`): new 10-K, 10-Q and 8-K since a date, with the 8-K item numbers named (2.02 results, 5.02 officer change, 1.01 material agreement, 8.01 other). Into A3.1. | `/edgar`, EDGAR submissions API | Free, and the single richest "what changed" source there is. | M | MARKS |
| A6.2 | **Institutional holders from 13F-HR** (EDGAR, quarterly, 45-day lag): top holders and quarter-on-quarter change per holding, display only, dated. | EDGAR 13F XML, a CUSIP-to-ticker map | C asked for ownership. It is free; the work is the parsing. | M | MARKS |
| A6.3 | **An economic release calendar** from FRED's release-dates endpoint (the FRED key is on the worker): CPI, payrolls, FOMC, GDP, as dated context on Command. Never a signal. | `/fred` | P and C asked for it; the key already exists. | S | MARKS |
| A6.4 | **Consensus estimates and revisions** (revenue and EPS by year, actual against consensus, revisions with dates) into the company sheet and A3.1. | A licensed source (Finnhub's paid estimates, or another) | The reviewers' most-repeated data ask after real-time. Needs a licence; do not build against the free tier. | M | LICENCE |
| A6.5 | **Transcript links**, from 8-K exhibits and investor-relations pages, on the company sheet. Full transcripts only with a licensed source, later. | A6.1 | Links are free and honest; transcripts are a budget line. | S | MARKS |
| A6.6 | **Quote latency stated on every price** (real-time, delayed, close), from the feed's own terms. | A2.1 | C: make the user feel they are looking at the market. First make them know which market they are looking at. | S | LICENCE |
| A6.7 | **Non-US listings**, only when the licensed feed and a statements source cover them. The 22 checks read EDGAR, which is US filers; the checks come with the coverage or not at all. | A2.1, a non-US statements source | Say why it is US-only until it is not. | L | LICENCE |

---

## 7. Business seats

| ID | Add | Built from | Why | Size | Gate |
|---|---|---|---|---|---|
| A7.1 | **Seat identity**: each seat holds a key pair made in the browser (WebCrypto), the public key registered with the firm at `/org`, and every call signed by the seat that made it. Attribution becomes a signature, not a name field (`madeBy`, [terminal/index.html:16423](terminal/index.html:16423)). | `/org`, `madeBy`, WebCrypto | "Every call carries the name of who made it" is a claim; a signature is a fact a compliance officer can check. | M | FIRM |
| A7.2 | **Rulebook versions**: every publish of the org rulebook (`PUT /org/rulebook`) is chained, and every call records the rulebook version it was made under. The local rule log exists (`renderRuleLog`). | `/org/rulebook`, rule log | A call is only judged fairly against the rules that stood when it was made. | S | FIRM |
| A7.3 | **A reviewer seat**: read-only, for a principal or compliance, sees every seat's record and statements, makes no calls. | Seat roles | The person paying the invoice is usually not the person making calls. | S | FIRM |
| A7.4 | **The firm evidence pack**: all seats, one export, plus a retention setting the admin controls. | A2.4, A7.1 | The compliance export the pricing page already promises, made real. | S | FIRM |
| A7.5 | **Admin visibility**: last sync per seat (`/usync/devices` exists), last chain head per seat, pause and rotate a seat (`/pause/code` exists). | Existing routes, admin.html | What a desk head asks on day two. | S | FIRM |
| A7.6 | **Support hours and an uptime statement** in the quote and on the firm page. | A1.5 | Part of what $760 buys is that someone answers. | S | FIRM |

---

## 8. After forty marks

The forty-call hold was lifted on 2026-09-13 (PRD D8). The gate stays here for a statistical reason: below forty marks, each of these shows an interval too wide to read. Each is a display of a measured result, with its interval, never a new model.

| ID | Add | Built from | Why | Size | Gate |
|---|---|---|---|---|---|
| A8.1 | **Per-check contribution**: for each of the 22 checks, expectancy of verdicts where it passed against where it failed, with intervals, and "too few" where it is too few. | Marks, verdict log | The only honest way to learn which bars matter. | M | FORTY |
| A8.2 | **Horizon evidence**: expectancy by horizon (30, 90, 180, 365), so the user sees where the rulebook works and where the mark is noise. | Marks | Decides which mark to headline with evidence instead of with A2.7's assumption. | S | FORTY |
| A8.3 | **Kronos against the rulebook**: the model's graded forecasts beside the rulebook's graded verdicts, same interval, same page. | Marks, `/kronos` | The terminal grades Kronos rather than trusting it; show the grade. | S | FORTY |
| A8.4 | **Assumption failure rates** (A3.6) with enough volume to mean something. | A3.4 | | S | FORTY |
| A8.5 | **Peer comps on the company sheet**, from the peers call the Map already makes (`/stock/peers`), with the same checks run on each peer. | `/stock/peers`, Analyzer | Asked by P; cheap; but it is a new comparison, so it waits with the rest. | M | FORTY |

---

## 9. Order of work

| When | Items | What it proves |
|---|---|---|
| Week of 2026-09-21 | A0.0, A1.1 to A1.6, A5.3 | The site works, is measured, and says what is true. |
| Before the first invoice | A2.1 to A2.8, A5.2, A5.4, A5.6 | The data can be sold; the record can be verified; the buyer's questions are answered before they are asked; the prices say who each plan is for. |
| From the first marks (about 2026-12) | A3.1 to A3.5, A4.1 to A4.7, A5.1, A5.5, A6.1 to A6.3, A6.5 | The review exists; the record is legible; the company sheet is the demo. |
| With the first paying firm | A7.1 to A7.6 | Attribution is a signature; the firm's export is real. |
| With a licence | A6.4, A6.6, A6.7 | Estimates, stated latency, coverage. |
| At forty marked calls | A3.6, A8.1 to A8.5 | The marks say which checks and horizons matter. |

---

## 10. From the outside reviews: adopted, adapted, left out

| Review item | Decision | Reason |
|---|---|---|
| "What changed since your last review" (C) | Adopted, A3.1 | Composition of data already fetched; the one idea all four council voices took. |
| Thesis assumptions marked supported, broken, uncertain (C) | Adapted, A3.3 and A3.4 | The user marks by hand; a machine mark on a named holding is advice-shaped. |
| Show one real company in 90 seconds, not module counts (C) | Adopted, A4.5 and A5.1 | |
| Provide the data, or make BYO data worth it (all three) | Adopted, A2.1 | Licence before the first invoice. |
| Evidence pack, audit trail, user management, compliance (P) | Adopted, A2.3 to A2.5, A7.x | Already half-built; made verifiable. |
| Consensus estimates and revisions (P, C) | Adopted with a licence, A6.4 | Not against the free tier. |
| Filings, ownership, economic calendar (P, C) | Adopted from free sources, A6.1 to A6.3 | EDGAR and FRED are keyless. |
| Excel and API (P, C) | Adopted as CSV and a read-only token, A4.2 and A4.7 | |
| Mobile (C) | Exists: the terminal installs to a phone home screen. Add A4.3 so the phone is told when a mark lands. | |
| Transcripts (P, G, C) | Links now, A6.5; full text with a licence | |
| Broker deep link, "open this at Interactive Brokers" (C) | Left out | The terminal reports; a person executes. One tap to a broker is the step the exclusion rests on not taking. |
| Execution, order routing, EMS (P, G) | Left out | On the public impossible list: no venue, and never will be. |
| Fixed income, yield curves, credit (P, G, C) | Left out | On the public impossible list: no term structure, no spreads at this tier. |
| Options, Greeks, volatility surfaces (P, C) | Left out | On the public impossible list: no options chain. |
| FX, commodities, crypto (P, G, C) | Left out | No licensed feed, and outside the universe the 22 checks read (EDGAR filers). Revisit with A6.7. |
| Chat network, collaboration (G, C) | Left out; A4.6 is the seed | A one-person shop does not build a network; it builds the thing people forward. |
| Real-time newswire (P, G, C) | Left out; cited summaries stay | A wire is a licence; a summary whose every claim cites a headline is the honest substitute. |
| Backtesting (P, C) | Left out | Rule I11: the terminal grades only calls it wrote down. |
| Factor exposure, ML predictor, mean-variance (P) | Left out | Declined on evidence, publicly, with the reason. |
| "Anyone can use and access" at $760 (P) | Resolved by A2.8 | $149 Founding is the "anyone" plan. $760 is the desk's. Same terminal, two buyers. |

---

## 11. Sources

- Three outside reviews of the site at a stated $760 a month, 2026-09-21 (P, G, C), supplied by the owner.
- Council of 2026-09-21, two rounds: Architect, Skeptic, Pragmatist, Critic.
- Verified on the day: the production hero defect and the CSP that causes it ([functions/_middleware.js](functions/_middleware.js)); the hash chain ([terminal/index.html:15421](terminal/index.html:15421)) and the server-clocked heads (`/chain` in [worker.js](worker.js)); the refused list ([refused/index.html](refused/index.html)); the routes that exist (`/edgar`, `/fred`, `/kronos`, `/summarise`, `/council`, `/history`, `/popular`, `/callreg`, `/marks`, `/chain`, `/org`, `/org/rulebook`, `/usync/devices`, `/pause/code`); the pricing page; [PRD.md](PRD.md) §2, §6; [PRODUCT.md](PRODUCT.md); [APP-GUIDE.md](APP-GUIDE.md).

---

## 12. Status, built 2026-09-21

Everything with a code side was built in one pass and is uncommitted on `rebuild/v2`. Tests: `node test/run.mjs` (1033 checks) and `node test/billing.mjs` both pass. The site builds. Nothing is deployed.

| Item | State | Note |
|---|---|---|
| A0.0 | Built | PRD §1, hero lede, a test pins both. |
| A1.1, A1.2, A1.3 | Built | Preview policy, beacon hosts, sitemap; tests. Visible only after a Pages deploy. |
| A1.4 | Built | Landing tile, FAQ, security sheet. |
| A1.5 | Built, one owner step | `SUPPORT_LIVE` in site config flips to support@perceptfolio.com once Cloudflare Email Routing forwards it. Footer status line measures `/version`. |
| A1.6, A2.8 | Built, then superseded | Pricing page, worker quote, PRD D13. Closed by the 2026-09-22 decision below: one plan, no seats, no Founding label, and no Business Stripe price to create. |
| A2.1 | Code built, purchase is the owner's | `PRICE_FEED` + `PRICE_FEED_KEY` (EODHD or Tiingo) already switch the history and the marks; `DATA_TIERS` scopes the built-in Finnhub route. The licence itself, and Finnhub's written approval or a commercial plan, are not bought. |
| A2.2 | Built | Terms: a Market data section, true as of today. |
| A2.3, A2.4, A2.5 | Built | `/record`, evidence pack, `/verify/`; verified in the browser on a sealed sample pack. |
| A2.6, A2.7 | Built | `/security`, `/flat-quarter`, the Command strip's flat reading, PRODUCT.md. |
| A3.1 to A3.6 | Built | Review sheet, digest, assumptions, hand marks in the chain, cadence, History table. Not exercised in a signed-in browser (no session here); pure parts tested. |
| A4.1 to A4.7 | Built | Meter, CSVs, notices (needs `[triggers]` deployed), statement, company sheet, share page, token. |
| A5.1 | Built as the public half | The card reads EDGAR, closes, filings, 13F filers keyless; the checks stay inside the terminal (Finnhub terms). Renders its error state on localhost (CORS is perceptfolio.com only). |
| A5.2, A5.4, A5.5, A5.6 | Built | |
| A5.3 | Built as tiles plus the tool | Fifteen captioned tiles; Settings → Snapshot this screen (sandbox account) writes `preview/<tab>.html`; mark `still: true` in `SCREENS` when a still is added. |
| A6.1, A6.2, A6.3, A6.5, A6.6 | Built | `/filings`, `/holders`, `/calendar`, result and IR links on the sheet, the source line under the hero change. FRED calendar needs `FRED_API_KEY` (already a worker secret). |
| A6.4, A6.7 | Not built | Need the licence. |
| A7.1 to A7.6 | Built, then removed | Withdrawn on 2026-09-27; see the note at the end. The bar-version stamp on a call is what survives. |
| A8.1 | Was already built | `checkAuditHTML`. |
| A8.2, A8.3, A8.5 | Built | By-horizon table, Kronos in the comparison, peers on the sheet. |
| A8.4 | Built | Same table as A3.6. |

**Owner steps, in order:** buy the price feed and set `PRICE_FEED`, `PRICE_FEED_KEY`; decide `DATA_TIERS`; enable Email Routing and flip `SUPPORT_LIVE`; deploy the worker (`npx wrangler deploy -c worker.wrangler.toml`, which also installs the cron trigger) and Pages (`node scripts/assemble.mjs && npx wrangler pages deploy dist --project-name perceptfolio --branch main`); then open the terminal on the sandbox account and walk Portfolio → Review, Settings → Evidence pack, and `/verify/`.

**2026-09-22, the owner's decision:** one plan only. The terminal, $760 a month or $8,360 a year, one person, quote-first. The Personal/Business split, the Founding label and the firm application (/apply) are withdrawn from the site, the quote and the terms. The seat machinery built under A7 stays in the code, issuable by the operator, not sold. A2.8's "per-seat price above three: OPEN" is closed by this decision.

**2026-09-27, the owner's decision:** remove every trace of the business terminal. §7 (A7.1 to A7.6), §A5.4 and the client-books feature are **withdrawn, not merely unsold** — the code is deleted, not parked. Gone from the worker: `/apply`, `/apply/decide`, `/decide/members`, `/org`, `/org/rulebook`, `/org/keys`, `/org/roles`, `/org/records`, `/org/status`, the `business-*` plans, `minSeats`, the seat stamp on a decision, the org record and its webhook fan-out, and the seat column in the record CSV. Gone from the terminal: the Clients tab and every client profile, `bizContext` and `isBizOwnView`, the business dashboard, the ORG module, seat keys and their IndexedDB store, call signatures, the reviewer role, the published firm rulebook, the firm card, the firm statement and the firm evidence pack. Gone from admin: the seat panel and the business grant. Gone from `/verify/`: the seat-signature section. A decision is now one of `personal`, `employee`, `denied`. What remains of A7's intent is the part that never needed a firm: a call carries the version of the bars it was made under (`p:<digest>`), and the record still chains and still verifies.

**Also 2026-09-27:** **one new sign-in a day a code.** The worker holds `door:<code>` for two days and answers `POST /door` with a 429 and the hours left; `functions/api/enter.js` asks before a fresh sign-in and skips the question entirely for a device that already holds a session, so a signed-in terminal is never interrupted. `POST /door/clear` and admin's **Let them sign in now** lift the hold for someone who cleared their site data or changed device. And **no page opens a mail app any more**: FormSubmit delivers the request and the worker keeps a copy, so the mailto fallback is gone from both landing pages and the thanks page's mail button with it.

**2026-09-27, the fear and greed index and NewsAPI.** `GET /feargreed` proxies CNN's published JSON (it refuses a bare request, so the worker presents browser headers), caches it an hour, and returns the headline score with all seven readings it is made of, each dated, plus what the index read a week, a month and a year ago. The card sits on Market above calendar effects. It is reported, never recomputed, reaches no rulebook, and says so.

`GET /worldnews` now takes an optional key. **Unset (the default): Google News RSS**, free, uncapped, current. **`NEWS_API_KEY` set: NewsAPI answers instead**, with `NEWS_API_URL` overriding the base for a reseller or proxy. A spent quota or a dead key falls back to the free feed rather than emptying the panel, and the answer names whichever served it. The feed is part of the cache key, or setting a key would appear to do nothing for half an hour.

**Read NewsAPI's terms before setting that key.** Their free Developer plan is "for development and testing": articles arrive with a 24-hour delay, the cap is 100 requests a day across the whole terminal rather than per person, and CORS is localhost only. Production and commercial use is the Business plan at $449 a month. Databar is not a source of a raw key: it is a no-code enrichment product that resells the same API inside its own workflows.

To set one:
```
npx wrangler secret put NEWS_API_KEY -c worker.wrangler.toml
npx wrangler secret put NEWS_API_URL -c worker.wrangler.toml   # only for a reseller or proxy
```
To go back to the free feed: `npx wrangler secret delete NEWS_API_KEY -c worker.wrangler.toml`.

**2026-09-27, knowing it when it breaks.** Two halves, both free, because the latency was never in the feed: Finnhub carries a company's headlines within minutes and the terminal simply had nobody watching.

**While you are looking:** News refreshes itself every 90 seconds, and only while News is the open tab and the window is in front. It stops on a tab change, on blur and on the page being hidden, because a timer running behind a hidden tab spends the shared market-data allowance on a page nobody is reading.

**While you are not:** a second cron, `*/15 13-21 * * 1-5` (about 9am to 5:45pm New York), reads the synced book under `uslot:<code>` for the holdings and the watchlist, pools those symbols across every account so ten accounts watching ten names cost ten calls rather than a hundred, and emails each account only what is new to it. Opt-in, beside the mark and review notices; a paused grant is told nothing; `newsseen:<ident>` stops a story being sent twice and expires in three days. Headlines, publisher and time only: nothing is scored, ranked or interpreted, and nothing reaches a rulebook.

`scheduled()` branches on `event.cron`, and an unrecognised schedule falls to the nightly marking pass, because losing a mark is the worse failure.

**2026-09-27, the two outside reviews, checked against the code.** Both challenged the same two things, both marked them ASSUMED because the terminal is gated, and both were already answered in the code:

- **"Audit the 138."** It is derived: `n = (Z·sigma/mean)^2`, at an assumed 2% edge and 12% dispersion, and the assumption is dropped for the operator's own observed mean and dispersion the moment marks exist. The derivation was in a source comment only. **Fixed:** `needWhyHTML()` now puts the formula, the inputs, which are assumed, and the moving target on screen in every state including the empty one.
- **"Decisions are not independent."** `effectiveN()` already computes pairwise correlation and discounts the count. **Fixed:** the panel now reports independent-of-each-other beside the raw count, so the two can differ visibly.
- **"Lock in relative alpha at the mark."** Already done — a call stores price and spy, a mark stores price and spy, so excess is computed from both ends and cannot be recomputed later.
- **"localStorage is capped at 5MB."** Correct, but the conclusion was stale: the book lives on the worker, and quota failure reclaims caches then pushes to the server.

**Genuinely new and unresolved: the Tiingo redistribution question.** Internal commercial use and redistribution are separate licences. Serving closes and marks to a paying subscriber through `/history` and `/marks` may be redistribution. This needs reading the actual contract, not a code change. **It ranks above every feature**, beside the Finnhub commercial plan.

**2026-09-28, "should it be for the general public?" — asked, and answered no.** The owner raised widening the terminal to everyone, then chose **A: keep $760, keep the audience narrow**. The arithmetic that settled it: $760/mo is $9,120/yr, about 11% of a median US household's gross income, so no member of the general public buys it at any framing. The price stays in `site/src/lib/config.ts`, `worker.js`, admin's quote and the welcome email, and the suite keeps checking they agree.

**What follows from A.** Per-user data and aggregator fees are affordable at this price, so **live broker sync via SnapTrade or Plaid is now viable** where it would not be at public pricing. The quote-first flow stays: a person asks, the operator reads it and grants a code. No self-serve signup.

**Do not reopen this** without new information. It has now been decided twice, on 2026-09-22 and again today.

**2026-09-28, the book stopped being kept in the browser.** The owner's instruction, and it was overdue: until today `localStorage` held the whole thing and the worker was a mirror kept in step on a timer. Every device carried a full copy of the positions, the cost basis and the record, and a cleared browser or Safari's seven-day eviction took a copy of all of it away.

Now the worker under `uslot:<code>` is the home, and the browser keeps exactly two things:

1. **A shell of each profile** — email, access code, password hash, identity, the terms that were accepted. That is what the sign-in screen needs before there is any book to show. Built by naming the fields to keep (`SHELL_FIELDS`), so a field added to a profile later is left behind by default rather than written here by accident.
2. **The one edit that has not been acknowledged yet**, under `pf_unsent_v1`. Keyed off the two stamps the book already carried — an edit is unsent exactly while `lastLocalEdit` is ahead of `syncedAt` — so it clears itself when the push lands, with no second place that has to remember to.

So between a save and its push there is a book on the disk, and after the push there is not. That window is the alternative to losing a trade typed two seconds before the tab was closed. It is bounded by the push debounce, **shortened from 8s to 2.5s** because that debounce is now the length of time a change exists in only one place, and `pagehide` still flushes it.

**Three things this forced, each of which was a real hazard:**

- **A push must not leave a device that has not yet read the account.** After a reload `D` is a default book until the pull lands, and last-write-wins would make a blank record permanent over a real one. `_serverCopyUnknown` blocks every push until a pull resolves — including resolving to "nothing there yet" — and a pull that fails leaves it blocked and says so in a red bar with a Try again button, rather than silently.
- **Opening now waits on the network**, because there is nothing local to draw. That wait is labelled on screen ("Bringing your book down from your account"), because an empty screen in that gap reads as an empty account, which is the most alarming thing this product could say to someone who has just paid.
- **Turning sync off moves the book, it does not mute a timer.** `disableSync()` pushes what is unsent while there is still somewhere to push it, then drops the config, then writes the whole book to disk with `serverIsHome()` now false. The confirm text says which of the two homes is being chosen.

**Who keeps their own copy, unchanged:** a device with no access code, a paused code, a book held for someone else (`managedBy`), and the sandbox. For those the browser *is* the only home and stripping it would destroy the account.

**The export nag is now scoped.** `backupState()` returns nothing when the account holds an acknowledged copy, keyed on `syncedAt > 0` and not merely on the setting — a device with sync on that has never got a push through is still told to export.

**Still in the browser, deliberately:** public market-data caches (`pf_popular_v1`, `pf_cycle_v1`, `pf_earn_v1`), the error log, the device id, the remembered email and the UI preferences. None of them is anyone's book.

**Proved by running it, not by reading it.** `test/serverstore.mjs` lifts `writeStore`, `shellDB` and `SHELL_FIELDS` out of the file by name, runs them against a fake storage object with a book that has holdings, cash, marks and history in it, and asserts that after an acknowledged push no substring of any of it survives anywhere in that storage. `test/run.mjs` keeps pinning the shape; the behavioural claim needed a suite that actually looks at the bytes.

**2026-09-28, the page a buyer lands on after paying.** It was `/thanks?type=purchase`: a heading, one paragraph, a button. The look was the smaller problem. The real one was that it **guessed**: it said "your code is on its way" because it had been loaded, which is evidence of nothing. A success URL is guessable, it stays in history, and a completed session can still have a payment that fails afterwards. While mail was unconfigured it said "check your email" about an email that was never sent.

Now `/welcome` (`site/src/pages/Welcome.tsx`) asserts nothing and asks `GET /checkout/confirm?session_id=`, which asks Stripe whether the session was paid and asks KV whether the webhook minted a code and whether the code email went out. Three facts, three ticks, each either true or visibly not.

- **The code is never on this page.** It is the only credential for the account, and anything the page can reach is reachable by anyone holding the session id out of a URL bar, a shared screen or a referrer header. The code goes to the address that paid. The page names that address **masked** (`maskEmail`), which answers the question a buyer actually has, which is "which of my inboxes".
- **The webhook race is a state, not an error.** Stripe can redirect before the webhook lands. Paid-but-not-minted polls every two seconds, fifteen times, then stops and says to write in, rather than spinning forever or crying failure at a two-second gap.
- **`mailed: null` is "not recorded", not "failed".** The webhook always attempts the send, so only an explicit `false` is evidence of failure. Records written before the flag existed would otherwise show a waiting dot that never resolves.
- **`/thanks?type=purchase` hands over** rather than being kept in step, because sessions created before `/welcome` existed can still be completed days later.

Route pinned by `test/welcome.mjs` (19 checks), including that the malformed-session-id refusal happens **before** Stripe is called, and that recording `mailed` can never be the reason a paid account has no code.


**2026-09-29, three days free, with a card.** `TRIAL_DAYS = 3`, attached to the checkout session as `subscription_data[trial_period_days]`. The owner chose card-first over a no-card demo, and the reason is cost rather than caution: every account spends real money on market data from the first screen it opens, so a trial anyone can take with a throwaway address is a bill with no ceiling. A card also makes it self-enforcing, since Stripe moves the subscription to active by itself and the worker already treated `trialing` as fully live.

**What it obliged.** A trial that becomes $760 without another click has to say so before the card is entered, and three days is short enough that forgetting is a normal thing to do. So the amount and the **date** appear in four places: Stripe's own checkout page (*"3 days free, then $760.00 per month starting October 2, 2026"*, total due today $0.00), the code email **above the code**, the `/welcome` page, and the quote the operator sends. The page takes the figure from `PLAN` rather than a literal, so it cannot drift from what Stripe will charge.

**The webhook stopped assuming.** `checkout.session.completed` used to hard-code `subStatus: 'active'`, which was true only while there was no trial. It now reads the subscription from Stripe for the real status and `trial_end`. A failure to read falls back to the old assumption, because a paid account with no code is the direction that cannot be undone.

**The no-price rule was scoped, not weakened.** `/welcome` is reached only by completing a checkout, and is where the charge must be stated; the marketing pages are still checked for a figure exactly as before. `test/run.mjs` now asserts both halves.

**What this created, and it is not small.** The record needs marked calls before it says anything, and the trial is three days. The one fast source of evidence, an imported broker CSV, is deliberately never graded. See the open item in HANDOFF.md §11: the answer is a separate read-only view over imported history, not a relaxation of the forward-only rule.


**2026-09-29, Command removed and its queue kept.** The owner cut Command; Dashboard and Command were answering the same question in two places, and a person opening the terminal in the morning had to choose. The queue itself is not redundant: it is the only screen that says a stop was hit or a limit was crossed, so it **moved onto the Dashboard rather than being deleted**, and it sits above the portfolio value for the same reason the record does. One date line now, not two. The tour is three screens. `SCREENS` is 13. Pinned under "COMMAND WAS MERGED, NOT DELETED", including that nothing still links to the removed screen.

**Screener and Lists stay separate**, on the owner's reading: Screener analyses many names at once, Lists saves them for later. They are not the same job and merging them would cost the faster one.

**2026-09-29, anyone may ask, and what they ask FOR is screened.** The form said "Business email" over a field placeheld `you@firm.com`, which told a private investor in two words that it was not for them. It always was: "Private investor" is a role and "My own capital" is a book type. The audience is narrow because of the price, not because of what anybody does for a living.

So the gate moved from **who is asking** to **what they say it is for**. `screenRequest()` in worker.js matches statements of illegal intent (insider dealing, manipulation, wash trading, front-running, laundering, sanctions evasion, concealing funds, ponzi, tax evasion, operating unregistered, falsifying records).

**It flags. It never refuses by itself, and that is the whole design.** *"I want to be sure I never front-run my clients"* and *"I front-run my clients"* share every word that matters, so an automatic refusal would lose real customers silently and the operator would never learn it happened. Therefore:

- the request is **stored, always**, exactly as written; nobody is refused at the door;
- the visitor gets **the same 200 and the same words** either way, so the filter cannot be probed by rewording;
- `NOT_INTENT` clears a match preceded within 90 characters by avoid, never, prevent, detect, without, compliance, regulated, victim of, must not and the rest, which is what a careful professional writes;
- admin shows the flag and **the words that matched**, in red, on the request card;
- **`/decide` returns 409 and issues no code** for a flagged request unless called again with `override: true`. Denying needs no override, because denying is the safe direction. The override and its note are recorded on the request.

**Proved in production, not only in the suite.** Three live requests: a retired teacher with their own savings came back `clear`; *"I trade on insider information"* came back `review` with the matched phrase; *"I am a compliance officer and I need to detect insider dealing"* came back `clear`. All three got a byte-identical reply.

**A trap worth recording.** The patterns were first written through a Python heredoc that ate every `\b`, so they shipped into worker.js with literal backspace bytes and matched nothing. `node --check` passed, because the file was still valid JavaScript. Only `test/screen.mjs`, which lifts the function out and runs it on real sentences, caught it. **Regexes written from a script must be written from a raw string, and a filter must be tested by running it, never by reading it.**


**2026-09-29, the broker connection, read-only.** The owner asked to connect a broker and have the terminal read the account and fill the book in. Built on **SnapTrade**, whose Build plan is free to five connected accounts, which is exactly the scale at which the Finnhub commercial plan also falls due.

**The promise that had to change, and the one that did not.** Two pages said *"no broker is connected and none will be"*, and the landing page said *"does not connect to a broker"*. That was a broader promise than the one carrying the weight, which is that this thing never moves money. Both now say the connection is read-only and cannot place, change or cancel an order. **"It never places a trade" is untouched.**

**Read-only three times over, so the sentence is true of the code and not of our restraint:**

1. every connection is opened `connectionType: 'read'`, so SnapTrade issues a connection with no trading permission and the limit lives on their side of the wire;
2. `stFetch` throws on any path whose segments include trade, trading, order or an order verb, matched by segment because *snapTrade* contains *trade* and blocking the login route would break the only thing that opens a read-only connection;
3. nothing in the file references a trading endpoint, and there is no flag that turns any of it on. Trading would be a code change with a diff to read.

**What leaves the system.** Never a broker password: with OAuth nobody sees one, and without it SnapTrade collects it and we never receive it. Their id for a subscriber is `pf_` plus a hash of the access code, so their records carry no email and no name. Account numbers come back masked to the last four. Disconnecting deletes our copy of the credential whether or not the remote delete succeeded, and says which happened.

**The rule that did not bend.** Everything read from a broker is stored `imported: true` and **is never graded**, exactly as a CSV import is. It merges through the same duplicate key as the CSV so the two cannot drift apart. Holdings are **added, never overwritten**: a position already in the book may carry a cost basis the person typed from their own records, so a name already present is left alone and any disagreement about the share count is reported instead of silently resolved.

**What is proved and what is not.** `test/broker.mjs` (32 checks) verifies the canonical JSON and the HMAC against the documented algorithm and against Node's own crypto, which is the failure that would otherwise look exactly like a bad key, plus all three read-only enforcements. It does **not** prove the endpoints return what we expect; only a live key does, and the first connection is that test. Two notes for whoever hits it: `getUserHoldings` is 410 Gone for accounts created after 2026-05-11, and `SNAPTRADE_BASE` is a secret rather than a constant because the reference pages and the signing guide disagree about the `/api/v1` prefix.

**To switch it on:** sign up at snaptrade.com, then `SNAPTRADE_CLIENT_ID` and `SNAPTRADE_CONSUMER_KEY` as worker secrets. Until then every `/broker/*` route answers 503 and the settings card says connections are not switched on yet.


**2026-09-29, is the broker connection safe, and does it work?** Both asked, both answered, and the answering found three things.

**Does it work.** `test/brokerlive.mjs` drives the real worker over all four routes against a **mock SnapTrade that verifies the signature the way SnapTrade does**: it recomputes the HMAC from the request it actually received, with its own canonicaliser written separately from the worker's, and answers 401 on a mismatch. Ten calls signed and accepted, none rejected. Link, status, sync and unlink all work; options, zero-quantity positions, dividends, fees and malformed rows are all skipped rather than guessed at. What it still cannot prove is that SnapTrade's live endpoints are shaped like the mock. Only a key proves that.

**Is it safe. Three gaps found in my own code, all closed:**

1. **The userSecret was stored in the clear.** KV is encrypted at rest by Cloudflare, so this was never about the disk; it was about what a leaked KV-scoped API token would be worth. It is now sealed with AES-GCM under a key derived from `SYNC_SECRET`, which lives in the worker's secrets and not in KV, so a namespace dump is ciphertext. One write path (`putBrokerRec`) and one read path (`brokerRec`), so no route can put a plaintext secret in by forgetting.
2. **`/broker/status` was not rate limited**, while calling SnapTrade on every hit. A code is its holder's own, but that still let one account burn its own quota unboundedly and hammer a third party. Reads now take the looser bucket, writes keep the tight one.
3. **A cancelled subscription left a live credential behind.** Somebody stops paying and we keep a key that reads their brokerage, which nobody would ever think to ask for back. `customer.subscription.deleted` now tears the connection down, best effort at SnapTrade and certain in KV. A **paused or past-due** account keeps its connection, because that lapses by itself and getting this backwards would make people reconnect over a failed card.

**2026-09-29, API keys, so somebody's AI can read this.** What existed was one unnamed token for a spreadsheet. An assistant is not a spreadsheet: it gets pointed at things, kept for months, and occasionally needs taking away on its own. So a key now has:

- a **name**, so you know which is which a year later, and an **id**, so revoking one does not revoke the rest. Without an id, DELETE still revokes everything, which is what a panic button should do;
- a **scope**. The record is the published, hash-chained thing this product is judged on. The book is what someone owns and what it cost. `record` is the default and `book` must be asked for, behind a confirm that says what it exposes;
- **bearer auth**, because anything that can send a header should. The query string stays, because Google Sheets IMPORTDATA cannot send one and breaking the integration that already exists to look tidy would be vandalism;
- a **last-used** stamp, because a key nobody can account for should be revoked and you cannot tell which that is without it.

**`GET /me/schema` is the part that makes it an AI feature rather than an endpoint.** An assistant pointed at an unfamiliar API guesses, and a guess against somebody's portfolio is the wrong kind of wrong. The schema states the endpoints, what this particular key may and may not reach, and the three things about this product a reader must not get wrong: marks are forward-only and never backfilled, there is no win rate on purpose, and **rows marked imported came from a broker or a CSV and are not calls this terminal made**. That last one is repeated in the book payload itself, because an agent that summarises one object would otherwise report somebody's broker history as this product's track record. That is the single worst thing this API could cause.

Keys are capped at ten, stop reading the instant an account is paused, and an older bare token still reads the record and still cannot reach the book. Proved live in production: minted, read by bearer, refused the book, read its own schema, listed with its last-used time, revoked by id, dead. 42 checks in `test/apikeys.mjs`.
