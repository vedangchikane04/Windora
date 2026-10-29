import pytest
import math
from app.services.accuracy import AccuracyService
from app.schemas.forecast import IntervalRecord, ProcurementDirection

def create_interval(actual, forecast, st="2026-01-15T12:00:00Z"):
    err = forecast - actual if (actual is not None and forecast is not None) else None
    return IntervalRecord(
        start_time=st,
        settlement_date="2026-01-15",
        settlement_period=25,
        actual_mw=actual,
        forecast_mw=forecast,
        error_mw=err,
        abs_error_mw=abs(err) if err is not None else None,
        publish_time="2026-01-14T10:00:00Z",
        eligible_cutoff="2026-01-14T11:00:00Z",
        status="matched" if (actual is not None and forecast is not None) else "incomplete",
        procurement_direction=ProcurementDirection.BALANCED,
        procurement_note="Test note"
    )

def test_mae_rmse_bias_calculations():
    # Actuals: [1000, 2000, 3000, 4000]
    # Forecasts: [1200, 1800, 3100, 3700]
    # Errors: [+200, -200, +100, -300]
    # Abs Errors: [200, 200, 100, 300]
    # MAE = (200 + 200 + 100 + 300) / 4 = 800 / 4 = 200.0
    # Mean Error (Bias) = (200 - 200 + 100 - 300) / 4 = -200 / 4 = -50.0
    # Squared Errors: [40000, 40000, 10000, 90000] -> Mean = 180000 / 4 = 45000 -> RMSE = sqrt(45000) = 212.13
    records = [
        create_interval(1000, 1200),
        create_interval(2000, 1800),
        create_interval(3000, 3100),
        create_interval(4000, 3700)
    ]

    metrics = AccuracyService.calculate_metrics(records, expected_intervals=4)

    assert metrics.sample_count == 4
    assert metrics.coverage_pct == 100.0
    assert metrics.mae_mw == 200.0
    assert metrics.mean_error_mw == -50.0
    assert math.isclose(metrics.rmse_mw, 212.13, abs_tol=0.01)

def test_mape_and_wape_with_near_zero_actuals():
    """
    Test that MAPE defensively excludes or flags near-zero actual generation
    to prevent infinite or distorted values, and that WAPE is calculated accurately.
    """
    # Interval 1: near-zero actual (10 MW < 50 MW epsilon guard)
    # Interval 2: 1000 MW actual, 1100 MW forecast (err: 100)
    # Interval 3: 2000 MW actual, 1800 MW forecast (err: 200)
    records = [
        create_interval(10, 150),   # 10 MW is near calm/zero
        create_interval(1000, 1100),
        create_interval(2000, 1800)
    ]

    metrics = AccuracyService.calculate_metrics(records, expected_intervals=3)

    # 10 MW is excluded from MAPE numerator/denominator by the 50 MW epsilon guard
    # Remaining 2 intervals:
    # Int 2: |100| / 1000 = 10%
    # Int 3: |200| / 2000 = 10%
    # Expected MAPE = 10.0%
    assert metrics.mape_pct == 10.0
    assert "actual generation >= 50 MW" in metrics.mape_explanation

    # Total abs errors = 140 + 100 + 200 = 440
    # Total actual = 10 + 1000 + 2000 = 3010
    # WAPE = (440 / 3010) * 100 = 14.62%
    expected_wape = round((440 / 3010) * 100.0, 2)
    assert metrics.wape_pct == expected_wape

def test_empty_and_all_missing_intervals():
    metrics = AccuracyService.calculate_metrics([], expected_intervals=48)
    assert metrics.sample_count == 0
    assert metrics.coverage_pct == 0.0
    assert metrics.mae_mw is None
    assert metrics.rmse_mw is None
    assert metrics.mean_error_mw is None
