import { useRef, useState } from "react";
import type { FormEvent } from "react";

import type { Activity } from "../types";
import { Icon } from "./Icon";

export function ActivityInput({
  activity,
  onSave,
  onDelete,
  isSaving,
}: {
  activity: Activity;
  onSave: (text: string) => void;
  onDelete: () => void;
  isSaving: boolean;
}) {
  const [text, setText] = useState(activity.text);
  const [editing, setEditing] = useState(false);
  // Escape unmounts the input, which fires blur -> commit with the edited text still
  // in state; this flag makes that commit a no-op so the cancelled edit isn't saved.
  const cancelledRef = useRef(false);

  function startEditing() {
    cancelledRef.current = false;
    setEditing(true);
  }

  function commit() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const trimmed = text.trim();
    if (trimmed && trimmed !== activity.text) {
      onSave(trimmed);
    } else {
      setText(activity.text);
    }
    setEditing(false);
  }

  if (!editing) {
    return (
      <li className="group flex items-center gap-3 rounded-xl border border-border bg-background/70 px-3.5 py-2.5">
        <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-hidden="true" />
        <button
          type="button"
          onClick={startEditing}
          className="flex-1 text-left text-text hover:text-primary"
          title="Click to edit"
        >
          {activity.text}
        </button>
        <button
          type="button"
          onClick={startEditing}
          className="rounded-lg p-1.5 text-text-muted opacity-70 transition hover:bg-sand hover:text-ink group-hover:opacity-100"
          aria-label={`Edit ${activity.text}`}
        >
          <Icon name="pencil" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-1.5 text-text-muted opacity-70 transition hover:bg-error-soft hover:text-error group-hover:opacity-100"
          aria-label={`Delete ${activity.text}`}
        >
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-primary bg-surface px-2 py-1.5">
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          commit();
        }}
        className="flex items-center gap-2"
      >
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              cancelledRef.current = true;
              setText(activity.text);
              setEditing(false);
            }
          }}
          disabled={isSaving}
          aria-label="Edit activity"
          className="flex-1 rounded-lg bg-transparent px-2 py-1 text-text focus:outline-none"
        />
        <span className="pr-2 text-xs text-text-muted">Enter to save · Esc to cancel</span>
      </form>
    </li>
  );
}
