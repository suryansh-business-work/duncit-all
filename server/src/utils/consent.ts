import type { Request } from 'express';

/**
 * What the caller has allowed us to store about them, read off the request.
 *
 * Every client surface sends `x-consent: analytics,marketing` (or a subset, or
 * `none`) — the twin of `consentHeaderValue` in `@duncit/utils/consent.ts`. The
 * server imports no `@duncit/*` package, so the parse lives here.
 *
 * A request without the header has allowed nothing. That is the GDPR default
 * (consent is opt-in), and it also means an old app build or a forgotten call
 * site stores nothing optional rather than everything.
 */
export interface TrackingConsent {
  analytics: boolean;
  marketing: boolean;
}

export const NO_CONSENT: TrackingConsent = Object.freeze({ analytics: false, marketing: false });

export function parseConsentHeader(raw: string | string[] | undefined): TrackingConsent {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return NO_CONSENT;
  const granted = new Set(
    value
      .toLowerCase()
      .split(',')
      .map((part) => part.trim())
  );
  return { analytics: granted.has('analytics'), marketing: granted.has('marketing') };
}

export function consentFromRequest(req: Pick<Request, 'headers'>): TrackingConsent {
  return parseConsentHeader(req.headers['x-consent']);
}

/** The web surfaces' consent cookie — `CONSENT_COOKIE` in `@duncit/utils`. */
const CONSENT_COOKIE = 'duncit_consent';

/**
 * The choice stored in the shared `.duncit.com` consent cookie.
 *
 * Used where a browser reaches the server by navigation rather than through
 * the app's GraphQL client — the short-link redirect — so there is no header
 * to read, but the cookie the website or mWeb wrote is sent along.
 */
export function consentFromCookie(cookieHeader: string | undefined): TrackingConsent {
  const prefix = `${CONSENT_COOKIE}=`;
  const entry = (cookieHeader ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!entry) return NO_CONSENT;
  try {
    const value = JSON.parse(decodeURIComponent(entry.slice(prefix.length)));
    return { analytics: value?.analytics === true, marketing: value?.marketing === true };
  } catch {
    return NO_CONSENT;
  }
}
