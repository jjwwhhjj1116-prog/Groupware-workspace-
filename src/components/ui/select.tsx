import React from 'react';

export const Select = ({ children, onValueChange, value, className }: { children?: React.ReactNode, onValueChange: (val: string) => void, value: string, className?: string }) => <select className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${className || ''}`} value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>;
export const SelectContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export const SelectItem = ({ children, value }: { children?: React.ReactNode, value: string }) => <option value={value}>{children}</option>;
export const SelectTrigger = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export const SelectValue = ({ placeholder }: { placeholder: string }) => <option disabled>{placeholder}</option>;
