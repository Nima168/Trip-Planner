import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import groq
import httpx
import pytest
from pydantic import ValidationError

from app.config import Settings
from app.services.ai_prompts import RESULT_SCHEMA, RESULT_SCHEMA_NAME
from app.services.ai_service import (
    AIProviderInvalidOutput,
    AIProviderRateLimited,
    AIProviderTimeout,
    AIProviderUnavailable,
    GroqAdapter,
    get_default_adapter,
)

RESULT = {
    "draft": {
        "destination": "Goa",
        "start_date": "2026-10-01",
        "end_date": "2026-10-03",
        "trip_type": "solo",
    },
    "missing_fields": [],
    "clarification_fields": [],
    "reply": "Here's your trip.",
}

_REQUEST = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")


def _response(content=json.dumps(RESULT), finish_reason="stop"):
    message = SimpleNamespace(content=content)
    return SimpleNamespace(choices=[SimpleNamespace(message=message, finish_reason=finish_reason)])


def _adapter(create: AsyncMock) -> GroqAdapter:
    adapter = GroqAdapter(api_key="test-key", model="openai/gpt-oss-120b", timeout=5)
    adapter._client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    return adapter


def _complete(adapter: GroqAdapter) -> dict:
    return asyncio.run(adapter.complete("system prompt", [{"role": "user", "content": "Goa trip"}]))


def test_returns_parsed_json_and_requests_strict_schema():
    create = AsyncMock(return_value=_response())

    assert _complete(_adapter(create)) == RESULT

    kwargs = create.await_args.kwargs
    assert kwargs["model"] == "openai/gpt-oss-120b"
    assert kwargs["messages"][0] == {"role": "system", "content": "system prompt"}
    assert kwargs["messages"][1] == {"role": "user", "content": "Goa trip"}
    assert kwargs["response_format"] == {
        "type": "json_schema",
        "json_schema": {"name": RESULT_SCHEMA_NAME, "strict": True, "schema": RESULT_SCHEMA},
    }
    assert "tools" not in kwargs


def _objects(schema):
    if schema.get("type") == "object":
        yield schema
        for child in schema["properties"].values():
            yield from _objects(child)


def test_result_schema_satisfies_groq_strict_mode_rules():
    for obj in _objects(RESULT_SCHEMA):
        assert obj["additionalProperties"] is False
        assert set(obj["required"]) == set(obj["properties"])


@pytest.mark.parametrize("content", [None, ""])
def test_empty_response_is_invalid_output(content):
    with pytest.raises(AIProviderInvalidOutput):
        _complete(_adapter(AsyncMock(return_value=_response(content=content))))


def test_non_json_response_is_invalid_output():
    with pytest.raises(AIProviderInvalidOutput):
        _complete(_adapter(AsyncMock(return_value=_response(content="{not json"))))


def test_non_object_json_is_invalid_output():
    with pytest.raises(AIProviderInvalidOutput):
        _complete(_adapter(AsyncMock(return_value=_response(content="[1, 2]"))))


def test_truncated_response_is_invalid_output():
    create = AsyncMock(return_value=_response(finish_reason="length"))
    with pytest.raises(AIProviderInvalidOutput):
        _complete(_adapter(create))


def test_timeout_maps_to_provider_timeout():
    create = AsyncMock(side_effect=groq.APITimeoutError(request=_REQUEST))
    with pytest.raises(AIProviderTimeout):
        _complete(_adapter(create))


def test_connection_error_maps_to_unavailable():
    create = AsyncMock(side_effect=groq.APIConnectionError(request=_REQUEST))
    with pytest.raises(AIProviderUnavailable):
        _complete(_adapter(create))


def _rate_limit_error(message="rate limited", headers=None):
    return groq.RateLimitError(
        message, response=httpx.Response(429, request=_REQUEST, headers=headers or {}), body=None
    )


@pytest.mark.parametrize(
    ("message", "headers", "expected"),
    [
        ("rate limited", {"retry-after": "9.2"}, 10),  # header wins, rounded up
        ("Please try again in 9.525s.", {}, 10),
        ("Please try again in 1m30.5s.", {}, 91),
        ("Please try again in 2h3m.", {}, 7380),
        ("rate limited", {}, 30),  # no hint: default
    ],
)
def test_rate_limit_maps_to_rate_limited_with_retry_after(message, headers, expected):
    with pytest.raises(AIProviderRateLimited) as info:
        _complete(_adapter(AsyncMock(side_effect=_rate_limit_error(message, headers))))
    assert info.value.retry_after_seconds == expected


def test_json_validate_failed_maps_to_invalid_output():
    body = {"error": {"code": "json_validate_failed", "message": "Failed to generate JSON."}}
    error = groq.BadRequestError(
        "Error code: 400 - " + json.dumps(body),
        response=httpx.Response(400, request=_REQUEST),
        body=body,
    )
    with pytest.raises(AIProviderInvalidOutput):
        _complete(_adapter(AsyncMock(side_effect=error)))



def test_other_bad_request_maps_to_unavailable():
    error = groq.BadRequestError(
        "Error code: 400 - model not found",
        response=httpx.Response(400, request=_REQUEST),
        body=None,
    )
    with pytest.raises(AIProviderUnavailable):
        _complete(_adapter(AsyncMock(side_effect=error)))


def test_default_adapter_is_groq_with_configured_model(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "ai_api_key", "test-key")
    adapter = get_default_adapter()
    assert isinstance(adapter, GroqAdapter)
    assert adapter._model == settings.ai_model


def test_settings_default_to_groq_gpt_oss():
    defaults = Settings(_env_file=None)
    assert defaults.ai_provider == "groq"
    assert defaults.ai_model == "openai/gpt-oss-120b"


@pytest.mark.parametrize("provider", ["anthropic", "grok"])
def test_non_groq_provider_rejected_at_startup(provider):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, ai_provider=provider)
