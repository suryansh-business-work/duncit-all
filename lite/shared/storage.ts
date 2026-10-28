/** localStorage that never throws: a private window or blocked site data must not break a page. */
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

/** The session token's life, matching the API's 90-day token. */
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

/**
 * A first-party cookie for this host only (no Domain), so the server can
 * render the page the way this reader will see it. SameSite=Lax and only
 * ever read by page renders — the API itself still takes the token only as
 * an Authorization header, so the cookie cannot be used to change anything.
 */
export function writeCookie(name: string, value: string): void {
  if (globalThis.document === undefined) return;
  const secure = globalThis.location?.protocol === 'https:' ? '; Secure' : '';
  globalThis.document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function removeCookie(name: string): void {
  if (globalThis.document === undefined) return;
  globalThis.document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readCookie(name: string): string | null {
  if (globalThis.document === undefined) return null;
  for (const part of globalThis.document.cookie.split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === name) return decodeURIComponent(part.slice(at + 1).trim()) || null;
  }
  return null;
}
