import React, { useEffect, useState } from 'react';
import { 
  X, 
  History, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Layers, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { api } from '../services/api';
import { ForecastHistoryResponse, MatchingMode } from '../types';

interface ForecastHistoryDrawerProps {
  deliveryTime: string | null;
  cutoffTime: string;
  matchingMode: MatchingMode;
  onClose: () => void;
}

export const ForecastHistoryDrawer: React.FC<ForecastHistoryDrawerProps> = ({
  deliveryTime,
  cutoffTime,
  matchingMode,
  onClose
}) => {
  const [data, setData] = useState<ForecastHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deliveryTime) return;
    setLoading(true);
    setError(null);
    api.getForecastHistory(deliveryTime, cutoffTime, matchingMode)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch forecast version history.');
        setLoading(false);
      });
  }, [deliveryTime, cutoffTime, matchingMode]);

  if (!deliveryTime) return null;

  // Chart data formatting
  const chartData = data?.versions.map((v) => ({
    raw: v,
    publishLabel: v.publish_time.substring(5, 16).replace('T', ' '),
    gen: v.generation_mw,
    leadHours: v.lead_time_hours,
    isEligible: v.is_eligible,
    isSelected: v.is_selected
  })) || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-[#0B132B] border-l border-slate-800 h-full shadow-2xl flex flex-col z-50">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <span>Forecast Revision History</span>
              </h2>
              <p className="text-xs text-slate-400">
                Delivery: <span className="text-white font-semibold">{deliveryTime.replace('T', ' ').replace('Z', ' UTC')}</span>
                {data?.settlement_period && <span> • Settlement Period {data.settlement_period}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium">Reconstructing Elexon forecast revisions...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/50 border border-rose-800 rounded-xl text-rose-300 text-sm">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Context Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                  <div className="text-slate-400 text-[11px]">Actual Outturn</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {data.actual_generation_mw !== null ? `${data.actual_generation_mw.toLocaleString()} MW` : 'Missing'}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                  <div className="text-slate-400 text-[11px]">Selected Forecast</div>
                  <div className="text-lg font-bold text-sky-400 mt-1">
                    {data.selected_forecast_mw !== null ? `${data.selected_forecast_mw.toLocaleString()} MW` : 'None'}
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                  <div className="text-slate-400 text-[11px]">Decision Cutoff</div>
                  <div className="text-base font-bold text-amber-300 mt-1">
                    {data.cutoff_time} GMT (D-1)
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                  <div className="text-slate-400 text-[11px]">Versions (Eligible)</div>
                  <div className="text-base font-bold text-slate-200 mt-1">
                    {data.eligible_versions_count} / {data.total_versions_count}
                  </div>
                </div>
              </div>

              {/* Cutoff Assumption Explanation */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Day-Ahead Decision Cutoff: {data.cutoff_timestamp.replace('T', ' ').replace('Z', ' UTC')}</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Under day-ahead wholesale market mechanics, procurement contracts are placed at the auction gate closure.
                  Forecasts published prior to this cutoff were available for procurement decisions; subsequent revisions represent intraday updates.
                </p>
              </div>

              {/* Revision Trajectory Chart */}
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-semibold text-white">Forecast Progression Over Publication Lead Time</span>
                  <span className="text-slate-400 text-[11px]">Publication time vs Predicted Generation</span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                      <XAxis dataKey="publishLabel" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(val: any, name: any, item: any) => [
                          `${val.toLocaleString()} MW (${item.payload.isEligible ? 'Eligible' : 'Post-Cutoff'})`,
                          'Forecast'
                        ]}
                      />
                      {data.actual_generation_mw !== null && (
                        <ReferenceLine
                          y={data.actual_generation_mw}
                          stroke="#10B981"
                          strokeDasharray="4 4"
                          label={{ value: 'Actual Outturn', fill: '#10B981', fontSize: 10, position: 'right' }}
                        />
                      )}
                      <Line
                        type="stepAfter"
                        dataKey="gen"
                        stroke="#38BDF8"
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (payload.isSelected) {
                            return <circle key={cx} cx={cx} cy={cy} r={6} fill="#F59E0B" stroke="#FFFFFF" strokeWidth={2} />;
                          }
                          return (
                            <circle
                              key={cx}
                              cx={cx}
                              cy={cy}
                              r={3}
                              fill={payload.isEligible ? '#38BDF8' : '#64748B'}
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    Golden node = Selected day-ahead forecast active at cutoff
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                    Grey nodes = Post-cutoff revisions
                  </span>
                </div>
              </div>

              {/* Version History Table */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  All Elexon Publication Records for this Interval
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Publish Time (UTC)</th>
                        <th className="py-2.5 px-3">Lead Hours</th>
                        <th className="py-2.5 px-3">Forecast (MW)</th>
                        <th className="py-2.5 px-3">Error vs Outturn</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                      {data.versions.map((ver, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            ver.is_selected ? 'bg-sky-950/40 border-l-4 border-l-amber-400' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-white">
                            {ver.publish_time.replace('T', ' ').replace('Z', '')}
                          </td>
                          <td className="py-2 px-3 text-slate-400">
                            {ver.lead_time_hours}h ahead
                          </td>
                          <td className="py-2 px-3 font-bold text-sky-400">
                            {ver.generation_mw.toLocaleString()} MW
                          </td>
                          <td className="py-2 px-3">
                            {ver.error_against_actual !== null ? (
                              <span
                                className={
                                  ver.error_against_actual > 0
                                    ? 'text-amber-400 font-medium'
                                    : 'text-emerald-400 font-medium'
                                }
                              >
                                {ver.error_against_actual > 0 ? '+' : ''}
                                {ver.error_against_actual.toLocaleString()} MW
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {ver.is_selected ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                                SELECTED (ACTIVE)
                              </span>
                            ) : ver.is_eligible ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800">
                                Eligible
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                Post-Cutoff
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
