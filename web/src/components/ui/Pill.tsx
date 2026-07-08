import { cn } from '@/lib/utils';

interface PillProps {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

/** Toggle pill for filters and tag pickers. Lime = selected, outline = idle. */
export default function Pill({ on, onClick, children, className }: PillProps) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-full border px-3.5 py-2 font-mono text-[11px] uppercase tracking-[.08em] transition-colors duration-150',
        on ? 'border-lime bg-lime text-ink' : 'border-line-2 bg-transparent text-cream hover:border-cream',
        className
      )}
    >
      {children}
    </button>
  );
}
