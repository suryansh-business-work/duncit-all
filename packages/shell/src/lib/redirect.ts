/** The subset of a router location the login-redirect flow needs. */
export interface RedirectLocation {
  pathname: string;
  search: string;
  /** Optional so plain `{ pathname, search }` objects also qualify. */
  hash?: string;
}

/** Serializes the current location into the `?redirect=` query value. */
export function redirectPathFromLocation(location: RedirectLocation) {
  return `${location.pathname}${location.search}${location.hash ?? ''}`;
}

/**
 * Open-redirect guard for the post-login `?redirect=` value. Only same-origin
 * absolute paths pass; auth pages (`/login`, `/register`) are rejected so a
 * stale redirect can never bounce the user back onto the auth flow.
 * (`/register` exists only in partners-app — blocking it is a no-op elsewhere.)
 */
export function getSafeRedirectPath(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '';
  if (value === '/login' || value.startsWith('/login?')) return '';
  if (value === '/register' || value.startsWith('/register?')) return '';
  return value;
}
