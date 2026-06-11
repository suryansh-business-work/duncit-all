import { getItem, setItem, removeItem } from '@/services/secure-storage';

/**
 * Auth token persistence. Mobile analogue of mWeb's `localStorage` token:
 * the JWT returned by login/register/google is stored in the OS secure store
 * (Keychain / Keystore) and attached to GraphQL requests.
 */
const TOKEN_KEY = 'duncit.auth.token';

export async function getAuthToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await removeItem(TOKEN_KEY);
}
