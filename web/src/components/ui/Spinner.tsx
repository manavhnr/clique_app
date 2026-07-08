import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: number;
  className?: string;
}

/** Lime arc spinner. Wrap in a centered container for full-page loading. */
export default function Spinner({ size = 32, className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block rounded-full border-2 border-line-2 border-t-lime animate-spin', className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Full-page centered spinner for route-level loading states. */
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner />
    </div>
  );
}
