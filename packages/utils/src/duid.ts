import { DUID_STORAGE_KEY, makeDeviceId } from '@duncit/user-core';

/**
 * Duncit Unique Identifier (DUID) — a per-device anonymous id used to identify
 * a browser/device for analytics + active-user uniqueness, regardless of login
 * state. Persisted in localStorage and never sent to third parties.
 *
 * The key and the id generator now live in `@duncit/user-core` so the native
 * app mints the same shape against the same key — this file used to be the web's
 * only copy, and native had none at all.
 */
export function getOrCreateDuid(): string {
  if (globalThis.window === undefined) return '';
  try {
    const existing = globalThis.localStorage.getItem(DUID_STORAGE_KEY);
    if (existing && existing.length > 0) return existing;
    const fresh = makeDeviceId();
    globalThis.localStorage.setItem(DUID_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Private mode / disabled storage: still return a value for headers,
    // even though it won't be stable across reloads.
    return makeDeviceId();
  }
}
