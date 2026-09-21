# Security posture

Checked against the twenty-item list, honestly. This is a static site on GitHub Pages
plus a Cloudflare Worker plus browser localStorage. There is no application server, no
SQL database, no session cookie and no upload endpoint, so several items on a generic
web checklist have no surface here. Those are marked N/A with the reason, because
recording them as "done" would be a false assurance.

| # | Item | State |
|---|---|---|
| 1 | Hide API keys | **Done.** No key is in any shipped file. Finnhub, FRED and the AI key live as Cloudflare secrets and are read only as `env.*` inside the worker. The browser never sees one; it calls the worker, which holds them. |
| 2 | Check env variables | **Done.** Every secret is `env.FINNHUB_API_KEY`, `env.FRED_API_KEY`, `env.AI_API_KEY`, `env.SYNC_SECRET`, `env.ALLOWED_ORIGIN`. `/version` reports which are configured, as booleans, never values. |
| 3 | Check keys in git | **Done.** Full-history scan for key-shaped assignments returns nothing. |
| 4 | Protect admin routes | **Done.** `/requests`, `/decide`, `/pause` and `/finnhub` sit below the bearer wall and require `SYNC_SECRET`. `admin.html` is a public file that is useless without the secret, which is the correct model for a static host: the page is not the control, the API is. |
| 5 | Add auth | **Done.** Two credentials: the operator's `SYNC_SECRET`, and per-user invite codes that carry their own pause flag and can be revoked individually. Account creation requires a valid invite. |
| 6 | Check user permissions | **Done.** Each identity reads and writes only its own KV keyspace (`s:<slot>` or `c:<code>`). A code cannot address another code's data. Paused codes fail closed. |
| 7 | Sanitise user input | **Done.** Worker input is length-clamped and pattern-checked (`clean()`, ticker regex, JSON size caps, 400 on malformed bodies). The registry stores only the fields the cron needs rather than the client's blob verbatim. |
| 8 | XSS | **Done.** `esc()` escapes `& < > " '` on every interpolated value; user-controlled names go through `textContent`. CSP `object-src 'none'`, `base-uri 'self'`. |
| 9 | SQL injection | **N/A.** No SQL anywhere. Storage is localStorage and Cloudflare KV, addressed by exact key. |
| 10 | Check DB rules | **Done, in the KV sense.** Key namespacing is the rule, enforced in the worker; there is no client-side data store to write rules against. |
| 11 | Rate limiting | **Done.** Access requests are capped per IP per day; AI summaries are capped at 12 per invite code per day; Finnhub 429s are surfaced rather than retried. |
| 12 | Spend cap | **Done.** The AI daily cap is the spend control, deliberately applied per invite code because a code travels by email and a leaked one must not be able to run up a bill. |
| 13 | Secure file uploads | **N/A.** There is no upload endpoint. Import reads a local JSON file in the browser and never transmits it. |
| 14 | CSRF | **N/A by design, and better than mitigated.** Auth is a bearer token in an `Authorization` header, never a cookie, so a cross-site form post carries no credentials. This is the structural reason CSRF does not apply. |
| 15 | CORS | **Fixed in this pass.** `Access-Control-Allow-Origin` previously fell back to `*` when `ALLOWED_ORIGIN` was unset, which is exactly the state a fresh deployment is in. An unset origin now denies cross-origin reads and `/version` says so. |
| 16 | HTTPS | **Done.** GitHub Pages enforces it, `workers.dev` is HTTPS only, and every URL in the codebase is `https://`. |
| 17 | Security headers | **Added in this pass.** Every worker response carries `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Cross-Origin-Resource-Policy`, `Permissions-Policy`, a locked-down CSP and `Cache-Control: no-store`. The static pages carry a meta CSP. |
| 18 | Secure cookies | **N/A.** The product sets no cookies at all. State is localStorage and one sessionStorage key. |
| 19 | Disable debug mode | **Done.** No `console.log` in either shipped file, no debug flag, no verbose error path. Worker errors return a message, never a stack. |
| 20 | Check prod settings | **Done.** `/version` reports the build and which secrets are set, and the AUDIT screen reads it, so a misconfigured deployment is visible in the product rather than only in a dashboard. |

## What a static host cannot do, stated plainly

`X-Frame-Options` and CSP `frame-ancestors` are header-only and are ignored in a meta
tag. GitHub Pages permits no header configuration, so clickjacking cannot be blocked
declaratively on the site itself. The pages therefore refuse to render inside a frame in
script instead. That is weaker than a header, because it depends on script running, and
it is the strongest option available without moving the site behind a proxy. Putting the
site behind the Cloudflare Worker, or Cloudflare Pages, would allow real headers.

`'unsafe-inline'` is unavoidable in the CSP. The product is one HTML file with inline
script and style by design, which is invariant I2 and the reason it has no build step, so
there is nothing to hash and no nonce to issue. The policy still buys something real:
`connect-src` pins outbound requests to this origin, the worker and Finnhub, so an
injected script cannot exfiltrate a portfolio to an arbitrary host.

## Standing risk, not yet closed

The operator's sync runs on one shared `SYNC_SECRET` with no per-device revocation. That
is an acceptable trade for their own book and is not acceptable for anyone else's, which
is why profiles carrying `managedBy` or `accountType: business` are excluded from sync
entirely (F1). The route out is per-user credentials on `/usync`, which already exist for
invited users.

## Rebuild v2, M0 findings (2026-09-13)

The product is changing from a private tool to a sold subscription on Cloudflare Pages
(see PRD.md §8–§10). The twenty items are being re-closed against that architecture; this
section records what M0 found and did.

| Finding | State |
|---|---|
| `ACCESS_SECRET='pf-northbridge-gate-1'` and `SIGNUP_SECRET` exist in **public git history** (the first uploaded `index.html`). | **Dead in HEAD.** Nothing reads them; the worker uses `env.SYNC_SECRET`. **Action for the operator:** if `SYNC_SECRET` in Cloudflare was ever set to that string, change it now (`wrangler secret put SYNC_SECRET`). History is public, so treat the string as known. |
| No `.gitignore` existed. | **Fixed.** `.gitignore` covers `.env*`, `.dev.vars`, keys, builds, tooling state. A test asserts it. |
| MCP config could carry keys. | **Prevented.** `.mcp.json` uses `${VAR}` placeholders; a test fails if a literal key appears. `.env.example` documents each variable. |
| Secret-shaped literals in tracked files. | **Scanned on every run.** Test covers Stripe, Resend, AWS, GitHub, Slack key shapes and private-key blocks across all tracked files. `gitleaks` joins CI at M7. |
| Marketing vocabulary. | **Banned by test.** 23 words and exclamation marks fail the suite if rendered on a public page. |

### Strix (automated penetration test), when a key exists

Not run yet: it needs Docker and an LLM API key (`STRIX_LLM`, `LLM_API_KEY`), neither of which
is available. To run it against a preview deployment:

```
curl -sSL https://strix.ai/install | bash
export STRIX_LLM="openrouter/z-ai/glm-5.3"
export LLM_API_KEY="…"
strix --target https://<preview>.pages.dev
```

Results land in `strix_runs/<run-name>`; findings go into this file with a state.

## M1: the gate (2026-09-13)

`functions/_middleware.js` serves `/terminal/*`, `/admin`, `/app*` only to a request carrying a
valid `pf_session` cookie (HMAC-SHA256, HttpOnly, Secure, SameSite=Strict). `/api/enter` turns an
access code into a session by burning it at the worker and then trusting the durable `grant:`
record; the gate re-confirms that record every five minutes and clears the cookie on pause. Real
security headers ride every response, with a strict CSP (no inline) on public paths and the
single-file CSP on the terminal. `test/gate.mjs` proves thirteen properties end to end against
`wrangler pages dev`; `test/run.mjs` holds twenty static guarantees on the same files.

| Note | State |
|---|---|
| Codes redeemed **before** `grant:` records existed cannot open a session: `/status` does not know them and `/invite` reports them already used. | **Operator action, once:** issue those accounts a fresh code from admin. The gate is a paywall and does not fail open for unknown codes, by design. |
| The operator bootstrap accepts `SYNC_SECRET` at `/api/enter` and issues a permanent operator session. | Rate-limit `/api/enter` in Cloudflare (PRD §10 #8) before launch. The compare is constant-time. |
| `wrangler pages dev` adds `Access-Control-Allow-Origin: *` locally. | The middleware deletes it; production Pages never adds it. Tested. |

## Worker deployment (2026-09-13, evening)

The live Worker was build 2026-09-06.4 until this evening; every route added since M2 existed only
in the repo. Deployed as 2026-09-13.1 with `worker.wrangler.toml`: the KV binding declared
(`PF_SYNC`, `71ba2a59…`) and `keep_vars = true` so the dashboard's plain variables (ALLOWED_ORIGIN
among them) survive the deploy. Verified live: all routes present, CORS still pinned to
perceptfolio.com, KV bound, quote helper correct.

Secrets present: AI_API_KEY, FINNHUB_API_KEY, FRED_API_KEY, SYNC_SECRET, OPERATOR_EMAIL (set
tonight). **Absent: RESEND_API_KEY and MAIL_FROM**, so no email is sent automatically by any route;
admin's drafts are the only outbound mail. That is the reason "I didn't get an email".

## M5 close-out (2026-09-14): the twenty items plus payments, with evidence

Every row names where the proof lives. "Live at M7" means the code is built and tested but the
Pages gate is not in front of production until the cut-over from GitHub Pages; until then the
meta CSP in each file is the header layer.

| # | Item | State | Evidence |
|---|---|---|---|
| 1 | Hide API keys | **Done** | Secret-shape scan over every tracked file (`test/run.mjs`, "no secret-shaped literal"); keys exist only as Worker secrets (`wrangler secret list`: AI, FINNHUB, FRED, SYNC_SECRET, OPERATOR_EMAIL). |
| 2 | Env variables | **Done** | Listed above; `/version` reports booleans only with the operator token; `.dev.vars` ignored and documented. |
| 3 | Admin routes | **Built, live at M7** | Pages gate requires an operator or employee session for `/admin`; admin itself still needs `SYNC_SECRET` for every call. `test/gate.mjs` 13/13; static guards. |
| 4 | Authentication | **Built, live at M7** | HMAC-SHA256 session cookie, HttpOnly Secure SameSite=Strict, expiry, tamper refused, re-check every 5 minutes, paused/lapsed distinguished. `test/gate.mjs`. |
| 5 | Least privilege | **Done** | Every worker route is public, code-scoped, or operator-only; `test/billing.mjs` proves the 401s and the admin-seat-only publish; only the operator pauses a seat. |
| 6 | Sanitise forms | **Done** | `clean()` caps and strips on every field; honeypot on `/apply` and the request form; browser validation gates the form; 16 KB body cap on billing and org writes (new). |
| 7 | XSS | **Done** | Mechanical scan: every request-derived value in `admin.html` is rendered through `esc()` (`test/run.mjs`); the terminal's M4 additions use `textContent`; React escapes by default. |
| 8 | Rate limiting | **Partly verified** | `/request` 10/day/IP (KV, verified: the operator hit it). Per-minute limits on `/invite`, `/status`, `/org`, `/checkout`, `/apply`, `/portal`, `/org/rulebook` use Cloudflare's Rate Limiting binding (declared, bound, deployed as 2026-09-14.3) with a KV counter as fallback. **A live probe of 45 sequential calls at ~5/s did not trip the binding**; Cloudflare documents it as approximate and per-location, but that is not evidence, so this row is not closed. The reliable layer is a WAF rate-limiting rule on the Worker hostname and on `/api/enter`, set in the dashboard at M7. |
| 9 | Secure API endpoints | **Done** | Role on every non-public route; method checks; JSON-only bodies with a cap; Stripe signature verified in constant time with a five-minute tolerance. |
| 10 | CORS | **Done, verified live** | Preflight from perceptfolio.com returns exactly that origin; `keep_vars = true` preserved `ALLOWED_ORIGIN` through the deploy. |
| 11 | Security headers | **Built, live at M7** | HSTS, nosniff, DENY, no-referrer, Permissions-Policy, COOP, CORP, strict CSP on public paths (`functions/_middleware.js`). Meta CSP on every file until then. |
| 12 | Debug mode | **Done** | No `console.log` in `worker.js` (guarded); `/status` detail needs the operator token; Vite builds in production mode. |
| 13 | Update dependencies | **Done today** | `react-router-dom` 6 → 7.18.3 closed GHSA-wrjc-x8rr-h8h6 and GHSA-337j-9hxr-rhxg; `npm audit` reports 0 vulnerabilities. |
| 14 | Remove unused | **Done** | `site/` carries nine runtime dependencies, each imported; `vendor/` unchanged and served only to the terminal. |
| 15 | Secure files | **Done** | `.gitignore` covers env files, keys, builds, tooling state (guarded). |
| 16 | Database access | **Done** | Every KV write path requires the operator, a verified Stripe event, a live code, or is rate-limited (`/request`); no public list operation. |
| 17 | Hash passwords | **Done today** | Terminal local password: PBKDF2-SHA256, 16-byte random salt per profile, 150,000 iterations (~450 ms per guess), constant-time compare; legacy SHA-256 hashes verify once and are rewritten. Guarded. The worker stores no passwords. |
| 18 | Git secrets | **Done; CI at M7** | The historical secret is dead in HEAD and documented; the secret-shape scan runs on every suite run; `gitleaks` joins CI at M7. |
| 19 | Full audit | **Done (automated review); Strix pending a key** | `ecc:security-reviewer` read every file in full and returned three findings, all fixed the same day and each now guarded by a test: (HIGH) member codes carried no seat, so a missing seat passed the admin-only rulebook check; admin is now stamped seat 1 and members carry an explicit seat, and a member's publish is refused. (MEDIUM) `/status` and `/org` had no rate limit; added. (LOW) an unset `ALLOWED_ORIGIN` emitted the string `null`; the header is now absent. Strix stays dormant until an LLM key exists. |
| 20 | No mistakes | **Standing** | Every row here points at a test, a live check, or a recorded command. |
| P1 | Webhook replay | **Done** | Event ids stored 30 days; duplicates answered 200 and ignored (`test/billing.mjs`). |
| P2 | Code enumeration | **Done** | 31-symbol alphabet, 10 characters; `/invite` now 30/min/IP; constant-time compares. |
| P3 | Checkout tampering | **Done** | Prices exist only as Stripe Price IDs in env; no amount is ever posted (`test/billing.mjs`). |

### Access requests now travel by email

The request form posts to FormSubmit (formsubmit.co), which delivers it to the operator's inbox
and keeps no copy; if it cannot be reached the visitor's own mail app carries the same message.
A copy still goes to the worker so admin lists the request with its plan and seats. FormSubmit is
named in both privacy policies. One-time step: FormSubmit emails an activation link to the
inbox on the first submission; nothing is delivered until it is clicked.

## M9 (2026-09-20): the World route and the vendored globe

- `POST /world` on the Worker: live-code gated (an anonymous caller cannot make the site hammer
  OSM's geocoder), the phrase is `[A-Za-z0-9&'.\- ]{2,40}` and travels only as a URL-encoded query
  term to Nominatim, never into a query language; `RL_TIGHT` (10/min) via `tooMany` plus a global
  one-call-a-second timestamp in KV (Nominatim's policy); result filtered to industrial object
  classes, capped at 50 and cached a week under a case-folded key; a busy or rate-limited geocoder
  is a 503 with a sentence and is never cached. Evidence: `test/billing.mjs` ("world:" block,
  13 checks).
- CesiumJS is vendored from the npm tarball after comparing its SHA-512 with the registry's
  integrity field (hash recorded in `vendor/README.md`); nothing loads from a CDN. `Ion.defaultAccessToken`
  is emptied before the viewer is built and the base layer is served from this origin, so the page
  makes no request to api.cesium.com, Google or any tile company. Evidence: `test/run.mjs` M9 block.
- CSP: `'unsafe-eval'` stays forbidden. Stock Cesium needs it twice (Knockout's `(0,eval)("this")`
  at load, and a worker bootstrap that `importScripts` a blob: URL), so the vendored bundle carries
  two one-token patches instead (`vendor/README.md`), pinned by a test, and the globe is built with
  `CesiumWidget`, which applies no Knockout bindings. What both policies did gain: `worker-src 'self'`
  (same-origin module workers under /vendor/cesium/Workers) and `'wasm-unsafe-eval'` (Cesium
  compiles its mesh decoders at load; the token permits WebAssembly compilation only, never string
  evaluation). Verified in the browser: Cesium 1.145 boots under the policy with zero console
  errors.
- Data hygiene: the extract script never copies contact tags (email, phone) from OSM; websites are
  kept only when they start with http(s); links open with `rel="noopener noreferrer"` under the
  site's `Referrer-Policy: no-referrer`.
- Found and fixed: the Pages build was missing `vendor/` entirely (Chart.js requests returned the SPA
  index page). `scripts/assemble.mjs` now copies it; a test pins it.

## Satellite imagery and the market listing (2026-09-20, later)

- The World view fades Esri World Imagery in below 4,000 km. Both CSPs gained exactly two hosts,
  `services.arcgisonline.com` and `server.arcgisonline.com`, in `img-src` (tiles) and `connect-src`
  (the service description); no script, no frame. Tiles are requested only once the layer is
  visible, so a look at the world sends nothing to Esri. Attribution is on the globe's credit line.
- `GET /universe` serves the US common-stock listing (symbol, name, venue) from Finnhub through the
  Worker's own key, cached in KV for the day, rate-limited at 30/min; it is public reference data
  and carries nothing about a subscriber. `GET /history` now returns five years.
- A String.replace with a string replacement once swallowed `$&` into the matched text and shipped
  a regex-escape helper that was wrong for names with a dot; a test now pins every escape helper
  and both insertion scripts use function replacements.

## The Map's pre-fill and the model's account (2026-09-20, evening)

- `POST /map/prefill`: live-code gated, `RL_TIGHT`-class limit (10/min), the symbol validated as
  `[A-Z.\-]{1,10}`, the model's answer parsed as strict JSON and tidied (no self-links, no nameless
  rows, weights clamped to 1–100, tickers only when they look like tickers), cached thirty days
  per symbol, and a failure never cached. The prompt forbids inventing companies, tickers or
  numbers; the panel labels every row "model" and the person's edits win. Evidence: four checks
  in `test/billing.mjs`.
- The Anthropic account behind `AI_API_KEY` has no credit (the API answers 400 "credit balance is
  too low"). Both model routes now surface that sentence in their note instead of an empty answer,
  and the council no longer caches a day of nothing. No key material is ever echoed.

## The model, without Anthropic credit (2026-09-20, night)

One helper, `aiText`, serves the six lenses, the Map's pre-fill and the news summary: Anthropic when
`AI_API_KEY` is set and the account has credit, otherwise Cloudflare's own Workers AI through the
`AI` binding (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`; a free daily allowance on this account,
no other account, no card). The same prompts, the same JSON parsing, the same "never invent"
instruction; each answer records which model produced it. Workers AI hands JSON back already
parsed, which the helper stringifies. Verified live: NVDA's map and six lenses through Workers AI
while the Anthropic account is out of credit. Evidence: three checks in `test/billing.mjs`.

## Cut-over complete (2026-09-20)

perceptfolio.com and www.perceptfolio.com serve from Cloudflare Pages: the gate, the HSTS/CSP/frame
headers and the SPA routes are live on the production domain (`node test/smoke.mjs
https://perceptfolio.com`: 21/21). GitHub Pages is retired, so no copy of the terminal is served
ungated anywhere. The operator key was rotated the same day; `.dev.vars` still needs the new value
for the gate suite's three operator checks.

## Earnings dates and the country filter (2026-09-21)

- `GET /earnings?code=` on the worker: one Finnhub call a day for everybody, reduced to symbol →
  next date before it is cached (KV `earn:<day>`, a day), behind the same door as `/fred`: the
  operator's sync key as a bearer, or a live invite code. Nothing user-specific is fetched or
  stored; the answer is the same for every caller.
- The FRED allowlist grows by three public series (DFF, DGS2, DGS10). The route's door is unchanged.
- The World tab's atlas is static data already on the site (Natural Earth borders and places);
  the country filter is client-side and sends nothing anywhere.
- Settings → Access code stores a code on the profile record (`p.code`) and beside the door's own
  copy in localStorage; sign-in still reads only `p.invite`, so a code saved here can never lock
  a profile out.
