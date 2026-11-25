import { isPortalTokenPending } from '@duncit/user-core';

import { readValue, removeValue, STORAGE_KEYS, writeValue } from '@/services/secure-storage';

/**
 * The session token, held in memory after the first read so building a
 * request never waits on the secure store twice.
 */
let cached: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cached === undefined) cached = await readValue(STORAGE_KEYS.token);
  return cached;
}

export async function setToken(token: string): Promise<void> {
  cached = token;
  await writeValue(STORAGE_KEYS.token, token);
}

export async function clearToken(): Promise<void> {
  cached = null;
  await removeValue(STORAGE_KEYS.token);
}

/** The token already read, without waiting — for log headers, which cannot await. */
export const peekToken = (): string | null => cached ?? null;

/** Forget the in-memory copy (tests, and a sign-out from another code path). */
export function resetTokenCache(): void {
  cached = undefined;
}

/**
 * A console sign-in owes the Security Verification screen until it is done:
 * the server treats that token as signed out everywhere else. The same reader
 * the CRM portal uses (@duncit/user-core), so both gate identically.
 */
export const needsSecurityVerification = (token: string | null): boolean =>
  isPortalTokenPending(token);
