/**
 * Address handling. Deliberately permissive about the display-name form
 * (`Duncit <noreply@duncit.com>`) and strict about the address inside it —
 * every provider accepts the first and rejects a malformed second.
 */

/** `Name <a@b.c>` or a bare `a@b.c`. Anchored, so no backtracking tail. */
const ADDRESS_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
const DISPLAY_RE = /^(?<name>[^<>]*)<(?<address>[^<>\s]+)>$/;

/** The address out of a `Name <a@b.c>` form, or the input unchanged. */
export function bareAddress(input: string): string {
  const match = DISPLAY_RE.exec(input.trim());
  return (match?.groups?.address ?? input).trim();
}

/** Whether a value is a sendable address, with or without a display name. */
export function isEmailAddress(value: unknown): value is string {
  return typeof value === 'string' && ADDRESS_RE.test(bareAddress(value));
}

/**
 * One address or many, as a de-duplicated list. Duplicates matter: the same
 * person on both `to` and `cc` gets the message twice and most providers bill
 * for both.
 */
export function toAddressList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const key = bareAddress(trimmed).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
