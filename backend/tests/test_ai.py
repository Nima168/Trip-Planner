import pytest

from app.main import app
from app.routers.ai import _request_log
from app.services.ai_service import (
    AIProviderInvalidOutput,
    AIProviderTimeout,
    AIProviderUnavailable,
    get_default_adapter,
)
from tests.conftest import auth_headers

VALID_REQUEST = {
    "messages": [{"role": "user", "content": "Goa with friends"}],
    "draft": {"destination": None, "start_date": None, "end_date": None, "trip_type": None},
    "reference_date": "2026-09-18",
    "timezone": "Asia/Kolkata",
}

COMPLETE_RESULT = {
    "draft": {
        "destination": "Goa",
        "start_date": "2027-12-10",
        "end_date": "2027-12-12",
        "trip_type": "group_of_friends",
    },
    "missing_fields": [],
    "clarification_fields": [],
    "reply": "Goa, 10-12 December 2027, with friends. Please review these details.",
}

CLARIFICATION_RESULT = {
    "draft": {"destination": "Goa", "start_date": None, "end_date": None, "trip_type": "group_of_friends"},
    "missing_fields": ["start_date", "end_date"],
    "clarification_fields": [],
    "reply": "What are your start and end dates, including the year?",
}


class FakeAdapter:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error
        self.calls = 0

    async def complete(self, system, messages):
        self.calls += 1
        if self.error is not None:
            raise self.error
        return self.result


@pytest.fixture(autouse=True)
def _ai_enabled(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "ai_enabled", True)
    monkeypatch.setattr(settings, "ai_api_key", "test-key")
    _request_log.clear()
    yield
    app.dependency_overrides.pop(get_default_adapter, None)


def _override_adapter(adapter):
    app.dependency_overrides[get_default_adapter] = lambda: adapter


def test_requires_auth_before_calling_provider(client):
    adapter = FakeAdapter(result=COMPLETE_RESULT)
    _override_adapter(adapter)

    resp = client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST)
    assert resp.status_code == 401
    assert adapter.calls == 0


def test_returns_complete_draft(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(result=COMPLETE_RESULT))

    resp = client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["draft"]["destination"] == "Goa"
    assert body["missing_fields"] == []
    assert body["clarification_fields"] == []


def test_returns_clarification(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(result=CLARIFICATION_RESULT))

    resp = client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["missing_fields"] == ["start_date", "end_date"]


def test_disabled_returns_503(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "ai_enabled", False)
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(result=COMPLETE_RESULT))

    resp = client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST, headers=headers)
    assert resp.status_code == 503


def test_unconfigured_api_key_returns_503(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "ai_api_key", "")
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(result=COMPLETE_RESULT))

    resp = client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST, headers=headers)
    assert resp.status_code == 503


def test_provider_timeout_returns_504(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(error=AIProviderTimeout("timed out")))

    resp = client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST, headers=headers)
    assert resp.status_code == 504


def test_provider_unavailable_returns_503(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(error=AIProviderUnavailable("down")))

    resp = client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST, headers=headers)
    assert resp.status_code == 503


def test_malformed_provider_output_returns_502(client):
    headers = auth_headers(client)
    bad_result = {**COMPLETE_RESULT, "missing_fields": ["destination"]}  # destination is non-null
    _override_adapter(FakeAdapter(result=bad_result))

    resp = client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST, headers=headers)
    assert resp.status_code == 502


def test_provider_raising_invalid_output_returns_502(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(error=AIProviderInvalidOutput("bad tool call")))

    resp = client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST, headers=headers)
    assert resp.status_code == 502


def test_too_many_messages_422(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(result=COMPLETE_RESULT))
    payload = {**VALID_REQUEST, "messages": [{"role": "user", "content": "hi"}] * 20}

    resp = client.post("/api/v1/ai/trip-draft", json=payload, headers=headers)
    assert resp.status_code == 422


def test_message_too_long_422(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(result=COMPLETE_RESULT))
    payload = {**VALID_REQUEST, "messages": [{"role": "user", "content": "x" * 2001}]}

    resp = client.post("/api/v1/ai/trip-draft", json=payload, headers=headers)
    assert resp.status_code == 422


def test_aggregate_message_length_422(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(result=COMPLETE_RESULT))
    payload = {
        **VALID_REQUEST,
        "messages": [
            {"role": "user", "content": "x" * 2000},
            {"role": "assistant", "content": "x" * 2000},
        ]
        * 4
        + [{"role": "user", "content": "final"}],
    }

    resp = client.post("/api/v1/ai/trip-draft", json=payload, headers=headers)
    assert resp.status_code == 422


def test_last_message_must_be_user_422(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(result=COMPLETE_RESULT))
    payload = {**VALID_REQUEST, "messages": [{"role": "assistant", "content": "hello"}]}

    resp = client.post("/api/v1/ai/trip-draft", json=payload, headers=headers)
    assert resp.status_code == 422


def test_unknown_key_rejected_422(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(result=COMPLETE_RESULT))
    payload = {**VALID_REQUEST, "unexpected_field": "nope"}

    resp = client.post("/api/v1/ai/trip-draft", json=payload, headers=headers)
    assert resp.status_code == 422


def test_rate_limit_returns_429(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(result=COMPLETE_RESULT))

    for _ in range(10):
        resp = client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST, headers=headers)
        assert resp.status_code == 200

    resp = client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST, headers=headers)
    assert resp.status_code == 429
    assert "Retry-After" in resp.headers


def test_no_trip_days_or_activities_are_ever_written(client):
    headers = auth_headers(client)
    _override_adapter(FakeAdapter(result=COMPLETE_RESULT))

    client.post("/api/v1/ai/trip-draft", json=VALID_REQUEST, headers=headers)

    trips = client.get("/api/v1/trips", headers=headers).json()
    assert trips == []
