export type MatchingMode = 'hour_block' | 'exact';

export type ProcurementDirection = 'OVERFORECAST' | 'UNDERFORECAST' | 'BALANCED' | 'UNKNOWN';

export interface IntervalRecord {
  start_time: string;
  settlement_date: string;
  settlement_period: number;
  actual_mw: number | null;
  forecast_mw: number | null;
  error_mw: number | null;
  abs_error_mw: number | null;
  publish_time: string | null;
  eligible_cutoff: string;
  status: 'matched' | 'missing_actual' | 'missing_forecast' | 'missing_both';
  procurement_direction: ProcurementDirection;
  procurement_note: string;
}

export interface AccuracyMetrics {
  sample_count: number;
  expected_intervals: number;
  coverage_pct: number;
  mae_mw: number | null;
  rmse_mw: number | null;
  mean_error_mw: number | null;
  mape_pct: number | null;
  wape_pct: number | null;
  max_overprediction_mw: number | null;
  max_underprediction_mw: number | null;
  overforecast_pct: number;
  underforecast_pct: number;
  total_actual_mwh: number;
  total_forecast_mwh: number;
  mape_explanation: string;
}

export interface DailyAccuracyItem {
  date: string;
  sample_count: number;
  coverage_pct: number;
  mae_mw: number;
  rmse_mw: number;
  mean_error_mw: number;
  actual_avg_mw: number;
  forecast_avg_mw: number;
  procurement_bias: string;
}

export interface ErrorDistributionBucket {
  bucket_label: string;
  min_val: number;
  max_val: number;
  count: number;
  percentage: number;
}

export interface ForecastResponse {
  date: string;
  cutoff_time: string;
  cutoff_timestamp: string;
  matching_mode: string;
  metrics: AccuracyMetrics;
  intervals: IntervalRecord[];
}

export interface AccuracyResponse {
  start_date: string;
  end_date: string;
  cutoff_time: string;
  matching_mode: string;
  aggregate_metrics: AccuracyMetrics;
  daily_breakdown: DailyAccuracyItem[];
  error_distribution: ErrorDistributionBucket[];
}

export interface ForecastVersionItem {
  publish_time: string;
  generation_mw: number;
  is_eligible: boolean;
  is_selected: boolean;
  lead_time_hours: number;
  error_against_actual: number | null;
}

export interface ForecastHistoryResponse {
  delivery_time: string;
  settlement_period: number | null;
  actual_generation_mw: number | null;
  cutoff_time: string;
  cutoff_timestamp: string;
  selected_publish_time: string | null;
  selected_forecast_mw: number | null;
  total_versions_count: number;
  eligible_versions_count: number;
  versions: ForecastVersionItem[];
}

export interface OverviewResponse {
  period_start: string;
  period_end: string;
  selected_date: string;
  cutoff_time: string;
  cutoff_assumption_note: string;
  matching_mode: string;
  data_freshness: string;
  total_actual_records: number;
  total_forecast_records: number;
  overview_metrics: AccuracyMetrics;
  latest_forecast_publish_time: string | null;
}

export interface HealthResponse {
  status: string;
  project: string;
  environment: string;
  data_loaded: boolean;
  fuelhh_records_count: number;
  windfor_records_count: number;
  cache_path: string;
}
