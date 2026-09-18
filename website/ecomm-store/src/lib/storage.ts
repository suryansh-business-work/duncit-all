/**
 * localStorage that never throws. Private windows, blocked site data and
 * storage quotas all make the accessor itself throw, and a shopper must still
 * be able to browse and buy when that happens — so every read and write here
 * degrades to "nothing stored".
 */
export function readStored(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage unavailable: the value lives for this page view only.
  }
}

export function removeStored(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Nothing to remove when storage is unavailable.
  }
}

/** A JSON value from storage, or `fallback` when absent or unreadable. */
export function readStoredJson<T>(key: string, fallback: T): T {
  const raw = readStored(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const STORAGE_KEYS = {
  token: 'ecomm_store_token',
  cartToken: 'ecomm_cart_token',
  recentlyViewed: 'ecomm_recently_viewed',
  pincode: 'ecomm_pincode',
  onboarded: 'ecomm_onboarded',
} as const;
