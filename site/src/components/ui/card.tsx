import * as React from 'react';
import { cn } from '@/lib/utils';
/* A panel with real elevation meaning: 12px radius, hairline, a one-pixel top highlight so it reads
   lit rather than drawn (DESIGN.md, depth on dark). */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-[12px] border border-line bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_10px_30px_-18px_rgba(0,0,0,.7)]', className)} {...props} />
));
Card.displayName = 'Card';
