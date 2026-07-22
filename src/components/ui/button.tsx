import React from 'react';

const variants = {
  primary: 'bg-[var(--color-primary-strong)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm hover:shadow-[var(--cc-shadow-orange)]',
  secondary: 'bg-[var(--color-surface)] text-[var(--color-text-main)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-strong)]',
  outline: 'bg-[var(--color-surface)] text-[var(--color-text-main)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary-strong)]',
  danger: 'bg-[var(--cc-danger-700)] text-white hover:bg-[var(--color-danger)]',
  ghost: 'bg-transparent text-[var(--color-text-sub)] hover:bg-[var(--cc-surface-3)] hover:text-[var(--color-text-main)]',
} as const;

const sizes = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-10 px-4 text-sm',
  lg: 'min-h-11 px-5 text-sm',
} as const;

export const Button = ({ variant, size = 'md', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string }) => (
  <button
    className={`inline-flex items-center justify-center rounded-[var(--radius-button)] font-semibold transition-[background-color,color,border-color,box-shadow,transform] active:translate-y-px focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variant ? variants[variant] : ''} ${className}`}
    {...props}
  />
);
