import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";

import { formatWait, useCountdown } from "../hooks/useCountdown";
import type { ChatMessage } from "../types/ai";
import { MAX_MESSAGE_CHARS } from "../types/ai";
import { Icon } from "./Icon";

const SAMPLE_PROMPT = "Goa from 03/04/2027 to 05/04/2027 with friends.";

const SUGGESTIONS = [
  "Solo trip to Goa from 1 to 3 October",
  "Family trip to Jaipur, 10–13 November",
  "Hum dono Manali ja rahe hain next weekend",
];

// Above this, Groq's limit is a daily quota rather than a per-minute one.
const LONG_WAIT_SECONDS = 120;

function AssistantAvatar() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-white">
      <Icon name="compass" className="h-4 w-4" />
    </span>
  );
}

export interface Cooldown {
  /** Date.now() timestamp when sending is allowed again. */
  until: number;
  /** Length of the whole wait, for the progress bar. */
  seconds: number;
}

function RateLimitNotice({
  cooldown,
  canRetry,
  onRetry,
  onSwitchToManual,
}: {
  cooldown: Cooldown;
  canRetry: boolean;
  onRetry: () => void;
  onSwitchToManual: () => void;
}) {
  const remaining = useCountdown(cooldown.until);
  const totalSeconds = Math.max(1, cooldown.seconds);

  if (remaining === 0) {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
        <span className="flex items-center gap-2">
          <Icon name="check" /> Ready! You can send your message again.
        </span>
        {canRetry && (
          <button type="button" onClick={onRetry} className="btn-primary px-3 py-1.5">
            <Icon name="refresh" /> Send again
          </button>
        )}
      </div>
    );
  }

  const longWait = remaining > LONG_WAIT_SECONDS;
  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-gold/50 bg-gold-soft px-4 py-3 text-sm text-ink">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="clock" className="h-4 w-4 text-primary" />
        {longWait ? "The AI assistant has reached its usage limit for now" : "Our assistant needs a short breather"}
      </p>
      <p className="mt-1 text-text-muted">
        {longWait ? (
          <>
            Please try again in <strong className="text-ink">{formatWait(remaining)}</strong>, or fill in
            the trip details yourself — it only takes a moment.
          </>
        ) : (
          <>
            Lots of trip requests came in over the last minute. Please wait{" "}
            <strong className="text-ink">{formatWait(remaining)}</strong> and send again — your chat and
            trip details are saved.
          </>
        )}
      </p>
      {longWait ? (
        <button type="button" onClick={onSwitchToManual} className="btn-secondary mt-3 px-3 py-1.5">
          <Icon name="pencil" /> Enter details manually
        </button>
      ) : (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gold/25" aria-hidden="true">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-linear"
            style={{ width: `${Math.min(100, (remaining / totalSeconds) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function TripChat({
  messages,
  composerText,
  onComposerChange,
  onSend,
  onRetry,
  onSwitchToManual,
  canRetry,
  isSending,
  disabled,
  error,
  cooldown,
  limitReached,
}: {
  messages: ChatMessage[];
  composerText: string;
  onComposerChange: (text: string) => void;
  onSend: () => void;
  onRetry: () => void;
  onSwitchToManual: () => void;
  canRetry: boolean;
  isSending: boolean;
  disabled: boolean;
  error: string | null;
  cooldown: Cooldown | null;
  limitReached: boolean;
}) {
  const coolingDown = useCountdown(cooldown?.until ?? null) > 0;
  const trimmed = composerText.trim();
  const overLimit = composerText.length > MAX_MESSAGE_CHARS;
  const canSend =
    Boolean(trimmed) && !overLimit && !isSending && !disabled && !limitReached && !coolingDown;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isSending]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline. Ignore Enter while an IME
    // composition is in progress so it doesn't submit prematurely.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
        <AssistantAvatar />
        <div>
          <p className="font-semibold text-ink">Musafir assistant</p>
          <p className="text-xs text-text-muted">Understands English &amp; Hinglish · replies in English</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        aria-live="polite"
        className="flex h-[22rem] flex-col gap-3 overflow-y-auto bg-background/60 p-4 sm:h-[26rem]"
      >
        {messages.length === 0 && (
          <div className="flex flex-col gap-3 animate-fade-up">
            <div className="flex items-end gap-2">
              <AssistantAvatar />
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-surface px-4 py-2.5 text-sm text-text shadow-sm">
                Hi! Where would you like to go, when, and who is travelling? Tell me in your own words.
              </div>
            </div>
            <div className="ml-10 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onComposerChange(suggestion)}
                  disabled={disabled}
                  className="chip border border-border bg-surface text-ink transition hover:border-primary hover:text-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) =>
          message.role === "user" ? (
            <div
              key={index}
              className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-white shadow-sm animate-fade-up"
            >
              {message.content}
            </div>
          ) : (
            <div key={index} className="flex items-end gap-2 animate-fade-up">
              <AssistantAvatar />
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-surface px-4 py-2.5 text-sm text-text shadow-sm">
                {message.content}
              </div>
            </div>
          ),
        )}

        {isSending && (
          <div className="flex items-end gap-2" aria-label="Assistant is typing">
            <AssistantAvatar />
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-surface px-4 py-3.5 shadow-sm">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-2 w-2 animate-typing-dot rounded-full bg-text-muted"
                  style={{ animationDelay: `${dot * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border/70 p-4">
        {cooldown && (
          <RateLimitNotice
            cooldown={cooldown}
            canRetry={canRetry}
            onRetry={onRetry}
            onSwitchToManual={onSwitchToManual}
          />
        )}
        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-error-soft px-4 py-3 text-sm text-error">
            <span className="flex items-center gap-2">
              <Icon name="alert" className="h-4 w-4 shrink-0" /> {error}
            </span>
            {canRetry && (
              <button type="button" onClick={onRetry} className="btn-danger px-3 py-1.5">
                <Icon name="refresh" /> Retry
              </button>
            )}
          </div>
        )}
        {limitReached && (
          <p role="alert" className="rounded-xl bg-error-soft px-4 py-3 text-sm text-error">
            This conversation has reached its length limit — switch to manual entry or restart.
          </p>
        )}

        <div className="relative">
          <textarea
            value={composerText}
            onChange={(e) => onComposerChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || limitReached}
            placeholder="Describe your trip in English or Hinglish…"
            rows={2}
            aria-label="Message"
            className="field-input resize-none pr-14"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send"
            title={coolingDown ? "Please wait a moment" : "Send (Enter)"}
            className="btn-primary absolute bottom-2.5 right-2.5 h-9 w-9 rounded-lg p-0"
          >
            <Icon name="send" />
          </button>
        </div>
        <div className="flex items-start justify-between gap-3 text-xs text-text-muted">
          <p>
            e.g. “{SAMPLE_PROMPT}” — dates use DD/MM/YYYY, so this means 3–5 April 2027.
          </p>
          <span className={`shrink-0 ${overLimit ? "font-semibold text-error" : ""}`}>
            {composerText.length} / {MAX_MESSAGE_CHARS}
          </span>
        </div>
      </div>
    </div>
  );
}
