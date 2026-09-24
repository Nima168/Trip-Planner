import { useEffect, useState } from "react";

/** Whole seconds left until `untilMs` (a Date.now() timestamp), ticking while > 0. */
export function useCountdown(untilMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (untilMs === null) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [untilMs]);

  if (untilMs === null) return 0;
  return Math.max(0, Math.ceil((untilMs - now) / 1000));
}

/** "45 seconds", "1 min 30 sec", "about 2 hours". */
export function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest ? `${minutes} min ${rest} sec` : `${minutes} min`;
  }
  const hours = Math.round(seconds / 3600);
  return `about ${hours} ${hours === 1 ? "hour" : "hours"}`;
}
