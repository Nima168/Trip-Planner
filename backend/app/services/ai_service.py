import json
import math
import re
from typing import Protocol

import groq
from pydantic import ValidationError

from app.config import settings
from app.schemas.ai import TripDraftRequest, TripDraftResponse
from app.services.ai_prompts import RESULT_SCHEMA, RESULT_SCHEMA_NAME, SYSTEM_PROMPT


class AIProviderError(Exception):
    """Base class for all provider-side failures; the router maps these to HTTP errors."""


class AIProviderTimeout(AIProviderError):
    pass


class AIProviderUnavailable(AIProviderError):
    pass


class AIProviderInvalidOutput(AIProviderError):
    pass


class AIProviderRateLimited(AIProviderError):
    """The provider's quota (e.g. Groq free-tier tokens/minute) is used up for now."""

    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__(f"provider rate limit reached; retry after {retry_after_seconds}s")
        self.retry_after_seconds = retry_after_seconds


# Used when Groq gives no usable retry hint; its per-minute quotas reset within a minute.
DEFAULT_RATE_LIMIT_RETRY_SECONDS = 30
_RETRY_IN_PATTERN = re.compile(r"try again in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?")


def _retry_after_seconds(exc: groq.RateLimitError) -> int:
    """Seconds until Groq accepts requests again, from its `retry-after` header or message."""
    header = exc.response.headers.get("retry-after")
    if header:
        try:
            return max(1, math.ceil(float(header)))
        except ValueError:
            pass
    match = _RETRY_IN_PATTERN.search(str(exc))
    if match and any(match.groups()):
        hours, minutes, seconds = match.groups()
        total = int(hours or 0) * 3600 + int(minutes or 0) * 60 + float(seconds or 0)
        return max(1, math.ceil(total))
    return DEFAULT_RATE_LIMIT_RETRY_SECONDS


class ProviderAdapter(Protocol):
    async def complete(self, system: str, messages: list[dict]) -> dict: ...


class GroqAdapter:
    """Thin seam around Groq's OpenAI-compatible chat API so tests can inject a fake adapter instead.

    The result is requested as strict structured output (JSON schema with
    constrained decoding) rather than a forced tool call: gpt-oss tool calls on Groq
    intermittently fail with 400 `tool_use_failed`, while strict mode guarantees the
    response matches RESULT_SCHEMA.

    openai/gpt-oss-120b is a reasoning model: it spends output tokens on reasoning
    before the answer, so the output budget leaves room for that and reasoning
    effort is kept low to bound latency against the request timeout.
    """

    def __init__(self, api_key: str, model: str, timeout: float) -> None:
        self._client = groq.AsyncGroq(api_key=api_key, timeout=timeout, max_retries=0)
        self._model = model

    async def complete(self, system: str, messages: list[dict]) -> dict:
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                max_completion_tokens=4096,
                reasoning_effort="low",
                messages=[{"role": "system", "content": system}, *messages],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": RESULT_SCHEMA_NAME,
                        "strict": True,
                        "schema": RESULT_SCHEMA,
                    },
                },
            )
        except groq.APITimeoutError as exc:
            raise AIProviderTimeout("provider request timed out") from exc
        except groq.BadRequestError as exc:
            # Groq reports a generation that failed schema validation as a 400 with
            # `json_validate_failed` — that's bad model output, not an outage.
            if "json_validate_failed" in str(exc):
                raise AIProviderInvalidOutput("provider output failed schema validation") from exc
            raise AIProviderUnavailable(f"provider returned {exc.status_code}") from exc
        except groq.RateLimitError as exc:
            raise AIProviderRateLimited(_retry_after_seconds(exc)) from exc
        except groq.APIStatusError as exc:
            raise AIProviderUnavailable(f"provider returned {exc.status_code}") from exc
        except groq.APIConnectionError as exc:
            raise AIProviderUnavailable("could not reach provider") from exc

        choice = response.choices[0]
        if choice.finish_reason == "length":
            raise AIProviderInvalidOutput("response truncated by the output token limit")

        content = choice.message.content
        if not content:
            raise AIProviderInvalidOutput("provider returned an empty response")
        try:
            result = json.loads(content)
        except json.JSONDecodeError as exc:
            raise AIProviderInvalidOutput("provider response was not valid JSON") from exc
        if not isinstance(result, dict):
            raise AIProviderInvalidOutput("provider response was not a JSON object")
        return result


def get_default_adapter() -> ProviderAdapter:
    return GroqAdapter(
        api_key=settings.ai_api_key, model=settings.ai_model, timeout=settings.ai_timeout_seconds
    )


def _build_messages(request: TripDraftRequest) -> list[dict]:
    return [{"role": m.role, "content": m.content} for m in request.messages]


def _build_system_prompt(request: TripDraftRequest) -> str:
    return SYSTEM_PROMPT.format(
        reference_date=request.reference_date.isoformat(),
        timezone=request.timezone,
        current_draft=request.draft.model_dump_json(),
    )


async def get_trip_draft(request: TripDraftRequest, adapter: ProviderAdapter) -> TripDraftResponse:
    raw = await adapter.complete(_build_system_prompt(request), _build_messages(request))
    try:
        return TripDraftResponse.model_validate(raw)
    except ValidationError as exc:
        # Field locations and error types only: the input values can contain the
        # user's trip details, which must not reach the logs (AI-spec.md).
        problems = "; ".join(
            f"{'.'.join(str(p) for p in err['loc'])}: {err['type']}" for err in exc.errors()
        )
        raise AIProviderInvalidOutput(f"response failed validation ({problems})") from exc
