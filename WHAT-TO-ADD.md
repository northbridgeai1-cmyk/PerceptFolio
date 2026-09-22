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
| A1.6, A2.8 | Built, one OPEN | Pricing page, worker quote, PRD D13. Per-seat price above three is still OPEN; Founding rise date 2027-03-31 is the owner's to move. Stripe Price IDs for the new Business price are not created. |
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
| A7.1 to A7.6 | Built | Seat keys and signatures, chained rulebook versions, reviewer role, firm records and pack and statement, admin seats table, support line in the quote and on the firm page. |
| A8.1 | Was already built | `checkAuditHTML`. |
| A8.2, A8.3, A8.5 | Built | By-horizon table, Kronos in the comparison, peers on the sheet. |
| A8.4 | Built | Same table as A3.6. |

**Owner steps, in order:** buy the price feed and set `PRICE_FEED`, `PRICE_FEED_KEY`; decide `DATA_TIERS`; create the Business Stripe prices; enable Email Routing and flip `SUPPORT_LIVE`; deploy the worker (`npx wrangler deploy -c worker.wrangler.toml`, which also installs the cron trigger) and Pages (`node scripts/assemble.mjs && npx wrangler pages deploy dist --project-name perceptfolio --branch main`); then open the terminal on the sandbox account and walk Portfolio → Review, Settings → Evidence pack, and `/verify/`.

**2026-09-22, the owner's decision:** one plan only. The terminal, $760 a month or $8,360 a year, one person, quote-first. The Personal/Business split, the Founding label and the firm application (/apply) are withdrawn from the site, the quote and the terms. The seat machinery built under A7 stays in the code, issuable by the operator, not sold. A2.8's "per-seat price above three: OPEN" is closed by this decision.
