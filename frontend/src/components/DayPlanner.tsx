import { useState } from "react";
import type { FormEvent } from "react";

import type { Day } from "../types";
import { formatDateLong } from "../utils/date";
import { ActivityInput } from "./ActivityInput";

export function DayPlanner({
  day,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  isMutating,
}: {
  day: Day;
  onAddActivity: (text: string) => void;
  onUpdateActivity: (activityId: string, text: string) => void;
  onDeleteActivity: (activityId: string) => void;
  isMutating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newActivityText, setNewActivityText] = useState("");

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const trimmed = newActivityText.trim();
    if (!trimmed) return;
    onAddActivity(trimmed);
    setNewActivityText("");
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-medium text-text">
          Day {day.day_number} — {formatDateLong(day.date)}
        </span>
        <span className="text-sm text-text-muted">{day.activities.length} activities</span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          {day.activities.length === 0 ? (
            <p className="mb-3 text-sm text-text-muted">No activities yet — add one below.</p>
          ) : (
            <ul className="mb-3 flex flex-col gap-2">
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
              className="flex-1 rounded border border-border bg-background px-3 py-2 text-text focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={isMutating || !newActivityText.trim()}
              className="rounded bg-primary px-3 py-2 text-sm text-white hover:bg-primary-hover disabled:opacity-60"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
