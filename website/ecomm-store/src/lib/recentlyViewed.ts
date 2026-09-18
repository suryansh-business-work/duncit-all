import { STORAGE_KEYS, readStoredJson, writeStored } from './storage';

const LIMIT = 12;

/** Product ids this browser opened, newest first. */
export function readRecentlyViewed(): string[] {
  const ids = readStoredJson<unknown>(STORAGE_KEYS.recentlyViewed, []);
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

export function rememberViewed(productId: string): void {
  const next = [productId, ...readRecentlyViewed().filter((id) => id !== productId)].slice(0, LIMIT);
  writeStored(STORAGE_KEYS.recentlyViewed, JSON.stringify(next));
}
