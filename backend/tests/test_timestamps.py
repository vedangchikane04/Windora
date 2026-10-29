import pytest
from datetime import datetime, date
from zoneinfo import ZoneInfo
from app.utils.timestamps import (
    parse_iso_datetime,
    format_iso_utc,
    get_day_ahead_cutoff,
    get_settlement_period_for_dt,
    generate_expected_intervals_for_date,
    LONDON_TZ,
    UTC_TZ
)

def test_parse_and_format_iso():
    dt_str = "2026-01-15T14:30:00Z"
    dt = parse_iso_datetime(dt_str)
    assert dt.tzinfo is not None
    assert format_iso_utc(dt) == dt_str

def test_day_ahead_cutoff_generation():
    # Delivery on 2026-01-15 at 14:00 UTC (January is GMT, UTC+0)
    del_dt = datetime(2026, 1, 15, 14, 0, 0, tzinfo=UTC_TZ)
    cutoff = get_day_ahead_cutoff(del_dt, "11:00")
    # Day-ahead decision day is 2026-01-14 at 11:00 UTC
    assert cutoff == datetime(2026, 1, 14, 11, 0, 0, tzinfo=UTC_TZ)

def test_day_ahead_cutoff_bst_summer_time():
    """
    Test summer time (BST, UTC+1). E.g. July 15.
    11:00 London time (BST) corresponds to 10:00 UTC!
    """
    del_dt = datetime(2026, 7, 15, 14, 0, 0, tzinfo=UTC_TZ)
    cutoff = get_day_ahead_cutoff(del_dt, "11:00")
    # July 14 at 11:00 BST -> 10:00 UTC
    assert cutoff == datetime(2026, 7, 14, 10, 0, 0, tzinfo=UTC_TZ)

def test_settlement_periods_january_standard_day():
    """
    January days have exactly 48 30-minute settlement periods.
    """
    intervals = generate_expected_intervals_for_date(date(2026, 1, 15))
    assert len(intervals) == 48
    assert intervals[0][1] == 1  # SP 1
    assert intervals[-1][1] == 48  # SP 48
    assert intervals[0][0] == "2026-01-15T00:00:00Z"
    assert intervals[-1][0] == "2026-01-15T23:30:00Z"
