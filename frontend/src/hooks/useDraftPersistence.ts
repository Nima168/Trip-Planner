import { useCallback, useEffect, useState } from "react";

import { EMPTY_DRAFT } from "../types/ai";
import type { ChatMessage, TripDraft } from "../types/ai";

const SCHEMA_VERSION = 1;

export interface PersistedDraftState {
  schemaVersion: number;
  messages: ChatMessage[];
  draft: TripDraft;
  composerText: string;
  mode: "chat" | "manual";
  referenceDate: string;
  timezone: string;
  updatedAt: string;
}

// Namespaced by API base URL + account, so switching accounts or environments never
// leaks one signed-in user's unfinished draft into another's session.
function storageKey(username: string): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string;
  return `musafir.newTripDraft.${apiBase}.${username}`;
}

function freshState(): PersistedDraftState {
  return {
    schemaVersion: SCHEMA_VERSION,
    messages: [],
    draft: { ...EMPTY_DRAFT },
    composerText: "",
    mode: "chat",
    referenceDate: new Date().toISOString().slice(0, 10),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    updatedAt: new Date().toISOString(),
  };
}

function isValidState(value: unknown): value is PersistedDraftState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === SCHEMA_VERSION &&
    Array.isArray(v.messages) &&
    typeof v.draft === "object" &&
    v.draft !== null &&
    typeof v.composerText === "string" &&
    (v.mode === "chat" || v.mode === "manual") &&
    typeof v.referenceDate === "string" &&
    typeof v.timezone === "string"
  );
}

function readStored(key: string): PersistedDraftState {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return freshState();
    const parsed: unknown = JSON.parse(raw);
    return isValidState(parsed) ? parsed : freshState();
  } catch {
    return freshState();
  }
}

// Called from AuthContext.logout (including 401-triggered logout), before the
// username is cleared, so the departing account's draft never lingers for the
// next sign-in on this device.
export function clearStoredDraft(username: string): void {
  try {
    localStorage.removeItem(storageKey(username));
  } catch {
    // best-effort; nothing else to do if storage is unavailable
  }
}

export function useDraftPersistence(username: string | null) {
  const key = username ? storageKey(username) : null;
  const [state, setState] = useState<PersistedDraftState>(() => (key ? readStored(key) : freshState()));
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    setState(key ? readStored(key) : freshState());
  }, [key]);

  const persist = useCallback(
    (next: PersistedDraftState) => {
      const withTimestamp = { ...next, updatedAt: new Date().toISOString() };
      setState(withTimestamp);
      if (!key) return;
      try {
        localStorage.setItem(key, JSON.stringify(withTimestamp));
        setStorageAvailable(true);
      } catch {
        // The in-memory `state` above still updates, so the active flow keeps
        // working for this tab — it just won't survive a refresh.
        setStorageAvailable(false);
      }
    },
    [key],
  );

  const clear = useCallback(() => {
    const next = freshState();
    setState(next);
    if (key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // best-effort
      }
    }
  }, [key]);

  return { state, persist, clear, storageAvailable };
}
