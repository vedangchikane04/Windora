from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo
from typing import List, Tuple, Optional
import re

LONDON_TZ = ZoneInfo("Europe/London")
UTC_TZ = ZoneInfo("UTC")

def parse_iso_datetime(dt_str: str) -> datetime:
    """
    Parse an ISO 8601 datetime string and ensure it has UTC timezone awareness.
    """
    if not dt_str:
        raise ValueError("Empty datetime string")
    # Clean up trailing Z
    clean_str = dt_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(clean_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC_TZ)
    return dt.astimezone(UTC_TZ)

def format_iso_utc(dt: datetime) -> str:
    """Format datetime as standard ISO 8601 UTC with 'Z'."""
    utc_dt = dt.astimezone(UTC_TZ)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def get_day_ahead_cutoff(delivery_dt: datetime, cutoff_time_str: str = "11:00") -> datetime:
    """
    Given a delivery datetime (in UTC), determine the day-ahead decision cutoff.
    In UK wholesale power markets (EPEX SPOT / Nord Pool), day-ahead procurement
    for delivery day D occurs on day D-1 at the specified cutoff time (default 11:00 GMT).
    
    Cutoff time is interpreted in UK local time (Europe/London), converted to UTC.
    """
    # Convert delivery datetime to UK local time to determine the delivery calendar date D
    local_delivery = delivery_dt.astimezone(LONDON_TZ)
    delivery_date = local_delivery.date()
    
    # Decision day is D - 1
    decision_date = delivery_date - timedelta(days=1)
    
    # Parse cutoff time
    parts = cutoff_time_str.strip().split(":")
    hour = int(parts[0])
    minute = int(parts[1]) if len(parts) > 1 else 0
    
    # Construct cutoff in Europe/London time
    cutoff_local = datetime(
        decision_date.year, decision_date.month, decision_date.day,
        hour, minute, 0, tzinfo=LONDON_TZ
    )
    
    # Return as UTC datetime
    return cutoff_local.astimezone(UTC_TZ)

def get_settlement_period_for_dt(dt: datetime) -> int:
    """
    Calculate the settlement period (1-48, or up to 50 on clock change)
    for a given half-hour start time in UK local time.
    Period 1 starts at 00:00 local time.
    """
    local_dt = dt.astimezone(LONDON_TZ)
    minute_of_day = local_dt.hour * 60 + local_dt.minute
    return (minute_of_day // 30) + 1

def generate_expected_intervals_for_date(target_date: date) -> List[Tuple[str, int]]:
    """
    Generate all expected 30-minute delivery interval start times and settlement periods
    for a target calendar date in UK local time.
    Returns list of (iso_start_time_utc, settlement_period).
    """
    intervals = []
    # Start at 00:00 local time on target_date
    start_local = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=LONDON_TZ)
    next_day_local = start_local + timedelta(days=1)
    
    curr = start_local
    sp = 1
    while curr < next_day_local:
        utc_dt = curr.astimezone(UTC_TZ)
        intervals.append((format_iso_utc(utc_dt), sp))
        curr += timedelta(minutes=30)
        sp += 1
        
    return intervals
