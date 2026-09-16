from unittest.mock import MagicMock, patch

import httpx


def _create_trip(client, name="Trip"):
    return client.post("/trips", json={"name": name}).json()


def _create_day(client, trip_id, date="2026-05-01"):
    return client.post(f"/trips/{trip_id}/days", json={"date": date}).json()


def _create_activity(client, trip_id, day_id, location="Paris"):
    return client.post(
        f"/trips/{trip_id}/days/{day_id}/activities",
        json={"title": "Museum", "start_time": "09:00", "end_time": "10:00", "location": location},
    ).json()


def _conditions_url(trip_id, day_id):
    return f"/trips/{trip_id}/days/{day_id}/conditions"


def test_conditions_success(client, monkeypatch):
    monkeypatch.setattr("app.services.weather.settings.openweather_api_key", "test-key")
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    _create_activity(client, trip["id"], day["id"], location="Paris")

    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "coord": {"lon": 2.35, "lat": 48.85},
        "weather": [{"description": "clear sky", "icon": "01d"}],
        "main": {"temp": 18.5},
    }

    with patch("app.services.weather.httpx.get", return_value=mock_response) as mock_get:
        resp = client.get(_conditions_url(trip["id"], day["id"]))

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["weather"] == {"summary": "clear sky", "temp_c": 18.5, "icon": "01d"}
    assert body["map"]["lat"] == 48.85
    assert body["map"]["lng"] == 2.35
    assert body["map"]["static_map_url"]
    mock_get.assert_called_once()


def test_conditions_timeout_returns_unavailable_not_5xx(client, monkeypatch):
    monkeypatch.setattr("app.services.weather.settings.openweather_api_key", "test-key")
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    _create_activity(client, trip["id"], day["id"], location="Paris")

    with patch("app.services.weather.httpx.get", side_effect=httpx.TimeoutException("timed out")):
        resp = client.get(_conditions_url(trip["id"], day["id"]))

    assert resp.status_code == 200
    assert resp.json() == {"status": "unavailable"}


def test_conditions_non_2xx_returns_unavailable_not_5xx(client, monkeypatch):
    monkeypatch.setattr("app.services.weather.settings.openweather_api_key", "test-key")
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    _create_activity(client, trip["id"], day["id"], location="Paris")

    request = httpx.Request("GET", "https://api.openweathermap.org/data/2.5/weather")
    error_response = httpx.Response(500, request=request)
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Server error", request=request, response=error_response
    )

    with patch("app.services.weather.httpx.get", return_value=mock_response):
        resp = client.get(_conditions_url(trip["id"], day["id"]))

    assert resp.status_code == 200
    assert resp.json() == {"status": "unavailable"}


def test_conditions_malformed_body_returns_unavailable_not_5xx(client, monkeypatch):
    monkeypatch.setattr("app.services.weather.settings.openweather_api_key", "test-key")
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    _create_activity(client, trip["id"], day["id"], location="Paris")

    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {"unexpected": "shape"}

    with patch("app.services.weather.httpx.get", return_value=mock_response):
        resp = client.get(_conditions_url(trip["id"], day["id"]))

    assert resp.status_code == 200
    assert resp.json() == {"status": "unavailable"}


def test_conditions_no_location_returns_unavailable_without_calling_provider(client, monkeypatch):
    monkeypatch.setattr("app.services.weather.settings.openweather_api_key", "test-key")
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    # no activities on this day at all

    with patch("app.services.weather.httpx.get") as mock_get:
        resp = client.get(_conditions_url(trip["id"], day["id"]))

    assert resp.status_code == 200
    assert resp.json() == {"status": "unavailable"}
    mock_get.assert_not_called()


def test_conditions_first_activity_missing_location_does_not_fall_back(client, monkeypatch):
    monkeypatch.setattr("app.services.weather.settings.openweather_api_key", "test-key")
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    _create_activity(client, trip["id"], day["id"], location=None)
    _create_activity(client, trip["id"], day["id"], location="Paris")

    with patch("app.services.weather.httpx.get") as mock_get:
        resp = client.get(_conditions_url(trip["id"], day["id"]))

    assert resp.status_code == 200
    assert resp.json() == {"status": "unavailable"}
    mock_get.assert_not_called()


def test_conditions_missing_api_key_returns_unavailable_without_calling_provider(client, monkeypatch):
    monkeypatch.setattr("app.services.weather.settings.openweather_api_key", "")
    trip = _create_trip(client)
    day = _create_day(client, trip["id"])
    _create_activity(client, trip["id"], day["id"], location="Paris")

    with patch("app.services.weather.httpx.get") as mock_get:
        resp = client.get(_conditions_url(trip["id"], day["id"]))

    assert resp.status_code == 200
    assert resp.json() == {"status": "unavailable"}
    mock_get.assert_not_called()


def test_conditions_trip_not_found(client):
    resp = client.get(_conditions_url("does-not-exist", "does-not-exist"))
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"


def test_conditions_day_not_found(client):
    trip = _create_trip(client)
    resp = client.get(_conditions_url(trip["id"], "does-not-exist"))
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"
