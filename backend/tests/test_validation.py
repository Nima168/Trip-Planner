"""
Unit test for the acceptance criterion: "A Day cannot be saved with an end
time before its start time" (backend-spec.md).

Calls app.services.validate_time_range directly — no HTTP client, no DB —
so this is a true unit test of the rule in isolation, distinct from the
integration-style coverage of the same rule via the /days and /activities
endpoints in test_days.py / test_activities.py.
"""

from datetime import time

import pytest

from app.errors import DomainValidationError
from app.services.validation import validate_time_range


def test_end_time_before_start_time_raises():
    with pytest.raises(DomainValidationError) as exc_info:
        validate_time_range(time(10, 0), time(9, 0))

    assert exc_info.value.fields == {"end_time": "must be on or after start_time"}


def test_end_time_after_start_time_is_valid():
    validate_time_range(time(9, 0), time(17, 0))  # does not raise


def test_end_time_equal_to_start_time_is_valid():
    validate_time_range(time(9, 0), time(9, 0))  # boundary: allowed, does not raise


def test_start_time_none_skips_check():
    validate_time_range(None, time(9, 0))  # does not raise


def test_end_time_none_skips_check():
    validate_time_range(time(9, 0), None)  # does not raise


def test_both_none_skips_check():
    validate_time_range(None, None)  # does not raise
