import React, { useEffect, useState } from 'react';
import { 
  X, 
  History, 
  Clock
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-white border-l border-[#d8e8f2] h-full shadow-2xl flex flex-col z-50">
        
        {/* Header */}
        <div className="p-5 border-b border-[#d8e8f2] flex items-center justify-between bg-[#f4f9fc]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#c3e4f3]/40 border border-[#91cfec] flex items-center justify-center text-[#259ed9]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#253949] font-mono flex items-center gap-2">
                <span>Forecast Revision History</span>
              </h2>
              <p className="text-xs text-[#5b7282]">
                Delivery: <span className="text-[#253949] font-semibold">{deliveryTime.replace('T', ' ').replace('Z', ' UTC')}</span>
                {data?.settlement_period && <span> • Settlement Period {data.settlement_period}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5b7282] hover:text-[#253949] hover:bg-[#c3e4f3]/30 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-24 text-center text-[#5b7282] flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#259ed9] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium">Reconstructing Elexon forecast revisions...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-[#ff9b83]/15 border border-[#ff9b83] rounded-xl text-[#253949] text-sm">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Context Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-[#f4f9fc] border border-[#d8e8f2] p-3 rounded-lg">
                  <div className="text-[#5b7282] text-[11px]">Actual Outturn</div>
                  <div className="text-lg font-bold text-[#253949] mt-1">
                    {data.actual_generation_mw !== null ? `${data.actual_generation_mw.toLocaleString()} MW` : 'Missing'}
                  </div>
                </div>

                <div className="bg-[#f4f9fc] border border-[#d8e8f2] p-3 rounded-lg">
                  <div className="text-[#5b7282] text-[11px]">Selected Forecast</div>
                  <div className="text-lg font-bold text-[#259ed9] mt-1">
                    {data.selected_forecast_mw !== null ? `${data.selected_forecast_mw.toLocaleString()} MW` : 'None'}
                  </div>
                </div>

                <div className="bg-[#f4f9fc] border border-[#d8e8f2] p-3 rounded-lg">
                  <div className="text-[#5b7282] text-[11px]">Decision Cutoff</div>
                  <div className="text-base font-bold text-[#ff9b83] mt-1">
                    {data.cutoff_time} GMT (D-1)
                  </div>
                </div>

                <div className="bg-[#f4f9fc] border border-[#d8e8f2] p-3 rounded-lg">
                  <div className="text-[#5b7282] text-[11px]">Versions (Eligible)</div>
                  <div className="text-base font-bold text-[#253949] mt-1">
                    {data.eligible_versions_count} / {data.total_versions_count}
                  </div>
                </div>
              </div>

              {/* Cutoff Assumption Explanation */}
              <div className="bg-[#c3e4f3]/25 border border-[#91cfec] rounded-lg p-3 text-xs text-[#253949] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#ff9b83]">
                  <Clock className="w-3.5 h-3.5 text-[#ff9b83]" />
                  <span>Day-Ahead Decision Cutoff: {data.cutoff_timestamp.replace('T', ' ').replace('Z', ' UTC')}</span>
                </div>
                <p className="text-[#5b7282] leading-relaxed text-[11px]">
                  Under day-ahead wholesale market mechanics, procurement contracts are placed at the auction gate closure.
                  Forecasts published prior to this cutoff were available for procurement decisions; subsequent revisions represent intraday updates.
                </p>
              </div>

              {/* Revision Trajectory Chart */}
              <div className="bg-white border border-[#d8e8f2] p-4 rounded-xl shadow-xs">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-semibold text-[#253949]">Forecast Progression Over Publication Lead Time</span>
                  <span className="text-[#5b7282] text-[11px]">Publication time vs Predicted Generation</span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8f1f5" />
                      <XAxis dataKey="publishLabel" stroke="#91cfec" fontSize={10} tickLine={false} />
                      <YAxis stroke="#91cfec" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#91cfec', borderRadius: '8px', fontSize: '11px', color: '#253949', boxShadow: '0 4px 12px rgba(37,57,73,0.08)' }}
                        formatter={(val: any, name: any, item: any) => [
                          `${val.toLocaleString()} MW (${item.payload.isEligible ? 'Eligible' : 'Post-Cutoff'})`,
                          'Forecast'
                        ]}
                      />
                      {data.actual_generation_mw !== null && (
                        <ReferenceLine
                          y={data.actual_generation_mw}
                          stroke="#253949"
                          strokeDasharray="4 4"
                          label={{ value: 'Actual Outturn', fill: '#253949', fontSize: 10, position: 'right' }}
                        />
                      )}
                      <Line
                        type="stepAfter"
                        dataKey="gen"
                        stroke="#259ed9"
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (payload.isSelected) {
                            return (
                              <g key={cx}>
                                <circle cx={cx} cy={cy} r={7} fill="#ff9b83" stroke="#253949" strokeWidth={2} />
                                <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />
                              </g>
                            );
                          }
                          return (
                            <circle
                              key={cx}
                              cx={cx}
                              cy={cy}
                              r={3}
                              fill={payload.isEligible ? '#259ed9' : '#c3e4f3'}
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#5b7282] mt-2 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ff9b83] border border-[#253949]"></span>
                    <span className="text-[#253949] font-medium">Selected day-ahead forecast active at cutoff</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c3e4f3]"></span>
                    Post-cutoff revisions
                  </span>
                </div>
              </div>

              {/* Version History Table */}
              <div>
                <h4 className="text-xs font-semibold text-[#5b7282] uppercase tracking-wider mb-2">
                  All Elexon Publication Records for this Interval
                </h4>
                <div className="border border-[#d8e8f2] rounded-xl overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left text-xs text-[#253949]">
                    <thead className="bg-[#f4f9fc] text-[#5b7282] border-b border-[#d8e8f2] text-[11px] font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Publish Time (UTC)</th>
                        <th className="py-2.5 px-3">Lead Hours</th>
                        <th className="py-2.5 px-3">Forecast (MW)</th>
                        <th className="py-2.5 px-3">Error vs Outturn</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf3f7] font-mono">
                      {data.versions.map((ver, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-[#f0f7fb] transition-colors ${
                            ver.is_selected ? 'bg-[#c3e4f3]/35 border-l-4 border-l-[#259ed9]' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-[#253949]">
                            {ver.publish_time.replace('T', ' ').replace('Z', '')}
                          </td>
                          <td className="py-2 px-3 text-[#5b7282]">
                            {ver.lead_time_hours}h ahead
                          </td>
                          <td className="py-2 px-3 font-bold text-[#259ed9]">
                            {ver.generation_mw.toLocaleString()} MW
                          </td>
                          <td className="py-2 px-3">
                            {ver.error_against_actual !== null ? (
                              <span
                                className={
                                  ver.error_against_actual > 0
                                    ? 'text-[#ff9b83] font-bold'
                                    : 'text-[#259ed9] font-semibold'
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
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#259ed9] text-white border border-[#259ed9]">
                                SELECTED (ACTIVE)
                              </span>
                            ) : ver.is_eligible ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#c3e4f3]/50 text-[#253949] border border-[#91cfec]">
                                Eligible
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
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
        <div className="p-4 border-t border-[#d8e8f2] bg-[#f4f9fc] text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-[#d8e8f2] text-[#253949] hover:bg-[#259ed9] hover:text-white hover:border-[#259ed9] text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
export default ForecastHistoryDrawer;
