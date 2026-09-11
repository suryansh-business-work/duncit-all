import { getItem, setItem, removeItem } from '@/services/secure-storage';

/**
 * Auth token persistence. Mobile analogue of mWeb's `localStorage` token:
 * the JWT returned by login/register/google is stored in the OS secure store
 * (Keychain / Keystore) and attached to GraphQL requests.
 */
const TOKEN_KEY = 'duncit.auth.token';

/**
 * The token as last read or written this session. Every authenticated GraphQL
 * call asks for it, and reading the secure store each time put a native bridge
 * round trip in front of every request (device.ts caches the device id for the
 * same reason). The store is only ever written through the two functions below,
 * so the copy cannot go stale. A failed read is forgotten, so the next call
 * tries the store again rather than replaying the failure.
 */
let current: Promise<string | null> | null = null;

export function getAuthToken(): Promise<string | null> {
  current ??= getItem(TOKEN_KEY).catch((error: unknown) => {
    current = null;
    throw error;
  });
  return current;
}

export async function setAuthToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
  current = Promise.resolve(token);
}

export async function clearAuthToken(): Promise<void> {
  await removeItem(TOKEN_KEY);
  current = Promise.resolve(null);
}
