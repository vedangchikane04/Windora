from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, date, timedelta
from typing import Optional, List
import logging

from app.config import settings
from app.services.elexon_client import elexon_client
from app.services.forecast_selection import ForecastSelectionService
from app.services.accuracy import AccuracyService
from app.schemas.forecast import (
    ForecastResponse,
    AccuracyResponse,
    ForecastHistoryResponse,
    OverviewResponse,
    HealthResponse,
    MatchingMode
)
from app.utils.timestamps import (
    parse_iso_datetime,
    format_iso_utc,
    get_day_ahead_cutoff,
    LONDON_TZ,
    UTC_TZ
)

logger = logging.getLogger("windora.api")
router = APIRouter()

# Memory cache for loaded records to provide microsecond response times
_FUELHH_RECORDS = []
_WINDFOR_RECORDS = []

def get_loaded_datasets():
    global _FUELHH_RECORDS, _WINDFOR_RECORDS
    if not _FUELHH_RECORDS:
        try:
            _FUELHH_RECORDS = elexon_client.fetch_fuelhh_stream("2026-01-01", "2026-01-31", "WIND")
        except Exception as e:
            logger.error(f"Failed to load FUELHH: {e}")
            _FUELHH_RECORDS = []
            
    if not _WINDFOR_RECORDS:
        try:
            _WINDFOR_RECORDS = elexon_client.fetch_windfor_stream("2025-12-28T00:00:00Z", "2026-02-02T00:00:00Z")
        except Exception as e:
            logger.error(f"Failed to load WINDFOR: {e}")
            _WINDFOR_RECORDS = []
            
    return _FUELHH_RECORDS, _WINDFOR_RECORDS

@router.get("/health", response_model=HealthResponse)
def health_check():
    fuel, wf = get_loaded_datasets()
    return HealthResponse(
        status="healthy",
        project="Windora — UK Wind Forecast & Accuracy Intelligence",
        environment="production",
        data_loaded=bool(fuel and wf),
        fuelhh_records_count=len(fuel),
        windfor_records_count=len(wf),
        cache_path=str(settings.DATA_DIR)
    )

@router.get("/overview", response_model=OverviewResponse)
def get_overview(
    selected_date: str = Query("2026-01-15", pattern=r"^\d{4}-\d{2}-\d{2}$", description="Selected delivery date (YYYY-MM-DD)"),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME, pattern=r"^\d{1,2}:\d{2}$", description="Day-ahead cutoff time in GMT (e.g. 11:00)"),
    matching_mode: MatchingMode = Query(MatchingMode.HOUR_BLOCK, description="Forecast matching resolution mode")
):
    fuel, wf = get_loaded_datasets()
    if not fuel or not wf:
        raise HTTPException(status_code=503, detail="Elexon dataset is currently unavailable or initializing.")

    # Validate date range
    if selected_date < "2026-01-01" or selected_date > "2026-01-31":
        raise HTTPException(status_code=400, detail="Windora analysis window is focused on January 2026 (2026-01-01 to 2026-01-31).")

    # Reconstruct intervals for selected date
    intervals = ForecastSelectionService.reconstruct_day_ahead_intervals(
        fuelhh_records=fuel,
        windfor_records=wf,
        cutoff_time_str=cutoff_time,
        matching_mode=matching_mode.value,
        target_date_str=selected_date
    )

    metrics = AccuracyService.calculate_metrics(intervals, expected_intervals=48)
    
    # Latest forecast publication time in WINDFOR
    latest_pub = None
    if wf:
        valid_pubs = [r["publishTime"] for r in wf if r.get("publishTime")]
        if valid_pubs:
            latest_pub = max(valid_pubs)

    cutoff_note = (
        f"Default {cutoff_time} GMT cutoff on D-1 reflects standard EPEX SPOT GB Day-Ahead Auction gate closure. "
        "Forecasts published after this deadline are strictly excluded to model decisions under true market conditions."
    )

    return OverviewResponse(
        period_start="2026-01-01",
        period_end="2026-01-31",
        selected_date=selected_date,
        cutoff_time=cutoff_time,
        cutoff_assumption_note=cutoff_note,
        matching_mode=matching_mode.value,
        data_freshness="January 2026 Full Outturn & Forecast Stream Ingested",
        total_actual_records=len(fuel),
        total_forecast_records=len(wf),
        overview_metrics=metrics,
        latest_forecast_publish_time=latest_pub
    )

@router.get("/forecasts", response_model=ForecastResponse)
def get_forecasts(
    date: str = Query("2026-01-15", pattern=r"^\d{4}-\d{2}-\d{2}$", description="Delivery date (YYYY-MM-DD)"),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME, pattern=r"^\d{1,2}:\d{2}$", description="Cutoff time (HH:MM)"),
    matching_mode: MatchingMode = Query(MatchingMode.HOUR_BLOCK, description="Matching mode")
):
    fuel, wf = get_loaded_datasets()
    if not fuel or not wf:
        raise HTTPException(status_code=503, detail="Elexon dataset is unavailable.")

    if date < "2026-01-01" or date > "2026-01-31":
        raise HTTPException(status_code=400, detail="Date must be between 2026-01-01 and 2026-01-31.")

    intervals = ForecastSelectionService.reconstruct_day_ahead_intervals(
        fuelhh_records=fuel,
        windfor_records=wf,
        cutoff_time_str=cutoff_time,
        matching_mode=matching_mode.value,
        target_date_str=date
    )

    metrics = AccuracyService.calculate_metrics(intervals, expected_intervals=48)
    
    # Calculate cutoff timestamp for this date
    sample_dt = parse_iso_datetime(f"{date}T12:00:00Z")
    cutoff_dt = get_day_ahead_cutoff(sample_dt, cutoff_time)

    return ForecastResponse(
        date=date,
        cutoff_time=cutoff_time,
        cutoff_timestamp=format_iso_utc(cutoff_dt),
        matching_mode=matching_mode.value,
        metrics=metrics,
        intervals=intervals
    )

@router.get("/accuracy", response_model=AccuracyResponse)
def get_accuracy(
    start_date: str = Query("2026-01-01", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query("2026-01-31", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME, pattern=r"^\d{1,2}:\d{2}$"),
    matching_mode: MatchingMode = Query(MatchingMode.HOUR_BLOCK)
):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be before or equal to end_date.")

    fuel, wf = get_loaded_datasets()
    if not fuel or not wf:
        raise HTTPException(status_code=503, detail="Elexon dataset is unavailable.")

    # Filter fuel records for range
    filtered_fuel = [
        r for r in fuel 
        if r.get("settlementDate") and start_date <= r["settlementDate"] <= end_date
    ]

    intervals = ForecastSelectionService.reconstruct_day_ahead_intervals(
        fuelhh_records=filtered_fuel,
        windfor_records=wf,
        cutoff_time_str=cutoff_time,
        matching_mode=matching_mode.value
    )

    # Expected intervals = num_days * 48
    d_start = datetime.strptime(start_date, "%Y-%m-%d").date()
    d_end = datetime.strptime(end_date, "%Y-%m-%d").date()
    num_days = (d_end - d_start).days + 1
    expected_count = num_days * 48

    aggregate_metrics = AccuracyService.calculate_metrics(intervals, expected_intervals=expected_count)
    daily_breakdown = AccuracyService.calculate_daily_breakdown(intervals)
    error_distribution = AccuracyService.calculate_error_distribution(intervals)

    return AccuracyResponse(
        start_date=start_date,
        end_date=end_date,
        cutoff_time=cutoff_time,
        matching_mode=matching_mode.value,
        aggregate_metrics=aggregate_metrics,
        daily_breakdown=daily_breakdown,
        error_distribution=error_distribution
    )

@router.get("/forecast-history", response_model=ForecastHistoryResponse)
def get_forecast_history(
    delivery_time: str = Query(..., description="Delivery interval ISO UTC start time (e.g. 2026-01-15T12:00:00Z)"),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME, pattern=r"^\d{1,2}:\d{2}$"),
    matching_mode: MatchingMode = Query(MatchingMode.HOUR_BLOCK)
):
    fuel, wf = get_loaded_datasets()
    if not wf:
        raise HTTPException(status_code=503, detail="WINDFOR dataset is unavailable.")

    # Find actual outturn for this delivery interval if available
    actual_mw = None
    settlement_period = None
    for r in fuel:
        if r.get("startTime") == delivery_time:
            actual_mw = float(r["generation"]) if r.get("generation") is not None else None
            settlement_period = r.get("settlementPeriod")
            break

    delivery_dt = parse_iso_datetime(delivery_time)
    cutoff_dt = get_day_ahead_cutoff(delivery_dt, cutoff_time)
    cutoff_str = format_iso_utc(cutoff_dt)

    versions = ForecastSelectionService.get_forecast_history_for_interval(
        windfor_records=wf,
        delivery_time_str=delivery_time,
        actual_mw=actual_mw,
        cutoff_time_str=cutoff_time,
        matching_mode=matching_mode.value
    )

    selected_pub = None
    selected_mw = None
    for v in versions:
        if v.is_selected:
            selected_pub = v.publish_time
            selected_mw = v.generation_mw
            break

    eligible_count = sum(1 for v in versions if v.is_eligible)

    return ForecastHistoryResponse(
        delivery_time=delivery_time,
        settlement_period=settlement_period,
        actual_generation_mw=actual_mw,
        cutoff_time=cutoff_time,
        cutoff_timestamp=cutoff_str,
        selected_publish_time=selected_pub,
        selected_forecast_mw=selected_mw,
        total_versions_count=len(versions),
        eligible_versions_count=eligible_count,
        versions=versions
    )

@router.get("/available-dates")
def get_available_dates():
    return {
        "dates": [f"2026-01-{i:02d}" for i in range(1, 32)],
        "default_date": "2026-01-15",
        "default_cutoff_time": settings.DEFAULT_CUTOFF_TIME,
        "default_matching_mode": settings.DEFAULT_MATCHING_MODE
    }

@router.post("/sync")
def trigger_sync():
    """Manual sync endpoint to force re-fetch from Elexon BMRS API."""
    global _FUELHH_RECORDS, _WINDFOR_RECORDS
    try:
        fuel = elexon_client.fetch_fuelhh_stream("2026-01-01", "2026-01-31", "WIND", force_refresh=True)
        wf = elexon_client.fetch_windfor_stream("2025-12-28T00:00:00Z", "2026-02-02T00:00:00Z", force_refresh=True)
        _FUELHH_RECORDS = fuel
        _WINDFOR_RECORDS = wf
        return {
            "status": "success",
            "fuelhh_records": len(fuel),
            "windfor_records": len(wf),
            "message": "Successfully synchronized January 2026 datasets with Elexon BMRS."
        }
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")
