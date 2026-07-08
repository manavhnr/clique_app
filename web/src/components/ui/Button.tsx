import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

/**
 * Editorial button: mono uppercase label, pill radius.
 * Primary is always ink-on-lime — never put light text on the lime fill.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-full font-mono uppercase tracking-[.08em] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-lime text-ink border border-lime hover:bg-paper hover:border-paper',
      secondary: 'bg-transparent text-cream border border-line-2 hover:border-cream hover:text-paper',
      ghost: 'bg-transparent text-dim border border-transparent hover:text-paper hover:bg-line',
      danger: 'bg-hot/10 text-hot border border-hot/40 hover:bg-hot/20',
    };

    const sizes = {
      sm: 'px-4 py-2 text-[11px] gap-1.5',
      md: 'px-5 py-3 text-xs gap-2',
      lg: 'px-6 py-4 text-[13px] gap-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
