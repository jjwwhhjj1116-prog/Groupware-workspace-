import React from 'react';

export const Select = ({ children, onValueChange, value, className }: { children?: React.ReactNode, onValueChange: (val: string) => void, value: string, className?: string }) => <select className={`min-h-10 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-text-main)] shadow-sm outline-none hover:border-[var(--color-border-strong)] ${className || ''}`} value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>;
export const SelectContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export const SelectItem = ({ children, value }: { children?: React.ReactNode, value: string }) => <option value={value}>{children}</option>;
export const SelectTrigger = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export const SelectValue = ({ placeholder }: { placeholder: string }) => <option disabled>{placeholder}</option>;
