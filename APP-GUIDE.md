# PerceptFolio — how to actually use it

Plain steps. No theory. Each section is a recipe: do this, then this, then this.

Read section 0 once. After that you'll mostly live in sections 1, 2 and 3.

---

## 0. Set it up (once, 10 minutes)

**Get the data working.**

1. Go to **finnhub.io**, make a free account, copy your API key.
2. In PerceptFolio, click your **circle avatar** (top right) → **Settings**.
3. Paste the key into **API key**. Save.

Without this key nothing scores. Every other feature will just tell you to come back here.

**Tell it what you own.**

4. **Portfolio** tab → **Add Holding**. Ticker, type, shares (or switch the dropdown to *Enter dollars*), price you paid, broker. Hit **Add**.
5. Repeat for everything you own.
6. **Cash Available to Invest** → type what's sitting uninvested → **Update Cash**.

**Set your rules** (avatar → Settings). These are the lines the app holds you to:

| Setting | Default | What it means |
|---|---|---|
| Quality to buy | 9 | Won't call BUY unless quality is 9/12 or better |
| Value to buy | 4 | And the price is 4/6 or better |
| Momentum to buy | 0 | Off. Raise it if you want price strength required too |
| Quality to sell | 6 | Flags SELL when quality falls to 6/12 or below |
| Max position | 10% | No single stock should be more than this |
| Cash target | 3% | Keep at least this much in cash |
| Exclusions | — | Tickers you never want to own, comma separated |

Change these to whatever you actually believe. The whole app runs off them.

7. Last step: **Command** tab → **Run review**. This pulls prices and scores everything. Takes a few seconds per stock.

---

## 1. Every morning (2 minutes)

1. Open the app. It lands on **Dashboard** — glance at the value and today's move.
2. Click **Command**.
3. Read the **grey strip at the top**. That's the app's track record — how often its own calls have been right. If it says it hasn't measured anything yet, that's honest, not broken.
4. Click **Run review**.
5. Read the list.

Each row is one thing that needs you. Colour tells you what kind:

- 🔴 **SELL** — something you own broke a rule
- 🟢 **BUY** — something on your watchlist crossed your bar
- 🟡 **DRIFT** — a company you own is getting worse, slowly
- 🟡 **RISK** — you've broken your own policy
- 🟡 **REVIEW** — a thesis is due
- 🔵 **CASH** — too much money sitting idle
- ⚪ **DATA** — prices are stale, refresh before trusting anything

**Click any row** to see the reasoning and the numbers behind it.

If it says *"Nothing needs you"* — close the app. That's most days. That's correct.

---

## 2. Should I buy this stock?

This is the main recipe. Five steps.

### Step 1 — Score the company

**Analyzer** tab → type the ticker → **Run Quality + Price Check**.

You get three numbers:

- **Quality /12** — is this a good business? (margins, cash flow, debt, returns)
- **Value /6** — is the price sensible? (P/E vs its own history, DCF, etc.)
- **Momentum /4** — is the price already moving? (6- and 12-month returns, near highs)

And a **Verdict** pill:

| Verdict | Means |
|---|---|
| **BUY candidate** | Cleared both your bars |
| **Great biz, pricey — WATCH** | Good company, bad price. Wait |
| **Good price, weak momentum — WATCH** | Cheap but falling. Wait |
| **Doesn't qualify yet** | Doesn't clear your bar |
| **HOLD** | You own it, nothing's wrong |
| **Consider SELLING** | You own it, quality has dropped |

**Scroll down** and read the individual checks — each one shows what passed and what failed and why. Don't just read the score. The score is a summary of those rows.

> If the verdict isn't BUY, you can stop here. That's the point of having a bar.

### Step 2 — Check what kind of ride it is

**Risk** tab → **Check any stock's risk** → type the ticker → **Calculate**.

This gives you the volatility and a one-year range. A stock can pass every quality check and still swing 40% a year. This is where you find that out before you're in it.

### Step 3 — Decide how much (this is the important one)

**Portfolio** tab → scroll to **Before You Trade**.

1. Type the ticker
2. Leave it on **Buy**
3. Click **Largest size your policy allows** — it fills in the biggest amount that keeps you inside your own 10% cap
4. Type a smaller number if you want less

Now read the table:

- **Position** — how big this becomes as a % of everything you own
- **Cash** — what's left afterwards
- **Portfolio beta** — how much the whole portfolio moves with the market. Higher = wilder
- **Largest single position / Top 3** — how concentrated you're becoming
- **Risk weight** — position size × how jumpy the stock is. A 6% stake in a very jumpy stock behaves like a 14% stake in a calm one. This is the number people miss.

And the bullet list underneath:

- ✅ green — clears every rule you set
- 🔴 red — breaks one. It tells you which and by how much

> **Being right about the company and wrong about the size is how people lose money.** Don't skip this step.

### Step 4 — Buy it

Do the actual trade **in your broker**. PerceptFolio has no broker connection and never will — it's a static web page.

Then come back: **Portfolio** → **Add Holding** → enter what you actually bought. Tick *"Take this out of my cash"* if you paid from cash.

### Step 5 — Write down why (do it now, not later)

**Portfolio** tab → **Investment Thesis** card.

1. Pick the ticker from the dropdown
2. **Why do we own it?** — one or two sentences
3. **What must stay true?** — the thing that would change your mind
4. **What would make us sell?** — free text
5. **Sell if quality drops below (of 12)** — ⭐ *this is the one the app can act on.* Type a number, say 8. Now if quality drops under 8, Command will flag this specific stock — using **your** rule, not the global one
6. **Next review** — pick a date a few months out
7. **Save thesis**

Six months from now the price will have moved and you'll invent a reason for whatever it did. A thesis written *before* is the only thing that stops that.

---

## 3. Should I sell this?

**Command** tab. If it's not on the list, no rule fired. That's your answer.

If it *is* on the list, click the row and read which of these happened:

**"Your own thesis condition broke"** — the number you set in your thesis was crossed. It quotes back what you wrote when you bought it. This ranks above everything else, because you set it deliberately for this company.

**"Quality fell to X, at your sell bar"** — the global rule in Settings fired.

**"Score sliding"** (a DRIFT row) — ⚠️ **this is the early warning.** Nothing has broken yet. The company has just been getting worse for months. A sell rule fires when a company is *already* bad; this fires while it's *becoming* bad. Read it and ask whether the reason you bought it still holds.

To see all of them at once: **Portfolio** tab → **Quality Drift** table. Worst deterioration is at the top.

**To sell:** do it in your broker, then record it in PerceptFolio so the ledger stays honest.

---

## 4. Finding stocks you don't already know about

**Screener** tab. Four ways to fill the box:

- **Dow 30** / **Mega-cap tech** — preset lists
- **Search by sector** — type "water", "healthcare", "energy" → loads a curated list
- **This week's picks (20)** — a rotating batch from the built-in universe, skipping anything you already own
- **Paste your own list** — comma separated

Then hit **Run screen**. It scores a few seconds per stock (free-tier rate limit), so leave the tab and come back.

Results sort best-first. Use the filter dropdowns to show only **System: BUY**. Anything interesting → send it to the Analyzer (step 2 above) for the full breakdown.

> It does **not** scan the whole market. Nobody's free tier does. It scores the list you give it.

---

## 5. Is the whole market expensive right now?

**Market** tab.

**The Move, In Context** — is today's move normal or unusual?

- **Today** — live, right now, from the SPY quote
- **Yesterday** — the previous close
- **Tomorrow** — two guesses side by side:
  - **Implied** — what options traders expect (from VIX)
  - **Realized** — what actually happened the last 20 days

  When they agree, the number is solid. When they disagree, the app says which way and by how much. *That gap is itself the information.*

**Market Weather** — the long-run valuation picture. CAPE, Buffett indicator, margin debt.

⚠️ **These do not time the market.** The Buffett indicator has said "expensive" since about 2013 and CAPE has been over 30 since 2017, through years of big gains. Use them to decide *how much* to put in, never *when* to get out.

Some of these have no free feed, so you type them in monthly. The links to look them up are right there next to each box.

---

## 6. How risky is my whole portfolio?

**Risk** tab → **Calculate risk**.

- **Sector concentration** — are you accidentally all-in on one industry?
- **Correlation** — owning 5 stocks that all move together isn't 5 bets, it's 1
- **Portfolio beta** — how hard you get hit when the market drops
- **Beta drift** — is this still the stock you bought?

**Then the projection:**

**Risk** tab → **Monte Carlo projection**

1. Leave the ticker box **blank** to simulate your real portfolio (or type tickers to test a hypothetical)
2. Set years and monthly contribution
3. **Run simulation**

Read the **box & whisker** chart — that's your range. Middle line is the median, box is where a typical year lands, whiskers are the good and bad ends.

**Then, the part everyone skips:**

Scroll to **The hole on the way there** → **Model the drawdown**.

The projection above tells you where you might *end up*. This tells you the worst point you pass through — which is what actually decides whether you're still holding when the recovery comes.

It gives you three numbers: the typical worst drop, the one-in-ten, and the one-in-a-hundred, in both percent and dollars. It also shows the same figure calculated the naive way (bell curve) so you can see how much that method understates it.

> Ask yourself honestly: **if my account showed that one-in-ten number, would I still be holding?** If the answer is no, you're too big. Go back to section 2, step 3.

---

## 7. Am I any good at this?

Two screens. Both start empty and fill in over months. Nothing here can be faked backwards.

**Market** tab → **Your Call Scorecard** — is the *checklist* working?

Every time the app changes its verdict on a stock, it writes that down with the price and SPY at that moment. Then on the call's 30/90/180/365-day anniversary it stamps what happened.

- **Median edge vs SPY** — did the calls beat the market
- **Called it right** — a BUY is right if it beat SPY; a SELL is right if it *lagged*
- Under about 20 calls, it tells you the number means nothing. Believe it

**History** tab → **How You Behave** — is *your* judgement working?

- **How long you actually hold** — the median, not what you tell yourself
- **Whether you sell too early** — what your sales did in the 90 days after you got out. If the median is up 5%, you cut winners early
- **Whether you keep to your own rules** — what share of days your cash was under your own floor
- **Whether you trade in bursts** — activity clustering usually tracks stress, not opportunity

---

## 8. The Map (who a company depends on)

**Map** tab → type a ticker → **Map it**.

- Left = suppliers (who they buy from)
- Right = customers (who they sell to)
- Bottom = similar companies

Supplier and customer data isn't on any free API — you type those in yourself, and adding a link on one company automatically adds the reverse on the other.

Use it for one thing: **finding hidden overlap.** If four of your holdings all depend on the same supplier, you own one bet, not four.

**All maps (N)** button shows everything you've mapped.

---

## Cheat sheet

| I want to… | Go to |
|---|---|
| See what needs me today | **Command** → Run review |
| Score one stock | **Analyzer** |
| Compare two stocks | **Analyzer** → Compare Two Stocks |
| Work out how much to buy | **Portfolio** → Before You Trade |
| Write down why I own something | **Portfolio** → Investment Thesis |
| See which holdings are decaying | **Portfolio** → Quality Drift |
| Find new stocks | **Screener** |
| Check if the market is expensive | **Market** |
| See how bad a crash could get | **Risk** → Monte Carlo → Model the drawdown |
| Check if the app's calls work | **Market** → Call Scorecard |
| Check if *my* habits work | **History** → How You Behave |
| Change my rules | Avatar → **Settings** |
| Quick maths | The **calculator icon**, top right |
| Jump to any ticker | **Jump to ticker** box, top right |

---

## What this app cannot do

Worth knowing so you never rely on it for these:

- **It cannot trade.** No broker connection. It tells you; you decide; you execute.
- **It cannot scan the whole market.** It scores lists you give it.
- **It cannot see the future.** Every projection is a range under stated assumptions, not a forecast.
- **It cannot grade calls it never wrote down.** The scorecard starts today and builds forward. There's no free historical price API to reconstruct it backwards.
- **It only knows US stocks.** Finnhub's free tier is US-only.
- **It cannot price mutual funds.** Add them as *Mutual Fund* and type the NAV yourself.
- **It is not advice.** It's your own rules, applied consistently, with the arithmetic done for you.

The last one matters most. Every verdict in this app is your Settings numbers firing on public data. When it says BUY, that means *"this cleared the bar you set"* — not *"this will go up."*
