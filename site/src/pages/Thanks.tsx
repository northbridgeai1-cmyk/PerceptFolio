import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
export function Thanks() {
  const [sp] = useSearchParams(); const type = sp.get('type') || 'request';
  useEffect(() => { document.title = 'Thank you | PerceptFolio'; }, []);
  const copy = {
    purchase: { h: 'Your code is on its way.', p: 'It arrives by email within a minute. Open the entry page and type it in; it works on every device you own.', a: <Button asChild variant="primary" size="lg"><a href="/enter/">Enter your code</a></Button> },
    request: { h: 'Got it, your request is in.', p: 'Someone at NorthBridge will read it and reply personally to set up a demo. If it suits your work, that reply carries your access code and the link straight to the terminal. Meanwhile the demo on the front page is real history; being wrong on it is the point.', a: <Button asChild variant="secondary" size="lg"><Link to="/#demo">Try it on real history</Link></Button> },
  }[type as 'purchase' | 'request'] || { h: 'Thank you.', p: '', a: null };
  return <main id="main" className="wrap min-h-[60vh] pt-[var(--spacing-sec-lg)] pb-[var(--spacing-sec)]"><h1 className="mb-4 max-w-[14ch]">{copy.h}</h1><p className="lede mb-8">{copy.p}</p>{copy.a}</main>;
}
