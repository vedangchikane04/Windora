import React from 'react';
import { Info } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number | null;
  unit?: string;
  subtitle?: string;
  tooltip?: string;
  trend?: 'positive' | 'negative' | 'neutral' | 'warning';
  trendLabel?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'sky' | 'rose' | 'slate';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  tooltip,
  trend,
  trendLabel,
  badge,
  badgeColor = 'sky'
}) => {
  const getBadgeStyle = () => {
    switch (badgeColor) {
      case 'emerald':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'amber':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'rose':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'slate':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-sky-950/80 text-sky-300 border-sky-800';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg hover:border-slate-700/80 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <div className="flex items-center gap-1.5 font-medium tracking-wide uppercase text-[11px]">
            <span>{title}</span>
            {tooltip && (
              <div className="group relative cursor-help">
                <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300 transition-colors" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded shadow-xl z-50 normal-case font-normal">
                  {tooltip}
                </div>
              </div>
            )}
          </div>
          {badge && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getBadgeStyle()}`}>
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white tabular-nums">
            {value !== null && value !== undefined ? value : '—'}
          </span>
          {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="truncate">{subtitle || 'Evaluated intervals'}</span>
        {trendLabel && (
          <span
            className={`font-medium ${
              trend === 'positive'
                ? 'text-emerald-400'
                : trend === 'warning'
                ? 'text-amber-400'
                : trend === 'negative'
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
};
