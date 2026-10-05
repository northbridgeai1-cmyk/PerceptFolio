# PerceptFolio walkthrough, 2026-10-04

Walked as a first-time user on the live site (perceptfolio.com), signed in with the owner's code, on the owner's account. Goal of the owner: make it as simple as it can be.

Limit of this method: one agent clicking through. It proves what is reachable and what breaks. It cannot judge whether wording makes sense to a beginner.

## Owner feedback, added to the plan

1. **News screen:** show real headlines with photos, not just counts and a summary button.
2. **Ask who you are, once, up front:**
   - How will you use it: side-hustle, day trading, a job, or invest and forever?
   - Is this your first time doing this, or have you done it before?
   - Use the answers to set default rules, how dense the screens look, and whether notifications are on.
3. **Two people to design for:** the side-hustler (active, wants an edge, checks often) and the walk-away investor (puts money in, leaves).

## Fix first

| # | Problem | Where |
|---|---|---|
| 1 | Stripe checkout charges $760/month, site says $39. Price IDs `STRIPE_PRICE_PERSONAL_MONTHLY` and `_YEARLY` are not in the repo; check them in Stripe. | Checkout |
| 2 | Stale "Ask / See it / Enter" block and "a person reads every request" copy contradict self-serve. | Landing, /pricing |
| 3 | "Fifteen screens" (landing) vs "13 screens" (pricing). | Landing, /pricing |

## The door (before signing in)

Worked:
- Hero sentence is clear.
- The hidden-ticker history demo needs no signup and marks a call against the S&P.
- Real Apple numbers with a source line.
- Plain terms: 3 days free, 14-day refund, cancel in one click.

Stuck:
- No free way to see the terminal. `/terminal/` redirects to `/enter`, which needs a code.
- "Try it on real history first" lands on the heading; the demo is below the fold.
- Nothing says up front whether it tells you to SELL something you own.
- Stripe page text contained instructions aimed at AI agents (Link CLI). Not from this site.

## Inside, first minutes

Worked:
- 5-question survey, one tap each, auto-advances, always skippable. Plain wording.
- 5-card tour lights up the sidebar icon it describes.
- Dashboard chips: "find something to buy / know what to sell / bring in my account". Best part of the product.
- "know what to sell" jumps to Portfolio with a toast.
- Prices fill in by themselves from ticker, shares and cost.

## Where it breaks, worst first

1. **Add holding is blocked by a pre-ticked "Take this out of my cash" box.** Red text says "more than your $0 cash" and never says to untick. Default it off for holdings you already own.
2. **Existing holdings are logged as new buys.** History says "Bought $6,000, Opened position" dated today.
3. **Verdict column says "refresh" and pressing it does nothing.** Verdicts only appear after Analyze has run.
4. **"know what to sell" shows an empty list with no reason.** "No holdings match your filters" looks the same as "nothing to sell".
5. **The Sell answer rests on missing data.** INTC: "Price 0/6 (1 had data)", up 165%, flagged Consider SELLING. Missing data counts as a fail, and the screen never says so. Rows say "Not available on your Finnhub plan".
6. **Every Sell line has the same sentence, "Your rules say consider selling."** No reason on the line. INTC is probably size (78% of book vs 10% limit).
7. **Keep / look / sell list is last on a very long Analyze page**, below the single-stock detail, after a blank gap.
8. **Top "Search a ticker" filters the Portfolio table** instead of opening the stock, and the filter sticks across visits (my INTC stayed hidden).
9. **"How much should I put in?" gives no preview.** Typing MSFT and $1,000 shows nothing. The link says "MSFT has no room left under your limits" with no reason, even with $5,000 cash and a 10% limit set. The landing page promises the terminal shows which limit said no. Possible bug.
10. **Compare labels the verdict row "AI"** (it is rules, not AI). AAPL says "Consider SELLING" only because I hold it; MSFT says "Doesn't qualify yet" because I do not. Two vocabularies for the same idea.
11. **Green banner "This browser has no room left..."** is scary, shows after every save, and returns after "Not now". It sits on top of content.
12. **"I understand the risk" button** on the first-holding modal, next to copy saying nothing is at risk.
13. **Portfolio table wider than the screen**; "My call" is cut off. "Price when I decided $" is unexplained.
14. **Sidebar is icons only**, no labels.
15. **Calculator icon in the top bar does nothing visible.**
16. **Dashboard shows a "today" loss on a Sunday.**

## Side-hustler

Worked: one-tap screener, "This week's picks" fills 20 tickers, progress bar and Stop, Quality/Value/Momentum scores per row, Risk says "INTC is 78% of the book and made 80% of the gain", Market page says "quiet day" honestly. Compare is fast.

Stuck:
- Scan says "up to ~1 min"; 12 of 20 took about 90 seconds.
- 12 names scored, all "Doesn't qualify yet". Zero buys, no hint of what to try next.
- CYBR shows raw "no data (NO_DATA)".
- Near-misses (WDAY, ZM) are not saved; Watchlist stays at 0.
- Paragraph text on the screener (breaks the no-paragraphs rule).

## Walk-away investor

Worked: survey sets rules once; Projections gives the answer in dollars (10 years at $500 a month on my book: $75.9k worst, $147.3k median, $304.7k best, 4.7% chance of ending below what was put in); "Down $33.3 today. One day is noise, not evidence" is calming.

Stuck:
- Email exists (Settings > Advanced: "Email when a mark lands", "Email when a review is due", "Notify me when news breaks") but is at the bottom of Advanced, not on by default, and tied to marks, not to "nothing needs doing" or a weekly note. Alerts screen only offers browser notifications.
- No simple answer to "what do I buy?" (no broad index option; 20 single stocks).
- Projections opens on "Kronos, a K-line foundation model", then asks for "risk-free rate" and "expected market return". The dollar answer is below a 1-year percent block that says "not tied to how much money you put in".
- "Run the walkthrough" is only in Settings.
- Supply chain and World are expert screens with no starter state.

## Biggest gap

The product scores calls well but has no "I'm done for now" ending. Hustler: no buy candidates. Walk-away: no default holding, no weekly note.

## Suggested order

1. Stripe prices to $39 / $390.
2. Ask the two questions (use style, experience) after the survey; set defaults, density and notifications from them.
3. Weekly email: "Nothing needs doing" or "INTC is 78% of your book".
4. Reason on every Sell line; say when missing data drove it; run verdicts automatically.
5. Projections: dollar answer first, plain input names, defaults filled.
6. Scan with no buys: say so and offer the three closest, saved to Watchlist.
7. News with headlines and images.
8. Fix Add holding (cash box default, fake "Opened position" buys).
9. Delete stale demo copy; one screen count.

## Test data left in the owner's account

AAPL 10 @ $150, INTC 100 @ $45, cash $5,000, 12 cached scan results. Remove when done.

## Correction

An earlier note said "no email anywhere". Wrong: the three email options exist in Settings > Advanced.
