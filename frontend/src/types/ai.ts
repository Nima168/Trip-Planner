import type { TripType } from "./index";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TripDraft {
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  trip_type: TripType | null;
}

export interface TripDraftRequest {
  messages: ChatMessage[];
  draft: TripDraft;
  reference_date: string;
  timezone: string;
}

export type DraftFieldName = "destination" | "start_date" | "end_date" | "trip_type";

export interface TripDraftResponse {
  draft: TripDraft;
  missing_fields: DraftFieldName[];
  clarification_fields: DraftFieldName[];
  reply: string;
}

export const EMPTY_DRAFT: TripDraft = {
  destination: null,
  start_date: null,
  end_date: null,
  trip_type: null,
};

export const MAX_MESSAGE_CHARS = 2000;
export const MAX_AGGREGATE_CHARS = 12000;
export const MAX_MESSAGES = 19;

export function isDraftComplete(draft: TripDraft): boolean {
  return (
    draft.destination !== null &&
    draft.start_date !== null &&
    draft.end_date !== null &&
    draft.trip_type !== null
  );
}
