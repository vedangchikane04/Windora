import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from app.schemas.forecast import (
    IntervalRecord,
    AccuracyMetrics,
    DailyAccuracyItem,
    ErrorDistributionBucket
)

class AccuracyService:
    """
    Computes statistical forecast accuracy metrics and error distributions.
    Ensures defensible denominator handling for MAPE, disclosures of sample counts,
    and rigorous edge-case handling for missing observations.
    """

    @staticmethod
    def calculate_metrics(
        records: List[IntervalRecord],
        expected_intervals: int
    ) -> AccuracyMetrics:
        # Filter for valid matched pairs (both actual and forecast are non-null)
        valid = [r for r in records if r.actual_mw is not None and r.forecast_mw is not None]
        n = len(valid)

        coverage = round((n / expected_intervals) * 100.0, 2) if expected_intervals > 0 else 0.0

        if n == 0:
            return AccuracyMetrics(
                sample_count=0,
                expected_intervals=expected_intervals,
                coverage_pct=coverage,
                mae_mw=None,
                rmse_mw=None,
                mean_error_mw=None,
                mape_pct=None,
                wape_pct=None,
                max_overprediction_mw=None,
                max_underprediction_mw=None,
                overforecast_pct=0.0,
                underforecast_pct=0.0,
                total_actual_mwh=0.0,
                total_forecast_mwh=0.0,
                mape_explanation="No matched forecast-actual intervals found to compute error metrics."
            )

        actuals = np.array([r.actual_mw for r in valid], dtype=float)
        forecasts = np.array([r.forecast_mw for r in valid], dtype=float)
        errors = forecasts - actuals  # Forecast - Actual
        abs_errors = np.abs(errors)

        mae = float(np.mean(abs_errors))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        mean_error = float(np.mean(errors)) # Bias
        max_over = float(np.max(errors))
        max_under = float(np.min(errors))

        over_count = int(np.sum(errors > 5.0))
        under_count = int(np.sum(errors < -5.0))
        over_pct = round((over_count / n) * 100.0, 2)
        under_pct = round((under_count / n) * 100.0, 2)

        # Total energy in MWh: each interval is 30 minutes (0.5 hour)
        total_actual_mwh = round(float(np.sum(actuals)) * 0.5, 2)
        total_forecast_mwh = round(float(np.sum(forecasts)) * 0.5, 2)

        # Defensible MAPE calculation with epsilon guard (actual >= 50 MW)
        # Explains near-zero limitations as mandated by requirements
        epsilon = 50.0  # MW
        mask_defensible = actuals >= epsilon
        m_count = int(np.sum(mask_defensible))
        
        mape_val = None
        if m_count > 0:
            mape_val = round(float(np.mean(abs_errors[mask_defensible] / actuals[mask_defensible])) * 100.0, 2)
            mape_note = (
                f"Calculated on {m_count}/{n} intervals with actual generation >= {epsilon:.0f} MW. "
                f"Intervals with near-zero wind (<{epsilon:.0f} MW) are excluded from traditional MAPE "
                "to prevent extreme mathematical distortion from vanishingly small denominators. "
                "WAPE is provided alongside as a more robust volume-weighted industry standard."
            )
        else:
            mape_note = (
                "MAPE not defensible: all observations are below the 50 MW threshold, "
                "which causes infinite or misleadingly inflated percentage errors."
            )

        # WAPE (Weighted Absolute Percentage Error): Sum(|Errors|) / Sum(Actuals) * 100
        # Highly standard in utility procurement because denominator is total volume
        sum_actuals = float(np.sum(actuals))
        wape_val = round((float(np.sum(abs_errors)) / sum_actuals) * 100.0, 2) if sum_actuals > 0 else None

        return AccuracyMetrics(
            sample_count=n,
            expected_intervals=expected_intervals,
            coverage_pct=coverage,
            mae_mw=round(mae, 2),
            rmse_mw=round(rmse, 2),
            mean_error_mw=round(mean_error, 2),
            mape_pct=mape_val,
            wape_pct=wape_val,
            max_overprediction_mw=round(max_over, 2),
            max_underprediction_mw=round(max_under, 2),
            overforecast_pct=over_pct,
            underforecast_pct=under_pct,
            total_actual_mwh=total_actual_mwh,
            total_forecast_mwh=total_forecast_mwh,
            mape_explanation=mape_note
        )

    @staticmethod
    def calculate_daily_breakdown(
        records: List[IntervalRecord]
    ) -> List[DailyAccuracyItem]:
        df = pd.DataFrame([
            {
                "date": r.settlement_date,
                "actual": r.actual_mw,
                "forecast": r.forecast_mw,
                "error": r.error_mw,
                "abs_error": r.abs_error_mw
            }
            for r in records if r.actual_mw is not None and r.forecast_mw is not None
        ])

        if df.empty:
            return []

        daily_items = []
        for dt_str, group in df.groupby("date"):
            n = len(group)
            expected = 48  # 48 settlement periods in standard UK day
            mae = float(group["abs_error"].mean())
            rmse = float(np.sqrt((group["error"] ** 2).mean()))
            bias = float(group["error"].mean())
            act_avg = float(group["actual"].mean())
            fct_avg = float(group["forecast"].mean())
            
            bias_label = "Balanced"
            if bias > 50.0:
                bias_label = "Overforecast (Shortfall Risk)"
            elif bias < -50.0:
                bias_label = "Underforecast (Surplus Risk)"

            daily_items.append(DailyAccuracyItem(
                date=dt_str,
                sample_count=n,
                coverage_pct=round((n / expected) * 100.0, 1),
                mae_mw=round(mae, 1),
                rmse_mw=round(rmse, 1),
                mean_error_mw=round(bias, 1),
                actual_avg_mw=round(act_avg, 1),
                forecast_avg_mw=round(fct_avg, 1),
                procurement_bias=bias_label
            ))

        daily_items.sort(key=lambda x: x.date)
        return daily_items

    @staticmethod
    def calculate_error_distribution(
        records: List[IntervalRecord]
    ) -> List[ErrorDistributionBucket]:
        valid = [r.error_mw for r in records if r.error_mw is not None]
        n = len(valid)
        if n == 0:
            return []

        buckets_def = [
            ("Severe Underforecast (<-3000 MW)", -float("inf"), -3000),
            ("High Underforecast (-3000 to -1500 MW)", -3000, -1500),
            ("Moderate Underforecast (-1500 to -500 MW)", -1500, -500),
            ("Slight Underforecast (-500 to 0 MW)", -500, 0),
            ("Slight Overforecast (0 to +500 MW)", 0, 500),
            ("Moderate Overforecast (+500 to +1500 MW)", 500, 1500),
            ("High Overforecast (+1500 to +3000 MW)", 1500, 3000),
            ("Severe Overforecast (>+3000 MW)", 3000, float("inf")),
        ]

        dist = []
        errs = np.array(valid)
        for label, low, high in buckets_def:
            if low == -float("inf"):
                count = int(np.sum(errs < high))
            elif high == float("inf"):
                count = int(np.sum(errs >= low))
            else:
                count = int(np.sum((errs >= low) & (errs < high)))
            
            pct = round((count / n) * 100.0, 2)
            dist.append(ErrorDistributionBucket(
                bucket_label=label,
                min_val=low if low != -float("inf") else -5000,
                max_val=high if high != float("inf") else 5000,
                count=count,
                percentage=pct
            ))

        return dist
