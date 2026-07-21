import React from 'react';
export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`min-h-10 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-main)] shadow-sm outline-none placeholder:text-[var(--color-text-sub)] hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
    {...props}
  />
);
