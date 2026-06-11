import * as SecureStore from 'expo-secure-store';

/**
 * Key/value persistence backed by the OS secure store (Keychain / Keystore).
 * Web has no native secure-store backend, so it gets a separate implementation
 * in `secure-storage.web.ts` that Metro resolves automatically for `platform=web`.
 * Both files expose the same interface — one correct path per platform.
 */
export async function getItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function removeItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
