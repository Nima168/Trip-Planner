import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useTripDraft } from "../api/ai";
import { ApiError } from "../api/client";
import { useCreateTrip } from "../api/queries";
import { useAuth } from "../auth/AuthContext";
import { AppShell } from "../components/AppShell";
import { Icon } from "../components/Icon";
import { TripChat } from "../components/TripChat";
import type { Cooldown } from "../components/TripChat";
import { TripDraftReview } from "../components/TripDraftReview";
import { useDraftPersistence } from "../hooks/useDraftPersistence";
import type { ChatMessage, DraftFieldName, TripDraft } from "../types/ai";
import { MAX_MESSAGE_CHARS, MAX_MESSAGES, isDraftComplete } from "../types/ai";
import { isConfirmationPhrase } from "../utils/confirmation";
import { isPastDate, localTodayIso } from "../utils/date";

const ALL_FIELDS: DraftFieldName[] = ["destination", "start_date", "end_date", "trip_type"];
const CONVERSATION_LIMIT = 20;
// Used if a 429 arrives without a readable Retry-After header.
const DEFAULT_COOLDOWN_SECONDS = 60;

function startCooldown(seconds: number): Cooldown {
  return { until: Date.now() + seconds * 1000, seconds };
}

function isCoolingDown(cooldown: Cooldown | null): boolean {
  return cooldown !== null && cooldown.until > Date.now();
}

// Trips must start today or later (local date); the backend enforces this too.
function hasPastDate(draft: TripDraft): boolean {
  const today = localTodayIso();
  return isPastDate(draft.start_date, today) || isPastDate(draft.end_date, today);
}

const PAST_DATE_MESSAGE = "Trip dates can't be in the past — choose a start date of today or later.";

export function NewTripPage() {
  const { username } = useAuth();
  const { state, persist, clear, storageAvailable } = useDraftPersistence(username);
  const [clarificationFields, setClarificationFields] = useState<DraftFieldName[]>([]);
  const [confirmedSnapshot, setConfirmedSnapshot] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<Cooldown | null>(null);
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
  const isComplete =
    isDraftComplete(state.draft) && clarificationFields.length === 0 && !hasPastDate(state.draft);
  const limitReached = state.messages.length >= CONVERSATION_LIMIT;

  function abortPending() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  async function submitDraft(draft: TripDraft) {
    if (isCreating || !isDraftComplete(draft)) return;
    if (hasPastDate(draft)) {
      setCreateError(PAST_DATE_MESSAGE);
      return;
    }
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
      if (err instanceof ApiError && err.detail === "start_date cannot be in the past") {
        setCreateError(PAST_DATE_MESSAGE);
      } else {
        setCreateError(
          err instanceof ApiError ? String(err.detail ?? err.message) : "Could not create trip",
        );
      }
      setIsCreating(false);
    }
  }

  async function sendToAI(messages: ChatMessage[]) {
    abortPending();
    const controller = new AbortController();
    abortRef.current = controller;
    const version = ++requestVersionRef.current;
    setChatError(null);
    setCooldown(null);

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
        !hasPastDate(response.draft) &&
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
        if (err.status === 429) {
          const seconds = err.retryAfterSeconds ?? DEFAULT_COOLDOWN_SECONDS;
          setCooldown(startCooldown(seconds));
        } else if (err.status === 504)
          setChatError("The assistant took too long to reply. Retry, or enter the details manually.");
        else if (err.status === 503)
          setChatError("The AI assistant is unavailable right now. Retry, or enter the details manually.");
        else if (err.status === 502)
          setChatError("The assistant's reply didn't come through properly. Please retry.");
        else if (err.status === 422) setChatError(String(err.detail ?? "That message couldn't be sent."));
        else setChatError(String(err.detail ?? err.message));
      } else {
        setChatError("Something went wrong sending that message.");
      }
    }
  }

  // After a failed turn the user's message is already the last one in the transcript,
  // so a retry resends the conversation as-is instead of appending it again.
  const lastIsUser = state.messages.at(-1)?.role === "user";
  const canRetry = lastIsUser && !tripDraftMutation.isPending && !isCreating;

  function handleRetry() {
    if (canRetry) void sendToAI(state.messages);
  }

  async function handleSend() {
    const text = state.composerText.trim();
    if (!text || text.length > MAX_MESSAGE_CHARS || limitReached) return;
    if (isCoolingDown(cooldown)) return;

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
    setCreateError(null);
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
    setCooldown(null);
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
    setCooldown(null);
    setCreateError(null);
    clear();
  }

  const modeButton = (mode: "chat" | "manual", icon: "sparkles" | "pencil", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={state.mode === mode}
      onClick={() => handleModeChange(mode)}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
        state.mode === mode ? "bg-surface text-primary shadow-sm" : "text-text-muted hover:text-ink"
      }`}
    >
      <Icon name={icon} /> {label}
    </button>
  );

  const review = (
    <TripDraftReview
      draft={state.draft}
      missingFields={missingFields}
      clarificationFields={clarificationFields}
      onChange={handleDraftFieldChange}
      onSubmit={() => submitDraft(state.draft)}
      isComplete={isComplete}
      isSubmitting={isCreating}
    />
  );

  return (
    <AppShell>
      <Link to="/trips" className="btn-ghost -ml-3 mb-3 px-3">
        <Icon name="arrowLeft" /> Back to Trips
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Plan a new trip</h1>
          <p className="mt-1 text-text-muted">
            {state.mode === "chat"
              ? "Chat with our assistant — it fills in the trip details as you go."
              : "Fill in the four details below to create your trip."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="How to create the trip" className="inline-flex rounded-xl bg-sand p-1">
            {modeButton("chat", "sparkles", "Describe your trip")}
            {modeButton("manual", "pencil", "Enter details manually")}
          </div>
          <button type="button" onClick={handleDiscard} className="btn-ghost px-3 hover:text-error">
            <Icon name="trash" /> Discard draft
          </button>
        </div>
      </div>

      {createError && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-xl bg-error-soft px-4 py-3 text-sm text-error">
          <Icon name="alert" /> {createError}
        </p>
      )}
      {!storageAvailable && (
        <p className="mb-4 rounded-xl bg-sand px-4 py-3 text-sm text-text-muted">
          Your browser storage is unavailable, so this draft won't be saved if you leave the page —
          the current session still works normally.
        </p>
      )}

      {state.mode === "chat" ? (
        <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
          <TripChat
            messages={state.messages}
            composerText={state.composerText}
            onComposerChange={(text) => persist({ ...state, composerText: text })}
            onSend={handleSend}
            onRetry={handleRetry}
            onSwitchToManual={() => handleModeChange("manual")}
            canRetry={canRetry}
            isSending={tripDraftMutation.isPending}
            disabled={isCreating}
            error={chatError}
            cooldown={cooldown}
            limitReached={limitReached}
          />
          <div className="lg:sticky lg:top-24">{review}</div>
        </div>
      ) : (
        <div className="max-w-xl">{review}</div>
      )}
    </AppShell>
  );
}
