# PerceptFolio — Product Requirements Document

**Version:** 1.3 (agreed, building) · **Date:** 2026-09-13 · **Status:** agreed 2026-09-13; build in progress from M0
**Owner:** NorthBridge · Financial (Pierce) · **Author:** drafted with Claude from the decisions in §2

> How to use this: edit any line. **DECIDED** came from your answers on 2026-09-13. **PROPOSED** is my recommendation and stands unless you change it. **OPEN** needs your answer before that part is built. v1.1 replaces v1.0 entirely: the product changed from a private employee tool to a sold subscription.

---

## 1. Summary

PerceptFolio is a research terminal sold as software. Anyone can read what it does, run the live demo on the site, and buy a monthly or yearly subscription. Paying unlocks the terminal; each subscriber connects their own free market-data key in a guided first step. NorthBridge employees use the same terminal on permanent codes.

It is sold as a tool, never as advice. The terminal applies rules the user sets to public data and records every verdict so the user can see whether the rules were any good. It makes no recommendation to any person. That positioning is what lets it be sold without an adviser or broker licence, and the terms of sale say so in plain language.

Kronos, a time-series forecasting model, joins the terminal as one input in Projections. Every forecast it makes is logged and marked on a fixed horizon like every other call, so the terminal grades Kronos rather than trusting it.

## 2. Decisions

| # | Decision | Status |
|---|---|---|
| D1 | **PerceptFolio is sold as a software subscription**, to individuals and to firms. No managed service, no advice. | **DECIDED** |
| D2 | **Monthly and yearly plans; yearly cheaper.** Priced in the professional self-serve tier (§6), not against Bloomberg. | **DECIDED** |
| D3 | **No paid trial.** The free live demo on the site is the trial. Buy when convinced. | **DECIDED** |
| D4 | **Subscribers connect their own free Finnhub key at launch.** Finnhub's self-serve plans do not licence redistribution to end users; "data included" needs a commercial agreement and is deferred until subscribers can fund it (§9). | **DECIDED** 2026-09-13, revised after research |
| D5 | **Public site rebuilt in React + shadcn/ui** (Vite). **Terminal stays vanilla** single-file. | **DECIDED** |
| D6 | **Hosting moves to Cloudflare Pages**; the terminal is served only to an active subscriber or employee session. DNS is already in Cloudflare. | **DECIDED** |
| D7 | **Subscriber sessions: 30 days sliding. Employee codes: permanent** (sign in once, that browser is theirs until you pause it). Admin shows names. | **DECIDED** |
| D8 | **Kronos is in scope.** The 40-marked-calls hold is lifted. | **DECIDED** |
| D9 | US company; state to be confirmed. | **DECIDED** (state OPEN) |
| D10 | The GitHub repo is public → the secret found in history is treated as exposed and rotated. | **DECIDED** |
| D11 | magic-mcp and Strix are configured but dormant until you have keys. shadcn-ui-mcp and ui-ux-pro-max install now. | **DECIDED** |
| D12 | No performance claims, no win rate, expectancy only; the record is new and says so. "What we refused" stays off the site. | **DECIDED** (standing) |
| D13 | **Two plans.** Personal $149/mo · $1,490/yr. Business $119/seat/mo · $1,190/seat/yr, minimum 3 seats. Refunds 14 days. | **DECIDED** |
| D15 | **Quote-first for everyone (revised 2026-09-13).** Request → Pierce is emailed who/what with a suggested quote → Pierce replies with the price (and questions) → Pierce grants; for a firm, admin issues one code per member email ("Issue member codes") → they enter their code. Firms of 8+ get 15% off every seat, stated in the quote. Stripe Checkout stays built for M7 but is not the site's path. | **DECIDED** |
| D16 | **Business mode** changes terminal behaviour: org rulebook applied to all seats, per-analyst attribution on every call, client books on, seat admin, compliance export. | **DECIDED** |
| D14 | Kronos hosts on **Modal**. Stripe is built against a stub and activated when the account exists. Legal entity: "NorthBridge", details pending. | **DECIDED** |

## 3. Goals and non-goals

**Goals**
1. A visitor understands within one screen what the terminal does, who it is for, and what it costs; they can try it without an account and buy in under two minutes.
2. Only paying subscribers and employees can load the terminal.
3. Nothing on the site or in the product constitutes personalised investment advice; the terms make the software-not-advice position explicit.
4. The 20-point security list is closed with evidence, plus payment-specific items (§10).
5. The site does not read as generated: varied composition, no marketing vocabulary, real product shown rather than described.
6. Every push is tested, audited and deployed automatically.
7. Kronos ships as a graded input, not an oracle.

**Non-goals (this version)**
- Managed accounts, advice, brokerage, or holding client assets (requires a licence; not this product).
- Team or multi-seat plans (single user per subscription; revisit after launch).
- Mobile apps (the terminal installs to a home screen as a web app already).
- Rebuilding the terminal in React.

## 4. Users

| User | What they need | Where |
|---|---|---|
| **Prospect** | To see what the terminal does, try the demo, compare the price, and buy. | Public site |
| **Subscriber** | The terminal with their own data key; their record synced across their devices; billing they can manage themselves. | Terminal, Stripe portal |
| **Business admin** | Buys seats for a firm, sets the org rulebook, adds and removes analysts, exports the firm's record. | Terminal (org settings), Stripe portal |
| **Business analyst** | A seat on a firm's account; works inside the firm's rulebook; every call carries their name. | Terminal |
| **Employee** | The terminal on a permanent code, free. | Terminal |
| **Pierce (operator)** | See subscribers and employees, issue and pause codes, answer support. | Admin |

## 5. Public site (React + shadcn)

### 5.1 Pages
| Route | Purpose |
|---|---|
| `/` | Product landing: the terminal as hero, what it does, who it is for, the live demo, pricing, FAQ, buy. |
| `/pricing` | Personal and Business side by side, what each includes, the three named comparisons, "Buy" for Personal and "Apply" for Business. |
| `/apply` | Business application: firm name, size, contact, what they run. Pierce accepts from admin; acceptance email carries the checkout link. |
| `/how-it-works` | **PROPOSED.** The 22 checks, the record, sizing, Kronos, in plain terms with labelled screens. |
| `/enter` | Access-code entry for subscribers and employees. Links to "resend my code". |
| `/thanks` | After purchase: "your code is in your email; here is the link." |
| `/terms`, `/privacy`, `/refunds` | Rewritten for a sold product (§7). |
| `/404` | |

### 5.2 Landing composition (carried from the 2026-09-13 design round)
- Hero: one sentence on what it does, one on who it is for, primary action **"Buy access"** with the price beside it, secondary **"Try the demo"** scrolling to it. The terminal's Analyzer screen as the hero, a React component built from the real 22 checks with illustrative values, labelled "Illustrative · not live".
- Sections alternate composition; no two adjacent sections share a layout. No eyebrows, no section numbers, no icon-heading-text card grids, no stat-tile row.
- The live marking demo (real closes, hidden ticker) sits under the record section as the trial.
- Pricing block: two plans, yearly highlighted, the saving stated as a number, the three named comparisons with prices, one line on the data key ("you connect a free Finnhub key; two minutes, no card").
- The honest note stays: the record is new; first marks land in about a quarter.
- Type: Archivo (self-hosted) for headings, system stack for body, mono only for data. Tokens in `DESIGN.md`.
- The terminal's surface follows the ledger pass in `DESIGN.md` (2026-09-20): flat ground, hairlines for boxes, sentence-case labels, Archivo for headings and figures, no chips, no halos, no glow. The tells are pinned absent by the test suite.
- **Skeleton loaders** on every async surface: hero facsimile during font load, demo during data load, checkout button while Stripe initialises, `/enter` while the code validates.

### 5.3 Copy rules
- Banned words (a test fails the build if any appears in rendered text): powerful, intuitive, streamline(d), seamless, leverage, cutting-edge, next-generation, revolutionary, unlock, empower, robust, world-class, best-in-class, effortless, supercharge, game-changing, elevate, harness, synergy, innovative, state-of-the-art, disrupt.
- No exclamation marks. Controls name their action ("Buy yearly access", "Send code again").
- No claim about returns, hit rates, or outperformance anywhere. The demo's own honest verdicts are the only results shown.

## 6. Pricing

Research 2026-09-13 (sources at the end of this section). The market has three tiers; a self-serve web terminal bought with a card sits in the middle one.

| Tier | Products | Per year |
|---|---|---|
| Institutional (sales-led, 2-year contracts) | Bloomberg $31,980 · LSEG/Refinitiv $14–22k · FactSet $12–18k | $12k–$32k |
| Professional self-serve | YCharts ~$5k+ (unpublished) · Fiscal.ai Enterprise $2,388 · Godel Terminal $996 · Koyfin Pro $948 | $950–$5k |
| Prosumer | TradingView Premium $719 · Koyfin Plus $468 · Fiscal.ai Pro $468 · Finviz Elite ~$480 · Tikr $300 | $300–$720 |

| Plan | Price | Effective monthly | Access | Notes |
|---|---|---|---|---|
| Personal, monthly | **$149** | $149.00 | Instant after payment | Cancel any time. |
| Personal, yearly | **$1,490** | $124.17 | Instant after payment | "Two months free." |
| Business, monthly | **$119 / seat** | $119.00 | Apply, then pay | Minimum 3 seats ($357/mo). |
| Business, yearly | **$1,190 / seat** | $99.17 | Apply, then pay | Minimum 3 seats ($3,570/yr). |
| Employee | $0 | — | Permanent code | Issued by Pierce. |

Position: Personal sits ~50% above Koyfin Pro and Godel and well under YCharts; Business per-seat lands between them. Both are under Fiscal.ai Enterprise. The page compares against those three by name and price, never against Bloomberg. The differentiator the price rests on is the self-grading record, sizing limits and evidence-carrying verdicts, which none of the named products have.

Refunds: Koyfin offers 30 days, TradingView 14 days on annual plans, Godel a 14-day free trial. **Policy: 14 days, either plan, no questions.**

Sources: [Bloomberg pricing](https://costbench.com/software/financial-data-terminals/bloomberg-terminal/) · [terminal comparison](https://godeldiscount.com/blog/financial-terminal-pricing-comparison) · [Koyfin/Fiscal/Tikr](https://simplemarkets.io/blog/post/koyfin-review) · [Koyfin refunds](https://www.koyfin.com/pricing/) · [TradingView refunds](https://www.tradingview.com/support/solutions/43000485430-i-ve-paid-for-a-subscription-and-would-like-to-get-a-refund/)

**OPEN Q1** — Confirm $129 / $1,290 or set other numbers.

## 7. Legal posture

- **Sold as software, not advice.** Terms of sale state: the terminal applies rules the user configures to public data; it makes no recommendation to any person; nothing in it is investment, legal, or tax advice; the user is responsible for their decisions; past marks do not predict future marks.
- A securities attorney reviews the terms and the landing copy once, before launch, to confirm the positioning (US publisher's exclusion). **OPEN Q3** — Company legal name, state of formation, and business address for the terms and Stripe.
- Privacy: subscriber email and Stripe customer ID are held on the Worker; card details never touch NorthBridge (Stripe-hosted Checkout and Portal). Portfolio data stays in the subscriber's browser and their own sync slot; NorthBridge does not read it. Data-deletion on request; export always available.
- Sales tax: Stripe Tax enabled; prices shown exclusive or inclusive per Stripe's locale handling.

## 8. Access model (subscription gate)

1. **Buy:** Stripe Checkout (monthly or yearly). Success URL → `/thanks`.
2. **Provision:** Stripe webhook (`checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`) → Worker verifies the signature → creates or updates a subscriber record in KV: `{customerId, email, plan, status, currentPeriodEnd, code}` → issues an access code → Resend emails it with the link to `/enter`.
3. **Enter:** subscriber submits the code at `/enter`; a Pages Function validates it with the Worker, sets a signed HttpOnly SameSite=Strict session cookie (30 days, sliding), serves the terminal. Employee codes issue a permanent cookie.
4. **Gate:** every request under `/terminal/*` passes the Function. Valid session with `status ∈ {active, trialing, past_due-within-grace}` → serve. Otherwise → a plain page: "Your access has lapsed" with a link to the Stripe portal, or `/enter`. The terminal file is never served without a valid session.
5. **Lapse:** `past_due` gets a 7-day grace with a banner inside the terminal; `canceled`/`unpaid` locks at period end. Data is never deleted on lapse; export stays available from the lapsed page.
6. **Self-service:** Stripe Customer Portal for card, plan change, cancel, invoices. "Send my code again" on `/enter` looks up by billing email and re-sends.
7. **Employees:** Pierce issues a permanent code from admin, tied to a name. Pause kills the session on next request.
8. **Business:** an application at `/apply` lands in admin. Pierce accepts (or declines with a reason); acceptance emails a Stripe Checkout link with the seat quantity. Payment creates an **org** record `{orgId, name, adminEmail, seats, plan, status}`; the admin's code is issued; the admin invites analysts by email from org settings, each getting their own code bound to the org. Seats above the paid count are refused. Removing an analyst kills their session.
8. **Sync:** unchanged mechanism; a subscriber's sync slot is keyed to their code.

## 9. Architecture

```
perceptfolio/
  site/            React + Vite + shadcn/ui + Tailwind → dist/     (public)
  terminal/        vanilla single-file terminal                     (gated)
  admin/           operator page                                     (gated)
  functions/       Pages Functions: session gate, code entry, headers, rate limits
  worker.js        API: Stripe webhooks, subscribers, codes, data proxy + metering, sync, Kronos bridge
  kronos/          Python inference service (FastAPI + Kronos), deployed separately (§11)
  test/            existing suite, extended
  .github/workflows/
  PRD.md PRODUCT.md DESIGN.md SECURITY.md
```

- Pages serves `site/dist` + `terminal/` + `admin/` with Functions in front of the gated paths. Worker deploys with `wrangler`. Kronos deploys to Modal (PROPOSED) or a small VPS.
- `_headers` sets real security headers (CSP without `unsafe-inline` for the React site, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors). The terminal keeps its own meta-CSP as defence in depth.
- Secrets only in Cloudflare and Modal. `.gitignore` added.
- **Data:** each subscriber connects their own Finnhub key at first run (guided step, free tier is 60 calls/minute). The key is stored only in that subscriber's browser; the Worker's `/finnhub` proxy is retained for employees and for macro data (FRED). Finnhub's self-serve plans do not permit redistribution to end users; a commercial agreement (custom pricing via Finnhub sales, plus exchange display licences for some data) is the route to "data included" and is revisited once subscription revenue can carry it.

## 10. Security requirements — the 20 items plus payments

Findings from the 2026-09-13 scan in **bold**.

| # | Item | What is done | Status |
|---|---|---|---|
| 1 | Hide API keys | Finnhub, Resend, FRED, Stripe keys are Worker secrets. Built site and terminal audited for any literal key. | verify |
| 2 | Env variables | Every secret documented in `SECURITY.md`; `wrangler secret list` and Pages env reviewed; no `.env` in repo. | verify |
| 3 | Admin routes | `/admin` behind the session gate **and** `SYNC_SECRET`; operator only. | build |
| 4 | Authentication | Signed HttpOnly session from a code issued only by a verified Stripe event or by Pierce. Terminal's local hashed sign-in stays as the device lock. | build |
| 5 | Least privilege | Public: site + demo. Subscriber: terminal, own sync, own data quota. Employee: same, no billing. Operator: admin. Every Worker route checks role. | build |
| 6 | Sanitise forms | `/enter`, "resend code", and any support form validated server-side: length caps, type checks, control-character strip, honeypot. | build |
| 7 | XSS | Every `innerHTML` in terminal and admin audited; `esc()` on user-derived text; React escapes by default; strict CSP on the site. | build |
| 8 | Rate limiting | Cloudflare rules on `/enter`, `/resend`, `/webhook` (per IP); per-user data quota in KV (§9). | build |
| 9 | Secure API endpoints | Role on every non-public route; method allow-lists; JSON bodies with size cap; Stripe webhook signature verified with tolerance. | build |
| 10 | CORS | Pinned to `https://perceptfolio.com`; preview URLs never allowed in production. | verify |
| 11 | Security headers | Pages `_headers` (§9). | build |
| 12 | Debug mode | No `console.log` in production builds; Worker `/status` details only with operator token; Stripe in live mode with test mode keys never in production env. | build |
| 13 | Update dependencies | `site/` and `kronos/` lockfiles; Dependabot; `vendor/` inventoried. | build |
| 14 | Remove unused | `depcheck` in CI; `vendor/` audit; dead routes removed (`/request` public self-request goes). | build |
| 15 | Secure files | **No `.gitignore` exists.** Add. `make-icons.html`, `SYNC-SETUP.md`, `skills-lock.json` reviewed. | build |
| 16 | Database access | KV writes require operator, a verified Stripe event, or a live code; keys namespaced per code; no public list operations. | verify |
| 17 | Hash passwords | Terminal local sign-in: confirm PBKDF2 with salt and adequate iterations; Worker stores only code hashes; Stripe holds all payment data. | verify |
| 18 | Git secrets | **`ACCESS_SECRET='pf-northbridge-gate-1'` / `SIGNUP_SECRET` in public history.** Rotate everything derived; `gitleaks` in CI. | fix |
| 19 | Full audit | `ecc:security-reviewer`; Strix against the preview when a key exists; Lighthouse; `npm audit`. Findings in `SECURITY.md`. | build |
| 20 | No mistakes | Every row has a test or a recorded verification. | standing |
| P1 | Webhook replay | Stripe event IDs stored; duplicates ignored. | build |
| P2 | Code enumeration | Codes are 10 chars from a 31-symbol alphabet (existing), `/enter` rate-limited, constant-time compare (existing `safeEqual`). | verify |
| P3 | Checkout tampering | Prices live only in Stripe Price IDs; the site never posts an amount. | build |

## 10b. Business mode

When a session belongs to an org, the terminal:
- applies the **org rulebook** (the 22-check thresholds, sizing limits, horizons) set by the org admin; analysts see the rules but cannot change them;
- stamps **every call with the analyst's name** and shows it in the record and scorecard, with per-analyst and whole-firm views;
- enables the **Clients** module (multiple client books per seat);
- gives the admin an **org settings** screen: seats, invites, rulebook, and a **compliance export** (CSV/JSON of every call with its stamp, checks and mark);
- keeps each analyst's sync slot separate, with the firm record aggregated on the Worker under the org.

Personal sessions see none of this; the terminal is the single-user tool it is today.

## 11. Kronos

- **What:** the Kronos K-line foundation model (shiyu-coder/Kronos), run as a FastAPI service: `POST /forecast {symbol, closes[], horizonDays}` → predicted path and a confidence band.
- **Where:** Modal (PROPOSED; scales to zero, pay per second) or a $20/month VPS. The Worker calls it with a service token; the terminal never calls it directly.
- **In the terminal:** a "Model view" inside Projections showing Kronos's path beside the existing projection, clearly labelled as a model output. Selecting "record this forecast" logs it as a call with a fixed horizon; it is marked against the S&P like every other call and appears in the record and the scorecard under its own source tag.
- **Rules:** never shown on the public site; never phrased as a recommendation; the honest note applies ("the model's record is new").
- **OPEN Q4** — Hosting budget for Kronos: Modal (~$5–30/month at low use) or a fixed VPS?

## 12. Automation (CI/CD)

On every push and pull request: the existing suite (extended); `site/` lint, type-check, build, `npm audit`, `depcheck`; `gitleaks`; Playwright (links, forms empty/garbage/correct, 375/768/1440, console clean); Lighthouse CI (a11y and best-practices at 100 on every public route); banned-words and em-dash tests. On `main`: deploy Pages and Worker; smoke test `/`, `/pricing`, `/enter`, and confirm `/terminal/` is not served without a session; Stripe webhook test event round-trips.

## 13. Tooling

| Tool | Use | Needs from you |
|---|---|---|
| impeccable | Design direction, finish review, DESIGN.md | — |
| ui-ux-pro-max-skill | Second UI/UX review lens | — (installs now) |
| shadcn-ui-mcp-server | shadcn components and blocks into `site/` | optional GitHub token (installs now) |
| magic-mcp (21st.dev) | Bespoke React components to the design system | 21st.dev key (dormant) |
| Strix | Pen test against the preview | LLM key + Docker (dormant) |
| Playwright | Interaction and responsive tests in CI | — |
| Stripe | Checkout, Portal, Tax, webhooks | **Stripe account, prices, bank details: yours** |
| Modal (or VPS) | Kronos hosting | account |
| aceternity / watermelon / refero / godly / haikei | Reference only | — |

## 14. Out of scope, and why

- **img2threejs:** no object specified.
- **Managed service / advice:** a different product needing a licence; the landing page does not mention it.
- **Team plans, SSO, invoicing by PO:** after launch.

## 15. Open questions

| # | Question | Needed for |
|---|---|---|
| Q1 | Confirm $129 / $1,290, or set other numbers | §6, Stripe prices |
| Q2 | ~~Refund policy~~ 14 days, decided | — |
| Q3 | Legal entity details for "NorthBridge": state of formation, address | terms, Stripe, privacy |
| Q4 | ~~Kronos hosting~~ Modal, decided | — |
| Q5 | ~~Stripe account~~ not yet; built against a stub, activated at M7 | — |
| Q6 | ~~Finnhub tier~~ BYO key at launch, decided | — |

## 16. Milestones

| M | Deliverable | Exit test |
|---|---|---|
| M0 | PRD agreed; `.gitignore`; secret rotated; tools installed | `gitleaks` clean; you say go |
| M1 | Cloudflare Pages project; session gate Function; `/enter`; employee permanent code issues and redeems; `/terminal/` unreachable without session | **Built 2026-09-13; `test/gate.mjs` 13/13 locally. Deploy needs `wrangler login` (§18).** |
| M2 | Stripe integration against a local stub: Personal checkout, Business application → acceptance → checkout with seat quantity; webhook handler; portal; lapse flow; contract tests | **Built 2026-09-13; `test/billing.mjs` 31/31 against a stubbed Stripe. Live activation at M7 needs your Stripe account and Price IDs (§18).** |
| M3 | `site/` React + shadcn: landing, pricing, apply, thanks, legal; skeleton loaders; banned-words test | **Built 2026-09-13.** Vite + React 18 + Tailwind v4 + shadcn-pattern primitives; 89 KB gzipped. Verified in the browser: hero, demo, pricing toggle, business acceptance state, apply, FAQ, zero console errors. `scripts/assemble.mjs` produces the Pages `dist/`. Lighthouse on the preview URL at M7. |
| M4 | Guided Finnhub-key onboarding; **Business mode** in the terminal (org rulebook, attribution, seats, export); admin shows subscribers, orgs, applications, employees; **the request-notification email** (added 2026-09-14 at Pierce's instruction) | **Built 2026-09-14.** Worker `2026-09-14.1` live: `/org`, `/org/rulebook`, `/pause/code`, Email Routing sender. Terminal: firm line, rulebook applied and locked for members, Publish for the admin seat, calls stamped `by`, first-run key card. Admin: per-seat pause. `test/billing.mjs` 43/43 including a 3-seat firm round-trip. **Remaining operator step: enable Email Routing on perceptfolio.com and verify the destination address** (§20). |
| M5 | Security items 1–20 + P1–P3 closed with evidence; Strix run; `SECURITY.md` updated | **Built 2026-09-14.** Every row in `SECURITY.md` names its test or record. Closed today: PBKDF2 passwords with migration, per-minute limits and a body cap on the Worker, react-router 7 (two advisories), the automated audit's three findings (one HIGH). Open: rate-limit binding not verified live (WAF rule at M7); Strix needs a key. Access requests now deliver by FormSubmit; activation email sent. |
| M6 | Kronos service deployed; Model view; forecasts recorded and marked | **Built 2026-09-14; one operator command left (`bash kronos/deploy.sh`, needs a Modal sign-in).** `kronos/app.py` (Modal, T4, Kronos-small, token-checked); worker `/kronos` (code-gated, Yahoo daily OHLCV, day cache, 503 until configured); terminal Projections gains a Model view whose direction records onto the `kronos` track and is marked like any call. Contract-tested. **Not yet running: needs your Modal account and two secrets (kronos/README.md).** |
| M7 | CI/CD complete; DNS cut to Pages; GitHub Pages retired; Stripe account connected, test mode verified, then live | **Done 2026-09-20.** perceptfolio.com and www on Cloudflare Pages (both Active), 21/21 smoke checks on the live domain, GitHub Pages retired and the CNAME file removed. Stripe stays dormant by decision; the CI deploy token and the WAF rules remain optional (§21). Pages project live at perceptfolio.pages.dev with the gate, real headers, SPA routing, the operator sign-in verified against the Worker (no second copy of the secret). CI workflow runs the suites, build, audit, gitleaks, and deploys on main once `CLOUDFLARE_API_TOKEN` exists. **Remaining, dashboard only: add the custom domain to the Pages project (retires GitHub Pages), add WAF rate-limiting rules, add the CI token (§21).** Stripe stays dormant by decision D15. |
| M8 | History on the first visit; company, analysts and six lenses; Kelly | **Built 2026-09-14.** Worker `/history` and `/council`; the panel beneath every analysis; Kelly in Risk. §22. |
| M9 | The world map of factories on a globe, built on God's Eye View | **Built 2026-09-20.** World tab (CesiumJS vendored, Natural Earth II from this origin); fifteen bundled layers from Wikidata and OpenStreetMap; live company search through Nominatim; both CSPs kept without `'unsafe-eval'`. §23. |

## 17. Acceptance criteria

- A visitor with no account can run the demo, see both prices and the three named comparisons, and reach Stripe Checkout in two clicks.
- After a successful test payment, a code arrives by email within a minute and unlocks the terminal.
- An anonymous request to `/terminal/` is not served the terminal.
- Cancelling in the Stripe portal locks the terminal at period end, with export still available.
- An employee code works permanently until Pierce pauses it.
- A Business application accepted from admin yields a checkout for N seats; the admin can invite exactly N analysts; the N+1th is refused; every call in the org carries an analyst name.
- The rendered site contains no banned word, no em dash, no return claim, and no "advice".
- Every row in §10 has evidence.
- A Kronos forecast can be recorded and appears in the record with a fixed horizon.
- The build is reproducible from a clean clone with no secrets present.

## 18. Deploying the gate (operator steps)

The Pages project cannot be created from this machine without your Cloudflare login. Once, from the repo root:

```
npx wrangler login
npx wrangler pages project create perceptfolio --production-branch main
npx wrangler pages secret put SESSION_SECRET --project-name perceptfolio   # paste: openssl rand -hex 32
npx wrangler pages secret put SYNC_SECRET --project-name perceptfolio      # the same value the worker holds
# WORKER_URL is not secret: set it under Pages > Settings > Variables as https://crimson-hat-6ad9.northbridgeai1.workers.dev
npx wrangler pages deploy . --project-name perceptfolio --branch rebuild-v2   # preview URL; production cuts over at M7
```

Then, in the Cloudflare dashboard: Security > WAF > Rate limiting rules, one rule for `/api/enter` at 10 requests per minute per IP.

**Activating billing (M7), once the Stripe account exists.** In Stripe: create four Prices (Personal monthly $149, Personal yearly $1,490, Business monthly $119/seat, Business yearly $1,190/seat), enable Stripe Tax, and add a webhook endpoint at `<worker>/stripe/webhook` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Then on the Worker: `wrangler secret put` for `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PERSONAL_MONTHLY`, `STRIPE_PRICE_PERSONAL_YEARLY`, `STRIPE_PRICE_BUSINESS_MONTHLY`, `STRIPE_PRICE_BUSINESS_YEARLY`, and variables `SITE_URL`, `OPERATOR_EMAIL`. Until those exist, `/checkout` answers 503 "Billing is not open yet" and the site shows Request a demo. The custom domain moves at M7, not now; until then `perceptfolio.com` stays on GitHub Pages and the preview URL is where M2–M6 are verified.

## 19. Revisions of 2026-09-13 (evening)

- **Access flow** is quote-first (D15 revised). Built: `/request` stores plan and seats and emails the operator with a suggested quote; admin shows plan, seats and the quote, has **Send quote** (draft with the discount stated) and, on a business grant, **Issue member codes** (`/decide/members`: one code per member email, each emailed, re-sent rather than re-minted). The site's pricing page asks for access instead of selling.
- **The landing hero is the real dashboard**: `preview/dashboard.html` is a static snapshot of the terminal's own markup and styles on the sandbox account, framed and scaled. Regenerate it whenever the dashboard changes (procedure: open the sandbox dashboard, clone the DOM without scripts, strip the demo class, save).
- **Language**: EN/ES on the landing, the door, the terminal chrome and the React site, from one dictionary (`i18n/es.js`) and one translator (`i18n/lang.js`); the choice persists. Deep terminal copy is translated as it is reached; a missing key stays English.
- **Market page, "tomorrow"**: Finnhub's candle endpoint is paid-tier, so the S&P log used to fill one close per visit; it is now seeded from FRED's SP500 series when candles fail, so the realised-vol range exists on the first visit.
- **Kronos**: not started. It is M6 and needs a Modal account (or a VPS) for the Python service; nothing shipped includes it.

## 20. The email, precisely (2026-09-14)

Why no email arrived: the Worker was the 6 September build until the evening of the 13th, and it has never had a mail provider. Both are now addressed in code: the Worker is deployed from `worker.wrangler.toml`, and it can send through **Cloudflare Email Routing** (free, no third party) to any address verified on the perceptfolio.com zone, which is the operator's inbox. A live test on the 14th proved the whole path: the request was stored, the send was attempted, and it failed with *"could not find account config of sending domain"*, which means exactly one thing remains:

**Operator step (two minutes, dashboard):** Cloudflare → perceptfolio.com → Email → Email Routing → Enable. Then Destination addresses → add `northbridgeai1@gmail.com` → click the verification link Cloudflare emails. Every request then emails you; the `/request` response reports `notified: sent`.

For emails **to customers** (codes, quotes) a general sender is still required: Resend (`RESEND_API_KEY`, `MAIL_FROM`), or keep sending admin's drafts by hand. Firms of eight or more see the 15% in the suggested quote and the quote draft.

## 21. Cut-over: done 2026-09-20 (the runbook, kept for the record)

**Done on 2026-09-20:** the operator key was reset with `wrangler secret put`, both domains were
attached to the Pages project through the API, the DNS was rewritten in the dashboard, and
`node test/smoke.mjs https://perceptfolio.com` passed all 21 checks; GitHub Pages was then
retired and the CNAME file removed. The steps below are how it was done. The account's Cloudflare login used here holds `pages (write)` and
`zone (read)` but no DNS write, so the move itself is a dashboard step. Before, during and after:

0. **Before you move anything: make sure you can get in.** After the move, `/terminal/` needs an
   access code or the operator key. The operator toggle on `/enter` takes the Worker's
   `SYNC_SECRET`; the copy in `.dev.vars` on the development machine no longer matches the live
   one (the gate suite's three operator checks fail with "not the operator key"). Check
   Cloudflare → Workers → crimson-hat-6ad9 → Settings → Variables and Secrets, or simply mint
   yourself a code in admin first. Installed copies of the app open `/terminal/`, get sent to
   `/enter` once, and hold the session for thirty days (ten years for an operator).
1. **Custom domain.** Cloudflare → Workers & Pages → perceptfolio → Custom domains → Set up a
   custom domain → `perceptfolio.com`, then again for `www.perceptfolio.com`. The zone is on this
   account, so the dashboard replaces the GitHub Pages A/AAAA records with the CNAME itself. It
   shows Active within minutes.
2. **Prove it.** `node test/smoke.mjs https://perceptfolio.com` must pass all 21 checks. Until the
   DNS change reaches you it reports the GitHub Pages failures; that is the test working.
3. **Retire GitHub Pages.** Only after step 2 passes: delete the `CNAME` file from the repo and
   turn Pages off in GitHub → Settings → Pages (or `gh api -X DELETE repos/northbridgeai1-cmyk/PerceptFolio/pages`).
   Until then GitHub keeps serving the old copy to anyone whose DNS has not caught up, which is
   harmless.
4. **WAF rate limits.** Security → WAF → Rate limiting rules: `/api/enter` 10 per minute per IP;
   the Worker hostname `crimson-hat-6ad9.northbridgeai1.workers.dev` 60 per minute per IP. This
   is the reliable layer above the Worker's own limiter.
5. **CI deploys.** GitHub → repo → Settings → Secrets → `CLOUDFLARE_API_TOKEN`: a token with
   "Cloudflare Pages: Edit". From then on every push to main deploys itself; until then, the
   command is `node scripts/assemble.mjs && npx wrangler pages deploy dist --project-name perceptfolio --branch main --commit-dirty=true`.
6. Stripe stays dormant by decision (quote-first); nothing to do.

## 22. M8 (2026-09-14): data on day one, the company view, six lenses, Kelly

Built and live:
- **History on the first visit.** The worker's `/history` returns two years of daily closes for any symbol (public data, cached a day); the terminal backfills its price log from it whenever Finnhub's paid candle route refuses. Charts, EWMA 50/200, realised volatility, portfolio growth and the market page's ranges are populated immediately.
- **Company, analysts and six lenses**, beneath every analysis: profile, eighteen ratios, analyst buy/hold/sell counts and the consensus target (free feeds), then six short readings of the business in the published frameworks of Buffett (value), Lynch (growth), Dalio (macro), Wood (innovation), Burry (contrarian) and Marks (downside), written by the model already wired for news, labelled as AI applications of published frameworks and never as the people's views or as a recommendation. Cached a day.
- **Kelly criterion**, in Risk: full and half Kelly from the thesis's price, target and stop, with the win probability taken from the marked record once it holds thirty marks (assumed 50% and said so until then), capped by the concentration limit, and framed as arithmetic on the user's own inputs.

Needs data that must be bought, so specified but not built:
- **Pre-filled buyer and supplier maps** (Bloomberg SPLC): Finnhub's supply-chain endpoint is paid-tier and no free feed exists; since 2026-09-20 the Map opens pre-filled from the model's knowledge of publicly documented supply chains, labelled as such and editable (§23). A licensed feed would replace the model's answer with a filed one.
- **ESG** scores: paid on every provider.
- **A world map of facilities** ("smart chip factories"): this line was wrong. OpenStreetMap and Wikidata carry plants with coordinates, and God's Eye View shows how to use them properly. Built as M9, §23.
- **Heatmaps**: built 2026-09-20, in Market: the holdings as a squarified treemap (size = value, colour = the day's move from the last refresh) and the eleven S&P sectors through their SPDR ETFs (eleven quotes when the tab opens, held five minutes). Colour saturates at three percent; a tile opens the analysis.

## 23. M9 (2026-09-20): the world map of factories, built on God's Eye View

The request: install https://github.com/bilawalsidhu/gods-eye-view and use it for the world map of
factories. What it is: a CesiumJS globe (MIT source, vanilla JS, 1,100 files, its own Node server)
over public feeds, with infrastructure layers extracted from OpenStreetMap through an Overpass proxy.
It has no factories dataset. What it has is the approach, and a working demonstration that OSM's
`man_made=works`, `industrial=*`, `power=plant` and `telecom=data_center` objects can be extracted,
bundled and drawn honestly. §22's "no free geospatial dataset of plants exists" is withdrawn.

What shipped (`world/README.md` is the full provenance):
- **The World tab** in the terminal, behind More with the other advanced tabs. One box: an industry
  phrase ("smart chip factories") opens a bundled layer; anything else is a company, answered live.
  Fifteen industry chips with counts. A globe with a dot per plant; click for name, operator, what it
  makes, country, website and the OpenStreetMap or Wikidata record. A side panel with the count, the
  extract date, the top countries, and a plain sentence when the source capped the answer.
- **Bundled layers** (`world/data/*.json`), the union of two free sources: Wikidata's typed classes
  (fab, refinery, nuclear plant, shipyard, steel mill, car factory, chemical plant, data centre,
  cement plant, smelters, foundries; CC0, with the owner's ticker where Wikidata has it) and
  OpenStreetMap through the public Overpass mirrors (ODbL): every named `man_made=works` and
  `industrial=*` object pulled once as CSV and cached a month, the industry's operators matched
  locally as whole words on name and operator, plus the small tag selectors asked live. Extracted by
  `scripts/world-extract.mjs`, which marks a layer `partial` when a source could not answer, so a
  subscriber never mistakes an outage for the whole world.
- **The Worker's `/world` route**: a company name, plain characters only, goes to Nominatim, OSM's
  own geocoder, the way GEV does keyless name lookups (a name regex over the planet is more than the
  Overpass mirrors can finish; measured, see `world/README.md`). Only industrial objects come back
  (works, industrial land, plants, data centres, quarries). Live-code gated, never more than one
  geocoder call a second across everyone, capped at 50, cached a week; a busy geocoder is a plain
  503 and is never cached.
- **The globe is CesiumJS, vendored** (`vendor/cesium`, Apache 2.0, integrity-checked), with Natural
  Earth II imagery served from this origin. No Cesium ion token, no Google tiles, no Esri or OSM tile
  server: nothing on the page is metered, non-commercial, or watching who opens it. The CSPs still forbid
  `'unsafe-eval'`: two one-token patches to the vendored bundle (documented, pinned by a test) and
  `CesiumWidget` instead of `Viewer` make that possible; what they gained is `worker-src 'self'` and
  `'wasm-unsafe-eval'`.
- **From a ticker**: the command palette and the WORLD verb open the tab with the company's short
  name (legal suffixes dropped), so "NVDA" becomes a search for NVIDIA's plants.
- Found and fixed on the way: `scripts/assemble.mjs` never copied `vendor/`, so the Pages build
  served the React index page where Chart.js should be; perceptfolio.com is still on GitHub Pages so
  no subscriber saw it, but the cut-over would have shipped it. A test now pins it.

Not taken from God's Eye View, and why: its live movers (OpenSky is non-commercial; adsb.lol and
AISStream are fair-use feeds a sold product should not lean on), its TeleGeography cables
(CC BY-NC-SA), and the ion/Google 3D tiers. Not in the bundle: `landuse=industrial` sites
(1.5 million objects, more than the public mirrors can hand over); the live company search does
reach them, because Nominatim indexes every named object.

Added 2026-09-20, later the same day: **Your holdings** on World (every plant of every company
held, one request, bundle first and Nominatim on top, a colour per holding); the **analyst trend**
(twelve monthly stacked bars in the company panel); a **monthly refresh workflow** that re-runs the
extractor and opens a pull request; the layer cap raised to 5,000.

Later still, 2026-09-20: **satellite on the way down** (Esri World Imagery faded in below
4,000 km over Natural Earth II; a plant becomes a roof); the seventeen intro paragraphs **folded
into one-line asides**; **five years of history** (the Worker's `/history` serves 5y; the device
keeps it outside the synced log; charts and hindsight windows read it); **the whole listing built
in** (`/universe`: every US common stock daily; a company name resolves to its ticker in the
search box; the Screener scans the whole market at about fifteen tickers a minute, hours for a
full pass, resumable). What "checks everything" cannot mean on a free data key: a live score of
six thousand stocks at once; the scan is a pass, not a snapshot.

And the same evening: **places, not coordinates** (every plant carries "Miami, Florida" from
Natural Earth's populated places, "near" when more than 15 km out; the geocoder's own address for
live results); **the explanatory text is gone** (every "About this", the World aside, the Kelly
essay, the Kronos note: numbers stand on their own); **the Map opens pre-filled** from the model
the Worker already uses, labelled "model", weights rough, editable, never over a map the person
touched (`/map/prefill`, cached thirty days); **Today's heat switches** between the holdings and
the market (the Dow 30 and twelve mega-caps); Calendar effects sits under The Move; the Top
button is round with an arrow. Found on the way: the Anthropic account behind `AI_API_KEY` has no
credit, so the six lenses had never produced a reading live. Fixed the same night without
Anthropic: Cloudflare's own Workers AI (the `AI` binding, free daily allowance) answers whenever
Anthropic cannot, for the lenses, the pre-fill and the news summary; Anthropic takes over again
the moment its account has credit.

Coverage is what the community has drawn. Fabs on Wikidata skew to the former Soviet Union; OSM
carries TSMC, Samsung and Intel because people drew them. The page says "community-mapped,
incomplete by nature" and shows the count and date, and that is the honest product.
