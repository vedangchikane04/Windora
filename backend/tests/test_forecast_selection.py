import pytest
from datetime import datetime
from app.services.forecast_selection import ForecastSelectionService
from app.schemas.forecast import ProcurementDirection

def test_latest_eligible_forecast_selected():
    """
    Test that when multiple forecasts exist before cutoff,
    the latest one is selected.
    """
    delivery_time = "2026-01-15T14:00:00Z"
    # Cutoff is D-1 at 11:00 -> 2026-01-14T11:00:00Z
    
    mock_windfor = [
        {"publishTime": "2026-01-13T06:00:00Z", "startTime": delivery_time, "generation": 5000},
        {"publishTime": "2026-01-14T08:00:00Z", "startTime": delivery_time, "generation": 6000},
        {"publishTime": "2026-01-14T10:30:00Z", "startTime": delivery_time, "generation": 6500},  # Latest eligible
    ]
    mock_fuelhh = [
        {"startTime": delivery_time, "settlementDate": "2026-01-15", "settlementPeriod": 29, "generation": 7000}
    ]

    intervals = ForecastSelectionService.reconstruct_day_ahead_intervals(
        fuelhh_records=mock_fuelhh,
        windfor_records=mock_windfor,
        cutoff_time_str="11:00",
        matching_mode="exact"
    )

    assert len(intervals) == 1
    record = intervals[0]
    assert record.forecast_mw == 6500
    assert record.publish_time == "2026-01-14T10:30:00Z"
    assert record.actual_mw == 7000
    assert record.error_mw == -500  # 6500 - 7000
    assert record.procurement_direction == ProcurementDirection.UNDERFORECAST

def test_exclusion_of_forecasts_published_after_cutoff():
    """
    CRITICAL: Verify that forecasts published AFTER the day-ahead cutoff
    are strictly excluded, even if they are closer to the delivery interval.
    """
    delivery_time = "2026-01-15T14:00:00Z"
    # Cutoff: 2026-01-14T11:00:00Z
    
    mock_windfor = [
        {"publishTime": "2026-01-14T10:59:00Z", "startTime": delivery_time, "generation": 5200},  # Eligible
        {"publishTime": "2026-01-14T11:01:00Z", "startTime": delivery_time, "generation": 8000},  # Post-cutoff: must NOT be used
        {"publishTime": "2026-01-15T12:00:00Z", "startTime": delivery_time, "generation": 9500},  # Intraday: must NOT be used
    ]
    mock_fuelhh = [
        {"startTime": delivery_time, "settlementDate": "2026-01-15", "settlementPeriod": 29, "generation": 5000}
    ]

    intervals = ForecastSelectionService.reconstruct_day_ahead_intervals(
        fuelhh_records=mock_fuelhh,
        windfor_records=mock_windfor,
        cutoff_time_str="11:00",
        matching_mode="exact"
    )

    assert len(intervals) == 1
    record = intervals[0]
    assert record.forecast_mw == 5200
    assert record.publish_time == "2026-01-14T10:59:00Z"
    assert record.forecast_mw != 8000
    assert record.forecast_mw != 9500

def test_missing_actual_and_missing_forecast_handling():
    """
    Verify that missing observations are NOT silently replaced with zero.
    """
    mock_fuelhh = [
        {"startTime": "2026-01-15T00:00:00Z", "settlementDate": "2026-01-15", "settlementPeriod": 1, "generation": None},
        {"startTime": "2026-01-15T00:30:00Z", "settlementDate": "2026-01-15", "settlementPeriod": 2, "generation": 4500}
    ]
    # No forecast for 00:30
    mock_windfor = [
        {"publishTime": "2026-01-14T10:00:00Z", "startTime": "2026-01-15T00:00:00Z", "generation": 4000}
    ]

    intervals = ForecastSelectionService.reconstruct_day_ahead_intervals(
        fuelhh_records=mock_fuelhh,
        windfor_records=mock_windfor,
        cutoff_time_str="11:00",
        matching_mode="exact"
    )

    # First record: actual is missing
    assert intervals[0].actual_mw is None
    assert intervals[0].error_mw is None
    assert intervals[0].status == "missing_actual"

    # Second record: forecast is missing
    assert intervals[1].actual_mw == 4500
    assert intervals[1].forecast_mw is None
    assert intervals[1].error_mw is None
    assert intervals[1].status == "missing_forecast"

def test_duplicate_records_deduplication():
    """
    Verify deduplication of identical incoming publication records.
    """
    delivery_time = "2026-01-15T12:00:00Z"
    mock_windfor = [
        {"publishTime": "2026-01-14T10:00:00Z", "startTime": delivery_time, "generation": 5000},
        {"publishTime": "2026-01-14T10:00:00Z", "startTime": delivery_time, "generation": 5000},  # Duplicate
    ]
    mock_fuelhh = [
        {"startTime": delivery_time, "settlementDate": "2026-01-15", "settlementPeriod": 25, "generation": 4800},
        {"startTime": delivery_time, "settlementDate": "2026-01-15", "settlementPeriod": 25, "generation": 4800},  # Duplicate
    ]

    intervals = ForecastSelectionService.reconstruct_day_ahead_intervals(
        fuelhh_records=mock_fuelhh,
        windfor_records=mock_windfor,
        cutoff_time_str="11:00",
        matching_mode="exact"
    )

    assert len(intervals) == 1
    assert intervals[0].forecast_mw == 5000
    assert intervals[0].actual_mw == 4800
