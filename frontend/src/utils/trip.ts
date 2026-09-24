import type { TripType } from "../types";

export type TripTiming = "upcoming" | "ongoing" | "past";

// "YYYY-MM-DD" as a local calendar day number, so comparisons ignore timezones.
function dayNumber(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.round(new Date(year, month - 1, day).getTime() / 86_400_000);
}

function todayNumber(now: Date): number {
  return Math.round(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86_400_000);
}

export function tripLengthDays(startIso: string, endIso: string): number {
  return dayNumber(endIso) - dayNumber(startIso) + 1;
}

export function tripTiming(startIso: string, endIso: string, now = new Date()): TripTiming {
  const today = todayNumber(now);
  if (today < dayNumber(startIso)) return "upcoming";
  if (today > dayNumber(endIso)) return "past";
  return "ongoing";
}

/** Short human label, e.g. "Starts in 5 days", "Happening now", "Completed". */
export function tripTimingLabel(startIso: string, endIso: string, now = new Date()): string {
  const timing = tripTiming(startIso, endIso, now);
  if (timing === "ongoing") return "Happening now";
  if (timing === "past") return "Completed";
  const days = dayNumber(startIso) - todayNumber(now);
  if (days === 1) return "Starts tomorrow";
  return `Starts in ${days} days`;
}

export const TRIP_TYPE_EMOJI: Record<TripType, string> = {
  solo: "🎒",
  couple: "💑",
  family: "👨‍👩‍👧",
  group_of_friends: "🧑‍🤝‍🧑",
};
