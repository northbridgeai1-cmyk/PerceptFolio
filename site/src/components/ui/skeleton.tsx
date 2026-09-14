import { cn } from '@/lib/utils';
/* Skeletons match the shape of what replaces them, and shimmer only while something is actually
   loading. Reduced motion leaves them static. */
export function Skeleton({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('relative overflow-hidden rounded-[6px] bg-panel2 shimmer', className)} {...p} />;
}
