import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
const QA: Array<[string, React.ReactNode]> = [
  ['Is this available to the public?', 'By request, and by subscription. Ask for a demo and someone will show it to you on your own positions; if it suits the work, you pay monthly or yearly and your code arrives by email. Firms apply for seats. There is no signal service and no self-serve trial.'],
  ['Is any of this investment advice?', 'No. The terminal applies rules its operator configures to public data and shows the arithmetic. When it says BUY, that means the position cleared the bar that operator set. It has no view on anyone’s circumstances, makes no recommendation, and takes no custody. Judgement stays with the person at the keyboard.'],
  ['Does it promise to beat the market?', 'It promises nothing about returns, and you will not find a performance figure anywhere in this product. What it does is measure. Every call is marked against the index on a fixed horizon and reported with a confidence interval wide enough to show when the sample is too thin to mean anything. A tool that tells you it wins is selling. A tool that tells you how often it was wrong is working.'],
  ['Where does my data live?', 'In your own browser. Holdings, prices, notes and history are stored locally on the device you use. With sync enabled it goes to a private store under your access code, readable only with that code. There is no central database holding anyone’s book, and NorthBridge does not read yours.'],
  ['Why is my scorecard empty when I start?', 'Because a fixed-horizon record cannot be faked backwards. To know what a stock did ninety days after a call, something has to look on the day. The terminal marks each call on its own anniversary going forward, so the first meaningful reading is roughly a quarter out.'],
  ['Does it place trades?', 'No, and it never will. There is no broker connection and none is planned. It reports what the rules flagged and shows the numbers; execution happens in your own brokerage, by you.'],
];
export function Faq() {
  return (
    <Accordion type="single" collapsible defaultValue="q0">
      {QA.map(([q, a], i) => <AccordionItem key={i} value={'q' + i}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}
    </Accordion>
  );
}
