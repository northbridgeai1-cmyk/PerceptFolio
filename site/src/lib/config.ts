/* The only place the worker's address lives. It is the workers.dev hostname on purpose (see the
   note in worker.js); pointing api.perceptfolio.com at it and changing this string is the upgrade. */
export const WORKER = 'https://crimson-hat-6ad9.northbridgeai1.workers.dev';

/* The inbox access requests reach today. */
export const CONTACT = 'northbridgeai1@gmail.com';

/* A1.5. A support address on the domain. It goes live when the owner enables Cloudflare Email
   Routing for perceptfolio.com (DNS is already in Cloudflare; one rule forwarding support@ to the
   inbox above) and flips SUPPORT_LIVE. Until then every mailto on the site keeps using CONTACT, so
   nothing bounces. */
export const SUPPORT_LIVE = false;
export const SUPPORT = SUPPORT_LIVE ? 'support@perceptfolio.com' : CONTACT;

/* A2.8. Personal is the Founding price: held for anyone who has paid it, rising for new accounts
   after foundingUntil (a date the owner may move; the worker's FOUNDING_UNTIL must match).
   Business is a desk price: three seats included, seats beyond that quoted in the reply. The
   worker's PRICES must agree with these numbers; the suite checks both. */
export const PLANS = {
  personal: { monthly: 149, yearly: 1490, foundingUntil: '2027-03-31' },
  business: { monthly: 760, yearly: 8360, seatsIncluded: 3 },
} as const;

/* A5.3. The screens, and the decision each one answers. `still` is true where /preview/<id>.html
   exists (a snapshot of that screen on the sandbox account, made with Settings → Snapshot this
   screen on an operator device). The tour shows a still where there is one and the caption
   everywhere. */
export const SCREENS: ReadonlyArray<{ id: string; name: string; asks: string; still?: boolean }> = [
  { id: 'dashboard', name: 'Dashboard', asks: 'Where do things stand today?', still: true },
  { id: 'command', name: 'Command', asks: 'What needs me this morning, in what order?' },
  { id: 'portfolio', name: 'Portfolio', asks: 'What do I own, at what cost, against which limits?' },
  { id: 'watchlist', name: 'Lists', asks: 'Which of the names I watch clear my bars?' },
  { id: 'history', name: 'History', asks: 'How do I actually behave: hold times, early sales, rule adherence?' },
  { id: 'market', name: 'Market', asks: 'What regime is the market in, and how is my record marking?' },
  { id: 'news', name: 'News', asks: 'What was said about my holdings, and which headline says it?' },
  { id: 'map', name: 'Map', asks: 'Who does this company depend on, and who depends on it?' },
  { id: 'world', name: 'World', asks: 'What does a country make and sell, and to whom?' },
  { id: 'screener', name: 'Screener', asks: 'Which names on a list clear the rulebook?' },
  { id: 'analyzer', name: 'Analyzer', asks: 'How does one company do on the twenty-two checks?' },
  { id: 'risk', name: 'Risk', asks: 'What does a bad month do to the book?' },
  { id: 'projections', name: 'Projections', asks: 'What range of outcomes is plausible, under stated assumptions?' },
  { id: 'alerts', name: 'Alerts', asks: 'What crossed a line while I was away?' },
  { id: 'clients', name: 'Clients', asks: 'How is a client book doing, scored the same way, kept apart?' },
];
