import type { TripType } from "../types";
import { TRIP_TYPE_LABELS } from "../types";
import type { DraftFieldName, TripDraft } from "../types/ai";

const TRIP_TYPES: TripType[] = ["solo", "couple", "family", "group_of_friends"];

function fieldStatus(
  field: DraftFieldName,
  missing: DraftFieldName[],
  clarification: DraftFieldName[],
): "ok" | "missing" | "clarify" {
  if (clarification.includes(field)) return "clarify";
  if (missing.includes(field)) return "missing";
  return "ok";
}

function FieldNote({ status }: { status: "ok" | "missing" | "clarify" }) {
  if (status === "clarify") return <p className="mt-1 text-xs text-error">Needs clarification</p>;
  return null;
}

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm text-text-muted">
      {children} <span className="text-error">*</span>
    </label>
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
  const inputClass = (status: "ok" | "missing" | "clarify") =>
    `w-full rounded border bg-surface px-3 py-2 text-text focus:outline-none ${
      status === "ok" ? "border-border focus:border-primary" : "border-error focus:border-error"
    }`;

  const destinationStatus = fieldStatus("destination", missingFields, clarificationFields);
  const startStatus = fieldStatus("start_date", missingFields, clarificationFields);
  const endStatus = fieldStatus("end_date", missingFields, clarificationFields);
  const tripTypeStatus = fieldStatus("trip_type", missingFields, clarificationFields);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        Trip details
      </h2>

      <div className="mb-3">
        <RequiredLabel htmlFor="draft-destination">Destination</RequiredLabel>
        <input
          id="draft-destination"
          value={draft.destination ?? ""}
          onChange={(e) => onChange("destination", e.target.value)}
          className={inputClass(destinationStatus)}
        />
        <FieldNote status={destinationStatus} />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <RequiredLabel htmlFor="draft-start">From</RequiredLabel>
          <input
            id="draft-start"
            type="date"
            value={draft.start_date ?? ""}
            onChange={(e) => onChange("start_date", e.target.value)}
            className={inputClass(startStatus)}
          />
          <FieldNote status={startStatus} />
        </div>
        <div>
          <RequiredLabel htmlFor="draft-end">To</RequiredLabel>
          <input
            id="draft-end"
            type="date"
            value={draft.end_date ?? ""}
            onChange={(e) => onChange("end_date", e.target.value)}
            className={inputClass(endStatus)}
          />
          <FieldNote status={endStatus} />
        </div>
      </div>

      <div className="mb-4">
        <RequiredLabel htmlFor="draft-trip-type">Trip type</RequiredLabel>
        <select
          id="draft-trip-type"
          value={draft.trip_type ?? ""}
          onChange={(e) => onChange("trip_type", e.target.value)}
          className={inputClass(tripTypeStatus)}
        >
          <option value="" disabled>
            Select…
          </option>
          {TRIP_TYPES.map((type) => (
            <option key={type} value={type}>
              {TRIP_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <FieldNote status={tripTypeStatus} />
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!isComplete || isSubmitting}
        className="w-full rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {isSubmitting ? "Creating…" : "Create trip"}
      </button>
    </div>
  );
}
