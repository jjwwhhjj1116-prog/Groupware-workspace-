import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  subtitle?: string;
  onClick?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon: Icon, colorClass, subtitle, onClick }) => {
  const tone = colorClass.includes('red')
    ? 'danger'
    : colorClass.includes('green')
      ? 'success'
      : colorClass.includes('orange') || colorClass.includes('yellow')
        ? 'warning'
        : colorClass.includes('blue')
          ? 'info'
          : 'brand';
  const toneClasses = {
    brand: 'bg-[var(--cc-orange-50)] text-[var(--cc-orange-700)]',
    danger: 'bg-[var(--cc-danger-50)] text-[var(--cc-danger-700)]',
    success: 'bg-[var(--cc-success-50)] text-[var(--cc-success-700)]',
    warning: 'bg-[var(--cc-warning-50)] text-[var(--cc-warning-700)]',
    info: 'bg-[var(--cc-info-50)] text-[var(--cc-info-700)]',
  }[tone];

  const content = (
    <>
      <div className={`p-3.5 rounded-2xl ${toneClasses}`}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] uppercase tracking-[0.07em] text-[var(--color-text-sub)] font-extrabold mb-1 truncate">{title}</p>
        <p className="text-3xl font-black text-[var(--color-text-main)] tabular-nums tracking-[-0.035em] mb-1">{value}</p>
        {subtitle && <p className="text-[12px] leading-5 text-[var(--color-text-sub)] line-clamp-2">{subtitle}</p>}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="cc-card cc-interactive w-full p-5 text-left flex items-start gap-4"
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="cc-card p-5 flex items-start gap-4">
      {content}
    </div>
  );
};
