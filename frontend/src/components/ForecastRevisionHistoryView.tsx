import React, { useState, useEffect } from 'react';
import { 
  ForecastHistoryResponse, 
  IntervalRecord, 
  MatchingMode 
} from '../types';
import { api } from '../services/api';
import { 
  History, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink,
  Layers,
  Info
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
  selectedDate,
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-white">Forecast Publication History & Revision Tracking</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track all Elexon forecast iterations published over time for a target half-hour delivery interval.
          </p>
        </div>

        {/* Interval Dropdown */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono">
          <Clock className="w-4 h-4 text-sky-400" />
          <span className="text-slate-400">Target Interval:</span>
          <select
            value={selectedInterval?.start_time || ''}
            onChange={(e) => {
              const found = intervals.find((i) => i.start_time === e.target.value);
              if (found) setSelectedInterval(found);
            }}
            className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
          >
            {intervals.map((i) => (
              <option key={i.start_time} value={i.start_time} className="bg-slate-900 text-white">
                {i.start_time.substring(11, 16)} UTC (SP {i.settlement_period})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium">Reconstructing Elexon forecast revision history...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-950/50 border border-rose-800 rounded-xl text-rose-300 text-sm">
          {error}
        </div>
      ) : historyData ? (
        <>
          {/* Key Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <span className="text-slate-400 text-[11px]">Actual Outturn (FUELHH)</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {historyData.actual_generation_mw !== null ? `${historyData.actual_generation_mw.toLocaleString()} MW` : 'Missing'}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <span className="text-slate-400 text-[11px]">Selected Day-Ahead Forecast</span>
              <div className="text-2xl font-bold text-sky-400 mt-1">
                {historyData.selected_forecast_mw !== null ? `${historyData.selected_forecast_mw.toLocaleString()} MW` : 'None'}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <span className="text-slate-400 text-[11px]">Decision Gate Cutoff</span>
              <div className="text-xl font-bold text-amber-300 mt-1">
                {historyData.cutoff_time} GMT on D-1
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <span className="text-slate-400 text-[11px]">Eligible vs Total Iterations</span>
              <div className="text-xl font-bold text-slate-200 mt-1">
                {historyData.eligible_versions_count} eligible / {historyData.total_versions_count} total
              </div>
            </div>
          </div>

          {/* Revision Evolution Chart */}
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2 text-xs">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Forecast Evolution Across Successive Elexon Model Runs
                </h3>
                <p className="text-slate-400">
                  Shows how wind generation predictions updated from 72h ahead through the day-ahead cutoff to intraday.
                </p>
              </div>
              <span className="font-mono text-slate-400">Target: {historyData.delivery_time.replace('T', ' ').replace('Z', ' UTC')}</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="publishLabel" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} unit=" MW" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val.toLocaleString()} MW (${item.payload.isEligible ? 'Eligible at Cutoff' : 'Post-Cutoff / Intraday'})`,
                      'Forecast'
                    ]}
                  />
                  {historyData.actual_generation_mw !== null && (
                    <ReferenceLine
                      y={historyData.actual_generation_mw}
                      stroke="#10B981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ value: 'Actual Outturn', fill: '#10B981', fontSize: 11, position: 'right' }}
                    />
                  )}
                  <Line
                    type="stepAfter"
                    dataKey="gen"
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.isSelected) {
                        return <circle key={cx} cx={cx} cy={cy} r={7} fill="#F59E0B" stroke="#FFFFFF" strokeWidth={2} />;
                      }
                      return (
                        <circle
                          key={cx}
                          cx={cx}
                          cy={cy}
                          r={3.5}
                          fill={payload.isEligible ? '#38BDF8' : '#64748B'}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800 font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                  Selected Active Forecast (at Cutoff)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                  Eligible Historical Runs
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                  Post-Cutoff (Intraday) Runs
                </span>
              </div>
            </div>
          </div>

          {/* Versions Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Detailed Elexon Publication Records</h3>
              <span className="text-xs text-slate-400 font-mono">{historyData.versions.length} Total Versions</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-mono sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Publication Timestamp (UTC)</th>
                    <th className="py-2.5 px-3">Lead Time</th>
                    <th className="py-2.5 px-3">Forecast Value (MW)</th>
                    <th className="py-2.5 px-3">Error Against Actual</th>
                    <th className="py-2.5 px-3">Eligibility Status</th>
                    <th className="py-2.5 px-3 text-right">Selection Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {historyData.versions.map((ver, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        ver.is_selected ? 'bg-sky-950/40 border-l-4 border-l-amber-400 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-white">
                        {ver.publish_time.replace('T', ' ').replace('Z', ' UTC')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {ver.lead_time_hours} hours ahead
                      </td>
                      <td className="py-2.5 px-3 text-sky-400 font-bold">
                        {ver.generation_mw.toLocaleString()} MW
                      </td>
                      <td className="py-2.5 px-3">
                        {ver.error_against_actual !== null ? (
                          <span
                            className={
                              ver.error_against_actual > 0 ? 'text-amber-400' : 'text-emerald-400'
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                            Eligible (&le; {historyData.cutoff_time} GMT)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            Ineligible (Post-Cutoff)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {ver.is_selected ? (
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                            SELECTED FORECAST
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
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
