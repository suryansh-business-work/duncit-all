import type { DuncitUser } from './types';

const DEFAULT_STORAGE_KEY = 'duncit_user';

export function readCachedUser(storageKey = DEFAULT_STORAGE_KEY): DuncitUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as DuncitUser) : null;
  } catch {
    // Corrupted JSON — drop it so the next write replaces it cleanly.
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* storage unavailable — nothing else to do */
    }
    return null;
  }
}

export function writeCachedUser(user: DuncitUser | null, storageKey = DEFAULT_STORAGE_KEY): void {
  if (typeof window === 'undefined') return;
  try {
    if (user === null) {
      window.localStorage.removeItem(storageKey);
    } else {
      window.localStorage.setItem(storageKey, JSON.stringify(user));
    }
  } catch {
    /* storage unavailable — read path will simply return null next time */
  }
}

// Hard logout: wipe both storages entirely. We don't preserve "user theme" or
// similar preferences — the user can re-pick them after signing back in. The
// goal of this helper is to leave no auth, no session, no cache behind.
export function clearAllStorages(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

export { DEFAULT_STORAGE_KEY };
