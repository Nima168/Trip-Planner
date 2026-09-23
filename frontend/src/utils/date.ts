// Formats an ISO "YYYY-MM-DD" date string with a written month name and four-digit
// year (e.g. "3 April 2027"), per frontend-spec.md's requirement that review/summary
// text never show ambiguous numeric dates. Parsed as local calendar values (not via
// `new Date(iso)`, which treats a bare date as UTC midnight and can shift the day
// depending on the viewer's timezone).
export function formatDateLong(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateRange(startIso: string, endIso: string): string {
  if (startIso === endIso) {
    return formatDateLong(startIso);
  }
  return `${formatDateLong(startIso)} – ${formatDateLong(endIso)}`;
}
