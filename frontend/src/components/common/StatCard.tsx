import React from 'react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  subtext?: React.ReactNode;
  accent?: 'emerald' | 'slate' | 'amber' | 'rose' | 'sky';
  className?: string;
}

const accentStyles = {
  emerald: 'bg-emerald-50 text-emerald-600',
  slate: 'bg-slate-100 text-slate-700',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  sky: 'bg-sky-50 text-sky-600',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  subtext,
  accent = 'emerald',
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:border-slate-300 transition-colors flex flex-col justify-between gap-3',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', accentStyles[accent])}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{value}</div>
        {subtext && <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">{subtext}</div>}
      </div>
    </div>
  );
};
