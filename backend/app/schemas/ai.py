from datetime import date as date_
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models import TripType

_DRAFT_FIELDS = {"destination", "start_date", "end_date", "trip_type"}


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class TripDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination: str | None = Field(default=None, max_length=300)
    start_date: date_ | None = None
    end_date: date_ | None = None
    trip_type: TripType | None = None

    @field_validator("destination")
    @classmethod
    def _trim_destination(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("destination must not be blank")
        return stripped

    @model_validator(mode="after")
    def _end_on_or_after_start(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class TripDraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    messages: list[ChatMessage] = Field(min_length=1, max_length=19)
    draft: TripDraft
    reference_date: date_
    timezone: str = Field(min_length=1, max_length=100)

    @field_validator("messages")
    @classmethod
    def _last_message_is_user(cls, messages: list[ChatMessage]) -> list[ChatMessage]:
        if messages[-1].role != "user":
            raise ValueError("the last message must be from the user")
        return messages

    @field_validator("messages")
    @classmethod
    def _aggregate_length(cls, messages: list[ChatMessage]) -> list[ChatMessage]:
        total = sum(len(m.content) for m in messages)
        if total > 12000:
            raise ValueError("aggregate message content exceeds 12000 characters")
        return messages

    @field_validator("timezone")
    @classmethod
    def _valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError(f"unknown timezone: {value}") from exc
        return value


class TripDraftResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft: TripDraft
    missing_fields: list[str]
    clarification_fields: list[str]
    reply: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def _validate_field_lists(self):
        for name in [*self.missing_fields, *self.clarification_fields]:
            if name not in _DRAFT_FIELDS:
                raise ValueError(f"unknown field name: {name}")
        if len(set(self.missing_fields)) != len(self.missing_fields):
            raise ValueError("missing_fields must not contain duplicates")
        if len(set(self.clarification_fields)) != len(self.clarification_fields):
            raise ValueError("clarification_fields must not contain duplicates")
        if set(self.missing_fields) & set(self.clarification_fields):
            raise ValueError("missing_fields and clarification_fields must be disjoint")

        draft_dict = self.draft.model_dump()
        null_fields = {name for name, value in draft_dict.items() if value is None}
        flagged_fields = set(self.missing_fields) | set(self.clarification_fields)
        if null_fields != flagged_fields:
            raise ValueError(
                "missing_fields + clarification_fields must exactly cover the null draft fields"
            )
        return self
