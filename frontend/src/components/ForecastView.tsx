import React, { useState } from 'react';
import { ForecastResponse, IntervalRecord } from '../types';
import { ForecastChart } from './ForecastChart';
import { 
  TrendingUp, 
  Calendar, 
  Search, 
  ArrowUpDown, 
  ExternalLink,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';

interface ForecastViewProps {
  forecastData: ForecastResponse | null;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  availableDates: string[];
  cutoffTime: string;
  onSelectInterval: (interval: IntervalRecord) => void;
}

export const ForecastView: React.FC<ForecastViewProps> = ({
  forecastData,
  selectedDate,
  onSelectDate,
  availableDates,
  cutoffTime,
  onSelectInterval
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'OVER' | 'UNDER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!forecastData) return null;

  const intervals = forecastData.intervals;

  const filtered = intervals.filter((i) => {
    if (filterType === 'OVER' && i.procurement_direction !== 'OVERFORECAST') return false;
    if (filterType === 'UNDER' && i.procurement_direction !== 'UNDERFORECAST') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const timeMatch = i.start_time.includes(q);
      const spMatch = `sp ${i.settlement_period}`.includes(q);
      return timeMatch || spMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Time-series Chart */}
      <ForecastChart
        intervals={intervals}
        onSelectInterval={onSelectInterval}
      />

      {/* Interval Table Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span>Settlement Period Data Table ({selectedDate})</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-normal">
                {filtered.length} of {intervals.length} intervals
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any interval row to inspect all historical Elexon forecast iterations leading up to delivery.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter time / SP..."
                className="bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterType === 'ALL' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('OVER')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterType === 'OVER' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Overforecast (Shortfall)
              </button>
              <button
                onClick={() => setFilterType('UNDER')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterType === 'UNDER' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Underforecast (Surplus)
              </button>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-mono sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Delivery (UTC)</th>
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3">Actual (MW)</th>
                <th className="py-2.5 px-3">Day-Ahead Forecast (MW)</th>
                <th className="py-2.5 px-3">Error (F - A)</th>
                <th className="py-2.5 px-3">Absolute Error</th>
                <th className="py-2.5 px-3">Selected Publish Time</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filtered.map((row) => {
                const isOver = row.procurement_direction === 'OVERFORECAST';
                const isUnder = row.procurement_direction === 'UNDERFORECAST';
                return (
                  <tr
                    key={row.start_time}
                    onClick={() => onSelectInterval(row)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {row.start_time.substring(11, 16)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      SP {row.settlement_period}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">
                      {row.actual_mw !== null ? `${row.actual_mw.toLocaleString()} MW` : 'Missing'}
                    </td>
                    <td className="py-2.5 px-3 text-sky-400 font-bold">
                      {row.forecast_mw !== null ? `${row.forecast_mw.toLocaleString()} MW` : 'Missing'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-bold ${
                          isOver ? 'text-amber-400' : isUnder ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {row.error_mw !== null ? `${row.error_mw > 0 ? '+' : ''}${row.error_mw.toLocaleString()} MW` : '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {row.abs_error_mw !== null ? `${row.abs_error_mw.toLocaleString()} MW` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {row.publish_time ? row.publish_time.substring(11, 16) + ' (D-1)' : 'None'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                          isOver
                            ? 'bg-rose-950/70 text-rose-300 border-rose-800'
                            : isUnder
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isOver ? 'Shortfall' : isUnder ? 'Surplus' : 'Balanced'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInterval(row);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 group-hover:bg-sky-600 text-sky-300 group-hover:text-white text-[10px] font-semibold transition-colors flex items-center gap-1 ml-auto"
                      >
                        <span>History</span>
                        <ExternalLink className="w-3 h-3" />
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
