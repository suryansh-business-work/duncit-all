/**
 * Normalisers for the JSON an AI fill returns.
 *
 * The model is prompted with the form's exact shape but is not bound by it, so
 * every value is narrowed before it reaches react-hook-form. This matters most
 * for select fields: an unlisted enum value does not "fail", it silently
 * renders the MUI Select empty and clears whatever the admin had picked.
 */

/** Trimmed non-empty strings from an array, capped. `undefined` when absent. */
export function aiChips(input: unknown, max = 20): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  return input
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .slice(0, max);
}

/** A trimmed non-empty string, or `undefined` so the caller keeps its previous value. */
export function aiText(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  return trimmed || undefined;
}

/** The value only when it is one of `allowed` — an option the field can render. */
export function aiOneOf<T extends string>(input: unknown, allowed: readonly T[]): T | undefined {
  if (typeof input !== 'string') return undefined;
  return allowed.find((option) => option === input);
}
