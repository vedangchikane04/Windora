import React, { useState, useEffect } from 'react';
import { 
  ForecastHistoryResponse, 
  IntervalRecord, 
  MatchingMode 
} from '../types';
import { api } from '../services/api';
import { 
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

interface ForecastRevisionHistoryViewProps {
  selectedDate: string;
  intervals: IntervalRecord[];
  cutoffTime: string;
  matchingMode: MatchingMode;
  initialSelectedInterval?: IntervalRecord | null;
}

export const ForecastRevisionHistoryView: React.FC<ForecastRevisionHistoryViewProps> = ({
  intervals,
  cutoffTime,
  matchingMode,
  initialSelectedInterval
}) => {
  // Default to 12:00 UTC interval or initial
  const defaultInterval = initialSelectedInterval || intervals.find((i) => i.start_time.includes('12:00:00')) || intervals[0];
  const [selectedInterval, setSelectedInterval] = useState<IntervalRecord | null>(defaultInterval || null);
  const [historyData, setHistoryData] = useState<ForecastHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedInterval) {
      setSelectedInterval(initialSelectedInterval);
    } else if (intervals.length > 0 && !selectedInterval) {
      const mid = intervals.find((i) => i.start_time.includes('12:00:00')) || intervals[0];
      setSelectedInterval(mid);
    }
  }, [initialSelectedInterval, intervals]);

  useEffect(() => {
    if (!selectedInterval) return;
    setLoading(true);
    setError(null);
    api.getForecastHistory(selectedInterval.start_time, cutoffTime, matchingMode)
      .then((res) => {
        setHistoryData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch revision history.');
        setLoading(false);
      });
  }, [selectedInterval, cutoffTime, matchingMode]);

  const chartData = historyData?.versions.map((v) => ({
    raw: v,
    publishLabel: v.publish_time.substring(5, 16).replace('T', ' '),
    gen: v.generation_mw,
    leadHours: v.lead_time_hours,
    isEligible: v.is_eligible,
    isSelected: v.is_selected
  })) || [];

  return (
    <div className="space-y-6">
      {/* Interval Picker Bar */}
      <div className="bg-white border border-[#d8e8f2] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-[#259ed9]" />
            <h2 className="text-lg font-bold text-[#253949]">Forecast Publication History & Revision Tracking</h2>
          </div>
          <p className="text-xs text-[#5b7282] mt-1">
            Track all Elexon forecast iterations published over time for a target half-hour delivery interval.
          </p>
        </div>

        {/* Interval Dropdown */}
        <div className="flex items-center gap-2 bg-[#f4f9fc] border border-[#d8e8f2] rounded-xl px-3 py-1.5 text-xs font-mono">
          <Clock className="w-4 h-4 text-[#259ed9]" />
          <span className="text-[#5b7282]">Target Interval:</span>
          <select
            value={selectedInterval?.start_time || ''}
            onChange={(e) => {
              const found = intervals.find((i) => i.start_time === e.target.value);
              if (found) setSelectedInterval(found);
            }}
            className="bg-transparent text-[#253949] font-bold focus:outline-none cursor-pointer"
          >
            {intervals.map((i) => (
              <option key={i.start_time} value={i.start_time} className="bg-white text-[#253949]">
                {i.start_time.substring(11, 16)} UTC (SP {i.settlement_period})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-[#5b7282] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#259ed9] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium">Reconstructing Elexon forecast revision history...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-[#ff9b83]/15 border border-[#ff9b83] rounded-xl text-[#253949] text-sm">
          {error}
        </div>
      ) : historyData ? (
        <>
          {/* Key Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-white border border-[#d8e8f2] p-4 rounded-xl shadow-xs">
              <span className="text-[#5b7282] text-[11px]">Actual Outturn (FUELHH)</span>
              <div className="text-2xl font-bold text-[#253949] mt-1">
                {historyData.actual_generation_mw !== null ? `${historyData.actual_generation_mw.toLocaleString()} MW` : 'Missing'}
              </div>
            </div>

            <div className="bg-white border border-[#d8e8f2] p-4 rounded-xl shadow-xs">
              <span className="text-[#5b7282] text-[11px]">Selected Day-Ahead Forecast</span>
              <div className="text-2xl font-bold text-[#259ed9] mt-1">
                {historyData.selected_forecast_mw !== null ? `${historyData.selected_forecast_mw.toLocaleString()} MW` : 'None'}
              </div>
            </div>

            <div className="bg-white border border-[#d8e8f2] p-4 rounded-xl shadow-xs">
              <span className="text-[#5b7282] text-[11px]">Decision Gate Cutoff</span>
              <div className="text-xl font-bold text-[#ff9b83] mt-1">
                {historyData.cutoff_time} GMT on D-1
              </div>
            </div>

            <div className="bg-white border border-[#d8e8f2] p-4 rounded-xl shadow-xs">
              <span className="text-[#5b7282] text-[11px]">Eligible vs Total Iterations</span>
              <div className="text-xl font-bold text-[#253949] mt-1">
                {historyData.eligible_versions_count} eligible / {historyData.total_versions_count} total
              </div>
            </div>
          </div>

          {/* Revision Evolution Chart */}
          <div className="bg-white border border-[#d8e8f2] p-5 rounded-xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-[#edf3f7] gap-2 text-xs">
              <div>
                <h3 className="text-sm font-semibold text-[#253949]">
                  Forecast Evolution Across Successive Elexon Model Runs
                </h3>
                <p className="text-[#5b7282]">
                  Shows how wind generation predictions updated from 72h ahead through the day-ahead cutoff to intraday.
                </p>
              </div>
              <span className="font-mono text-[#5b7282]">Target: {historyData.delivery_time.replace('T', ' ').replace('Z', ' UTC')}</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8f1f5" vertical={false} />
                  <XAxis dataKey="publishLabel" stroke="#91cfec" fontSize={10} tickLine={false} />
                  <YAxis stroke="#91cfec" fontSize={11} tickLine={false} unit=" MW" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#91cfec', borderRadius: '8px', fontSize: '11px', color: '#253949', boxShadow: '0 4px 12px rgba(37,57,73,0.08)' }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val.toLocaleString()} MW (${item.payload.isEligible ? 'Eligible at Cutoff' : 'Post-Cutoff / Intraday'})`,
                      'Forecast'
                    ]}
                  />
                  {historyData.actual_generation_mw !== null && (
                    <ReferenceLine
                      y={historyData.actual_generation_mw}
                      stroke="#253949"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ value: 'Actual Outturn', fill: '#253949', fontSize: 11, position: 'right' }}
                    />
                  )}
                  <Line
                    type="stepAfter"
                    dataKey="gen"
                    stroke="#259ed9"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.isSelected) {
                        return (
                          <g key={cx}>
                            <circle cx={cx} cy={cy} r={8} fill="#ff9b83" stroke="#253949" strokeWidth={2} />
                            <circle cx={cx} cy={cy} r={3} fill="#ffffff" />
                          </g>
                        );
                      }
                      return (
                        <circle
                          key={cx}
                          cx={cx}
                          cy={cy}
                          r={3.5}
                          fill={payload.isEligible ? '#259ed9' : '#c3e4f3'}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-xs text-[#5b7282] mt-3 pt-2 border-t border-[#edf3f7] font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#ff9b83] border border-[#253949]"></span>
                  <span className="font-semibold text-[#253949]">Selected Active Forecast (at Cutoff)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#259ed9]"></span>
                  Eligible Historical Runs
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#c3e4f3]"></span>
                  Post-Cutoff (Intraday) Runs
                </span>
              </div>
            </div>
          </div>

          {/* Versions Table */}
          <div className="bg-white border border-[#d8e8f2] rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#edf3f7] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#253949]">Detailed Elexon Publication Records</h3>
              <span className="text-xs text-[#5b7282] font-mono">{historyData.versions.length} Total Versions</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs text-[#253949]">
                <thead className="bg-[#f4f9fc] text-[#5b7282] border-b border-[#d8e8f2] text-[11px] font-mono sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Publication Timestamp (UTC)</th>
                    <th className="py-2.5 px-3">Lead Time</th>
                    <th className="py-2.5 px-3">Forecast Value (MW)</th>
                    <th className="py-2.5 px-3">Error Against Actual</th>
                    <th className="py-2.5 px-3">Eligibility Status</th>
                    <th className="py-2.5 px-3 text-right">Selection Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3f7] font-mono">
                  {historyData.versions.map((ver, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-[#f0f7fb] transition-colors ${
                        ver.is_selected ? 'bg-[#c3e4f3]/35 border-l-4 border-l-[#259ed9] font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-[#253949]">
                        {ver.publish_time.replace('T', ' ').replace('Z', ' UTC')}
                      </td>
                      <td className="py-2.5 px-3 text-[#5b7282]">
                        {ver.lead_time_hours} hours ahead
                      </td>
                      <td className="py-2.5 px-3 text-[#259ed9] font-bold">
                        {ver.generation_mw.toLocaleString()} MW
                      </td>
                      <td className="py-2.5 px-3">
                        {ver.error_against_actual !== null ? (
                          <span
                            className={
                              ver.error_against_actual > 0 ? 'text-[#ff9b83] font-bold' : 'text-[#259ed9] font-semibold'
                            }
                          >
                            {ver.error_against_actual > 0 ? '+' : ''}
                            {ver.error_against_actual.toLocaleString()} MW
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {ver.is_eligible ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#c3e4f3]/50 text-[#253949] border border-[#91cfec]">
                            Eligible (&le; {historyData.cutoff_time} GMT)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Ineligible (Post-Cutoff)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {ver.is_selected ? (
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#259ed9] text-white border border-[#259ed9]">
                            SELECTED FORECAST
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
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
  );
};
export default ForecastRevisionHistoryView;
