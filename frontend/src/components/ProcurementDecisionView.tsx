import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle, 
  Info, 
  TrendingUp, 
  TrendingDown,
  Layers,
  FileText
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
      <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 sm:p-5 shadow-lg text-amber-200">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
              Qualitative Procurement Decision Support Only
            </h3>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              This module provides qualitative analytical guidance on the directional exposure introduced by wind forecast errors.
              <strong> Important Notice:</strong> Windora does not calculate a utility's actual or financial procurement requirement,
              as consumer demand, other generation fleet output, bilateral contract hedges, and power market prices are outside the permitted Elexon data scope.
            </p>
          </div>
        </div>
      </div>

      {/* Mechanics Explanation: Two Directions of Market Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Overforecast Card */}
        <div className="bg-slate-900/90 border border-rose-900/50 rounded-xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-800">
                <ArrowUpRight className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Overforecast (Wind Shortfall Risk)
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-mono">
              F &gt; A ({metrics.overforecast_pct}%)
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            When day-ahead wind generation is overpredicted, physical delivery will fall short of the market schedule.
            The utility or system operator is physically <strong>short</strong>.
          </p>

          <div className="space-y-2 text-xs bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 font-mono">
            <div className="flex justify-between text-slate-300">
              <span>Shortfall Intervals:</span>
              <span className="font-bold text-rose-400">{overforecastIntervals.length} / 48 intervals</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Wind Shortfall:</span>
              <span className="font-bold text-rose-400">+{totalShortfallMwh.toLocaleString()} MWh</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Market Action:</span>
              <span className="text-slate-200">Procure replacement intraday power / incur SBP cashout</span>
            </div>
          </div>
        </div>

        {/* Underforecast Card */}
        <div className="bg-slate-900/90 border border-emerald-900/50 rounded-xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                <ArrowDownRight className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Underforecast (Wind Surplus Risk)
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
              F &lt; A ({metrics.underforecast_pct}%)
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            When actual wind generation exceeds day-ahead forecasts, more clean electricity materializes than planned.
            The utility is physically <strong>long</strong>.
          </p>

          <div className="space-y-2 text-xs bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 font-mono">
            <div className="flex justify-between text-slate-300">
              <span>Surplus Intervals:</span>
              <span className="font-bold text-emerald-400">{underforecastIntervals.length} / 48 intervals</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Wind Surplus:</span>
              <span className="font-bold text-emerald-400">-{totalSurplusMwh.toLocaleString()} MWh</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Market Action:</span>
              <span className="text-slate-200">Excess thermal hedge procured; spill or sell at SSP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interval-by-Interval Exposure Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Interval Exposure Breakdown for Delivery Date: {selectedDate}
            </h3>
            <p className="text-xs text-slate-400">
              Directional procurement implications for each 30-minute settlement period.
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filter === 'ALL' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All (48)
            </button>
            <button
              onClick={() => setFilter('OVERFORECAST')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filter === 'OVERFORECAST' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Shortfall ({overforecastIntervals.length})
            </button>
            <button
              onClick={() => setFilter('UNDERFORECAST')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filter === 'UNDERFORECAST' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Surplus ({underforecastIntervals.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-mono sticky top-0">
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
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredIntervals.map((row) => {
                const isOver = row.procurement_direction === 'OVERFORECAST';
                const isUnder = row.procurement_direction === 'UNDERFORECAST';
                const volumeDeltaMwh = row.error_mw !== null ? Math.round(row.error_mw * 0.5) : null;

                return (
                  <tr key={row.start_time} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-white">
                      {row.start_time.substring(11, 16)}
                    </td>
                    <td className="py-2 px-3 text-slate-400">SP {row.settlement_period}</td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">
                      {row.actual_mw !== null ? row.actual_mw.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3 text-sky-400 font-bold">
                      {row.forecast_mw !== null ? row.forecast_mw.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`font-bold ${
                          isOver ? 'text-rose-400' : isUnder ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {row.error_mw !== null ? `${row.error_mw > 0 ? '+' : ''}${row.error_mw.toLocaleString()}` : '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={isOver ? 'text-rose-400' : isUnder ? 'text-emerald-400' : 'text-slate-400'}>
                        {volumeDeltaMwh !== null ? `${volumeDeltaMwh > 0 ? '+' : ''}${volumeDeltaMwh} MWh` : '—'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[11px] font-sans text-slate-300 max-w-xs truncate">
                      {row.procurement_note}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => onSelectInterval && onSelectInterval(row)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-600 text-sky-300 hover:text-white text-[10px] font-semibold transition-colors"
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
