# PerceptFolio

## Platform
web

## Stack
Static HTML/CSS/JS, no framework, no build step. GitHub Pages serves the files; a Cloudflare Worker proxies market data (Finnhub) so the browser never holds the key directly. The terminal is a single file with a service worker for offline and home-screen install. All user data lives in the browser's localStorage; nothing is sent to a server and there is no account system beyond a local hashed sign-in.

## Users
The internal team at NorthBridge Financial's investment branch: the person who makes an equity buy, sell or hold call and then has to justify it to a colleague, a client, or their own record six months later. Small book, few positions, high conviction, decisions made at a desk on a weekday. Secondary: a NorthBridge principal reviewing what the terminal said and whether it was right. Access is per person, by invitation. There is no public sign-up and no retail audience.

## Product Purpose
A private research terminal that applies one fixed rulebook to every position and writes down what it said. Twenty-two checks across quality, value and momentum produce a BUY / SELL / HOLD verdict for each ticker. The moment a verdict changes it is logged with the price and the S&P level at that instant and given a fixed anniversary. On that anniversary it is marked against the index, and the result is shown whether or not it flatters the system. The job it does: let someone make a decision with a written reason, and later find out whether the reason held.

## Positioning
Every other tool in this category sells signals and keeps no record. This one keeps a record it cannot edit. It never recommends; it applies rules the user set and shows the arithmetic. It is not a broker, places no trades, and never connects to one. It is research software, not investment advice, and NorthBridge is not a registered investment adviser.

## Operating Context
Daily use during market hours at a desk, often with other dark terminals open beside it. Also installed to an iPhone home screen for checking a position away from the desk. Users bring their own Finnhub data key. Decisions are made under time pressure but recorded for review months later, so the record must be more durable than the moment.

## Capabilities and Constraints
Live: 22-check scorecard; verdict log with price and index stamps; fixed-horizon marking against the S&P; position sizing checked against five limits (concentration, cash, market exposure, liquidity, thesis deadline); fourteen screens, each answering one decision; import/export and device-to-device sync of the local record.
Refused or impossible: 45 modules were considered, 18 shipped, 16 are impossible on retail market data, 11 were refused on evidence and are listed publicly with the reason.
Hard constraints: no performance claims of any kind on public pages; the goal is stated as expectancy, never a win rate; no new module ships until 40 calls have been marked; no hit rate is ever displayed because it is the most manufacturable statistic in finance.
Current state: the record is new. Calls are logged and awaiting their first marks. The public page must say this plainly rather than imply a track record.

## Brand Commitments
Name: PerceptFolio, one word, set as Percept + Folio in two weights or colours. Parent: NorthBridge · Financial. Mark: a PF monogram in a rounded square, P in text colour, F in the brand teal #1f9e8c. Palette is pinned dark: near-black ground, grey panels, cool blue accent for links and the primary action, teal reserved for the brand mark. Existing legal pages (privacy, terms) and the refused-modules page share this world and must keep matching.

## Evidence on Hand
The scorecard structure itself (ticker, call, held, vs index, result). The refused-modules page, which is the product's most credible artefact: a list of things it will not do and why. The rulebook in full. The five sizing limits. The fact that the record cannot be edited after the fact. No testimonials, no customers to name, no benchmark to cite, and none may be invented.

## Product Principles
Nothing is hidden: every verdict shows which checks it passed. It grades itself: the mark is shown whether or not it flatters. Thesis before position: no ticker enters the book without a written reason and a deadline. Size, not just selection: what a trade does to concentration and cash is shown before the money moves. It tells you; you decide.

## Accessibility & Inclusion
WCAG 2.2 AA is verified, not assumed: Lighthouse accessibility is 100 on every public page and contrast is computed against the darkest surface each colour sits on. Full keyboard operation, visible focus, reduced-motion respected, landmarks on every screen including sign-in. Type must stay legible at a desk at the end of a long day.
