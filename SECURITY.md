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
