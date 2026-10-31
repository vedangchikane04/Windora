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
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'amber':
        return 'bg-[#ff9b83]/20 text-[#c2410c] border-[#ff9b83]';
      case 'rose':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'slate':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-[#c3e4f3]/40 text-[#253949] border-[#91cfec]';
    }
  };

  return (
    <div className="bg-white border border-[#d8e8f2] rounded-xl p-4 shadow-xs hover:shadow-md hover:border-[#259ed9] transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-xs text-[#4a6375] mb-1.5">
          <div className="flex items-center gap-1.5 font-semibold tracking-wide uppercase text-[11px]">
            <span>{title}</span>
            {tooltip && (
              <div className="group relative cursor-help">
                <Info className="w-3.5 h-3.5 text-[#91cfec] group-hover:text-[#259ed9] transition-colors" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-60 p-2.5 bg-white border border-[#c3e4f3] text-xs text-[#253949] rounded-lg shadow-xl z-50 normal-case font-normal leading-relaxed">
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
          <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[#253949] tabular-nums">
            {value !== null && value !== undefined ? value : '—'}
          </span>
          {unit && <span className="text-sm font-semibold text-[#4a6375] font-mono">{unit}</span>}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-[#edf4f8] flex items-center justify-between text-xs text-[#6b8597] font-mono">
        <span className="truncate">{subtitle || 'Evaluated intervals'}</span>
        {trendLabel && (
          <span
            className={`font-semibold ${
              trend === 'positive'
                ? 'text-emerald-700'
                : trend === 'warning'
                ? 'text-[#ea580c]'
                : trend === 'negative'
                ? 'text-rose-700'
                : 'text-[#4a6375]'
            }`}
          >
            {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
};
export default KpiCard;
