import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* shadcn pattern, PerceptFolio skin. One primary per view; the primary carries a glow and nothing
   else does (Hick's law, DESIGN.md). Radius is the control radius, 8px, everywhere. */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border font-semibold leading-tight transition-[background-color,border-color,transform,box-shadow] duration-200 ease-[var(--ease-out)] active:translate-y-px disabled:opacity-55 disabled:pointer-events-none no-underline',
  {
    variants: {
      variant: {
        primary: 'bg-accent-solid border-accent-solid text-white shadow-[0_8px_24px_-10px_rgba(37,99,235,.65)] hover:bg-accent-deep hover:border-accent-deep hover:shadow-[0_10px_28px_-10px_rgba(37,99,235,.8)]',
        secondary: 'bg-transparent border-line2 text-text hover:bg-panel2 hover:border-faint',
        link: 'border-0 bg-transparent text-dim underline underline-offset-[.2em] decoration-line2 hover:text-text hover:decoration-current p-0 h-auto font-normal',
      },
      size: { md: 'px-[18px] py-[10px] text-[15px]', lg: 'px-[22px] py-[13px] text-[16px]', sm: 'px-3 py-2 text-[14px]' },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
});
Button.displayName = 'Button';
