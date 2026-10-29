import React, { useState, useEffect } from 'react';
import { 
  AccuracyResponse, 
  AccuracyMetrics, 
  DailyAccuracyItem, 
  MatchingMode 
} from '../types';
import { api } from '../services/api';
import { KpiCard } from './KpiCard';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  BarChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { 
  Layers, 
  Calendar, 
  Info, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface AccuracyViewProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  cutoffTime: string;
  matchingMode: MatchingMode;
  dayMetrics: AccuracyMetrics;
}

export const AccuracyView: React.FC<AccuracyViewProps> = ({
  selectedDate,
  onSelectDate,
  cutoffTime,
  matchingMode,
  dayMetrics
}) => {
  const [scope, setScope] = useState<'day' | 'month'>('month');
  const [monthData, setMonthData] = useState<AccuracyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getAccuracy('2026-01-01', '2026-01-31', cutoffTime, matchingMode)
      .then((res) => {
        setMonthData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load accuracy metrics.');
        setLoading(false);
      });
  }, [cutoffTime, matchingMode]);

  const activeMetrics = scope === 'day' ? dayMetrics : (monthData?.aggregate_metrics || dayMetrics);
  const scopeLabel = scope === 'day' ? `Selected Day: ${selectedDate}` : 'Full January 2026 Period (31 Days)';

  return (
    <div className="space-y-6">
      {/* Scope Selector Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-white">Forecast Accuracy & Error Quantisation</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Statistical performance evaluation of day-ahead wind generation forecasts using verified Elexon outturn data.
          </p>
        </div>

        {/* Day vs Month Toggle */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setScope('day')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              scope === 'day'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Day ({selectedDate.substring(5)})
          </button>
          <button
            onClick={() => setScope('month')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              scope === 'month'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Full January 2026 (Month)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="MAE (Mean Absolute Error)"
          value={activeMetrics.mae_mw?.toLocaleString() ?? null}
          unit="MW"
          subtitle={`N=${activeMetrics.sample_count} intervals (${activeMetrics.coverage_pct}% coverage)`}
          tooltip="Average magnitude of forecast errors regardless of direction: (1/N) * Σ |Forecast - Actual|."
          trend="neutral"
          badge={scopeLabel}
          badgeColor="sky"
        />

        <KpiCard
          title="RMSE (Root Mean Square)"
          value={activeMetrics.rmse_mw?.toLocaleString() ?? null}
          unit="MW"
          subtitle="Penalizes large errors heavily"
          tooltip="Square root of the mean squared errors: sqrt((1/N) * Σ (Forecast - Actual)^2). Sensitive to extreme outliers."
          trend="neutral"
          badge="Dispersion"
          badgeColor="slate"
        />

        <KpiCard
          title="Mean Error (Bias)"
          value={
            activeMetrics.mean_error_mw !== null && activeMetrics.mean_error_mw !== undefined
              ? `${activeMetrics.mean_error_mw > 0 ? '+' : ''}${activeMetrics.mean_error_mw.toLocaleString()}`
              : null
          }
          unit="MW"
          subtitle={
            activeMetrics.mean_error_mw && activeMetrics.mean_error_mw > 0
              ? 'Systematic Overprediction'
              : 'Systematic Underprediction'
          }
          tooltip="Average signed forecast error: (1/N) * Σ (Forecast - Actual). Positive value indicates systematic overforecasting."
          trend={activeMetrics.mean_error_mw && activeMetrics.mean_error_mw > 0 ? 'warning' : 'positive'}
          badge={activeMetrics.mean_error_mw && activeMetrics.mean_error_mw > 0 ? 'Shortfall Risk' : 'Surplus Risk'}
          badgeColor={activeMetrics.mean_error_mw && activeMetrics.mean_error_mw > 0 ? 'amber' : 'emerald'}
        />

        <KpiCard
          title="WAPE / Defensible MAPE"
          value={activeMetrics.wape_pct !== null ? `${activeMetrics.wape_pct}%` : '—'}
          unit="WAPE"
          subtitle={activeMetrics.mape_pct !== null ? `MAPE: ${activeMetrics.mape_pct}% (filtered)` : 'Filtered'}
          tooltip="Weighted Absolute Percentage Error (WAPE = Σ|Error| / ΣActual) is volume-weighted and stable. Traditional MAPE excludes near-zero wind (<50 MW)."
          trend="neutral"
          badge="Percentage Metric"
          badgeColor="slate"
        />
      </div>

      {/* Analytical Methodology Note on MAPE & Denominator Limitations */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <span className="font-semibold text-white">Methodological Disclosure: MAPE Limitations in Wind Analytics</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {activeMetrics.mape_explanation}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Daily Breakdown Chart (when available) */}
      {monthData && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Daily Forecast Accuracy & Bias Trend across January 2026
              </h3>
              <p className="text-xs text-slate-400">
                Daily MAE (bar) and Mean Error / Bias (line) for each day of the month.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">31 Evaluated Days</span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={monthData.daily_breakdown.map((d) => ({
                  ...d,
                  dayNum: d.date.substring(8),
                  isCurrent: d.date === selectedDate
                }))}
                margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="dayNum" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} unit=" MW" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(val: any, name: any) => [`${val.toLocaleString()} MW`, name]}
                  labelFormatter={(lbl) => `2026-01-${lbl}`}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }} />
                <ReferenceLine y={0} stroke="#64748B" strokeWidth={1} />
                <Bar name="Daily MAE (MW)" dataKey="mae_mw" fill="#38BDF8" opacity={0.6} radius={[2, 2, 0, 0]} />
                <Line
                  type="monotone"
                  name="Mean Error / Bias (MW)"
                  dataKey="mean_error_mw"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Error Distribution Histogram */}
      {monthData && monthData.error_distribution.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Forecast Error Distribution Across All January 2026 Intervals
              </h3>
              <p className="text-xs text-slate-400">
                Frequency histogram of forecast errors (Forecast - Actual, MW).
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {monthData.aggregate_metrics.sample_count} Total Intervals
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthData.error_distribution}
                margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="bucket_label"
                  stroke="#64748B"
                  fontSize={9}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} unit=" ints" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(val: any, name: any, item: any) => [
                    `${val} intervals (${item.payload.percentage}%)`,
                    'Frequency'
                  ]}
                />
                <Bar
                  dataKey="count"
                  name="Intervals"
                  fill="#10B981"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Daily Breakdown Table */}
      {monthData && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Daily Metrics Summary Table</h3>
            <span className="text-xs text-slate-400">Click a day to focus view</span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-mono sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">MAE (MW)</th>
                  <th className="py-2.5 px-3">RMSE (MW)</th>
                  <th className="py-2.5 px-3">Bias (MW)</th>
                  <th className="py-2.5 px-3">Actual Avg</th>
                  <th className="py-2.5 px-3">Forecast Avg</th>
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {monthData.daily_breakdown.map((row) => {
                  const isSelected = row.date === selectedDate;
                  return (
                    <tr
                      key={row.date}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-sky-950/40 border-l-4 border-l-sky-400' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-semibold text-white">{row.date}</td>
                      <td className="py-2 px-3 text-sky-400 font-bold">{row.mae_mw.toLocaleString()}</td>
                      <td className="py-2 px-3 text-slate-300">{row.rmse_mw.toLocaleString()}</td>
                      <td className="py-2 px-3">
                        <span className={row.mean_error_mw > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                          {row.mean_error_mw > 0 ? '+' : ''}{row.mean_error_mw.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-emerald-400">{row.actual_avg_mw.toLocaleString()}</td>
                      <td className="py-2 px-3 text-sky-400">{row.forecast_avg_mw.toLocaleString()}</td>
                      <td className="py-2 px-3 text-[11px] text-slate-400">{row.procurement_bias}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => onSelectDate(row.date)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-700 text-sky-300 hover:text-white text-[10px] font-semibold transition-colors"
                        >
                          Select Day
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
