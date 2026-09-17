from app.models import Day


def resolve_day_location(day: Day) -> str | None:
    """
    Resolution order (backend-spec.md business rule 8): Day.location if set,
    else the first Activity's location for this day by position, else None.
    Deliberately does not fall through to a later activity if the first has none --
    the Activity-based fallback only exists for Days created before Day.location existed.
    """
    if day.location:
        return day.location
    if not day.activities:
        return None
    return day.activities[0].location
