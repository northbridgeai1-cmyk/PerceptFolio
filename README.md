# QuantFolio

*Owned by NorthBridge.*

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

## How it works

### Login
Email + password, checked and stored only in this browser (hashed with SHA-256) — **not a real server-verified account**. Anyone with access to this browser/profile can see the localStorage; treat it as a personalization lock, not real security, for anything sensitive. Your portfolio **data** is stored in this browser (localStorage) per device, not on a server — Settings → Export/Import to back up or move devices. Don't rely on it as your only record.

### Account menu
Click the avatar circle in the top-right corner (instead of a permanent name/email/logout row in the header) to open a small menu: set a **display name** (used in the "Good morning, ___" greeting and the avatar's initial instead of guessing from your email), see your **login email**, **Upload** a photo for your avatar (auto-cropped and shrunk to a small square before it's stored — this app has no server, so the photo lives as part of your data in this browser's localStorage, same as everything else — **Remove** clears it), or pick an **avatar color** for the ring/initial when there's no photo. **Switch Account** saves your current session and drops you back at the login screen to log into a different account (your personal login, your business login, or a client's own login) without a full page reload. **Log out** ends the session entirely. Click anywhere outside the menu to close it.

### Business accounts and Clients
When you create an account you pick **Personal** or **Business**. A Business account gets an extra **Clients** tab where you can create a separate, fully walled-off portfolio for each client — their own holdings, watchlist, checklist scores, everything, completely independent from your own money and from every other client.

**How it actually works, given there's no server:** every account (yours and every client's) lives only in this browser's `localStorage`. There is no cloud sync. Two real ways a client ends up seeing their own portfolio:
- **Same device:** if a client logs in with their own email/password on the exact same browser you used to set up their portfolio, they see it directly and live — it's the same stored record.
- **Different device (the realistic case):** click **Switch** next to their name to work on their portfolio as if you were them — a banner at the top shows you're in client mode, with a **Return to my account** button. When you're done, switch to their account's **Settings → Export** to download a snapshot, and send them that file. They log in to their own personal account (anywhere) and use **Settings → Import** to load it. This is a point-in-time snapshot, not a live feed — you'd re-export and re-send it whenever you want them to see an update.

Refreshing the page while you're switched into a client always snaps you back to your own account — the switch only exists in memory for that browser tab, on purpose, so you're never accidentally left "as" a client.

**Before you use this for real clients, not just yourself:** giving specific buy/sell input and managing what's effectively someone else's portfolio decisions, especially for pay, is generally what triggers investment-adviser registration requirements (the Investment Advisers Act of 1940 federally, or a state-level equivalent) in the US. This app doesn't know your situation and this isn't legal advice — if you intend to actually manage other people's money or give them specific recommendations, especially once you start charging, talk to an actual securities attorney first.

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
| DCF | Undervalued | Auto — simplified 5-yr FCF model (10% discount, 2.5% terminal). Rough. Adjustable calculator below it lets you try your own assumptions. |
| P/E | Under 30 | Auto |
| Forward P/E | Below trailing P/E | **Manual** (free tier lacks estimates) |
| PEG | ≤ 1.5 | Auto |

### Verdicts (defaults, changeable in Settings)
- **BUY candidate:** quality ≥ 9/12 AND price ≥ 4/6
- **WATCH:** quality ≥ 9 but price checks fail (great business, too expensive)
- **Consider SELLING:** a holding's quality score drops to ≤ 6. This is a business-deterioration signal only — it does not check price. A holding that gets expensive shows WATCH, not sell.
- Checks with no data never count as passes.

### Compare Two Stocks (Analyzer)
Below the single-stock Analyzer, enter two tickers and hit Compare for a side-by-side table: verdict, Quality/Price/Momentum scores, Wall Street score (if available), Sharpe ratio, DCF estimate, and dividend yield. The higher number on each row is highlighted green — that's just showing which number is bigger, not a recommendation to buy that one; a higher score doesn't automatically mean the better buy once price, risk, and your own goals are factored in. Reuses the same 12-hour freshness cache as everywhere else, so comparing two stocks you already analyzed recently is instant. "Full analysis" buttons jump to the complete single-stock breakdown for either ticker.

### Try your own DCF assumptions (Analyzer)
Right below the DCF Value check, if it computed at all, three fields let you override the growth rate, discount rate, and terminal growth rate yourself and instantly see the fair-value estimate recalculate — same simplified 5-year free-cash-flow model as the checklist row, just with your numbers instead of the fixed 10%/2.5% defaults. This exists so you can see how sensitive "undervalued" really is to the assumptions behind it, rather than trusting one fixed answer.

### Dividend Income (Analyzer, dividend-paying stocks only)
A new section shows trailing dividend yield, annual $/share, and payout ratio — but only for tickers that actually pay a dividend. Everything else shows a plain "doesn't pay a dividend" message instead of a number. This is deliberately **not** a Dividend Discount Model: a discount-rate-based DDM formula divides by (discount rate − growth rate), which blows up or goes negative the moment assumed growth approaches the discount rate — a real problem for a screener whose universe leans heavily toward non-dividend-paying growth stocks (quantum computing, cybersecurity, EV, biotech, etc.). Rather than force every ticker through a formula that breaks for most of them, this just shows the real numbers Finnhub already returns, informational only, with a rule-of-thumb note about payout ratio and never a factor in the BUY verdict.

### Style Tilt (Dashboard)
A bar on the Dashboard shows how your held stocks' *currently passing* checklist rows split across three academic style categories — Profitability, Value, and Momentum — weighted by position size. **This is explicitly not a "factor exposure simulation."** A real one would regress each holding's actual historical returns against real Fama-French/Carhart factor return series to get true factor loadings — this app has no verified access to that data (see the Academic Context section below). What Style Tilt actually is: a dollar-weighted rollup of which of your own checklist's factor-tagged rows are passing right now, using the same loose tagging (`FACTOR_CHECK_MAP`) that powers the Academic Context panel. It's a "how diversified across investing styles am I" read, not a projection of future returns, not a regression, and it's stated as such directly in the card. Only counts Stock-type holdings that have been analyzed at least once; ETFs, mutual funds, cash, and un-analyzed holdings are excluded.

### Momentum (4th score)
Beyond quality and value, each stock now also gets a **Momentum score out of 4**: 6-month price return, 12-month price return, proximity to its 52-week high, and whether it's outperforming the S&P 500 over the trailing year. This is a real, separate factor from quality/value — a great cheap business and a business the market has actually started re-rating are different signals.

By default momentum is informational only and does **not** change your BUY verdict — a stock can still be a BUY candidate with weak momentum, same as before. If you want it to matter, set "Min momentum checks to be a BUY candidate" above 0 in Settings.

### Risk-Adjusted Outlook (4th section in the Analyzer)
Below Quality/Price/Momentum, each analysis now also shows a **Sharpe-ratio-based rating**: is the stock's expected return worth its volatility, not just is the business good and cheap?
- **Expected return** — CAPM: 4.5% risk-free rate + beta × (8% expected market return − 4.5%). Same fixed assumptions as the Monte Carlo tool's defaults (tune the real ones there if you want a custom rate).
- **Volatility** — from 6 months of actual daily price history when available, else a 20% default.
- **Sharpe ratio** = (expected return − risk-free rate) ÷ volatility. Rating bands: ≥1.0 "Strong," 0.5–1.0 "Good," 0–0.5 "Fair," below 0 "Poor" (expected return doesn't clear the risk-free rate given how much the stock swings).
- A quick 2,000-path simulation (same GBM math as Monte Carlo, just smaller — this runs inline per stock, not the dedicated 10,000-path tool) produces a 1-year % return range for that single stock, shown as 5th/median/95th case numbers plus a box-and-whisker chart.

This is a genuine, separate rating from Quality/Price/Momentum — a stock can pass the quality checklist and still get a "Poor" risk-adjusted rating if its volatility is high relative to its expected return, and vice versa.

### Box & whisker view (Monte Carlo)
The "Distribution of possible 1-year returns" card in the Risk tab's Monte Carlo section now has a toggle: **Histogram** (the original bar chart of every simulated outcome) or **Box & Whisker** (a single compact chart — whiskers at the 5th/95th percentile, box spanning the 25th–75th percentile, white line at the median). Same underlying simulation data, two views. Drawn with plain Canvas (no extra chart library), so it has no added dependency or CDN.

### Wall Street Signals (5th section in the Analyzer)
What else hedge funds and sell-side desks look at beyond a company's own fundamentals — the crowd's opinion and the crowd's money, not just the business itself:
- **Analyst Consensus** — the latest buy/hold/sell breakdown from Wall Street analysts covering the stock (Finnhub's recommendation-trends data). Passes if 60%+ are buy-rated.
- **Price Target Upside** — analysts' mean 12-month price target vs. the current price. Passes at 10%+ implied upside.
- **Volume Trend** — the last 20 trading days' average volume vs. the prior 20, computed from the same price history already fetched for the risk section (no extra API call). Rising volume alongside a rising price can mean institutional accumulation; rising volume with a falling price can mean distribution — the checklist only flags the magnitude, you still have to look at direction yourself.

This is informational only — like Momentum, it never changes the BUY verdict. Analyst opinion in particular is a lagging, herd-following signal (by the time 20 analysts agree, the easy money is often already made) — treat it as one more data point, not a reason on its own.

**What I deliberately left out, and why:** short interest (Finnhub does offer this for free, but I didn't have a way to verify the exact endpoint/date-range parameters against a live key in this session, and I didn't want to ship a guessed integration that might silently do nothing — tell me if you want it and we can wire it up and test it together) and institutional/13F ownership changes (this is gated behind Finnhub's paid tier). Options-market signals (put/call ratios, implied volatility) aren't on Finnhub's free tier at all.

### Favorites
A star icon (☆/★) on every Portfolio row, Watchlist row, and the Analyzer result. Starring a symbol pins it to a new "★ Favorites" card at the top of the Dashboard, showing price, day change (for holdings), and its current verdict at a glance, with one-click Analyze or un-star.

This is deliberately separate from the Watchlist — the Watchlist is your full "things I'm considering" list, which can grow to dozens of tickers, while Favorites is meant to stay small: the handful you actually want to see the moment you open the app. A symbol can be a holding, on the watchlist, both, or neither, and still be favorited.

### Shares calculator (Quick calculator)
Below the compounding calculator: enter a stock's price per share and how much you're willing to spend, get back fractional shares, whole shares, and leftover cash if your broker doesn't do fractional shares.

### Check any stock's risk (Risk tab)
A standalone card above the Quick Calculator — type any ticker and hit Calculate to see its beta, historical volatility, CAPM expected return, Sharpe-ratio rating, and 1-year % range with a box-and-whisker chart. It does **not** need to be in your Portfolio or Watchlist, and it's a lighter call than a full Analyzer run (just quote + fundamentals + price history — no earnings, insiders, or estimates), so it's a fast way to size up a stock you're only considering before you add it anywhere.

### Sortable columns (Portfolio & Watchlist)
Click any column header to sort by it (Gain/Loss, Value, Quality, Verdict, whatever you want ranked); click the same header again to reverse. An arrow (▲/▼) on the header shows the active sort. Rows with no data for that column always sink to the bottom regardless of direction, so a stock you haven't refreshed yet won't land confusingly at the top. Sorting works together with the existing filters — filter first, then sort what's left.

### Global ticker search
A small "Jump to ticker…" box in the header, visible from every tab. Type any ticker and hit Enter (or Go) and it runs a full Analyzer scan on it immediately — whether or not that ticker is in your Portfolio, Watchlist, or Favorites. Fastest way to check something you just heard about without leaving whatever tab you're on.

### Discover by sector/theme (Screener)
Below the Dow 30 / Mega-cap Tech presets: a search box where you can type a sector or theme — "tech," "water," "healthcare," "energy," "financials," "consumer," "industrials," "real estate," "materials," "communication" — and get back a curated list of well-known companies in that space, including ones you may not have specifically heard of. Loading a match fills the ticker box below; you still hit Run screen to actually score them.

**Be clear-eyed about what this is and isn't:** Finnhub's free tier has no live "scan the whole market by sector" endpoint — that's a paid/institutional feature on most data providers, this one included. So this is **not** a real-time scan of every company in a sector; it's a curated snapshot of 12–20 well-known names per sector that I put together, same honest caveat that already applied to the Dow 30 and Mega-cap Tech presets ("a fixed list I wrote in, not a live index feed"). It's a genuinely useful starting point for discovery, not an exhaustive one — sector/industry membership can also drift over time (a company's classification changes, new companies IPO, etc.).

### Portfolio Risk
Single-stock scores can't see portfolio-level risk. The **Risk** tab looks at your stock holdings together: sector concentration (are you secretly 60% tech?), portfolio-weighted beta (how volatile you are relative to the market), and pairwise correlation between your holdings (five stocks that all move together is one bet, not five). It's calculated on demand via a button, not automatically, since it costs extra API calls per stock (~3 more calls each) on top of a normal refresh.

Honest limitation: correlation needs 6 months of daily price history per stock, and Finnhub restricts historical candle data on some free-tier accounts. If that happens, the Risk tab tells you plainly and still shows sector concentration and beta, which don't need candle data.

### Monte Carlo projection
In the **Risk** tab, below the sector/beta/correlation sections. Simulates thousands of random possible futures for your whole portfolio (stocks, ETFs, mutual funds, cash) and shows the range of where you could end up — 5th percentile (bad case), median, 95th percentile (good case) — as a fan chart over your chosen time horizon.

How it estimates return and risk per holding, honestly:
- **Expected return** comes from CAPM (risk-free rate + beta × equity risk premium), not from extrapolating a short recent price trend, which would be statistically unreliable. You set the risk-free rate and expected market return yourself — these are assumptions, not facts I'm asserting.
- **Volatility** comes from actual historical daily price swings (6 months) when Finnhub's candle data is available for that ticker; otherwise it falls back to a reasonable default (20% for stocks, 15% for ETFs, 12% for mutual funds, which have no live data at all).
- **Correlation between holdings** uses the actual measured average from the Risk tab's correlation calculation if you've run "Calculate risk" first — otherwise it assumes 0.5, a reasonable but generic default for a mixed equity portfolio. Run Calculate risk first for a more accurate simulation.
- The simulation itself is geometric Brownian motion — the standard finance-textbook model, and a simplification. Real markets have fatter tails than this model assumes (crashes are more frequent and more severe than a normal distribution predicts), and correlations that hold in normal times often spike during a crisis (the "worst case" here is likely optimistic during an actual market crash). Treat the output as a range of plausible outcomes under stated assumptions, not a prediction.

**Simulate specific stocks instead of your whole portfolio:** type tickers into "What to simulate" (comma-separated). This switches into a hypothetical mode — an "Amount to simulate" field appears, split evenly across just those tickers, ignoring your real position sizes and cash. Leave it blank to simulate your actual portfolio as-is.

**1-year return range:** a separate, contribution-free simulation shown in percent — "how would this perform in a year" independent of how much money is involved. Shown as a bar chart histogram of the full distribution of simulated outcomes, plus a worst/median/best case summary in %. This is deliberately decoupled from the multi-year dollar projection below it, which does account for contributions.

**Quick calculator:** above the Monte Carlo section — no simulation, just simple compounding. Enter an amount and an annual return %, see what it grows to in a year. Useful for sanity-checking a percentage from the simulation against a real dollar amount.

### Growth chart (Dashboard)
A "money made over time" chart on the Dashboard, plotting your cumulative gain/loss (and total value, dashed) day by day. Honest limitation: QuantFolio has no record of your portfolio before you started using it — this starts tracking from today and fills in as you use the app (each Refresh Data, or any manual price/cash edit, logs a snapshot for that day). It is not a substitute for your brokerage's actual historical performance report.

### Filters
Portfolio and Watchlist both have a filter row: search by ticker, plus Type/Broker/Signal filters on Portfolio and a Verdict filter on Watchlist. Filters are live (no button needed) and reset with the Clear button; they don't persist between sessions.

### My Call — your own tag, separate from the computed verdict
Every Portfolio row, Watchlist row, Screener result, and the Analyzer header now has a "My Call" dropdown: **—, (Buy), (Hold), (Sell), (Watching)**. This is purely your own manual label, stored per ticker — it does not feed the checklist, doesn't change the auto-computed verdict pill next to it, and is never used for anything except showing you what you decided. The two are deliberately independent: the pill is "what the checklist says," My Call is "what you say."

### Academic Context — the Educational Bridge (Analyzer)
A toggle in every stock analysis ("Academic Context — what does research say about this style?") opens a second, visually distinct panel below the Quality/Price/Momentum checklist. It never touches or blends with the checklist score. It shows what long-run academic research (Fama-French/Carhart factor research: Value, Profitability/Quality, Momentum) says about that *style category* market-wide, over decades — not a projection or score for this stock, and explicitly labeled as such throughout, including inline in the panel itself.

Only some checklist rows get tagged to a factor, deliberately: Gross Margin, Operating Margin, Free Cash Flow, and ROE loosely relate to the Profitability factor; P/E vs History, DCF Value, and P/E loosely relate to the Value factor; the four momentum checks relate to the Momentum factor. Rows like Insider Buying, Revenue Guidance, Growth Runway, Moat, Comp Analysis, Forward P/E, PEG, Current Ratio, and Cash vs Debt get **no** academic tag — there isn't a clean academic-factor match, so none is forced.

**Honest limitation you should know about — this one matters more than most:** the historical return/volatility ranges shown (e.g., "Value: roughly +3% to +5%/yr, 10-12% volatility") are broadly-published, literature-consistent figures, not numbers this app independently pulled and recomputed from Kenneth French's raw data library. Getting real numbers required either a working sandbox to download and compute directly from the primary source, or a single reliable table with all the stats — neither was available when this was built (the sandbox was down with a disk-space error at the time, and web search only surfaced fragments across different sample windows, not one clean authoritative table). The panel says this plainly, in its own disclaimer text, every time it's shown — it's marked "provisional," not "verified." If you want this tightened to fully independently-verified figures, that's a straightforward follow-up: pull the actual monthly series from Kenneth French's Data Library and recompute the exact stats, then swap them into `FACTOR_REFERENCE` in the code.

### Privacy mode — hide your dollar amounts
A small eye icon sits right next to "Portfolio value" on the Dashboard — a circular badge with a line-art eye icon (not an emoji). Click it and every personal dollar figure turns into asterisks (e.g. `$**,***.**`) instead of the real number: portfolio value, cash, gain/loss, the Avg Cost/Value/Gain-Loss/Shares columns on the Portfolio table, the sector-exposure dollar column on Risk, the allocation pie chart tooltips and growth-chart axis/tooltip on the Dashboard, and the Monte Carlo tool's dollar outputs (starting value, worst/median/best case, monthly contribution). The icon switches to an eye-with-a-slash-through-it badge; click again to reveal. This is meant for "someone's looking at my screen" moments, not encryption — the real numbers are still sitting in this browser's localStorage underneath, just not painted on screen. Deliberately left unmasked: stock quote prices, percentages/allocation weights, and anything in the checklist/Analyzer, since those are market data or proportions, not your absolute dollar figures, and the app needs to stay usable while privacy mode is on. The setting is saved per profile, so it stays on (or off) the next time you open the app.

### Screener (discovery)
QuantFolio doesn't browse the market on its own — it only scores tickers you give it. The **Screener** tab lets you batch that, three ways: paste your own list of tickers, use the Dow 30 / mega-cap tech presets or a sector/theme search, or click **"Find recommendations"** to load a built-in list of ~350 well-known, liquid US-listed tickers (13 sector presets plus ~150 more spanning quantum computing, cybersecurity, cloud/SaaS, fintech, EV, clean energy, emerging biotech, more semiconductors, travel, insurance, REITs, materials, transports, and popular international ADRs) into the scan box, automatically skipping anything already in your Portfolio or Watchlist. Whichever way you fill the box, click **Run screen** and every ticker gets scored against your same 22-point checklist, with results showing the same Analyze / + Watchlist / My Call controls.

**Honest limitations:**
- The recommendation list is a curated snapshot, not a live scan of the entire market — Finnhub's free tier has no such endpoint. A stock not on this list simply won't be found; paste it in yourself if you want it checked.
- At free-tier pace (~4 seconds/ticker) a full scan of ~350 tickers takes up to ~25 minutes. It runs in the background — you can leave the tab — and results appear live as they're found. Scores less than 12 hours old are reused instantly instead of re-fetched, so a second scan the same day is much faster.
- Stop anytime and keep whatever's found so far.

It runs slowly on purpose — about 4 seconds per ticker — to stay under Finnhub's free-tier limit of 60 requests/minute (each stock costs ~5 calls: quote, fundamentals, earnings, insiders, EPS estimate). Screening 30 tickers takes ~2 minutes; 100 tickers takes ~7 minutes. You can Stop it anytime and keep whatever's scored so far. Presets are a fixed list I wrote in, not a live index feed — real index membership changes periodically, so verify against a current source if precision matters.

### Alerts
- In-app alerts + optional browser push notifications (enable in Alerts tab).
- Custom price alerts (rises above / falls below).
- Signals fire on **Refresh Data** — the site can't check while closed (it's a static site). Open it daily or keep a tab pinned.
- Every alert has a **Review** button that jumps straight to the Analyzer and re-runs the full checklist for that ticker — you never have to retype the symbol to see why it fired.

### Add to Portfolio (from the Analyzer)
Once you've analyzed a stock you don't already hold, a **+ Add to Portfolio** button appears at the end of its results, next to + Add to Watchlist. It jumps to the Portfolio tab and pre-fills the ticker, so you just fill in shares and avg cost and click Add — no retyping the symbol.

### Sell shares (Portfolio)
Every holding row has a **Sell** button. Click it and an inline row opens below that holding with the number of shares to sell (defaults to your full position — edit it down for a partial sale), the sell price per share, and a checkbox to add the proceeds straight to your Cash balance. Confirm Sell either reduces that holding's share count (avg cost basis on the remaining shares is unchanged) or removes it entirely if you sold everything. A toast confirms the realized gain or loss on the shares you just sold. This is a manual record, same as the rest of the Portfolio tab — it doesn't place a real trade or touch a brokerage; you still sell through your actual broker and just log it here afterward. Realized sales aren't kept in a separate history log — only reflected in your current holdings, cash, and the growth chart from that point forward.

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
- Email/password login is local-only, not a real account system — no backend exists to verify it. Treat it as a personalization lock, not real security.
- No live brokerage sync — you enter holdings manually (Plaid-style sync costs money).
- Mutual funds are price-tracked manually (see above) and are not quality-scored — the 12-point checklist is for individual companies.
- Forward P/E and revenue guidance may need manual entry depending on your Finnhub plan.
- ETF holdings are tracked for value/allocation but not quality-scored (the checklist is for companies).
- The Risk-Adjusted Outlook and Wall Street Signals sections add three more Finnhub calls (candles, recommendation trends, price target) to every single-stock analysis — negligible for one ticker at a time, but worth knowing if you're ever running many analyses back-to-back.
- The Risk-Adjusted Outlook uses fixed 4.5%/8% rate assumptions, not the ones you may have customized in the Monte Carlo tool — they're independent for now. Analyses saved before these features existed won't show them until you re-analyze that ticker.
- Analyst Consensus and Price Target Upside depend on Finnhub having coverage for that ticker on your plan — small/micro-cap or thinly-covered stocks may show "no data," same honest-degradation pattern as Forward P/E.
- If you later charge others for recommendations, research investment-adviser registration rules first.
- **"Find recommendations" scans a fixed ~350-ticker built-in list, not the full market.** A stock outside that list won't be found that way — paste it into the Screener's ticker box directly instead.
- **The Academic Context panel's factor statistics are provisional, not independently verified** against Kenneth French's raw data — see the "Academic Context" section above for exactly why and how to tighten it.
- **Dividend field names on Finnhub's free tier weren't independently re-verified against live API output when this was built** (same tooling outage as above) — the code tries several plausible field-name variants, but if your plan reports dividend data under a different key than expected, a dividend-paying stock could show "doesn't pay a dividend" incorrectly. Cross-check against your broker if a known dividend payer shows no data here.
- **Style Tilt is a checklist-tag rollup, not a real factor-exposure model** — it does not regress your holdings against real historical Fama-French/Carhart factor returns, because this app has no verified access to that data. Treat it as "which investing styles do my current holdings' passing checks skew toward," not a prediction of how your portfolio will behave in a given market regime.
- **The DCF calculator and DCF checklist row are the same simplified 5-year model** (not a full multi-stage DCF with explicit terminal-year normalization) — useful for sensitivity testing, not a substitute for a real equity-research valuation.
- **Avatar photos are stored as small compressed images inside localStorage**, same place as your portfolio data — there's no image hosting or CDN. Each is shrunk to 128×128 before saving so it stays lightweight, but it still counts against your browser's per-site localStorage limit (typically 5-10MB), same pool as everything else in the app.
- **Business/Client accounts have no live sync, by design** — there's no server, so a client only sees your work either on the exact same browser, or via an exported snapshot you send them and they import. See "Business accounts and Clients" above.
