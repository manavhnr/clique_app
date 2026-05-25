import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'purple' | 'green' | 'yellow' | 'red' | 'blue';
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-dark-card border border-dark-border text-muted',
    purple: 'bg-primary/20 border border-primary/30 text-primary-light',
    green: 'bg-green-500/20 border border-green-500/30 text-green-400',
    yellow: 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400',
    red: 'bg-red-500/20 border border-red-500/30 text-red-400',
    blue: 'bg-blue-500/20 border border-blue-500/30 text-blue-400',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
