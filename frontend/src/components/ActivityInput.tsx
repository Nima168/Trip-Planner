import { useState } from "react";
import type { FormEvent } from "react";

import type { Activity } from "../types";

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

  function commit() {
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
      <li className="flex items-center justify-between gap-3 rounded border border-border bg-background px-3 py-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex-1 text-left text-text hover:text-primary"
        >
          {activity.text}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-sm text-error hover:underline"
          aria-label={`Delete ${activity.text}`}
        >
          Delete
        </button>
      </li>
    );
  }

  return (
    <li className="rounded border border-primary bg-background px-3 py-2">
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
          disabled={isSaving}
          className="flex-1 rounded border border-border bg-surface px-2 py-1 text-text focus:border-primary focus:outline-none"
        />
      </form>
    </li>
  );
}
