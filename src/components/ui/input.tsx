import React from 'react';
export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => <input className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${className || ''}`} {...props} />;
