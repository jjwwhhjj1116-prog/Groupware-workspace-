import React from 'react';
export const Button = ({ variant, size, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; className?: string }) => <button className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${className || ''}`} {...props} />;
