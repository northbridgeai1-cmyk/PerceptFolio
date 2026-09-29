/* THE PAGE A BUYER LANDS ON AFTER PAYING, AND THE ROUTE THAT TELLS IT THE TRUTH (2026-09-28).

   The thing being protected here is not the layout. It is that the page cannot say something
   flattering that is not true, and that it cannot leak the access code. Both are testable from the
   source, so both are tested from the source. */
import { readFileSync } from 'node:fs';
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const worker = read('worker.js');
const page = read('site/src/pages/Welcome.tsx');
const thanks = read('site/src/pages/Thanks.tsx');
const main = read('site/src/main.tsx');

let pass = 0, fail = 0;
const t = (n, ok) => { if (ok) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
console.log('the welcome page');

/* ---- the redirect out of Stripe ---- */
t('Stripe sends a buyer to /welcome, carrying the session id',
  /success_url: `\$\{site\}\/welcome\?session_id=\{CHECKOUT_SESSION_ID\}`/.test(worker));
t('the route exists in the router', /path="\/welcome" element=\{<Welcome \/>\}/.test(main));
t('the old purchase URL still works, and hands over rather than duplicating',
  /window\.location\.replace\('\/welcome'/.test(thanks));

/* ---- THE ONE THAT MATTERS: the code is never in anything this page can reach ---- */
/* Pinned as "the code is not in it" rather than as the exact field list, because the field list is
   going to keep growing and a test that breaks on every addition gets updated without being read,
   which is exactly how the one guarantee that matters here would quietly be lost. */
const confirmReturn = (() => {
  const at = worker.indexOf("return json({ ok: true, paid, provisioned, mailed,");
  return at < 0 ? null : worker.slice(at, worker.indexOf('\n', at));
})();
t('the confirm route still returns its answer in one place', !!confirmReturn);
t('the confirm route never returns the access code',
  !!confirmReturn && !/\bcode\b/.test(confirmReturn));
t('and the page has no way to render one', !/\bj\.code\b|\bc\.code\b|accessCode/.test(page));
t('the address comes back masked, not whole', /function maskEmail\(e\)/.test(worker) &&
  /return s\[0\] \+ '\\u2022\\u2022\\u2022\\u2022' \+ s\.slice\(at\)/.test(worker));

/* ---- the page may not assume ---- */
t('being redirected is not treated as proof of payment: the page asks',
  /fetch\(WORKER \+ '\/checkout\/confirm\?session_id=' \+ encodeURIComponent\(sid\)\)/.test(page));
t('paid comes from Stripe',
  /const paid = sess\.payment_status === 'paid' \|\| sess\.status === 'complete';/.test(worker));
t('provisioned comes from what the webhook stored, not from Stripe',
  /const rec = await env\.PF_SYNC\.get\('sub:' \+ sess\.customer\);/.test(worker));
t('an unpaid session is told so, and told nothing was charged',
  /That payment has not completed\./.test(page) && /Nothing has been charged\./.test(page));

/* ---- the three states of the email line are three different sentences ---- */
t('a failed code email is shown as a failure, not as success',
  /The email to /.test(page) && /did not go out/.test(page));
t('and it is not recorded as failure when it was simply never recorded',
  /minted && mailed === false \? 'no' : minted \? 'yes' : 'wait'/.test(page));
t('the webhook records whether the code email went out',
  /o\.mailed = !!\(mail\.attempted && mail\.ok\);/.test(worker));
t('recording it can never be the reason a paid account has no code',
  worker.indexOf('const code = await mintCode(env, tier, email') < worker.indexOf('o.mailed = !!(mail.attempted && mail.ok);'));

/* ---- the webhook race is a state, not an error ---- */
t('paid-but-not-yet-minted polls instead of alarming',
  /if \(j && j\.paid && !j\.provisioned && tries < 15\)/.test(page));
t('and stops, rather than spinning forever', /const stalled = paid && !minted && tries >= 15;/.test(page));

/* ---- the route is unauthenticated, so it is cheap to abuse and must not be ---- */
t('a malformed session id is refused before Stripe is called',
  worker.indexOf("if (!/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(sid)) return json({ error: 'Not a checkout session.' }, 400, env);") <
  worker.indexOf("const r = await stripeGet(env, '/checkout/sessions/'"));
t('and it is rate limited', /tooMany\(env, request, '\/checkout\/confirm', 20\)/.test(worker));

/* ---- and it points at the door ---- */
t('the page offers the way in', /<a href="\/enter\/">Sign in with your code<\/a>/.test(page));

/* ---- THE THREE DAYS (2026-09-29) ----
   A trial that becomes $760 without another click is the one thing on this product that could be
   called a dark pattern if it were done quietly. So the tests are about whether it is said, where,
   and whether the amount can drift from what Stripe will charge. */
t('the trial is attached to the checkout session, so Stripe states it above the card field',
  /'subscription_data\[trial_period_days\]': TRIAL_DAYS,/.test(worker) && /const TRIAL_DAYS = 3;/.test(worker));
t('the webhook asks Stripe what the subscription is rather than assuming active',
  /await stripeGet\(env, '\/subscriptions\/' \+ encodeURIComponent\(subscriptionId\)\)/.test(worker) &&
  !/subStatus: 'active' \}\);/.test(worker));
t('a failure to ask still mints the code, which is the direction that cannot be undone',
  /let subStatus = 'active', trialEnd = null, periodEnd = null;/.test(worker) &&
  worker.indexOf("catch (e) { /* the fallback above is deliberate */ }") < worker.indexOf('const code = await mintCode(env, tier, email, { subscriptionId, customerId, subStatus, trialEnd });'));
t('the charge and its date are the FIRST thing the code email says, above the code itself',
  worker.indexOf('will be charged on ${when}, unless you cancel before then.') <
  worker.indexOf('Your access code is:'));
t('the email gives the date as a date, not as "in three days"',
  /new Date\(rec\.trialEnd\)\.toUTCString\(\)/.test(worker));
t('the email says how to stop it in the same breath',
  /Cancelling takes one click in your customer portal/.test(worker));
t('the welcome page states the amount and the date too, not only the email',
  /Nothing has been charged\. <b>\{amount\} on \{chargeOn\}<\/b>, unless you cancel before then\./.test(page));
t('the amount on the page comes from the plan, so it cannot drift from what Stripe charges',
  /const amount = yearly \? '\$' \+ PLAN\.yearly\.toLocaleString\(\) : '\$' \+ PLAN\.monthly;/.test(page) &&
  /import \{ WORKER, SUPPORT, PLAN \}/.test(page));
t('and the trial is only claimed when Stripe says the subscription is trialing',
  /const trialing = !!\(c && c\.status === 'trialing' && c\.trialEnd\);/.test(page));
t('the quote the operator sends says it as well',
  /days first, with a card but no charge/.test(worker));

console.log('');
if (fail) { console.log(fail + ' FAILED, ' + pass + ' passed'); process.exit(1); }
console.log('ALL ' + pass + ' CHECKS PASSED');
