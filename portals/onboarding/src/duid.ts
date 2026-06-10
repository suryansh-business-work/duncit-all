/**
 * Duncit Unique Identifier (DUID) — a per-device anonymous id used to identify
 * a browser/device for analytics + active-user uniqueness, regardless of login
 * state. Persisted in localStorage and never sent to third parties.
 */
const KEY = 'duncit_duid';

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random for older browsers
  return `duid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateDuid(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && existing.length > 0) return existing;
    const fresh = makeId();
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Private mode / disabled storage: still return a value for headers,
    // even though it won't be stable across reloads.
    return makeId();
  }
}
