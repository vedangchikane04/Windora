import React from 'react';
import { 
  OverviewResponse, 
  ForecastResponse, 
  IntervalRecord, 
  MatchingMode 
} from '../types';
import { KpiCard } from './KpiCard';
import { ForecastChart } from './ForecastChart';
import { 
  Activity, 
  Calendar, 
  Clock, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Layers,
  ArrowRight
} from 'lucide-react';

interface OverviewViewProps {
  overview: OverviewResponse;
  forecastData: ForecastResponse | null;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  availableDates: string[];
  cutoffTime: string;
  matchingMode: MatchingMode;
  onSelectInterval: (interval: IntervalRecord) => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  overview,
  forecastData,
  selectedDate,
  onSelectDate,
  availableDates,
  cutoffTime,
  matchingMode,
  onSelectInterval,
  onNavigateTab
}) => {
  const metrics = forecastData?.metrics || overview.overview_metrics;

  // Find previous and next dates
  const currentIndex = availableDates.indexOf(selectedDate);
  const prevDate = currentIndex > 0 ? availableDates[currentIndex - 1] : null;
  const nextDate = currentIndex < availableDates.length - 1 ? availableDates[currentIndex + 1] : null;

  // Find max generation and peak error interval
  const intervals = forecastData?.intervals || [];
  let peakActual = 0;
  let peakActualTime = '';
  let peakError = 0;
  let peakErrorTime = '';
  let peakErrorDirection = '';

  intervals.forEach((i) => {
    if (i.actual_mw && i.actual_mw > peakActual) {
      peakActual = i.actual_mw;
      peakActualTime = i.start_time.substring(11, 16);
    }
    if (i.abs_error_mw && i.abs_error_mw > peakError) {
      peakError = i.abs_error_mw;
      peakErrorTime = i.start_time.substring(11, 16);
      peakErrorDirection = (i.error_mw || 0) > 0 ? 'Overforecast (Shortfall)' : 'Underforecast (Surplus)';
    }
  });

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B132B] to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 font-semibold tracking-wider font-mono">
                UK NATIONAL GRID BALANCING MECHANISM
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Data Freshness: Verified January 2026
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Day-Ahead Wind Forecast & Generation Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Evaluating day-ahead wholesale wind forecasts available at gate closure against settlement outturn.
              Identifies systematic prediction bias, volume exposure, and procurement shortfall risks.
            </p>
          </div>

          {/* Quick Date Stepper Control */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-2 rounded-xl self-start lg:self-center">
            <button
              onClick={() => prevDate && onSelectDate(prevDate)}
              disabled={!prevDate}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous delivery day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center px-3 font-mono">
              <div className="text-xs text-slate-400">Delivery Date</div>
              <div className="text-sm font-bold text-white tracking-wide">{selectedDate}</div>
            </div>

            <button
              onClick={() => nextDate && onSelectDate(nextDate)}
              disabled={!nextDate}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next delivery day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status & Cutoff Metadata Strip */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Decision Gate: <strong className="text-slate-200">{cutoffTime} GMT on D-1</strong> (EPEX SPOT Assumption)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Ingested Records: <strong className="text-slate-200">{overview.total_actual_records.toLocaleString()} FUELHH</strong> • <strong className="text-slate-200">{overview.total_forecast_records.toLocaleString()} WINDFOR</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Forecast Coverage: <strong className="text-emerald-400">{metrics.coverage_pct}%</strong> ({metrics.sample_count}/48 intervals)
            </span>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Actual Delivered Energy"
          value={metrics.total_actual_mwh ? metrics.total_actual_mwh.toLocaleString() : '—'}
          unit="MWh"
          subtitle={`Peak: ${peakActual.toLocaleString()} MW at ${peakActualTime} UTC`}
          tooltip="Total electrical energy generated from UK wind farms across the selected 24-hour delivery day."
          trend="positive"
          badge="Outturn"
          badgeColor="emerald"
        />

        <KpiCard
          title="Day-Ahead Forecast Energy"
          value={metrics.total_forecast_mwh ? metrics.total_forecast_mwh.toLocaleString() : '—'}
          unit="MWh"
          subtitle="Forecast scheduled at gate closure"
          tooltip="Total wind energy volume anticipated at day-ahead decision cutoff."
          trend="neutral"
          badge="Schedule"
          badgeColor="sky"
        />

        <KpiCard
          title="Daily Mean Absolute Error (MAE)"
          value={metrics.mae_mw !== null ? metrics.mae_mw.toLocaleString() : '—'}
          unit="MW"
          subtitle={`RMSE: ${metrics.rmse_mw !== null ? metrics.rmse_mw.toLocaleString() : '—'} MW`}
          tooltip="Average magnitude of forecast error per 30-minute settlement period."
          trend="neutral"
          badge="Accuracy"
          badgeColor="slate"
        />

        <KpiCard
          title="Forecast Bias (Mean Error)"
          value={
            metrics.mean_error_mw !== null && metrics.mean_error_mw !== undefined
              ? `${metrics.mean_error_mw > 0 ? '+' : ''}${metrics.mean_error_mw.toLocaleString()}`
              : '—'
          }
          unit="MW"
          subtitle={
            metrics.mean_error_mw && metrics.mean_error_mw > 0
              ? `Overforecast (+${Math.round(metrics.overforecast_pct)}% of intervals)`
              : `Underforecast (+${Math.round(metrics.underforecast_pct)}% of intervals)`
          }
          tooltip="Signed error: Forecast - Actual. Positive = Overforecast (Shortfall risk). Negative = Underforecast (Surplus risk)."
          trend={metrics.mean_error_mw && metrics.mean_error_mw > 0 ? 'warning' : 'positive'}
          badge={metrics.mean_error_mw && metrics.mean_error_mw > 0 ? 'Shortfall Risk' : 'Surplus Risk'}
          badgeColor={metrics.mean_error_mw && metrics.mean_error_mw > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Main Interactive Forecast vs Actual Chart */}
      {forecastData && (
        <ForecastChart
          intervals={forecastData.intervals}
          onSelectInterval={onSelectInterval}
        />
      )}

      {/* Quick Action Cards to Other Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => onNavigateTab('forecast')}
          className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-sky-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5 uppercase tracking-wide">
              <TrendingUp className="w-4 h-4" />
              Interval Inspection
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">Forecast vs Actual Deep Dive</h4>
          <p className="text-xs text-slate-400">
            Inspect all 48 settlement periods with interval tooltips, error diffs, and individual timestamps.
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab('accuracy')}
          className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-sky-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
              <Layers className="w-4 h-4" />
              Monthly Statistical Metrics
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">Accuracy Intelligence Suite</h4>
          <p className="text-xs text-slate-400">
            Analyze MAE, RMSE, WAPE, and error distribution across all 31 days in January 2026.
          </p>
        </div>

        <div 
          onClick={() => onNavigateTab('procurement')}
          className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-sky-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4" />
              Qualitative Procurement Impact
            </span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">Procurement Decision Support</h4>
          <p className="text-xs text-slate-400">
            Understand imbalance exposure, replacement energy demand, and spill risks.
          </p>
        </div>
      </div>
    </div>
  );
};
