# The analysis: defaults, what it looks like, what to add

2026-10-07. Written to be argued with. Every number is a proposal, not a decision.

## 1. The finding that reorders everything

**Most of the blanks are not missing. They are fetched and ignored.**

The worker serves `/edgar?symbol=X`: ten fiscal years from the SEC's public XBRL company-facts API,
free, authoritative, no key, no plan. It returns revenue, gross profit, operating income, net income,
EPS, operating cash flow, capital expenditure, **free cash flow**, dividends, buybacks, cash, debt,
assets, liabilities, equity and share count.

The worker's own comment on that route reads: *"the statements behind the 22 checks, display only."*

Display only. The checks ask Finnhub instead, and on a free plan Finnhub answers with nothing.

| Check | Weight | Reported blank because | SEC EDGAR has |
|---|---|---|---|
| Free Cash Flow | **9** | Finnhub plan | operating cash flow − capex, ten years |
| Cash vs Debt | 8 | — | cash, long-term debt |
| Revenue Growth (YoY) | 8 | — | revenue, ten years |
| Gross Margin | 7 | — | gross profit ÷ revenue |
| Operating Margin | **7** | Finnhub plan | operating income ÷ revenue, ten years, so "expanding" is answerable |
| ROE | 7 | — | net income ÷ equity |
| P/E vs own history | **8** | Finnhub plan | EPS ten years, and the terminal keeps its own price log |
| PEG Ratio | 7 | often blank | P/E ÷ revenue or EPS growth |
| EPS Beats | 4 | Finnhub plan | EPS actuals only, **not** estimates. Stays blank. |

**Wiring the checks to EDGAR fills about 46 of the 188 weight with free, auditable, filed numbers.**
No model. No paid plan. No new key. This is the single biggest improvement available and it is
mostly plumbing.

**Do this first.** Everything below matters less.

## 2. What Groq is actually for

Agreed and recorded: **Groq makes no judgement. Judgement is the user's.** That rules out the four
judgement checks, and it rules out any number that appears on a filing, because a model asked for a
financial fact will answer confidently and sometimes wrongly and nobody will know which.

What is left is real and useful:

| Job | Why it is safe |
|---|---|
| Fill the supply-chain map | Already live. A starting point marked as the model's guess, for the user to correct. |
| Classify a headline's topic | Replacing keyword regexes with better classification. Still a count, not an opinion. |
| Read a filing and point at the page | Extraction with a citation, not generation. The user reads the quote. |
| Plain-English restatement of a check | "Operating margin went 22% → 19% → 17%" in words. No new fact. |

**Never:** a number, a verdict, a recommendation, or an answer to "is this good".

A Groq key is worth adding for the first two. It is not what fixes the blanks; EDGAR is.

## 3. Proposed defaults

Current shipped values, and what I would change.

| Setting | Now | Proposed | Why |
|---|---|---|---|
| Buy at or above | 75% | **70%** | At 75 with the price floor also at 50, very little clears. 70 is still demanding. |
| Sell at or below | 40% | **35%** | 40 fires on companies that are merely unexciting. A sell should mean something is wrong. |
| Price floor for a buy | 50% | **50%** | Keep. It is the rule that stops "good business at any price". |
| Confidence warning below | 55% | **55%** | Keep. |

**These are proposals. Give me yours and I will set them.**

Two things worth knowing before you choose:

- Lower the buy line and more names qualify, which is not the same as more names being good. The
  record is what tells you whether your line is right, and it needs 90 days of marks first.
- Changing either line splits the record, by design. Calls made under the old numbers were made by
  a different system and the policy fingerprint already records that.

## 4. What the analysis looks like

### The verdict, as now

One word, one score, one confidence, every section listed.

```
BUY
Scored 78% on everything that could be checked, at 86% confidence.
That clears the 70% you buy at. Strongest on the business, at 91%.

78% score     86% of the checks could be answered

the business 91% · the price 62% · momentum 75% · the news and supply chain 80% · Wall Street 67%
your lines: buy at 70%, sell at 35%. Change them in Settings.
```

### The split you asked for

Of all the check weight, how much passed, how much failed, and how much could not be answered.
This is arithmetic on what is already computed. Nothing is invented.

```
  passed 78%  ·  failed 12%  ·  could not answer 10%
  ███████████████████████████████████░░░░░░░░▒▒▒▒▒
```

One bar, three segments, under the verdict. It reads exactly as you wrote it, and it makes the
third number visible, which is the one that has been doing damage invisibly.

**Not proposed: "75% buy, 15% hold, 10% sell."** That needs the score mapped onto three
probabilities, and no such mapping is measured here. It would look more precise than it is, and
precision this product has not earned is the one thing it has never shipped.

## 5. What to add, in order

| # | Thing | Why it is in this position | Size |
|---|---|---|---|
| 1 | **Wire the checks to EDGAR** | Fills ~46 of 188 weight with filed numbers. Free. No model. | Medium |
| 2 | **The three-segment bar** | Makes "could not answer" visible. | Small |
| 3 | **Groq key: map and headline classification** | Both already have a home. | Small |
| 4 | **Chat over your own data** | See below. | Medium |
| 5 | **FX, crypto, commodity screens** | Context. | Medium |
| 6 | Per-company commodity exposure | The only honest way markets reach a verdict. | Medium |

### The chat, scoped

It answers from what the terminal has computed. It never predicts.

| It answers | It refuses |
|---|---|
| "Why is INTC a sell?" | "What's the best stock right now?" |
| "Which holding scores lowest?" | "Will NVDA go up?" |
| "What's stopping MSFT being a buy?" | "Should I buy this?" |
| "What did the news say about AAPL?" | "What will the market do?" |

Every answer cites the check it came from, so it can be checked. The refusals are not squeamishness:
answering them makes this an unregistered adviser with no record, and the record is the product.

### The markets, honestly

Screens for FX, crypto and commodities are fine and cheap, as context.

Feeding them into a company's verdict generically is not. The copper price does not tell you whether
Apple is a good business, and a score that moves because gold moved is numerology.

**Where it is real:** a named exposure. An airline and jet fuel. A miner and its metal. A bank and
rates. That is a per-company fact, the supply-chain map already holds per-company facts, and a check
reading it would be as auditable as every other check here. That is the version worth building.
