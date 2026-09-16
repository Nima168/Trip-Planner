from datetime import time

from app.errors import DomainValidationError


def validate_time_range(start_time: time | None, end_time: time | None) -> None:
    """backend-spec.md: end_time must be on or after start_time, when both are set."""
    if start_time is not None and end_time is not None and end_time < start_time:
        raise DomainValidationError(
            fields={"end_time": "must be on or after start_time"},
            message="end_time must be on or after start_time",
        )
