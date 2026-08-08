# QuantFolio

A personal portfolio quant. Tracks your holdings, scores stocks against a 12-point business-quality checklist and a 6-point valuation checklist, and alerts you when a watchlist stock becomes a buy candidate or a holding turns into a sell candidate.

**Not financial advice.** Signals are rule-based scores of your own checklist. Verify all data before trading.

## Setup (10 minutes)

### 1. Get a free market-data key
1. Go to **https://finnhub.io/register** and create a free account.
2. Copy your API key from the dashboard.
3. In QuantFolio, open **Settings** and paste the key. It will test itself.

Free tier = 60 requests/minute. Plenty for personal use; if you refresh a huge watchlist you may briefly hit the limit — wait a minute.

### 2. Put it on GitHub Pages
1. Create a new repo on GitHub (e.g. `quantfolio`).
2. Upload `index.html` and this `README.md` (drag-and-drop on github.com works).
3. Repo → **Settings → Pages** → Source: `main` branch, root folder → Save.
4. Your site is live at `https://YOURNAME.github.io/quantfolio/` within a couple of minutes.

### 3. (Optional) Turn on Sign in with Google
Real, Google-verified login — not just a local passcode. Requires a free Google Cloud OAuth Client ID tied to your exact live URL.

1. Go to **console.cloud.google.com** → create a project (any name, e.g. "QuantFolio").
2. Left menu → **APIs & Services → OAuth consent screen** → User Type: External → fill app name/email → Save through the wizard (you don't need to publish it; "Testing" mode is fine for personal use, but add your own Google account under **Test users** if it stays in Testing).
3. Left menu → **APIs & Services → Credentials** → **Create Credentials → OAuth client ID** → Application type: **Web application**.
4. Under **Authorized JavaScript origins**, add your exact Pages URL with no trailing slash, e.g. `https://YOURNAME.github.io` (just the origin, not `/quantfolio/`).
5. Create → copy the **Client ID** (ends in `.apps.googleusercontent.com`).
6. On your live QuantFolio site's login screen, click **⚙ Set up Sign in with Google**, paste the Client ID, Save. The Google button appears immediately and works from then on, on that browser. Anyone else using the site pastes their own Client ID once too (it's stored locally per browser, same as everything else).

## How it works

### Login
Email + password, checked and stored only in this browser (hashed with SHA-256) — **not a real server-verified account**. Anyone with access to this browser/profile can see the localStorage; treat it as a personalization lock, not real security, for anything sensitive. **Sign in with Google is the real one** — Google verifies the identity, and QuantFolio just reads the verified email to open your profile. Either way, your portfolio **data** is stored in this browser (localStorage) per device, not on a server — Settings → Export/Import to back up or move devices. Don't rely on it as your only record.

### Quality Check (12 points — "is the business good?")
| Check | Target | Source |
|---|---|---|
| Revenue growth YoY | ≥ 10% | Auto (Finnhub) |
| Gross margin | ≥ 40% | Auto |
| Operating margin | Expanding | Auto (annual trend when available) |
| Free cash flow | Positive | Auto (via P/FCF) |
| Cash vs debt | Cash > debt | Auto proxy (debt/equity) — verify balance sheet |
| Current ratio | ≥ 1.5 | Auto |
| ROE | ≥ 15% | Auto |
| EPS beats | 4/4 last quarters | Auto (earnings history) |
| Revenue guidance raised | Yes | **Manual** — check the earnings call |
| Insider buying | Active | Auto (6-month insider transactions) |
| Growth runway | Yes | **Manual** — your judgment |
| Competitive moat | Durable | **Manual** — your judgment |

### Price Check (6 points — "discount or expensive?")
| Check | Target | Source |
|---|---|---|
| P/E vs its own history | Below average | Auto when history available |
| Comp analysis | Below peers | **Manual** |
| DCF | Undervalued | Auto — simplified 5-yr FCF model (10% discount, 2.5% terminal). Rough. |
| P/E | Under 30 | Auto |
| Forward P/E | Below trailing P/E | **Manual** (free tier lacks estimates) |
| PEG | ≤ 1.5 | Auto |

### Verdicts (defaults, changeable in Settings)
- **BUY candidate:** quality ≥ 9/12 AND price ≥ 4/6
- **WATCH:** quality ≥ 9 but price checks fail (great business, too expensive)
- **Consider SELLING:** a holding's quality score drops to ≤ 6
- Checks with no data never count as passes.

### Alerts
- In-app alerts + optional browser push notifications (enable in Alerts tab).
- Custom price alerts (rises above / falls below).
- Signals fire on **Refresh Data** — the site can't check while closed (it's a static site). Open it daily or keep a tab pinned.

## Mutual funds (FSKAX, FXAIX, FZILX, etc.)
Finnhub does not provide live quotes for mutual funds — they don't trade on an exchange, they price once a day at NAV after market close, and Finnhub's free tier only covers exchange-listed stocks/ETFs. That's why those tickers returned nothing.

Fix: add them in Portfolio with type **Mutual Fund**. The app skips the (impossible) auto-lookup for that type and gives you an editable Price cell — type in the NAV yourself (Fidelity/your broker shows it daily) and it's saved with a timestamp. The same editable Price cell also works as a manual override for any stock/ETF if an auto-lookup ever fails.

## Forward P/E
Now fetched automatically from Finnhub's EPS-estimate data (next fiscal year's average analyst EPS estimate vs. current price) wherever your Finnhub plan includes it. If your plan doesn't include forward estimates (this is gated on some free-tier accounts), the analyzer tells you so and falls back to the manual field — enter it from your broker and it overrides the auto value.

## How to push an update to your live site
Whenever you get a new `index.html` from me (or edit it yourself), your repo needs the new file — GitHub Pages always serves whatever's currently in the repo.

1. Go to your repo on github.com (e.g. `github.com/YOURNAME/quantfolio`).
2. Click into `index.html` in the file list.
3. Click the **pencil icon** (top right of the file view) to edit.
4. Select all the existing content (Ctrl/Cmd+A) and delete it.
5. Paste in the full new file content.
6. Scroll down → **Commit changes** → Commit directly to `main`.
7. GitHub Pages auto-redeploys — refresh your live URL in ~30–60 seconds (hard refresh with Ctrl/Cmd+Shift+R if you still see the old version, browsers cache aggressively).

Alternative if you don't want to copy/paste in the browser: delete the old `index.html` from the repo (trash icon) and drag-and-drop the new one in from your computer — same commit step at the end.

## Honest limitations
- Email/password login is local-only, not a real account system — no backend exists to verify it. Use Google Sign-In if you want a real verified login.
- No live brokerage sync — you enter holdings manually (Plaid-style sync costs money).
- Mutual funds are price-tracked manually (see above) and are not quality-scored — the 12-point checklist is for individual companies.
- Forward P/E and revenue guidance may need manual entry depending on your Finnhub plan.
- ETF holdings are tracked for value/allocation but not quality-scored (the checklist is for companies).
- If you later charge others for recommendations, research investment-adviser registration rules first.
