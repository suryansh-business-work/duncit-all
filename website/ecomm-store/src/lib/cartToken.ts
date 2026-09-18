import { STORAGE_KEYS, readStored, writeStored } from './storage';

let memoryToken: string | null = null;

/**
 * The guest's cart id: a random UUID kept in the browser, sent with every
 * cart, wishlist and checkout call so a shopper can buy without an account.
 * Signing in folds whatever it holds into the account (`storeMergeGuest`).
 */
export function getCartToken(): string {
  const stored = readStored(STORAGE_KEYS.cartToken);
  if (stored) return stored;
  memoryToken ??= globalThis.crypto.randomUUID();
  writeStored(STORAGE_KEYS.cartToken, memoryToken);
  return memoryToken;
}
