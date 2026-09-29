# PerceptFolio — handoff map

Written 2026-09-27. For an agent or a person arriving with no context. It says what exists, where
it is, how the pieces fit, and which traps have already cost a day. It does not repeat the other
documents; it points at them.

| Document | What it holds |
|---|---|
| `PRD.md` | Requirements, numbered (D1, A2.3, I11…). The source of "why is it like this". |
| `APP-GUIDE.md` | The terminal, screen by screen, as a user meets it. |
| `PRODUCT.md` | Positioning and the public refused list. |
| `SECURITY.md` | Threat model, the gate, the record's integrity argument. |
| `WHAT-TO-ADD.md` | The 45-item build list, plus every owner decision since, dated. **Read the dated notes at the end first** — they overrule anything earlier in the file. |

---

## 1. What this is

A research terminal for one person who buys and sells shares. It scores a company against rules
the user sets, writes down the verdict, and later marks that verdict against the index on fixed
horizons it cannot move afterwards.

The line that settles most scope arguments: **Bloomberg tells you everything that is happening;
PerceptFolio tells you whether your decisions worked.**

**Price:** $760 a month or $8,360 a year. One plan. **No page on the site renders that number** —
it reaches a person in the operator's reply after a demo. `PLAN` in `site/src/lib/config.ts` and
`PRICE` in `worker.js` hold it and the suite checks they agree.

**Refused, publicly and on purpose:** fixed income, options, FX, order execution, chat. Do not
propose them. It never places a trade, never quotes a win rate (expectancy with its interval
instead), and never edits a past mark.

---

## 2. Two hosts. This is the first thing to get right.

| | Cloudflare **Pages** | Cloudflare **Worker** |
|---|---|---|
| Serves | every file: site, terminal, admin, door | no files — it is the API |
| Name | `perceptfolio.com` | `crimson-hat-6ad9.northbridgeai1.workers.dev` |
| Deployed by | `npx wrangler pages deploy dist --project-name perceptfolio --branch main` | `npx wrangler deploy -c worker.wrangler.toml` |
| Config | `functions/`, `_redirects` | `worker.wrangler.toml` |
| Secrets live | Pages project settings | `npx wrangler secret put X -c worker.wrangler.toml` |

They are separate deployments with separate secrets. A change to `worker.js` needs the worker
deploy; a change to anything else needs the Pages deploy. Most changes need one, not both.

**Trap:** `localhost` cannot call the worker — the worker's CORS allows `perceptfolio.com` only.
A terminal served from a local static server will show CORS errors for every data call. That is
expected, not a bug. Test worker routes in Node instead (see §8).

---

## 3. Repo map

```
site/                 the public website (React + Vite + Tailwind)
  src/pages/          Landing Subscription Legal Security FlatQuarter Thanks
  src/components/     Nav Footer RequestForm Demo CompanyDemo TerminalDashboard Faq Logo ui/
  src/lib/config.ts   PLAN, SCREENS, CONTACT, SUPPORT, WORKER  <- single source of truth
  dist/               vite output, copied into dist/ by assemble

terminal/index.html   THE WHOLE TERMINAL. ~18k lines, one file, vanilla JS. No build step.
admin.html            operator console: requests, grants, pauses, health
enter/index.html      the door: type a code, get a session
verify/               public page that checks an exported evidence pack, no account
call/                 public page for one shared call
preview/              static snapshots of terminal screens, framed by the landing page
demo/ world/ vendor/  bundled datasets, country polygons, Chart.js + CesiumJS (self-hosted)

worker.js             THE WHOLE API. One file. Routes + two cron jobs.
worker.wrangler.toml  worker config, KV binding, cron schedules
functions/            Pages Functions
  _middleware.js      the gate + CSP per path
  _lib/session.js     signed cookie: sign, verify, readCookie, LIFETIME
  api/enter.js        code -> session
  api/whoami.js       session -> code   <- how the terminal opens with nothing typed
  api/leave.js api/portal.js

scripts/assemble.mjs  builds site if stale, then copies everything into dist/
test/                 seven suites, see §8
sw.js                 service worker. BUMP CACHE_VERSION ON EVERY TERMINAL CHANGE.
index.html            LEGACY landing page. Not deployed. Kept only because ~8 tests read it.
```

---

## 4. The website

Built from `site/`, served at the root. One CTA everywhere: **Request a demo**.

File paths in this table are relative to `site/src/`.

| Route | File | What it is |
|---|---|---|
| `/` | `pages/Landing.tsx` | hero, three-step "how to get in", company demo, marking demo, the record, sizing, the 14 screens, who it is for, the request form, FAQ |
| `/subscription` | `pages/Subscription.tsx` | what a subscription includes. **No price.** Ends in the demo request |
| `/pricing` | same component | old path, still resolves so links do not 404 |
| `/security` | `pages/Security.tsx` | how the gate, the record and the evidence pack work |
| `/flat-quarter` | `pages/FlatQuarter.tsx` | the statement shown when a quarter is flat |
| `/terms` `/privacy` `/refunds` | `pages/Legal.tsx` | |
| `/thanks` | `pages/Thanks.tsx` | after a request. **No mail button** |
| `/enter/` | `enter/index.html` | the door (static, not React) |
| `/terminal/` `/admin.html` | gated by `functions/_middleware.js` | |

**Nav is two rows** (`components/Nav.tsx`):
- utility row — *Already have a code? Sign in* · *Support* · EN/ES. The subscriber's row, never the
  sales path.
- primary row — The terminal · The record · Security · **one filled button**.

**The demo request** (`components/RequestForm.tsx`) qualifies in three stages: *have you used it
before* (a code holder is sent to `/enter/` and never sees the form) -> *who you are* (business
email, role, what you run) -> *the problem*. FormSubmit delivers it and the worker keeps a copy.
**Nothing on the site opens a mail app.**

---

## 5. The terminal

`terminal/index.html`. One file, no framework, no build. Edit it directly. 14 tab panes
(`id="tab-…"`), 13 of which are in `SCREENS` in `site/src/lib/config.ts` — that list is what the
site advertises and **must stay in step with the tabs**.

**Command was removed on 2026-09-29** because it and the Dashboard answered the same question in two
places. Its action queue was **moved, not deleted**: it is the only screen that says a stop was hit or
a limit was crossed. It now sits at the top of the Dashboard, above the portfolio value. Pinned in
`test/run.mjs` under "COMMAND WAS MERGED, NOT DELETED".

| Tab | Answers |
|---|---|
| dashboard | Where do things stand today, and what needs me first? (the action queue moved here from Command, 2026-09-29) |
| portfolio | What do I own, at what cost, against which limits? |
| watchlist | *(shown as "Lists")* Which of the names I watch clear my bars? |
| history | How do I actually behave: hold times, early sales, rule adherence? |
| market | What regime is the market in, and how is my record marking? |
| news | What was said about my holdings, and what is happening in the world? |
| map | Who does this company depend on, and who depends on it? |
| world | What does a country make and sell, and to whom? (CesiumJS globe) |
| screener | Which names on a list clear the rulebook? |
| analyzer | How does one company do on the 22 checks? |
| risk | What does a bad month do to the book? |
| projections | What range of outcomes is plausible? (+ Kronos model view) |
| alerts | What crossed a line while I was away? |
| settings | *(not in SCREENS; reached from the avatar menu)* |

### How a session starts — the important flow

```
/enter/  ->  POST /api/enter   code -> worker /invite or /status -> signed pf_session cookie
                               also enforces ONE NEW SIGN-IN A DAY per code (worker POST /door)
/terminal/ -> middleware checks the cookie
           -> terminal boot calls GET /api/whoami  (cookie -> access code)
           -> openFromSession(): makes/reuses a profile keyed by the code, points sync at it,
              finishLogin() -> pulls the book from the worker -> the terminal opens
```

**No email, no password, nothing typed.** The set-up form still exists as the fallback for a saved
copy of the page or an expired session. An account opened this way is keyed
`<code>@code.perceptfolio` and is labelled "Code ABCDE-12345", never greeted as a name.

### Where the data lives

**Changed 2026-09-28: the worker, not the browser.** `localStorage` keeps a profile shell
(`SHELL_FIELDS`) and the single unacknowledged edit (`pf_unsent_v1`), nothing else. See
`serverIsHome()`, `writeStore()` and `test/serverstore.mjs`, and the long note in WHAT-TO-ADD.md.

**On the worker, under the access code.** `uslot:<code>` holds the whole profile. The browser keeps
a copy for speed and offline. Sync is on by default for any profile with a code, pulls on sign-in,
pushes debounced 8s plus on `pagehide`.

If `localStorage` fills up, `persistDB` does not give up: it drops caches in order (scores for
unwatched tickers -> quarantine log -> daily logs to 120 days -> to 60 -> all cached scores),
retrying the write after each, and if it still fails **pushes to the server immediately** and says
so. It never touches holdings, cash, transactions, watchlist, lists, theses, reviews, calls, marks
or the chain.

### Two devices per code

`DEVICE_LIMIT = 2` in the worker. A third is refused with the list, and any holder can forget one
from Settings.

---

## 6. The worker API

All routes in `worker.js`. Data routes are gated on a live access code (`?code=`) and rate-limited.

**Access and identity**
`/request` `/invite` `/requests` `/decide` `/pause` `/pause/code` `/status` `/door` `/door/clear`

**The book and the record**
`/usync` `/usync/devices` `/usync/forget` `/record` `/callreg` `/marks` `/chain` `/share` `/token`
`/me` `/notify`

**Market and research**
`/data` `/finnhub` `/history` `/fred` `/calendar` `/filings` `/holders` `/universe` `/popular`
`/kronos` `/council` `/summarise` `/map/prefill` `/trade` `/trade/partners` `/trade/product`
`/world` `/world/batch` `/worldnews` `/feargreed`

**Billing**
`/checkout` `/stripe/webhook` `/portal` `/quote`

**Meta**
`/version` — public; with the operator bearer it also reports cron state, data tier and licence count.

### KV keyspace (`PF_SYNC`)

| Prefix | Holds |
|---|---|
| `code:` | an issued code, 40-day TTL, burned on first use |
| `grant:` | the durable grant. **No TTL** — this is what `/status` checks forever |
| `req:` | a demo request record, for admin |
| `uslot:` | the synced book |
| `udev:` | devices under a code (max 2) |
| `rec:` `cmarks:` `creg:` `chain:` | the record's server copy, marks, call registry, chain heads |
| `notify:` | notice preferences |
| `newsseen:` | stories already told, so none is sent twice |
| `door:` | last sign-in stamp, 2-day TTL — the one-a-day rule |
| `share:` `shares:` `tok:` `tokens:` | public shares and read-only tokens |
| `sub:` `cust:` `evt:` | Stripe subscription, code->customer, webhook idempotency |
| `cron:last` `cron:news` | what the two cron jobs did |
| `fg:` `wnews:` `nominatim:` `cikmap:` `hs:` | caches, all TTL'd |

### Cron — two schedules, one handler

`scheduled()` branches on `event.cron`. An unrecognised schedule falls to the nightly job, because
losing a mark is the worse failure.

- `40 21 * * 1-5` — marks the record against the index, then sends review notices.
- `*/15 13-21 * * 1-5` — the news watcher: reads `uslot:` for each account's holdings and watchlist,
  pools symbols across accounts, fetches Yahoo per-ticker RSS plus fresh SEC 8-K/6-K filings,
  and emails what is new. **See the open item in §11 — this emails, and the owner asked for
  notifications instead.**

---

## 7. Data sources and their licence state

| Source | Used for | Key | Licence |
|---|---|---|---|
| Finnhub | quotes, fundamentals, company news in the terminal | `FINNHUB_API_KEY` | **free tier is personal-use. A commercial plan is due at 5 live clients** (`LICENCE_AT` in worker.js; `/version` counts grants) |
| Tiingo | daily closes, history, the cron's marks | `PRICE_FEED` + `PRICE_FEED_KEY` | licensed, paid |
| FRED | rates, the economy, release calendar | `FRED_API_KEY` | free, permitted |
| SEC EDGAR | filings, holders, company facts, 8-K watching | none | public domain, no limit. Send a real User-Agent |
| Yahoo Finance RSS | the news watcher's headlines | none | headline + link only |
| Google News RSS | world and country news | none | headline + link only |
| CNN | fear and greed | none | refuses a bare request; the worker sends browser headers |
| OpenStreetMap / Nominatim | the World view | none | see the trap in §9 |
| Kronos (Modal) | the model view | `KRONOS_URL` + `KRONOS_TOKEN` | own service |

**`DATA_TIERS` must stay unset.** Set, it silently refuses paying accounts and the terminal asks
them for their own key, which looks exactly like a broken product. This was live for a day once.
`/version` reports it and admin shows it in red.

---

## 8. Tests

Seven suites. Run them all before committing.

```
node test/run.mjs         1150 static assertions across every file. The main one.
node test/billing.mjs     Stripe contract, in-memory KV, stubbed fetch
node test/door.mjs        the one-sign-in-a-day rule, against functions/api/enter.js
node test/whoami.mjs      the session -> code route
node test/worldnews.mjs   hits the LIVE Google feed; can fail transiently on a 502
node test/feargreed.mjs   hits the LIVE CNN endpoint
node test/newswatch.mjs   the cron watcher, fully stubbed
```

`test/run.mjs` reads source files and asserts on their text. It is a **pinning** suite: when you
change code it will fail, and re-pinning it is part of the change, not a chore to skip. Write the
reason into the test's comment.

**What this suite cannot catch:** it verifies that handlers exist and that source text matches. It
does **not** render anything. A button whose `onclick` attribute is malformed, or which runs and
does nothing visible, passes every check. Both have shipped. For UI faults, a screenshot from the
owner is faster and more reliable than this suite.

---

## 9. Traps that have already cost time

1. **`assemble.mjs` used to copy a stale `site/dist`.** It now builds when `site/src` is newer. If
   you edit a `.tsx`, do not hand-copy — run `node scripts/assemble.mjs`.
2. **Bump `CACHE_VERSION` in `sw.js`** on every terminal change, or installed copies keep serving
   the old file. Currently `perceptfolio-v145`. The suite pins it, so it will remind you.
3. **`activeGrant` is defined inside the fetch handler.** A cron or module-level function cannot
   see it. Read `grant:<code>` directly, or use `emailForIdent`, which already refuses a paused one.
   This has bitten twice.
4. **`openMenu` inlines `run` into `onclick="…"`.** Build arguments with **single** quotes. A
   `JSON.stringify` argument closes the attribute and the menu silently does nothing.
5. **Nominatim indexes places by NAME**, and factories are tagged by operator, not brand. Company
   search in the World view is inherently thin. `WORLD_CAP` is 200; raising it further will not fix
   it. Tag selectors work; name regexes do not.
6. **The owner's network (FortiGate) blocks `perceptfolio.com`.** A stale service-worker copy then
   looks like a lost account. `curl` first before believing a bug report about the site being down.
7. **`wrangler dev` hangs** on Yahoo over IPv6. Test worker routes by importing `worker.js` in Node
   with an in-memory KV — copy the pattern from `test/billing.mjs`.
8. **Copy goes stale silently.** Three separate places still claimed "everything lives only in this
   browser" long after the server existed — the welcome email, the first-holding card, and the
   backup banner. When you change where data lives, grep for the claim.

---

## 10. House style

- **No paragraphs on screen.** Tiles, tables, legends, and a source line. Explanations belong in
  source comments, which is why this codebase's comments are long and argue with themselves.
- **No em dashes in rendered text.**
- **No marketing vocabulary.** `test/run.mjs` fails on a list of banned words.
- **Never name a rulebook check on the public site.**
- Comments explain *why*, and especially why the obvious alternative was wrong. Several tests
  assert that a particular comment still exists, because the reasoning is the artefact.

---

## 11. Open items

- **The news watcher still emails.** The owner asked for a notification from the terminal instead,
  which is built (`setNewsAlerts` / `announceNews`, fires while the terminal is open). The `*/15`
  cron still runs and tries to email. Either give it Web Push properly, or remove the cron.
- ~~**No mail is configured.**~~ **Done 2026-09-28.** `RESEND_API_KEY` and `MAIL_FROM` are set and
  proved with a real send (`/request` returns `notified: "sent"`). Resend delivers to any address;
  the Email Routing fallback in `sendPlain` remains for a worker with no Resend key.
- ~~**Stripe is test mode.**~~ **Live from 2026-09-29.** Live restricted key, both live prices, live
  webhook with **Events from: Your account**. `/checkout` returns `cs_live_` sessions.
- **The card statement says "Terminal", not PerceptFolio.** Stripe's checkout page names the product
  `Terminal`, and the statement descriptor follows the account setting. A $760 line item from a name
  the buyer does not recognise is how a chargeback starts. Set the descriptor to `PERCEPTFOLIO` in
  Stripe → Settings → Business → Public details. **Cheapest unfixed money risk on the list.**
- **The 3-day trial has no day-2 reminder.** `TRIAL_DAYS = 3` in worker.js; Stripe charges on day 4
  on its own. Nothing warns the buyer the day before. This is both the decent thing and the single
  largest reducer of disputes on an auto-converting trial. Stripe can send it (Settings → Billing →
  Subscriptions and emails → trial ending) or the `40 21` cron can.
- ~~**`STRIPE_PRICE_BUSINESS_*` are dead secrets.**~~ **Deleted 2026-09-29.**
- **`SUPPORT_LIVE` is false** in `site/src/lib/config.ts` until Email Routing forwards
  `support@perceptfolio.com`.
- **Finnhub commercial plan** is due at 5 live grants.
- **A trial cannot show the product's own claim, and the trial is three days.** The record needs
  marked calls before it says anything, and the only fast source of evidence, an imported broker CSV,
  is stored as `imported: true` and deliberately **never graded** (`applyTradesCsv`), because a call
  this terminal did not make must never appear as one it marked. That rule is right and should stay.
  What is missing is a second, clearly separate read-only view over imported history, which answers
  "how did your past decisions actually do" without entering the hash-chained record. Without it a
  trialist sees "not enough data yet" for all three days. **This is now the highest-value product
  gap, because the trial created it.**
- Notifications reach a terminal that is **open**, including a background tab. Not a closed one.
  That needs Web Push and a VAPID key pair on the worker.

---

## 12. Deploying

```bash
# worker.js only
npx wrangler deploy -c worker.wrangler.toml

# everything else
node scripts/assemble.mjs && npx wrangler pages deploy dist --project-name perceptfolio --branch main
```

Verify a worker deploy with `curl -s https://crimson-hat-6ad9.northbridgeai1.workers.dev/version`.
Verify a Pages deploy by checking the service worker version:
`curl -s "https://perceptfolio.com/sw.js?cb=$(date +%s)" | grep -o "perceptfolio-v[0-9]*"`.

**Add a cache-buster to any `curl` of the live site.** A cached copy has twice been mistaken for a
failed deploy.
