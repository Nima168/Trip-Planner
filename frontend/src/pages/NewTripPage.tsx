import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useTripDraft } from "../api/ai";
import { ApiError } from "../api/client";
import { useCreateTrip } from "../api/queries";
import { useAuth } from "../auth/AuthContext";
import { AppShell } from "../components/AppShell";
import { TripChat } from "../components/TripChat";
import { TripDraftReview } from "../components/TripDraftReview";
import { useDraftPersistence } from "../hooks/useDraftPersistence";
import type { ChatMessage, DraftFieldName, TripDraft } from "../types/ai";
import { MAX_MESSAGE_CHARS, MAX_MESSAGES, isDraftComplete } from "../types/ai";
import { isConfirmationPhrase } from "../utils/confirmation";

const ALL_FIELDS: DraftFieldName[] = ["destination", "start_date", "end_date", "trip_type"];
const CONVERSATION_LIMIT = 20;

export function NewTripPage() {
  const { username } = useAuth();
  const { state, persist, clear, storageAvailable } = useDraftPersistence(username);
  const [clarificationFields, setClarificationFields] = useState<DraftFieldName[]>([]);
  const [confirmedSnapshot, setConfirmedSnapshot] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const tripDraftMutation = useTripDraft();
  const createTrip = useCreateTrip();
  const navigate = useNavigate();
  const requestVersionRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const missingFields = ALL_FIELDS.filter(
    (field) => state.draft[field] === null && !clarificationFields.includes(field),
  );
  const isComplete = isDraftComplete(state.draft) && clarificationFields.length === 0;
  const limitReached = state.messages.length >= CONVERSATION_LIMIT;

  function abortPending() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  async function submitDraft(draft: TripDraft) {
    if (isCreating || !isDraftComplete(draft)) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const trip = await createTrip.mutateAsync({
        destination: draft.destination!,
        start_date: draft.start_date!,
        end_date: draft.end_date!,
        trip_type: draft.trip_type!,
      });
      clear();
      navigate(`/trips/${trip.id}`, { replace: true });
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? String(err.detail ?? err.message) : "Could not create trip",
      );
      setIsCreating(false);
    }
  }

  async function sendToAI(messages: ChatMessage[]) {
    abortPending();
    const controller = new AbortController();
    abortRef.current = controller;
    const version = ++requestVersionRef.current;
    setChatError(null);

    try {
      const response = await tripDraftMutation.mutateAsync({
        payload: {
          messages: messages.slice(-MAX_MESSAGES),
          draft: state.draft,
          reference_date: state.referenceDate,
          timezone: state.timezone,
        },
        signal: controller.signal,
      });
      // A newer turn, manual edit, mode switch, or restart superseded this response.
      if (requestVersionRef.current !== version) return;

      const assistantMessage: ChatMessage = { role: "assistant", content: response.reply };
      persist({ ...state, messages: [...messages, assistantMessage], draft: response.draft, composerText: "" });
      setClarificationFields(response.clarification_fields);

      const complete =
        isDraftComplete(response.draft) &&
        response.missing_fields.length === 0 &&
        response.clarification_fields.length === 0;
      setConfirmedSnapshot(complete ? JSON.stringify(response.draft) : null);
    } catch (err) {
      if (requestVersionRef.current !== version) return;
      if (err instanceof DOMException && err.name === "AbortError") return;

      // Keep the user's message in the transcript (already persisted by the
      // caller) so a retry doesn't need to re-type or re-append it.
      persist({ ...state, messages, composerText: "" });

      if (err instanceof ApiError) {
        if (err.status === 429) setChatError("Too many requests — please wait a moment and try again.");
        else if (err.status === 504) setChatError("The assistant timed out. Retry, or switch to manual entry.");
        else if (err.status === 503) setChatError("AI is currently unavailable. Retry, or switch to manual entry.");
        else if (err.status === 502) setChatError("The assistant returned something unexpected. Please retry.");
        else if (err.status === 422) setChatError(String(err.detail ?? "That message couldn't be sent."));
        else setChatError(String(err.detail ?? err.message));
      } else {
        setChatError("Something went wrong sending that message.");
      }
    }
  }

  async function handleSend() {
    const text = state.composerText.trim();
    if (!text || text.length > MAX_MESSAGE_CHARS || limitReached) return;

    const userMessage: ChatMessage = { role: "user", content: text };

    if (confirmedSnapshot && isConfirmationPhrase(text)) {
      const draftToSubmit = JSON.parse(confirmedSnapshot) as TripDraft;
      persist({ ...state, messages: [...state.messages, userMessage], composerText: "" });
      setConfirmedSnapshot(null);
      await submitDraft(draftToSubmit);
      return;
    }

    setConfirmedSnapshot(null);
    const nextMessages = [...state.messages, userMessage];
    persist({ ...state, messages: nextMessages, composerText: "" });
    await sendToAI(nextMessages);
  }

  function handleDraftFieldChange(field: DraftFieldName, value: string) {
    setConfirmedSnapshot(null);
    const newDraft: TripDraft = { ...state.draft, [field]: value === "" ? null : value } as TripDraft;
    persist({ ...state, draft: newDraft });
    if (value !== "") {
      setClarificationFields((prev) => prev.filter((f) => f !== field));
    }
  }

  function handleModeChange(mode: "chat" | "manual") {
    if (mode === state.mode) return;
    abortPending();
    requestVersionRef.current += 1;
    setConfirmedSnapshot(null);
    setChatError(null);
    if (mode === "chat") {
      persist({
        ...state,
        mode,
        messages: [],
        referenceDate: new Date().toISOString().slice(0, 10),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } else {
      persist({ ...state, mode });
    }
  }

  function handleDiscard() {
    abortPending();
    requestVersionRef.current += 1;
    setConfirmedSnapshot(null);
    setClarificationFields([]);
    setChatError(null);
    setCreateError(null);
    clear();
  }

  return (
    <AppShell>
      <Link to="/trips" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Back to Trips
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">New trip</h1>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => handleModeChange("chat")}
            className={`rounded border px-3 py-1 ${
              state.mode === "chat"
                ? "border-primary bg-primary text-white"
                : "border-border text-text hover:border-primary"
            }`}
          >
            Describe your trip
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("manual")}
            className={`rounded border px-3 py-1 ${
              state.mode === "manual"
                ? "border-primary bg-primary text-white"
                : "border-border text-text hover:border-primary"
            }`}
          >
            Enter details manually
          </button>
          <button type="button" onClick={handleDiscard} className="px-2 text-text-muted hover:text-error">
            Discard draft
          </button>
        </div>
      </div>

      {createError && <p className="mb-3 text-sm text-error">{createError}</p>}
      {!storageAvailable && (
        <p className="mb-3 text-sm text-text-muted">
          Your browser storage is unavailable, so this draft won't be saved if you leave the page —
          the current session still works normally.
        </p>
      )}

      {state.mode === "chat" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <TripChat
            messages={state.messages}
            composerText={state.composerText}
            onComposerChange={(text) => persist({ ...state, composerText: text })}
            onSend={handleSend}
            isSending={tripDraftMutation.isPending}
            disabled={isCreating}
            error={chatError}
            limitReached={limitReached}
          />
          <TripDraftReview
            draft={state.draft}
            missingFields={missingFields}
            clarificationFields={clarificationFields}
            onChange={handleDraftFieldChange}
            onSubmit={() => submitDraft(state.draft)}
            isComplete={isComplete}
            isSubmitting={isCreating}
          />
        </div>
      ) : (
        <TripDraftReview
          draft={state.draft}
          missingFields={missingFields}
          clarificationFields={clarificationFields}
          onChange={handleDraftFieldChange}
          onSubmit={() => submitDraft(state.draft)}
          isComplete={isComplete}
          isSubmitting={isCreating}
        />
      )}
    </AppShell>
  );
}
