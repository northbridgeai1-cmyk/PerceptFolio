import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SUPPORT, PLANS } from '@/lib/config';

const Doc = ({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) => {
  useEffect(() => { document.title = title + ' | PerceptFolio'; }, [title]);
  return <main id="main" className="wrap max-w-[860px] pt-[var(--spacing-sec)] pb-[var(--spacing-sec)] [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-[24px] [&_p]:mt-3 [&_p]:text-dim [&_li]:text-dim [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1"><h1 className="mb-2">{title}</h1><p className="text-[14px] !text-faint">Last updated {updated}. Questions: <a href={'mailto:' + SUPPORT}>{SUPPORT}</a>.</p>{children}</main>;
};

/* Written for a sold product: software, not advice; a subscription; a fourteen-day refund. Plain
   sentences on purpose, so a reader can tell what they agreed to. Counsel reviews before launch. */
export function Terms() {
  return (
    <Doc title="Terms of use" updated="13 September 2026">
      <h2>What PerceptFolio is</h2><p>PerceptFolio is research software made by NorthBridge Financial ("NorthBridge", "we"). It applies rules you configure to public market data, records the verdicts it produces, and marks them against an index on fixed horizons. It is a tool. It is not investment, legal or tax advice, and it makes no recommendation to any person.</p>
      <h2>Not advice, not a broker</h2><p>NorthBridge is not a registered investment adviser or broker-dealer. Nothing in the terminal or on this site is a recommendation to buy, sell or hold any security. A verdict such as "BUY candidate" means only that a position cleared the bar you set; it says nothing about your circumstances. The terminal does not place trades, connect to any broker, or hold any assets. Every decision, and its consequences, is yours.</p>
      <h2>No promise about results</h2><p>We make no claim about returns. The record the terminal keeps shows what its verdicts did; it does not predict what they will do. Past marks do not predict future marks. Market data may be delayed, incomplete or wrong; verify before acting.</p>
      <h2>Market data</h2><p>Quotes, fundamentals and news for US-listed securities reach the terminal from Finnhub, through our service or through a key of your own, and daily price history from the price feed named on each screen. That data is for your use inside the terminal and for the record it keeps, under the vendor's terms. It is not yours to redistribute: you may not scrape, resell, republish or feed it to another system, and your export contains your own record and holdings, not the vendor's data. If you connect your own Finnhub key, that data is supplied under your own agreement with Finnhub and their terms apply to it. Each price on screen states its source and whether it is a live quote or a daily close.</p>
      <h2>Your subscription</h2><p>Personal access is ${PLANS.personal.monthly} a month or ${PLANS.personal.yearly.toLocaleString()} a year, the Founding price, held for anyone who has paid it and rising for new accounts after {PLANS.personal.foundingUntil}. Business access is ${PLANS.business.monthly} a month or ${PLANS.business.yearly.toLocaleString()} a year for {PLANS.business.seatsIncluded} seats, further seats as quoted, by application. Payment is taken by Stripe; we never see your card. Subscriptions renew until cancelled, which you can do at any time from the billing portal; access runs to the end of the period paid for. Prices may change with notice before your next renewal.</p>
      <h2>Refunds</h2><p>Fourteen days from any payment, either plan, no questions: see the <Link to="/refunds">refund policy</Link>.</p>
      <h2>Your access code</h2><p>Your code is your credential. It works on every device you own and should not be shared; anyone holding it can open your terminal and, if sync is on, read your record. One subscription is one person (Personal) or the number of seats paid for (Business). We may pause a code that is shared beyond that.</p>
      <h2>Your data</h2><p>Your holdings, notes and record live in your browser. If you turn on sync they are stored under your code; NorthBridge does not read them. The record's server copy, on by choice for Personal and always on for Business seats, holds your calls, marks and the hash chain so the record survives a lost device and can be attested; it holds no thesis text and no holdings. Export is always available, including after your subscription ends. See the <Link to="/privacy">privacy policy</Link>.</p>
      <h2>Acceptable use</h2><p>Do not attempt to gain access without a valid code, to redistribute the market data, or to interfere with the service. We may end access for abuse.</p>
      <h2>Liability</h2><p>The software is provided as is. To the fullest extent the law allows, NorthBridge is not liable for any loss arising from your use of it, including trading losses, and our total liability to you is limited to the amount you paid in the twelve months before the claim.</p>
      <h2>Changes and law</h2><p>We may update these terms; the date above changes when we do, and continued use after that is acceptance. These terms are governed by the laws of the United States and the state in which NorthBridge is established.</p>
    </Doc>
  );
}
export function Privacy() {
  return (
    <Doc title="Privacy" updated="13 September 2026">
      <h2>What we hold</h2><p>If you subscribe: your email address, your Stripe customer identifier, your plan and its status, and your access code. If you apply for a firm: the firm's name, your name, your work email and what you wrote. If you request a demo: your email and what you wrote. That is the list.</p>
      <h2>What we do not hold</h2><p>Your card details, which Stripe holds. Your holdings, notes and thesis text, which live in your browser; with sync on they are stored under your code and we do not read them. With the record's server copy on (your choice on Personal, always on for Business seats) we hold your calls, marks and chain heads under your code, so the record can be attested and survives a lost device. This site uses Cloudflare Web Analytics, which counts page views without cookies and without identifying you; no advertising pixels, no third-party cookies.</p>
      <h2>Cookies</h2><p>One: the session cookie that opens the terminal once you have entered your code. It is set only after you enter your code, is not readable by scripts, and is not shared with anyone.</p>
      <h2>Who else sees anything</h2><p>FormSubmit, which delivers your access request to our inbox and keeps no copy. Stripe, for payment. Resend, to send your code and replies by email. Cloudflare, which serves the site and runs the access service. Finnhub, when you connect your own key, under your own account with them. We do not sell or share your details with anyone else.</p>
      <h2>Your rights</h2><p>Ask and we will show you what we hold, correct it, or delete it. Deleting your account ends your subscription and removes your email, code, sync data and the record's server copy; your export is yours to keep. Email <a href={'mailto:' + SUPPORT}>{SUPPORT}</a>.</p>
      <h2>Retention</h2><p>Subscriber records for as long as you subscribe and for the period the law requires for payment records afterwards. Demo requests and applications for twelve months.</p>
    </Doc>
  );
}
export function Refunds() {
  return (
    <Doc title="Refunds" updated="13 September 2026">
      <h2>Fourteen days, no questions</h2><p>Within fourteen days of any payment, on either plan, email <a href={'mailto:' + SUPPORT}>{SUPPORT}</a> from the address on the account and the payment is refunded in full. That applies to the first payment and to every renewal.</p>
      <h2>After fourteen days</h2><p>Cancel any time from the billing portal; access runs to the end of the period paid for and nothing further is charged. We do not refund the unused part of a period after the fourteen days have passed.</p>
      <h2>Your record after a refund</h2><p>Export is available from the terminal before access ends and from the entry page afterwards. Your record is yours.</p>
    </Doc>
  );
}
export function NotFound() {
  useEffect(() => { document.title = 'Not found | PerceptFolio'; }, []);
  return <main id="main" className="wrap min-h-[60vh] pt-[var(--spacing-sec-lg)]"><h1 className="mb-4">Nothing here.</h1><p className="lede">That address does not exist. <Link to="/">The front page</Link> does.</p></main>;
}
