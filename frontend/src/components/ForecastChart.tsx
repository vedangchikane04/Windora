import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { IntervalRecord } from '../types';
import { Eye, EyeOff, Layers, ExternalLink, AlertTriangle } from 'lucide-react';

interface ForecastChartProps {
  intervals: IntervalRecord[];
  onSelectInterval?: (interval: IntervalRecord) => void;
  selectedDeliveryTime?: string | null;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  intervals,
  onSelectInterval,
  selectedDeliveryTime
}) => {
  const [showActual, setShowActual] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [showError, setShowError] = useState(true);

  // Transform interval data for recharts
  const chartData = intervals.map((rec) => {
    const timeLabel = rec.start_time.substring(11, 16);
    return {
      raw: rec,
      time: timeLabel,
      fullTime: rec.start_time,
      sp: rec.settlement_period,
      actual: rec.actual_mw,
      forecast: rec.forecast_mw,
      error: rec.error_mw,
      absError: rec.abs_error_mw,
      isSelected: rec.start_time === selectedDeliveryTime
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const rec: IntervalRecord = data.raw;
      const err = rec.error_mw;

      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl text-xs backdrop-blur-md min-w-[260px] text-slate-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <div>
              <span className="font-mono text-sm font-bold text-white">{data.time} UTC</span>
              <span className="ml-2 text-[11px] text-slate-400">SP {rec.settlement_period}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {rec.settlement_date}
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                Actual Outturn:
              </span>
              <span className="font-bold text-emerald-400">
                {rec.actual_mw !== null ? `${rec.actual_mw.toLocaleString()} MW` : 'Missing'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                Day-Ahead Forecast:
              </span>
              <span className="font-bold text-sky-400">
                {rec.forecast_mw !== null ? `${rec.forecast_mw.toLocaleString()} MW` : 'Missing'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Forecast Error (F - A):</span>
              <span
                className={`font-bold ${
                  err === null
                    ? 'text-slate-400'
                    : err > 0
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {err !== null ? `${err > 0 ? '+' : ''}${err.toLocaleString()} MW` : '—'}
              </span>
            </div>
          </div>

          {rec.publish_time && (
            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Published:</span>
              <span className="font-mono text-slate-300">
                {rec.publish_time.replace('T', ' ').replace('Z', ' UTC')}
              </span>
            </div>
          )}

          <div className="mt-2 text-[10px] text-slate-400 italic bg-slate-900/80 p-1.5 rounded border border-slate-800">
            {rec.procurement_note}
          </div>

          <div className="mt-2 text-[10px] text-sky-400 font-medium flex items-center justify-end gap-1">
            <span>Click to inspect revision history</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Day-Ahead Forecast vs Actual Wind Generation</span>
            <span className="text-xs font-normal text-slate-400">
              (30-minute settlement intervals, MW)
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare outturn wind generation against latest eligible day-ahead forecast active at decision cutoff.
          </p>
        </div>

        {/* Visibility Toggles */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowActual(!showActual)}
            className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
              showActual
                ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-400'
            }`}
          >
            {showActual ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Actual (MW)</span>
          </button>

          <button
            onClick={() => setShowForecast(!showForecast)}
            className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
              showForecast
                ? 'bg-sky-950/60 border-sky-700/80 text-sky-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-400'
            }`}
          >
            {showForecast ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Day-Ahead Forecast</span>
          </button>

          <button
            onClick={() => setShowError(!showError)}
            className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors ${
              showError
                ? 'bg-amber-950/60 border-amber-700/80 text-amber-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-400'
            }`}
          >
            {showError ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Error (MW)</span>
          </button>
        </div>
      </div>

      {/* Main Chart Canvas (Expansive Full Screen) */}
      <div className="h-[380px] sm:h-[460px] lg:h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length && onSelectInterval) {
                onSelectInterval(e.activePayload[0].payload.raw);
              }
            }}
          >
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />

            <XAxis
              dataKey="time"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              interval={3}
            />

            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
            />

            <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />

            {/* Error Bars on secondary axis */}
            {showError && (
              <Bar
                name="Forecast Error (MW)"
                dataKey="error"
                fill="#F59E0B"
                opacity={0.4}
                maxBarSize={12}
                radius={[2, 2, 0, 0]}
              />
            )}

            {/* Actual Outturn Area */}
            {showActual && (
              <Area
                type="monotone"
                name="Actual Wind (FUELHH)"
                dataKey="actual"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#actualGradient)"
                activeDot={{ r: 6, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            )}

            {/* Selected Day-Ahead Forecast Line */}
            {showForecast && (
              <Line
                type="monotone"
                name="Selected Forecast (WINDFOR)"
                dataKey="forecast"
                stroke="#38BDF8"
                strokeWidth={2.5}
                strokeDasharray="4 2"
                dot={{ r: 2.5, fill: '#38BDF8' }}
                activeDot={{ r: 6, fill: '#38BDF8', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          Click any 30-min point on the chart to inspect all earlier & intraday forecast revisions.
        </span>
        <span className="font-mono text-slate-400">Units: MW (Average Power)</span>
      </div>
    </div>
  );
};
