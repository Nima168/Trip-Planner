// Deterministic confirmation-phrase matching, per AI-spec.md §5. Confirmation is
// application state bound to the exact displayed draft — never a model-asserted
// flag — so this is exact-match only, never substring matching ("yes, but change
// the dates" must NOT match).
const CONFIRMATION_PHRASES = new Set([
  "yes",
  "yes create it",
  "create it",
  "create trip",
  "confirm",
  "haan",
  "haan bana do",
  "haan create kar do",
]);

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?]+$/g, "")
    .replace(/\s+/g, " ");
}

export function isConfirmationPhrase(text: string): boolean {
  return CONFIRMATION_PHRASES.has(normalize(text));
}
