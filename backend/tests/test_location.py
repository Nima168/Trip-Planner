"""
Unit test for the Day location resolution order (backend-spec.md business
rule 8): Day.location if set, else the first Activity's location, else None.

Constructs plain (unpersisted) model instances directly -- no HTTP, no DB --
so this is a true unit test of the resolver in isolation.
"""

from datetime import date

from app.models import Activity, Day
from app.services.location import resolve_day_location


def test_uses_day_location_when_set():
    day = Day(date=date(2026, 1, 1), location="Tokyo")
    day.activities = []
    assert resolve_day_location(day) == "Tokyo"


def test_day_location_takes_priority_over_activity_location():
    day = Day(date=date(2026, 1, 1), location="Tokyo")
    day.activities = [Activity(title="X", location="Paris")]
    assert resolve_day_location(day) == "Tokyo"


def test_falls_back_to_first_activity_when_day_location_unset():
    day = Day(date=date(2026, 1, 1), location=None)
    day.activities = [Activity(title="X", location="Paris")]
    assert resolve_day_location(day) == "Paris"


def test_empty_string_day_location_falls_back_to_activity():
    day = Day(date=date(2026, 1, 1), location="")
    day.activities = [Activity(title="X", location="Paris")]
    assert resolve_day_location(day) == "Paris"


def test_none_when_day_location_unset_and_no_activities():
    day = Day(date=date(2026, 1, 1), location=None)
    day.activities = []
    assert resolve_day_location(day) is None
