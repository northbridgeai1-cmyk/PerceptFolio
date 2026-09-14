import * as React from 'react';
import * as A from '@radix-ui/react-accordion';
import { cn } from '@/lib/utils';
export const Accordion = A.Root;
export const AccordionItem = React.forwardRef<React.ElementRef<typeof A.Item>, React.ComponentPropsWithoutRef<typeof A.Item>>(({ className, ...p }, ref) => (
  <A.Item ref={ref} className={cn('border-t border-line last:border-b', className)} {...p} />
));
AccordionItem.displayName = 'AccordionItem';
export const AccordionTrigger = React.forwardRef<React.ElementRef<typeof A.Trigger>, React.ComponentPropsWithoutRef<typeof A.Trigger>>(({ className, children, ...p }, ref) => (
  <A.Header className="flex">
    <A.Trigger ref={ref} className={cn('flex flex-1 items-center justify-between gap-4 py-5 text-left text-[17px] font-semibold rounded-[8px] [&[data-state=open]>svg]:rotate-45', className)} {...p}>
      {children}
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 stroke-faint fill-none stroke-2 transition-transform duration-250 ease-[var(--ease-out)]"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </A.Trigger>
  </A.Header>
));
AccordionTrigger.displayName = 'AccordionTrigger';
export const AccordionContent = React.forwardRef<React.ElementRef<typeof A.Content>, React.ComponentPropsWithoutRef<typeof A.Content>>(({ className, children, ...p }, ref) => (
  <A.Content ref={ref} className="overflow-hidden data-[state=closed]:animate-none" {...p}>
    <div className={cn('pb-5 text-[16px] leading-[1.62] text-dim max-w-[66ch]', className)}>{children}</div>
  </A.Content>
));
AccordionContent.displayName = 'AccordionContent';
