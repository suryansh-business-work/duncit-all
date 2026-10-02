/**
 * Tracking consent — the one rule every Duncit surface reads (GDPR / ePrivacy).
 *
 * Two optional categories, both OFF until the person says yes:
 *   - `analytics` — usage measurement: page views, taps, daily-active pings,
 *     Google Analytics.
 *   - `marketing` — campaign attribution: short-link click ids, utm tags, the
 *     cross-site link decorator.
 * Everything else the apps store (the session token, the cart, the language,
 * this choice itself) is strictly necessary and needs no consent.
 *
 * "Undecided" and "declined" behave identically — nothing optional runs — so
 * there is one path, not a fallback. The difference is only that an undecided
 * visitor is still shown the banner.
 *
 * The choice travels to the server on every request as the `x-consent` header
 * (`analytics,marketing`, `analytics`, `marketing` or `none`). The server
 * refuses to store optional data without it, so a client that forgets to gate
 * something still cannot write it.
 *
 * Web surfaces keep the choice in a first-party cookie on `.duncit.com`, so one
 * answer covers the website, mWeb and every other subdomain. The native app
 * keeps the same serialised string in secure storage.
 */

import {
  SHORT_LINK_CLICK_KEY,
  SHORT_LINK_SHARE_KEY,
  SHORT_LINK_UTM_KEY,
} from './short-link-attribution';

export type ConsentCategory ='analytics' | 'marketing';

export interface ConsentChoice {
  analytics: boolean;
  marketing: boolean;
  /** ISO timestamp — a choice older than {@link CONSENT_MAX_AGE_DAYS} is asked again. */
  decided_at: string;
}

export const CONSENT_COOKIE = 'duncit_consent';
export const CONSENT_HEADER = 'x-consent';
/** A consent is renewed yearly — regulators expect the question to be asked again. */
export const CONSENT_MAX_AGE_DAYS = 365;
/** Dispatched on `globalThis` whenever the web choice changes. */
export const CONSENT_CHANGE_EVENT = 'duncit:consent-change';

const DAY_MS = 24 * 60 * 60 * 1000;
const APEX = 'duncit.com';

/** The choice behind "Accept all" / "Reject all" / a saved custom set. */
export function makeConsent(
  categories: Readonly<Record<ConsentCategory, boolean>>,
  now: Date = new Date()
): ConsentChoice {
  return {
    analytics: categories.analytics,
    marketing: categories.marketing,
    decided_at: now.toISOString(),
  };
}

/** Whether a (possibly missing) choice allows one category. */
export function consentAllows(
  choice: ConsentChoice | null | undefined,
  category: ConsentCategory
): boolean {
  return choice?.[category] === true;
}

export function serializeConsent(choice: ConsentChoice): string {
  return JSON.stringify(choice);
}

/**
 * A stored choice, or null when there is none, it is unreadable, or it is
 * older than the renewal window — all three mean "ask again".
 */
export function parseConsent(
  raw: string | null | undefined,
  now: Date = new Date()
): ConsentChoice | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const { analytics, marketing, decided_at } = value as Record<string, unknown>;
  if (typeof analytics !== 'boolean' || typeof marketing !== 'boolean') return null;
  if (typeof decided_at !== 'string') return null;
  const decided = Date.parse(decided_at);
  if (Number.isNaN(decided)) return null;
  if (now.getTime() - decided > CONSENT_MAX_AGE_DAYS * DAY_MS) return null;
  return { analytics, marketing, decided_at };
}

/** The `x-consent` header value for a choice. */
export function consentHeaderValue(choice: ConsentChoice | null | undefined): string {
  const granted: ConsentCategory[] = [];
  if (consentAllows(choice, 'analytics')) granted.push('analytics');
  if (consentAllows(choice, 'marketing')) granted.push('marketing');
  return granted.length ? granted.join(',') : 'none';
}

/**
 * The cookie domain that shares one answer across every Duncit subdomain, or
 * null for a host outside duncit.com (localhost, a preview), which keeps a
 * host-only cookie instead.
 */
export function consentCookieDomain(hostname: string): string | null {
  return hostname === APEX || hostname.endsWith(`.${APEX}`) ? `.${APEX}` : null;
}

/** The web choice, read from the shared cookie. */
export function readWebConsent(doc: Document = globalThis.document): ConsentChoice | null {
  const prefix = `${CONSENT_COOKIE}=`;
  const entry = doc.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!entry) return null;
  try {
    return parseConsent(decodeURIComponent(entry.slice(prefix.length)));
  } catch {
    return null;
  }
}

/** Save the web choice and tell every listener on this page. */
export function writeWebConsent(
  choice: ConsentChoice,
  doc: Document = globalThis.document
): void {
  const domain = consentCookieDomain(doc.location.hostname);
  const parts = [
    `${CONSENT_COOKIE}=${encodeURIComponent(serializeConsent(choice))}`,
    'path=/',
    `max-age=${CONSENT_MAX_AGE_DAYS * 24 * 60 * 60}`,
    'SameSite=Lax',
  ];
  if (domain) parts.push(`domain=${domain}`);
  if (doc.location.protocol === 'https:') parts.push('Secure');
  doc.cookie = parts.join('; ');
  globalThis.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: choice }));
}

/** Listen for web choice changes on this page. Returns the unsubscriber. */
export function onWebConsentChange(listener: (choice: ConsentChoice) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<ConsentChoice>).detail);
  globalThis.addEventListener(CONSENT_CHANGE_EVENT, handler);
  return () => globalThis.removeEventListener(CONSENT_CHANGE_EVENT, handler);
}

/**
 * Run `start` once the web visitor allows `category` — now if they already
 * have, otherwise the moment they do. Returns the unsubscriber.
 */
export function whenWebConsentAllows(
  category: ConsentCategory,
  start: () => void,
  doc: Document = globalThis.document
): () => void {
  if (consentAllows(readWebConsent(doc), category)) {
    start();
    return () => undefined;
  }
  const stop = onWebConsentChange((choice) => {
    if (!consentAllows(choice, category)) return;
    stop();
    start();
  });
  return stop;
}

/**
 * The storage keys that belong to the optional categories, so withdrawing
 * consent can delete what was kept under it.
 */
export const OPTIONAL_STORAGE_KEYS: Readonly<Record<ConsentCategory, readonly string[]>> = {
  analytics: [],
  marketing: [SHORT_LINK_CLICK_KEY, SHORT_LINK_SHARE_KEY, SHORT_LINK_UTM_KEY],
};

/** Delete what a withdrawn category had stored on this device. */
export function clearWithdrawnStorage(
  choice: ConsentChoice,
  storage: Pick<Storage, 'removeItem'> = globalThis.localStorage
): void {
  for (const category of ['analytics', 'marketing'] as const) {
    if (choice[category]) continue;
    for (const key of OPTIONAL_STORAGE_KEYS[category]) storage.removeItem(key);
  }
}
