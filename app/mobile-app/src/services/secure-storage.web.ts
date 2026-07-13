/**
 * Web implementation of the secure-storage interface. `expo-secure-store` ships
 * no web backend (it wraps Keychain / Keystore), so on web — used for the Expo
 * dev build only — we persist to `localStorage`. Native uses `secure-storage.ts`.
 */
export async function getItem(key: string): Promise<string | null> {
  return globalThis.localStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  globalThis.localStorage.setItem(key, value);
}

export async function removeItem(key: string): Promise<void> {
  globalThis.localStorage.removeItem(key);
}
