import React from 'react';
import { Calendar } from 'lucide-react';
import { formatLocalYMD } from '../../lib/formatters';

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  onChange: (nextFrom: string, nextTo: string, triggerApply?: boolean) => void;
  onApply: () => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  fromDate,
  toDate,
  onChange,
  onApply,
}) => {
  const applyPreset = (preset: 'today' | '7days' | '30days' | 'clear') => {
    const now = new Date();
    if (preset === 'today') {
      const today = formatLocalYMD(now);
      onChange(today, today, true);
    } else if (preset === '7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      onChange(formatLocalYMD(past), formatLocalYMD(now), true);
    } else if (preset === '30days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      onChange(formatLocalYMD(past), formatLocalYMD(now), true);
    } else {
      onChange('', '', true);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5">
        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => onChange(e.target.value, toDate, false)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          title="Từ ngày"
        />
        <span className="text-slate-400">đến</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => onChange(fromDate, e.target.value, false)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          title="Đến ngày"
        />
        <button
          type="button"
          onClick={onApply}
          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
        >
          Lọc
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap ml-auto">
        <button
          type="button"
          onClick={() => applyPreset('today')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
        >
          Hôm nay
        </button>
        <button
          type="button"
          onClick={() => applyPreset('7days')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
        >
          7 ngày qua
        </button>
        <button
          type="button"
          onClick={() => applyPreset('30days')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
        >
          30 ngày qua
        </button>
        {(fromDate || toDate) && (
          <button
            type="button"
            onClick={() => applyPreset('clear')}
            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition-colors"
          >
            Xóa lọc
          </button>
        )}
      </div>
    </div>
  );
};
