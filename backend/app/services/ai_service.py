from typing import Protocol

import anthropic
from pydantic import ValidationError

from app.config import settings
from app.schemas.ai import TripDraftRequest, TripDraftResponse
from app.services.ai_prompts import RESULT_TOOL_NAME, RESULT_TOOL_SCHEMA, SYSTEM_PROMPT


class AIProviderError(Exception):
    """Base class for all provider-side failures; the router maps these to HTTP errors."""


class AIProviderTimeout(AIProviderError):
    pass


class AIProviderUnavailable(AIProviderError):
    pass


class AIProviderInvalidOutput(AIProviderError):
    pass


class ProviderAdapter(Protocol):
    async def complete(self, system: str, messages: list[dict]) -> dict: ...


class AnthropicAdapter:
    """Thin seam around the Anthropic SDK so tests can inject a fake adapter instead."""

    def __init__(self, api_key: str, model: str, timeout: float) -> None:
        self._client = anthropic.AsyncAnthropic(api_key=api_key, timeout=timeout, max_retries=0)
        self._model = model

    async def complete(self, system: str, messages: list[dict]) -> dict:
        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=1024,
                system=system,
                messages=messages,
                tools=[
                    {
                        "name": RESULT_TOOL_NAME,
                        "description": "Return the extracted trip draft for this turn.",
                        "input_schema": RESULT_TOOL_SCHEMA,
                    }
                ],
                tool_choice={"type": "tool", "name": RESULT_TOOL_NAME},
            )
        except anthropic.APITimeoutError as exc:
            raise AIProviderTimeout("provider request timed out") from exc
        except anthropic.APIStatusError as exc:
            raise AIProviderUnavailable(f"provider returned {exc.status_code}") from exc
        except anthropic.APIConnectionError as exc:
            raise AIProviderUnavailable("could not reach provider") from exc

        if response.stop_reason == "max_tokens":
            raise AIProviderInvalidOutput("response truncated by the output token limit")

        for block in response.content:
            if block.type == "tool_use" and block.name == RESULT_TOOL_NAME:
                return block.input
        raise AIProviderInvalidOutput("provider did not return the expected tool call")


def get_default_adapter() -> ProviderAdapter:
    return AnthropicAdapter(
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
        raise AIProviderInvalidOutput(str(exc)) from exc
