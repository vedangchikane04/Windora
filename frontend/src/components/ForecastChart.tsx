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
import { Eye, EyeOff, Layers, ExternalLink } from 'lucide-react';

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
        <div className="bg-white/95 border border-[#c3e4f3] rounded-xl p-3.5 shadow-xl text-xs backdrop-blur-md min-w-[270px] text-[#253949]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#edf4f8]">
            <div>
              <span className="font-mono text-sm font-bold text-[#253949]">{data.time} UTC</span>
              <span className="ml-2 text-[11px] text-[#4a6375] font-medium">SP {rec.settlement_period}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#c3e4f3]/40 text-[#253949] border border-[#91cfec] font-mono font-semibold">
              {rec.settlement_date}
            </span>
          </div>

          <div className="space-y-1.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#4a6375]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#253949]"></span>
                Actual Outturn:
              </span>
              <span className="font-bold text-[#253949]">
                {rec.actual_mw !== null ? `${rec.actual_mw.toLocaleString()} MW` : 'Missing'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#259ed9]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#259ed9]"></span>
                Day-Ahead Forecast:
              </span>
              <span className="font-bold text-[#259ed9]">
                {rec.forecast_mw !== null ? `${rec.forecast_mw.toLocaleString()} MW` : 'Missing'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#edf4f8]">
              <span className="text-[#6b8597]">Forecast Error (F - A):</span>
              <span
                className={`font-bold ${
                  err === null
                    ? 'text-slate-400'
                    : err > 0
                    ? 'text-[#ea580c]'
                    : 'text-[#259ed9]'
                }`}
              >
                {err !== null ? `${err > 0 ? '+' : ''}${err.toLocaleString()} MW` : '—'}
              </span>
            </div>
          </div>

          {rec.publish_time && (
            <div className="mt-2 pt-2 border-t border-[#edf4f8] text-[10px] text-[#6b8597] flex items-center justify-between">
              <span>Published:</span>
              <span className="font-mono text-[#259ed9] font-medium">
                {rec.publish_time.replace('T', ' ').replace('Z', ' UTC')}
              </span>
            </div>
          )}

          <div className="mt-2 text-[10px] text-[#335368] italic bg-[#ebf5fa] p-2 rounded border border-[#d8e8f2]">
            {rec.procurement_note}
          </div>

          <div className="mt-2 text-[10px] text-[#259ed9] font-semibold flex items-center justify-end gap-1">
            <span>Click to inspect revision history</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-[#d8e8f2] rounded-xl p-4 sm:p-6 shadow-xs">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#edf4f8] gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#253949] flex items-center gap-2">
            <span>Day-Ahead Forecast vs Actual Wind Generation</span>
            <span className="text-xs font-normal text-[#4a6375]">
              (30-minute settlement intervals, MW)
            </span>
          </h3>
          <p className="text-xs text-[#6b8597] mt-0.5">
            Compare outturn wind generation against latest eligible day-ahead forecast active at decision cutoff.
          </p>
        </div>

        {/* Visibility Toggles */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowActual(!showActual)}
            className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showActual
                ? 'bg-[#c3e4f3]/40 border-[#253949] text-[#253949] shadow-xs font-semibold'
                : 'bg-[#f8fafc] border-[#d8e8f2] text-[#8aa3b2]'
            }`}
          >
            {showActual ? <Eye className="w-3.5 h-3.5 text-[#253949]" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Actual (MW)</span>
          </button>

          <button
            onClick={() => setShowForecast(!showForecast)}
            className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showForecast
                ? 'bg-[#c3e4f3]/40 border-[#259ed9] text-[#259ed9] shadow-xs font-semibold'
                : 'bg-[#f8fafc] border-[#d8e8f2] text-[#8aa3b2]'
            }`}
          >
            {showForecast ? <Eye className="w-3.5 h-3.5 text-[#259ed9]" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Day-Ahead Forecast</span>
          </button>

          <button
            onClick={() => setShowError(!showError)}
            className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showError
                ? 'bg-[#c3e4f3]/40 border-[#91cfec] text-[#253949] shadow-xs font-semibold'
                : 'bg-[#f8fafc] border-[#d8e8f2] text-[#8aa3b2]'
            }`}
          >
            {showError ? <Eye className="w-3.5 h-3.5 text-[#259ed9]" /> : <EyeOff className="w-3.5 h-3.5" />}
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
                <stop offset="5%" stopColor="#91cfec" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#c3e4f3" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#edf4f8" vertical={false} />

            <XAxis
              dataKey="time"
              stroke="#91cfec"
              fontSize={11}
              tickLine={false}
              interval={3}
            />

            <YAxis
              stroke="#91cfec"
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
              wrapperStyle={{ paddingBottom: '12px', fontSize: '12px', color: '#4a6375' }}
            />

            <ReferenceLine y={0} stroke="#d8e8f2" strokeWidth={1} />

            {/* Error Bars */}
            {showError && (
              <Bar
                name="Forecast Error (MW)"
                dataKey="error"
                fill="#91cfec"
                opacity={0.55}
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
                stroke="#253949"
                strokeWidth={2.5}
                fill="url(#actualGradient)"
                activeDot={{ r: 6, fill: '#253949', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            )}

            {/* Selected Day-Ahead Forecast Line */}
            {showForecast && (
              <Line
                type="monotone"
                name="Selected Forecast (WINDFOR)"
                dataKey="forecast"
                stroke="#259ed9"
                strokeWidth={2.5}
                strokeDasharray="4 2"
                dot={{ r: 2.5, fill: '#259ed9' }}
                activeDot={{ r: 6, fill: '#259ed9', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-[#4a6375]">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#259ed9]" />
          Click any 30-min point on the chart to inspect all earlier & intraday forecast revisions.
        </span>
        <span className="font-mono text-[#6b8597]">Units: MW (Average Power)</span>
      </div>
    </div>
  );
};
export default ForecastChart;
