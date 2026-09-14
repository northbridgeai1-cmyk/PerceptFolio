import * as React from 'react';
import { cn } from '@/lib/utils';
const base = 'w-full rounded-[8px] border border-line2 bg-bg px-[14px] py-3 text-[15px] text-text placeholder:text-faint transition-colors focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(59,130,246,.18)] user-invalid:border-red';
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cn(base, className)} {...p} />);
Input.displayName = 'Input';
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => <textarea ref={ref} className={cn(base, 'min-h-[110px] resize-y leading-normal', className)} {...p} />);
Textarea.displayName = 'Textarea';
