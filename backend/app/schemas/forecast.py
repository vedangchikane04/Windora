from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class MatchingMode(str, Enum):
    HOUR_BLOCK = "hour_block"
    EXACT = "exact"

class ProcurementDirection(str, Enum):
    OVERFORECAST = "OVERFORECAST"       # Forecast > Actual: Wind Shortfall -> May need to purchase replacement power
    UNDERFORECAST = "UNDERFORECAST"     # Forecast < Actual: Wind Surplus -> May have procured excess thermal power
    BALANCED = "BALANCED"
    UNKNOWN = "UNKNOWN"

class IntervalRecord(BaseModel):
    start_time: str = Field(..., description="Delivery interval start time in UTC ISO 8601")
    settlement_date: str = Field(..., description="Settlement calendar date (YYYY-MM-DD)")
    settlement_period: int = Field(..., description="Settlement period number (1-48, or up to 50)")
    actual_mw: Optional[float] = Field(None, description="Actual wind generation in MW (from FUELHH)")
    forecast_mw: Optional[float] = Field(None, description="Selected day-ahead forecast in MW (from WINDFOR)")
    error_mw: Optional[float] = Field(None, description="Forecast Error: Forecast - Actual (MW)")
    abs_error_mw: Optional[float] = Field(None, description="Absolute Forecast Error |Forecast - Actual| (MW)")
    publish_time: Optional[str] = Field(None, description="Publication timestamp of the selected forecast")
    eligible_cutoff: str = Field(..., description="Decision cutoff timestamp applied (D-1 at configured time)")
    status: str = Field(..., description="'matched', 'missing_actual', or 'missing_forecast'")
    procurement_direction: ProcurementDirection
    procurement_note: str

class AccuracyMetrics(BaseModel):
    sample_count: int = Field(..., description="Number of valid matched intervals evaluated (N)")
    expected_intervals: int = Field(..., description="Total expected intervals in period")
    coverage_pct: float = Field(..., description="Forecast coverage: (sample_count / expected_intervals) * 100")
    mae_mw: Optional[float] = Field(None, description="Mean Absolute Error in MW")
    rmse_mw: Optional[float] = Field(None, description="Root Mean Squared Error in MW")
    mean_error_mw: Optional[float] = Field(None, description="Mean Error / Bias (Forecast - Actual) in MW")
    mape_pct: Optional[float] = Field(None, description="Mean Absolute Percentage Error (evaluated with epsilon guard)")
    wape_pct: Optional[float] = Field(None, description="Weighted Absolute Percentage Error (Sum(|Error|)/Sum(Actual)*100)")
    max_overprediction_mw: Optional[float] = Field(None, description="Largest single interval overprediction in MW")
    max_underprediction_mw: Optional[float] = Field(None, description="Largest single interval underprediction in MW")
    overforecast_pct: float = Field(0.0, description="Percentage of intervals where forecast exceeded actual")
    underforecast_pct: float = Field(0.0, description="Percentage of intervals where forecast was below actual")
    total_actual_mwh: float = Field(0.0, description="Total actual wind energy delivered (MWh)")
    total_forecast_mwh: float = Field(0.0, description="Total day-ahead forecast wind energy (MWh)")
    mape_explanation: str = Field(..., description="Analytical note on MAPE limitations around zero or near-zero generation")

class DailyAccuracyItem(BaseModel):
    date: str
    sample_count: int
    coverage_pct: float
    mae_mw: float
    rmse_mw: float
    mean_error_mw: float
    actual_avg_mw: float
    forecast_avg_mw: float
    procurement_bias: str

class ErrorDistributionBucket(BaseModel):
    bucket_label: str
    min_val: float
    max_val: float
    count: int
    percentage: float

class ForecastResponse(BaseModel):
    date: str
    cutoff_time: str
    cutoff_timestamp: str
    matching_mode: str
    metrics: AccuracyMetrics
    intervals: List[IntervalRecord]

class AccuracyResponse(BaseModel):
    start_date: str
    end_date: str
    cutoff_time: str
    matching_mode: str
    aggregate_metrics: AccuracyMetrics
    daily_breakdown: List[DailyAccuracyItem]
    error_distribution: List[ErrorDistributionBucket]

class ForecastVersionItem(BaseModel):
    publish_time: str
    generation_mw: float
    is_eligible: bool
    is_selected: bool
    lead_time_hours: float
    error_against_actual: Optional[float] = None

class ForecastHistoryResponse(BaseModel):
    delivery_time: str
    settlement_period: Optional[int]
    actual_generation_mw: Optional[float]
    cutoff_time: str
    cutoff_timestamp: str
    selected_publish_time: Optional[str]
    selected_forecast_mw: Optional[float]
    total_versions_count: int
    eligible_versions_count: int
    versions: List[ForecastVersionItem]

class OverviewResponse(BaseModel):
    period_start: str
    period_end: str
    selected_date: str
    cutoff_time: str
    cutoff_assumption_note: str
    matching_mode: str
    data_freshness: str
    total_actual_records: int
    total_forecast_records: int
    overview_metrics: AccuracyMetrics
    latest_forecast_publish_time: Optional[str]

class HealthResponse(BaseModel):
    status: str
    project: str
    environment: str
    data_loaded: bool
    fuelhh_records_count: int
    windfor_records_count: int
    cache_path: str
