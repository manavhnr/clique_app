import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'lime' | 'gold' | 'hot' | 'sky';
  className?: string;
}

/** Mono microlabel chip. Variant names are the palette, not borrowed hues. */
export default function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  const variants = {
    neutral: 'bg-line border-line-2 text-cream',
    lime: 'bg-lime/10 border-lime/30 text-lime',
    gold: 'bg-gold/10 border-gold/30 text-gold',
    hot: 'bg-hot/10 border-hot/30 text-hot',
    sky: 'bg-sky/10 border-sky/30 text-sky',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.12em]',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
