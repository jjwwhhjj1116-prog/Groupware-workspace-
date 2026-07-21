import React from 'react';

type BadgeVariant = 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO' | 'DEFAULT';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'DEFAULT', className = '' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'SUCCESS':
        return 'border-[var(--cc-success-500)]/20 bg-[var(--cc-success-50)] text-[var(--cc-success-700)] dark:bg-emerald-950/45 dark:text-emerald-300';
      case 'WARNING':
        return 'border-[var(--cc-warning-500)]/20 bg-[var(--cc-warning-50)] text-[var(--cc-warning-700)] dark:bg-amber-950/45 dark:text-amber-300';
      case 'ERROR':
        return 'border-[var(--cc-danger-500)]/20 bg-[var(--cc-danger-50)] text-[var(--cc-danger-700)] dark:bg-rose-950/45 dark:text-rose-300';
      case 'INFO':
        return 'border-[var(--cc-info-500)]/20 bg-[var(--cc-info-50)] text-[var(--cc-info-700)] dark:bg-sky-950/45 dark:text-sky-300';
      case 'DEFAULT':
      default:
        return 'border-[var(--color-border)] bg-[var(--cc-surface-3)] text-[var(--cc-ink-700)] dark:text-slate-300';
    }
  };

  return (
    <span className={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-xs font-bold ${getVariantStyles()} ${className}`}>
      {children}
    </span>
  );
};
