import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'lime' | 'gold' | 'hot' | 'sky';
  className?: string;
}

/** Flat stamp chip: squared mono label, like a mark pressed on the ledger. */
export default function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  const variants = {
    neutral: 'border-line-2 text-cream',
    lime: 'border-lime/40 text-lime',
    gold: 'border-gold/40 text-gold',
    hot: 'border-hot/40 text-hot',
    sky: 'border-sky/40 text-sky',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-[3px] border px-2 py-[3px] font-mono text-[10px] font-semibold uppercase leading-none tracking-[.14em]',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
