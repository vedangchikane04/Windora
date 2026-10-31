import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight
} from 'lucide-react';
import { IntervalRecord, AccuracyMetrics } from '../types';

interface ProcurementDecisionViewProps {
  selectedDate: string;
  intervals: IntervalRecord[];
  metrics: AccuracyMetrics;
  onSelectInterval?: (interval: IntervalRecord) => void;
}

export const ProcurementDecisionView: React.FC<ProcurementDecisionViewProps> = ({
  selectedDate,
  intervals,
  metrics,
  onSelectInterval
}) => {
  const [filter, setFilter] = useState<'ALL' | 'OVERFORECAST' | 'UNDERFORECAST'>('ALL');

  const overforecastIntervals = intervals.filter((i) => i.procurement_direction === 'OVERFORECAST');
  const underforecastIntervals = intervals.filter((i) => i.procurement_direction === 'UNDERFORECAST');

  const filteredIntervals = intervals.filter((i) => {
    if (filter === 'OVERFORECAST') return i.procurement_direction === 'OVERFORECAST';
    if (filter === 'UNDERFORECAST') return i.procurement_direction === 'UNDERFORECAST';
    return true;
  });

  // Calculate total shortfall and surplus energy (MWh) for this day
  // Each interval is 30 mins = 0.5 hour
  const totalShortfallMwh = Math.round(
    overforecastIntervals.reduce((acc, i) => acc + (i.error_mw || 0) * 0.5, 0)
  );

  const totalSurplusMwh = Math.round(
    underforecastIntervals.reduce((acc, i) => acc + Math.abs(i.error_mw || 0) * 0.5, 0)
  );

  return (
    <div className="space-y-6">
      {/* Prominent Mandatory Compliance Disclaimer */}
      <div className="bg-[#ff9b83]/15 border border-[#ff9b83]/60 rounded-xl p-4 sm:p-5 shadow-xs text-[#9a3412]">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#ea580c] mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#9a3412] uppercase tracking-wide">
              Qualitative Procurement Decision Support Only
            </h3>
            <p className="text-xs text-[#c2410c] leading-relaxed">
              This module provides qualitative analytical guidance on the directional exposure introduced by wind forecast errors.
              <strong> Important Notice:</strong> Windora does not calculate a utility's actual or financial procurement requirement,
              as consumer demand, other generation fleet output, bilateral contract hedges, and power market prices are outside the permitted Elexon data scope.
            </p>
          </div>
        </div>
      </div>

      {/* Mechanics Explanation: Two Directions of Market Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Overforecast Card (Shortfall) */}
        <div className="bg-white border border-[#ff9b83]/50 rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#ff9b83]/20 text-[#c2410c] border border-[#ff9b83]/60">
                <ArrowUpRight className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-[#253949] uppercase font-mono">
                Overforecast (Wind Shortfall Risk)
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#ff9b83]/20 text-[#c2410c] border border-[#ff9b83] font-mono font-semibold">
              F &gt; A ({metrics.overforecast_pct}%)
            </span>
          </div>

          <p className="text-xs text-[#4a6375] leading-relaxed mb-4">
            When day-ahead wind generation is overpredicted, physical delivery falls short of the market schedule.
            The utility or system operator is physically <strong>short</strong>.
          </p>

          <div className="space-y-2 text-xs bg-[#ff9b83]/10 p-3 rounded-lg border border-[#ff9b83]/30 font-mono">
            <div className="flex justify-between text-[#4a6375]">
              <span>Shortfall Intervals:</span>
              <span className="font-bold text-[#c2410c]">{overforecastIntervals.length} / 48 intervals</span>
            </div>
            <div className="flex justify-between text-[#4a6375]">
              <span>Total Wind Shortfall:</span>
              <span className="font-bold text-[#c2410c]">{totalShortfallMwh > 0 ? `+${totalShortfallMwh.toLocaleString()}` : '0'} MWh</span>
            </div>
            <div className="flex justify-between text-[#4a6375]">
              <span>Market Action:</span>
              <span className="text-[#253949] font-medium">Procure replacement intraday power / incur SBP cashout</span>
            </div>
          </div>
        </div>

        {/* Underforecast Card (Surplus) */}
        <div className="bg-white border border-[#91cfec] rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#c3e4f3]/40 text-[#259ed9] border border-[#91cfec]">
                <ArrowDownRight className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-[#253949] uppercase font-mono">
                Underforecast (Wind Surplus Risk)
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#c3e4f3]/40 text-[#259ed9] border border-[#91cfec] font-mono font-semibold">
              F &lt; A ({metrics.underforecast_pct}%)
            </span>
          </div>

          <p className="text-xs text-[#4a6375] leading-relaxed mb-4">
            When actual wind generation exceeds day-ahead forecasts, more clean electricity materializes than planned.
            The utility is physically <strong>long</strong>.
          </p>

          <div className="space-y-2 text-xs bg-[#c3e4f3]/25 p-3 rounded-lg border border-[#d8e8f2] font-mono">
            <div className="flex justify-between text-[#4a6375]">
              <span>Surplus Intervals:</span>
              <span className="font-bold text-[#259ed9]">{underforecastIntervals.length} / 48 intervals</span>
            </div>
            <div className="flex justify-between text-[#4a6375]">
              <span>Total Wind Surplus:</span>
              <span className="font-bold text-[#259ed9]">-{totalSurplusMwh.toLocaleString()} MWh</span>
            </div>
            <div className="flex justify-between text-[#4a6375]">
              <span>Market Action:</span>
              <span className="text-[#253949] font-medium">Excess thermal hedge procured; spill or sell at SSP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interval-by-Interval Exposure Table */}
      <div className="bg-white border border-[#d8e8f2] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#edf4f8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#253949]">
              Interval Exposure Breakdown for Delivery Date: {selectedDate}
            </h3>
            <p className="text-xs text-[#4a6375]">
              Directional procurement implications for each 30-minute settlement period.
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex items-center gap-1.5 bg-[#ebf5fa] p-1 rounded-lg border border-[#d8e8f2] text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-[#259ed9] text-white shadow-xs font-semibold'
                  : 'text-[#4a6375] hover:text-[#259ed9]'
              }`}
            >
              All (48)
            </button>
            <button
              onClick={() => setFilter('OVERFORECAST')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                filter === 'OVERFORECAST'
                  ? 'bg-[#ff9b83]/20 text-[#c2410c] border border-[#ff9b83] font-semibold'
                  : 'text-[#4a6375] hover:text-[#259ed9]'
              }`}
            >
              Shortfall ({overforecastIntervals.length})
            </button>
            <button
              onClick={() => setFilter('UNDERFORECAST')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                filter === 'UNDERFORECAST'
                  ? 'bg-[#c3e4f3]/40 text-[#259ed9] border border-[#91cfec] font-semibold'
                  : 'text-[#4a6375] hover:text-[#259ed9]'
              }`}
            >
              Surplus ({underforecastIntervals.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left text-xs text-[#253949]">
            <thead className="bg-[#f8fafc] text-[#4a6375] border-b border-[#d8e8f2] text-[11px] font-mono sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Interval (UTC)</th>
                <th className="py-2.5 px-3">SP</th>
                <th className="py-2.5 px-3">Actual (MW)</th>
                <th className="py-2.5 px-3">Forecast (MW)</th>
                <th className="py-2.5 px-3">Error (MW)</th>
                <th className="py-2.5 px-3">Volume Delta</th>
                <th className="py-2.5 px-3">Qualitative Assessment</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf4f8] font-mono">
              {filteredIntervals.map((row) => {
                const isOver = row.procurement_direction === 'OVERFORECAST';
                const isUnder = row.procurement_direction === 'UNDERFORECAST';
                const volumeDeltaMwh = row.error_mw !== null ? Math.round(row.error_mw * 0.5) : null;

                return (
                  <tr key={row.start_time} className="hover:bg-[#ebf5fa]/60 transition-colors">
                    <td className="py-2 px-3 font-semibold text-[#253949]">
                      {row.start_time.substring(11, 16)}
                    </td>
                    <td className="py-2 px-3 text-[#4a6375]">SP {row.settlement_period}</td>
                    <td className="py-2 px-3 text-[#253949] font-bold">
                      {row.actual_mw !== null ? row.actual_mw.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-[#259ed9] font-bold">
                      {row.forecast_mw !== null ? row.forecast_mw.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`font-bold ${
                          isOver ? 'text-[#c2410c]' : isUnder ? 'text-[#259ed9]' : 'text-[#4a6375]'
                        }`}
                      >
                        {row.error_mw !== null ? `${row.error_mw > 0 ? '+' : ''}${row.error_mw.toLocaleString()}` : '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={isOver ? 'text-[#c2410c] font-bold' : isUnder ? 'text-[#259ed9] font-bold' : 'text-[#4a6375]'}>
                        {volumeDeltaMwh !== null ? `${volumeDeltaMwh > 0 ? '+' : ''}${volumeDeltaMwh} MWh` : '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[11px] font-sans text-[#4a6375] max-w-xs truncate">
                      {row.procurement_note}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => onSelectInterval && onSelectInterval(row)}
                        className="px-2 py-1 rounded bg-[#c3e4f3]/30 border border-[#91cfec] hover:bg-[#259ed9] text-[#259ed9] hover:text-white text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        Revisions
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default ProcurementDecisionView;
