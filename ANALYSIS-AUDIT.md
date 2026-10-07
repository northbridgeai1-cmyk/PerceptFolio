# What we analyse, scored 1 to 10

2026-10-06. Every check the terminal computes, rated for how much it should count toward the
verdict on a stock, and why.

**The rule this audit now follows: everything is used.** Nothing computed is thrown away and
nothing sits on the page gating nothing. A check scored 2 still counts; it counts about a fifth of
what a check scored 10 counts. "What would not be used" is therefore not a list of deletions. It is
the bottom of the same scale.

The numbers in the table below are not commentary. They are the weights in `CHECK_WEIGHT` in
terminal/index.html, and `test/weights.mjs` fails the build if this file and that table disagree.
The check names are written exactly as the code names them, which is why one of them is just
"P/E": the test matches on the name, so prose would let the two drift apart.

## The defect this audit was written to fix

The buy bar was an absolute count: 9 of 12 quality checks. Four of those twelve are questions the
user has to type an answer to, and most people never will. So their quality total is 8, and **8 out
of 8, a company passing every check it is possible to pass, could never reach 9.**

A free-plan user could not see a BUY. Ever. Measured, not guessed:

| Company | Answered | Old verdict |
|---|---|---|
| Passes everything answerable, nothing typed | quality 8/8, price 5/5 | **HOLD** |
| Passes everything, free Finnhub plan | quality 8/8, price 1/1 | **HOLD** |
| Passes everything, all four manual answers typed | quality 12/12, price 6/6 | BUY |

The fix is in the scoring, not the bar: a check that could not answer no longer counts against the
company, it reduces how much is known about it. Score is a share of the weight that **answered**;
confidence is how much of the total weight that was.

## Scoring

```
score      = sum of weights that PASSED  /  sum of weights that ANSWERED      (0-100%)
confidence = sum of weights that ANSWERED / sum of ALL weights                 (0-100%)
```

Buy and sell lines are percentages, so adding or removing a check never silently moves anybody's
rulebook, and a section with no data lowers confidence instead of faking a failure.

## The price floor, found by the suite the same day

Weighting alone was not enough. Price is 35 of the 166 total weight, about a fifth, so a company
could fail **every** price check, be expensive on every measure here, and still score 79% and read
BUY on the strength of the business. Buying a good business at any price is the oldest mistake
there is, and the first line of this product is "know what to buy".

The weights were not wrong, so the fix is a separate rule rather than a thumb on the scale: **a BUY
also needs the price section at or above 50%**, counted across the price checks that answered. It
is in Settings, it names itself when it blocks a buy, and setting it to 0 switches it off.

## Quality: is the business any good

| # | Check | 1-10 | Why |
|---|---|---|---|
| 1 | Free Cash Flow | **9** | Cash a business actually produces is the hardest number to fake and the one that pays for everything else. |
| 2 | Cash vs Debt | **8** | Survival. A good business with the wrong balance sheet still goes to zero. |
| 3 | Revenue Growth (YoY) | **8** | The top line. Nearly always available, hard to argue with. |
| 4 | Gross Margin | **7** | What pricing power looks like in a number. |
| 5 | Operating Margin | **7** | Direction matters more than level, and this reads direction. |
| 6 | ROE | **7** | What they earn on what shareholders left in. Distorted by leverage, hence 7 not 9. |
| 7 | Insider Buying | **6** | People with the best information putting their own money in. Noisy, rare, real. |
| 8 | Current Ratio | **5** | A crude liquidity proxy that Cash vs Debt mostly already said. |
| 9 | EPS Beats | **4** | Beating a number management guided analysts toward. Backward-looking and game-able. |
| 10 | Competitive Moat | **4** | Would be a 10 if it were measurable. It is a question you type, so it is usually blank. |
| 11 | Clear Growth Runway | **3** | Same: valuable judgement, almost never recorded. |
| 12 | Revenue Guidance | **3** | Same, and it is also the most easily spun item on an earnings call. |

## Price: are you paying too much

| # | Check | 1-10 | Why |
|---|---|---|---|
| 1 | P/E vs Own History | **8** | Compares a company to itself, which avoids most of what makes cross-company P/E meaningless. |
| 2 | PEG Ratio | **7** | Price against growth. The one ratio that answers "expensive compared to what". |
| 3 | P/E | **6** | Crude, arbitrary threshold, but nearly always available, which counts for a lot. |
| 4 | Forward P/E | **6** | Says earnings are expected to grow into the price. Rests on estimates. |
| 5 | DCF Value | **5** | Rigorous in form, and the output moves wildly on assumptions a user did not choose. |
| 6 | Comp Analysis | **3** | A typed question. Blank for nearly everyone. |

## Momentum: is the market agreeing yet

| # | Check | 1-10 | Why |
|---|---|---|---|
| 1 | Beating the Market | **7** | Relative strength, which is the only momentum measure with real evidence behind it. |
| 2 | 6-Month Return | **6** | The classic momentum window. |
| 3 | 12-Month Return | **6** | The other classic window. |
| 4 | Near 52-Week High | **5** | Correlated with the two above; adds less than it looks like it does. |

## The news and who they trade with

| # | Check | 1-10 | Why |
|---|---|---|---|
| 1 | Legal and regulatory news | **7** | A lawsuit or a probe is the kind of thing that changes a business, and it is free to count. |
| 2 | Customer concentration | **6** | One customer who can leave is the risk that ends companies. Typed, so often blank. |
| 3 | Layoffs or restructuring | **5** | Real signal, ambiguous direction: it is both distress and discipline. |
| 4 | More than one supplier | **4** | Single points of failure matter. Typed. |
| 5 | Press coverage | **2** | Thin. Mostly a proxy for size, which the other checks already see. |
| 6 | Who they sell to is mapped | **2** | Closer to a prompt to fill the map than a fact about the company. |

## Wall Street: what everyone else thinks

| # | Check | 1-10 | Why |
|---|---|---|---|
| 1 | Price Target Upside | **4** | Analyst targets are persistently optimistic and move after the price, not before it. |
| 2 | Analyst Consensus | **3** | Mostly buy ratings on mostly everything. Weak, not worthless. |
| 3 | Volume Trend | **3** | Confirms a move that already happened. |

These three used to gate nothing at all. They now count, at the bottom of the scale, which is where
they belong: present in the verdict, unable to decide it.

## What is NOT in the verdict, and will not be

Not everything the terminal computes is a judgement about a company. These stay out, on purpose.

| Thing | Why it stays out |
|---|---|
| Dividend yield, payout | A fact about how they return cash, not about whether the business is good. Shown, never scored. |
| VaR, expected shortfall, GARCH | Severity of a bad day for a **portfolio**. Says nothing about one company's quality. |
| Monte Carlo, the stock projection | Arithmetic on an assumed average return. Circular: feeding it back in would score a company on an assumption about it. |
| Beta, volatility, liquidity | Properties of the **position**, which is why they drive sizing instead. A volatile stock is not a worse company. |
| Concentration (% of book) | A fact about the owner's book, not the company. Drives the keep/look/sell list, correctly. |
| Supply chain map, Seasonal, Cycle, Hindsight, Counterfactual | Context and research. None is evidence about whether this company is worth owning today. |
| Fear and greed | A market mood reading. Deliberately reaches no verdict, and should not start now. |

## Removed outright, 2026-10-06

| Thing | Why |
|---|---|
| The World globe | 22.7MB of a 25MB deploy: 8.5MB of vendored Cesium, 14MB of extracted plant data, downloaded by every build whether or not anybody opened the tab. It reached no verdict, the walkthrough called it an expert screen with no starter state, and neither user has a use for it. 91% of the download, 0% of the answer. |

The deploy went from **25MB to 2.4MB**.

## What the two users actually need from all this

| | Side hustler | Once a month |
|---|---|---|
| One score and one word per stock | yes | yes |
| How confident that score is | yes | yes |
| The 31 checks underneath | yes | no, folded |
| Their own record and expectancy | **the whole point** | no |
| Candidates to buy | **yes** | no |
| "Nothing needs doing" | no | **the whole product** |

The once-a-month user needs one message a month, not a screen. That remains the biggest gap.
