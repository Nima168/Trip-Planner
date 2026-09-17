import logging
import re

import httpx

from app.config import settings

logger = logging.getLogger("app.services.weather")

_UNAVAILABLE = {"status": "unavailable"}

_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
_MAP_EMBED_URL = "https://www.openstreetmap.org/export/embed.html"
_MAP_BBOX_DELTA = 0.01  # degrees; roughly a ~1-2km-wide view around the marker

_APPID_RE = re.compile(r"appid=[^&\s]+")


def _redact(text: str) -> str:
    return _APPID_RE.sub("appid=***", text)


def _map_embed_url(lat: float, lon: float) -> str:
    # OpenStreetMap's official embeddable map -- no API key required.
    bbox = f"{lon - _MAP_BBOX_DELTA},{lat - _MAP_BBOX_DELTA},{lon + _MAP_BBOX_DELTA},{lat + _MAP_BBOX_DELTA}"
    return f"{_MAP_EMBED_URL}?bbox={bbox}&marker={lat},{lon}"


def get_conditions(location: str) -> dict:
    """
    The only place the maps/weather provider is called from. Route handlers call
    this module — never httpx or the provider directly — so this function is the
    single point that must uphold api-contract.md's day-conditions contract: any
    upstream timeout, non-2xx response, or malformed body collapses to
    {"status": "unavailable"} rather than raising. The API key is attached here
    and never appears in the returned shape or in anything logged.
    """
    if not settings.openweather_api_key:
        logger.warning("OPENWEATHER_API_KEY is not configured; returning unavailable")
        return _UNAVAILABLE

    try:
        response = httpx.get(
            _WEATHER_URL,
            params={"q": location, "appid": settings.openweather_api_key, "units": "metric"},
            timeout=settings.conditions_timeout_seconds,
        )
        response.raise_for_status()
        data = response.json()

        lat = data["coord"]["lat"]
        lon = data["coord"]["lon"]

        return {
            "status": "ok",
            "weather": {
                "summary": data["weather"][0]["description"],
                "temp_c": data["main"]["temp"],
                "icon": data["weather"][0]["icon"],
            },
            "map": {
                "lat": lat,
                "lng": lon,
                "static_map_url": _map_embed_url(lat, lon),
            },
        }
    except httpx.TimeoutException:
        logger.warning("Weather provider timed out for location=%r", location)
        return _UNAVAILABLE
    except httpx.HTTPError as exc:
        logger.warning(
            "Weather provider request failed for location=%r: %s", location, _redact(str(exc))
        )
        return _UNAVAILABLE
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning(
            "Weather provider returned malformed data for location=%r: %s", location, exc
        )
        return _UNAVAILABLE
