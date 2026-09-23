import type { KeyboardEvent } from "react";

import type { ChatMessage } from "../types/ai";
import { MAX_MESSAGE_CHARS } from "../types/ai";

const SAMPLE_PROMPT = "Goa from 03/04/2027 to 05/04/2027 with friends.";

export function TripChat({
  messages,
  composerText,
  onComposerChange,
  onSend,
  isSending,
  disabled,
  error,
  limitReached,
}: {
  messages: ChatMessage[];
  composerText: string;
  onComposerChange: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  disabled: boolean;
  error: string | null;
  limitReached: boolean;
}) {
  const trimmed = composerText.trim();
  const overLimit = composerText.length > MAX_MESSAGE_CHARS;
  const canSend = Boolean(trimmed) && !overLimit && !isSending && !disabled && !limitReached;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline. Ignore Enter while an IME
    // composition is in progress so it doesn't submit prematurely.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface">
      <div aria-live="polite" className="flex max-h-96 flex-col gap-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-text-muted">Where would you like to go, when, and who is travelling?</p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              message.role === "user"
                ? "self-end bg-primary text-white"
                : "self-start bg-background text-text"
            }`}
          >
            {message.content}
          </div>
        ))}
        {isSending && <p className="self-start text-sm text-text-muted">Thinking…</p>}
      </div>

      <div className="border-t border-border p-3">
        <p className="mb-2 text-xs text-text-muted">
          e.g. “{SAMPLE_PROMPT}” — dates use DD/MM/YYYY, so this means 3–5 April 2027.
        </p>
        <textarea
          value={composerText}
          onChange={(e) => onComposerChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || limitReached}
          placeholder="Describe your trip in English or Hinglish…"
          rows={2}
          aria-label="Message"
          className="w-full resize-none rounded border border-border bg-background px-3 py-2 text-text focus:border-primary focus:outline-none disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
          <span className={overLimit ? "text-error" : ""}>
            {composerText.length} / {MAX_MESSAGE_CHARS}
          </span>
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            className="rounded bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-hover disabled:opacity-60"
          >
            Send
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
        {limitReached && (
          <p className="mt-2 text-sm text-error">
            This conversation has reached its length limit — switch to manual entry or restart.
          </p>
        )}
      </div>
    </div>
  );
}
