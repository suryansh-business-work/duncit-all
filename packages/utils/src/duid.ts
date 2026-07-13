/**
 * Duncit Unique Identifier (DUID) — a per-device anonymous id used to identify
 * a browser/device for analytics + active-user uniqueness, regardless of login
 * state. Persisted in localStorage and never sent to third parties.
 *
 * Lives here rather than in each app: this file used to be copy-pasted, byte for
 * byte, into mWeb and all 16 portals.
 */
const KEY = 'duncit_duid';

/** Monotonic tie-breaker for the no-Web-Crypto last resort below. */
let sequence = 0;

function makeId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  if (typeof c?.getRandomValues === 'function') {
    // Older browsers: no randomUUID, but getRandomValues is a CSPRNG.
    // Math.random() is predictable and must not mint identifiers (Sonar S2245).
    const bytes = c.getRandomValues(new Uint8Array(16));
    return `duid-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  // No Web Crypto at all. The DUID is an analytics device id, never a secret,
  // so a timestamp + sequence is enough to stay unique — and it still keeps
  // Math.random() out.
  sequence += 1;
  return `duid-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function getOrCreateDuid(): string {
  if (typeof globalThis.window === 'undefined') return '';
  try {
    const existing = globalThis.localStorage.getItem(KEY);
    if (existing && existing.length > 0) return existing;
    const fresh = makeId();
    globalThis.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Private mode / disabled storage: still return a value for headers,
    // even though it won't be stable across reloads.
    return makeId();
  }
}
