from app.models import Day


def resolve_day_location(day: Day) -> str | None:
    """
    Day has no location field of its own (api-contract.md's Conventions note).
    Resolution order: the first Activity's location for this day, by position.
    Deliberately does not fall through to a later activity if the first has none.
    """
    if not day.activities:
        return None
    return day.activities[0].location
