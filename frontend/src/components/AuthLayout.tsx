import { useState } from "react";
import type { ReactNode } from "react";

import { BrandMark } from "./AppShell";
import { Icon } from "./Icon";

const HIGHLIGHTS = [
  { icon: "sparkles", text: "Describe your trip in English or Hinglish — our assistant fills in the details" },
  { icon: "calendar", text: "A day-by-day plan created for every date of your journey" },
  { icon: "download", text: "Save your itinerary as a PDF to take anywhere" },
] as const;

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      <aside
        className="relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-ink bg-cover bg-center p-6 text-white sm:p-10 lg:min-h-screen"
        style={{ backgroundImage: "url(/images/hero-clouds.jpg)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/25 to-ink/85" />
        <div className="relative">
          <BrandMark light />
        </div>
        <div className="relative mt-10 max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Every journey begins with a single plan.
          </h2>
          <ul className="mt-6 hidden space-y-3 sm:block">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm text-white/90">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/15 ring-1 ring-white/25">
                  <Icon name={item.icon} className="h-4 w-4" />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="field-input pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-text-muted hover:text-ink"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        <Icon name={visible ? "eyeOff" : "eye"} />
      </button>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-error-soft px-3.5 py-2.5 text-sm text-error">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
