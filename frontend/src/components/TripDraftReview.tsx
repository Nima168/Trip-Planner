import type { ReactNode } from "react";

import type { TripType } from "../types";
import { TRIP_TYPE_LABELS } from "../types";
import type { DraftFieldName, TripDraft } from "../types/ai";
import { isPastDate, localTodayIso } from "../utils/date";
import { TRIP_TYPE_EMOJI } from "../utils/trip";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

const TRIP_TYPES: TripType[] = ["solo", "couple", "family", "group_of_friends"];

type Status = "ok" | "missing" | "clarify";

function fieldStatus(
  field: DraftFieldName,
  missing: DraftFieldName[],
  clarification: DraftFieldName[],
): Status {
  if (clarification.includes(field)) return "clarify";
  if (missing.includes(field)) return "missing";
  return "ok";
}

function Field({
  id,
  label,
  icon,
  status,
  filled,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: IconName;
  status: Status;
  filled: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label flex items-center gap-1.5">
        <Icon name={icon} className="h-4 w-4 text-text-muted" />
        {label} <span className="text-error">*</span>
        {filled && status === "ok" && !error && (
          <Icon name="check" className="ml-auto h-4 w-4 text-success" />
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-error">
          {error}
        </p>
      ) : (
        status === "clarify" && <p className="mt-1 text-xs font-medium text-error">Needs clarification</p>
      )}
    </div>
  );
}

export function TripDraftReview({
  draft,
  missingFields,
  clarificationFields,
  onChange,
  onSubmit,
  isComplete,
  isSubmitting,
}: {
  draft: TripDraft;
  missingFields: DraftFieldName[];
  clarificationFields: DraftFieldName[];
  onChange: (field: DraftFieldName, value: string) => void;
  onSubmit: () => void;
  isComplete: boolean;
  isSubmitting: boolean;
}) {
  const inputClass = (status: Status, hasError = false) =>
    `field-input ${status === "clarify" || hasError ? "border-error focus:border-error focus:ring-error/20" : ""}`;

  const today = localTodayIso();
  const startError = isPastDate(draft.start_date, today)
    ? "Start date can't be in the past — choose today or a later date."
    : null;
  const endError = isPastDate(draft.end_date, today)
    ? "End date can't be in the past — choose today or a later date."
    : null;

  const destinationStatus = fieldStatus("destination", missingFields, clarificationFields);
  const startStatus = fieldStatus("start_date", missingFields, clarificationFields);
  const endStatus = fieldStatus("end_date", missingFields, clarificationFields);
  const tripTypeStatus = fieldStatus("trip_type", missingFields, clarificationFields);

  const values = [draft.destination, draft.start_date, draft.end_date, draft.trip_type];
  // Fields needing clarification are null in the draft, so they don't count here;
  // neither do past dates, which can't be submitted.
  const ready = values.filter((v) => v !== null && v !== "").length - (startError ? 1 : 0) - (endError ? 1 : 0);

  return (
    <div className="card flex flex-col p-5">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Trip details</h2>
          <span className={`chip ${isComplete ? "bg-success-soft text-success" : "bg-sand text-text-muted"}`}>
            {ready} of 4 ready
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sand" aria-hidden="true">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-success" : "bg-primary"}`}
            style={{ width: `${(ready / 4) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Filled in from your chat — you can edit any field directly.
        </p>
      </div>

      <div className="space-y-4">
        <Field
          id="draft-destination"
          label="Destination"
          icon="mapPin"
          status={destinationStatus}
          filled={Boolean(draft.destination)}
        >
          <input
            id="draft-destination"
            value={draft.destination ?? ""}
            onChange={(e) => onChange("destination", e.target.value)}
            placeholder="e.g. Goa"
            className={inputClass(destinationStatus)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="draft-start"
            label="From"
            icon="calendar"
            status={startStatus}
            filled={Boolean(draft.start_date)}
            error={startError}
          >
            <input
              id="draft-start"
              type="date"
              value={draft.start_date ?? ""}
              min={today}
              onChange={(e) => onChange("start_date", e.target.value)}
              aria-invalid={Boolean(startError)}
              aria-describedby={startError ? "draft-start-error" : undefined}
              className={inputClass(startStatus, Boolean(startError))}
            />
          </Field>
          <Field
            id="draft-end"
            label="To"
            icon="calendar"
            status={endStatus}
            filled={Boolean(draft.end_date)}
            error={endError}
          >
            <input
              id="draft-end"
              type="date"
              value={draft.end_date ?? ""}
              min={draft.start_date && draft.start_date > today ? draft.start_date : today}
              onChange={(e) => onChange("end_date", e.target.value)}
              aria-invalid={Boolean(endError)}
              aria-describedby={endError ? "draft-end-error" : undefined}
              className={inputClass(endStatus, Boolean(endError))}
            />
          </Field>
        </div>

        <Field id="draft-trip-type" label="Trip type" icon="users" status={tripTypeStatus} filled={Boolean(draft.trip_type)}>
          <select
            id="draft-trip-type"
            value={draft.trip_type ?? ""}
            onChange={(e) => onChange("trip_type", e.target.value)}
            className={inputClass(tripTypeStatus)}
          >
            <option value="" disabled>
              Who's travelling?
            </option>
            {TRIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {TRIP_TYPE_EMOJI[type]} {TRIP_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!isComplete || isSubmitting}
        className="btn-primary mt-6 w-full py-3 text-base"
      >
        <Icon name="check" />
        {isSubmitting ? "Creating…" : "Create trip"}
      </button>
      {!isComplete && (
        <p className="mt-2 text-center text-xs text-text-muted">
          {startError || endError
            ? "Pick dates from today onwards to create your trip."
            : "Fill in all four details to create your trip."}
        </p>
      )}
    </div>
  );
}
