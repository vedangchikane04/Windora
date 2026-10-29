import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from zoneinfo import ZoneInfo

from app.utils.timestamps import (
    parse_iso_datetime,
    format_iso_utc,
    get_day_ahead_cutoff,
    LONDON_TZ,
    UTC_TZ
)
from app.schemas.forecast import IntervalRecord, ProcurementDirection, ForecastVersionItem

logger = logging.getLogger("windora.forecast_selection")

def get_procurement_assessment(error_mw: Optional[float]) -> Tuple[ProcurementDirection, str]:
    """
    Qualitative decision support mapping forecast error to power procurement implications.
    Mandatory constraint: Qualitative guidance only. Do not claim to calculate exact financial positions.
    """
    if error_mw is None:
        return ProcurementDirection.UNKNOWN, "Incomplete interval: actual outturn or eligible forecast unavailable."
    
    threshold = 5.0 # MW tolerance
    if error_mw > threshold:
        return (
            ProcurementDirection.OVERFORECAST,
            f"Overforecast (+{error_mw:.1f} MW): Actual wind is lower than planned. Utility faced a potential shortfall and may need replacement power."
        )
    elif error_mw < -threshold:
        return (
            ProcurementDirection.UNDERFORECAST,
            f"Underforecast ({error_mw:.1f} MW): Actual wind is higher than planned. Utility had surplus wind and may have over-hedged from other sources."
        )
    else:
        return (
            ProcurementDirection.BALANCED,
            "Balanced output: Forecast closely matched actual generation within ±5 MW tolerance."
        )

class ForecastSelectionService:
    """
    Implements historical day-ahead wind forecast reconstruction.
    For every delivery interval:
      1. Determines applicable Day-Ahead cutoff (D-1 at configured time, e.g. 11:00 GMT).
      2. Strictly excludes any forecasts published after the cutoff.
      3. Selects the latest forecast published at or before the cutoff.
      4. Matches with actual outturn generation without replacing missing values with zero.
    """

    @staticmethod
    def reconstruct_day_ahead_intervals(
        fuelhh_records: List[Dict[str, Any]],
        windfor_records: List[Dict[str, Any]],
        cutoff_time_str: str = "11:00",
        matching_mode: str = "hour_block",
        target_date_str: Optional[str] = None
    ) -> List[IntervalRecord]:
        # Deduplicate and index actuals
        # Key: startTime (ISO UTC)
        actuals_by_start: Dict[str, Dict[str, Any]] = {}
        for r in fuelhh_records:
            st = r.get("startTime")
            if not st:
                continue
            # Keep valid record
            actuals_by_start[st] = r

        # Deduplicate WINDFOR records
        # Index WINDFOR by exact startTime: Dict[startTime, List[record]]
        forecasts_by_exact_start: Dict[str, List[Dict[str, Any]]] = {}
        # Also index WINDFOR by hourly floor timestamp (for hour_block matching)
        forecasts_by_hour_floor: Dict[str, List[Dict[str, Any]]] = {}

        seen_wf = set()
        for r in windfor_records:
            pub = r.get("publishTime")
            st = r.get("startTime")
            gen = r.get("generation")
            if not pub or not st or gen is None:
                continue
            key = (pub, st)
            if key in seen_wf:
                continue
            seen_wf.add(key)
            
            forecasts_by_exact_start.setdefault(st, []).append(r)
            
            # Floor to top of the hour: YYYY-MM-DDTHH:00:00Z
            hour_st = st[:14] + "00:00Z"
            forecasts_by_hour_floor.setdefault(hour_st, []).append(r)

        # Determine target delivery intervals to evaluate
        # If target_date_str is supplied, evaluate all 30-min intervals for that date
        interval_records: List[IntervalRecord] = []
        
        # Collect distinct delivery intervals from actuals, filtered by target_date if supplied
        candidate_actuals = []
        for st, act in actuals_by_start.items():
            dt = parse_iso_datetime(st)
            local_dt = dt.astimezone(LONDON_TZ)
            date_str = local_dt.strftime("%Y-%m-%d")
            if target_date_str and date_str != target_date_str:
                continue
            candidate_actuals.append((dt, st, act))
            
        candidate_actuals.sort(key=lambda x: x[0])

        for delivery_dt, st, act in candidate_actuals:
            settlement_date = act.get("settlementDate") or delivery_dt.astimezone(LONDON_TZ).strftime("%Y-%m-%d")
            settlement_period = act.get("settlementPeriod") or 1
            actual_mw = float(act["generation"]) if act.get("generation") is not None else None

            # 1. Identify applicable day-ahead cutoff
            cutoff_dt = get_day_ahead_cutoff(delivery_dt, cutoff_time_str)
            cutoff_str = format_iso_utc(cutoff_dt)

            # 2. Find eligible forecast candidates
            candidates: List[Dict[str, Any]] = []
            if matching_mode == "hour_block":
                hour_floor = st[:14] + "00:00Z"
                candidates = forecasts_by_hour_floor.get(hour_floor, [])
            else:
                # Exact matching mode
                candidates = forecasts_by_exact_start.get(st, [])

            # Filter: publishTime <= cutoff_str (strictly eliminate future publications)
            eligible_candidates = [
                c for c in candidates 
                if c.get("publishTime") and parse_iso_datetime(c["publishTime"]) <= cutoff_dt
            ]

            selected_forecast_mw: Optional[float] = None
            selected_pub_time: Optional[str] = None
            
            if eligible_candidates:
                # Select latest published forecast
                eligible_candidates.sort(key=lambda c: parse_iso_datetime(c["publishTime"]))
                latest_eligible = eligible_candidates[-1]
                selected_forecast_mw = float(latest_eligible["generation"])
                selected_pub_time = latest_eligible["publishTime"]

            # Compute error if both actual and forecast exist
            error_mw = None
            abs_error_mw = None
            if actual_mw is not None and selected_forecast_mw is not None:
                error_mw = round(selected_forecast_mw - actual_mw, 2)
                abs_error_mw = round(abs(selected_forecast_mw - actual_mw), 2)

            status = "matched"
            if actual_mw is None and selected_forecast_mw is None:
                status = "missing_both"
            elif actual_mw is None:
                status = "missing_actual"
            elif selected_forecast_mw is None:
                status = "missing_forecast"

            proc_dir, proc_note = get_procurement_assessment(error_mw)

            record = IntervalRecord(
                start_time=st,
                settlement_date=settlement_date,
                settlement_period=settlement_period,
                actual_mw=actual_mw,
                forecast_mw=selected_forecast_mw,
                error_mw=error_mw,
                abs_error_mw=abs_error_mw,
                publish_time=selected_pub_time,
                eligible_cutoff=cutoff_str,
                status=status,
                procurement_direction=proc_dir,
                procurement_note=proc_note
            )
            interval_records.append(record)

        return interval_records

    @staticmethod
    def get_forecast_history_for_interval(
        windfor_records: List[Dict[str, Any]],
        delivery_time_str: str,
        actual_mw: Optional[float] = None,
        cutoff_time_str: str = "11:00",
        matching_mode: str = "hour_block"
    ) -> List[ForecastVersionItem]:
        """
        Inspect all historical forecast versions published by Elexon for a delivery interval.
        Labels eligibility at cutoff and identifies the selected forecast.
        """
        delivery_dt = parse_iso_datetime(delivery_time_str)
        cutoff_dt = get_day_ahead_cutoff(delivery_dt, cutoff_time_str)

        # Collect candidate forecasts
        candidates = []
        target_hour_floor = delivery_time_str[:14] + "00:00Z"
        
        seen_pubs = set()
        for r in windfor_records:
            st = r.get("startTime")
            pub = r.get("publishTime")
            gen = r.get("generation")
            if not st or not pub or gen is None:
                continue
            
            is_match = False
            if matching_mode == "hour_block":
                hour_floor = st[:14] + "00:00Z"
                if hour_floor == target_hour_floor:
                    is_match = True
            else:
                if st == delivery_time_str:
                    is_match = True
            
            if is_match and pub not in seen_pubs:
                seen_pubs.add(pub)
                candidates.append(r)

        # Sort chronologically by publishTime
        candidates.sort(key=lambda x: parse_iso_datetime(x["publishTime"]))

        # Identify latest eligible
        eligible = [c for c in candidates if parse_iso_datetime(c["publishTime"]) <= cutoff_dt]
        selected_pub = eligible[-1]["publishTime"] if eligible else None

        versions: List[ForecastVersionItem] = []
        for c in candidates:
            pub_dt = parse_iso_datetime(c["publishTime"])
            is_el = pub_dt <= cutoff_dt
            is_sel = (c["publishTime"] == selected_pub)
            lead_time = round((delivery_dt - pub_dt).total_seconds() / 3600.0, 1)
            
            err = None
            if actual_mw is not None:
                err = round(float(c["generation"]) - actual_mw, 2)

            versions.append(ForecastVersionItem(
                publish_time=c["publishTime"],
                generation_mw=float(c["generation"]),
                is_eligible=is_el,
                is_selected=is_sel,
                lead_time_hours=lead_time,
                error_against_actual=err
            ))

        return versions
