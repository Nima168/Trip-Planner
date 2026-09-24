import { useState } from "react";
import type { FormEvent } from "react";

import type { Day } from "../types";
import { formatDateLong } from "../utils/date";
import { ActivityInput } from "./ActivityInput";
import { Icon } from "./Icon";

function weekday(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", { weekday: "long" });
}

export function DayPlanner({
  day,
  expanded,
  onToggle,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  isMutating,
}: {
  day: Day;
  expanded: boolean;
  onToggle: () => void;
  onAddActivity: (text: string) => void;
  onUpdateActivity: (activityId: string, text: string) => void;
  onDeleteActivity: (activityId: string) => void;
  isMutating: boolean;
}) {
  const [newActivityText, setNewActivityText] = useState("");
  const count = day.activities.length;

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const trimmed = newActivityText.trim();
    if (!trimmed) return;
    onAddActivity(trimmed);
    setNewActivityText("");
  }

  return (
    <li className="relative pl-14">
      <span
        className={`absolute left-0 top-3 grid h-10 w-10 place-items-center rounded-full border-4 border-background text-sm font-bold ${
          count > 0 ? "bg-primary text-white" : "bg-sand text-text-muted"
        }`}
        aria-hidden="true"
      >
        {day.day_number}
      </span>

      <div className={`card overflow-hidden transition ${expanded ? "ring-1 ring-primary/20" : ""}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-background/60"
        >
          <span>
            <span className="block font-semibold text-ink">
              Day {day.day_number} — {formatDateLong(day.date)}
            </span>
            <span className="text-sm text-text-muted">
              {weekday(day.date)}
              {!expanded && count > 0 && ` · ${day.activities[0].text}${count > 1 ? ` +${count - 1} more` : ""}`}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className={`chip ${count > 0 ? "bg-primary-soft text-primary" : "bg-sand text-text-muted"}`}>
              {count} {count === 1 ? "activity" : "activities"}
            </span>
            <Icon
              name="chevronDown"
              className={`h-5 w-5 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {expanded && (
          <div className="border-t border-border/70 px-5 py-4 animate-fade-up">
            {count === 0 ? (
              <p className="mb-3 text-sm text-text-muted">No activities yet — add one below.</p>
            ) : (
              <ul className="mb-4 flex flex-col gap-2">
                {day.activities.map((activity) => (
                  <ActivityInput
                    key={activity.id}
                    activity={activity}
                    isSaving={isMutating}
                    onSave={(text) => onUpdateActivity(activity.id, text)}
                    onDelete={() => onDeleteActivity(activity.id)}
                  />
                ))}
              </ul>
            )}

            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                value={newActivityText}
                onChange={(e) => setNewActivityText(e.target.value)}
                placeholder="Add an activity…"
                aria-label={`Add an activity to day ${day.day_number}`}
                className="field-input flex-1"
              />
              <button
                type="submit"
                disabled={isMutating || !newActivityText.trim()}
                className="btn-primary shrink-0"
              >
                <Icon name="plus" /> Add
              </button>
            </form>
          </div>
        )}
      </div>
    </li>
  );
}
