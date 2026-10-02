import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_DAYS,
  clearWithdrawnStorage,
  consentAllows,
  consentCookieDomain,
  consentHeaderValue,
  makeConsent,
  onWebConsentChange,
  parseConsent,
  readWebConsent,
  serializeConsent,
  whenWebConsentAllows,
  writeWebConsent,
  type ConsentChoice,
} from '../src/consent';
import {
  SHORT_LINK_CLICK_KEY,
  SHORT_LINK_SHARE_KEY,
  SHORT_LINK_UTM_KEY,
} from '../src/short-link-attribution';

const NOW = new Date('2026-10-02T10:00:00.000Z');
const choice = (analytics: boolean, marketing: boolean): ConsentChoice =>
  makeConsent({ analytics, marketing }, NOW);

/** A document whose cookie jar is a plain string, at a chosen address. */
const fakeDoc = (hostname: string, protocol: string, cookie = '') =>
  ({ cookie, location: { hostname, protocol } }) as unknown as Document;

const clearCookie = () => {
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`;
};

afterEach(() => {
  clearCookie();
  localStorage.clear();
});

describe('makeConsent / consentAllows', () => {
  it('stamps the decision time and answers per category', () => {
    const c = choice(true, false);
    expect(c).toEqual({ analytics: true, marketing: false, decided_at: NOW.toISOString() });
    expect(consentAllows(c, 'analytics')).toBe(true);
    expect(consentAllows(c, 'marketing')).toBe(false);
  });

  it('defaults the decision time to now', () => {
    expect(Date.parse(makeConsent({ analytics: false, marketing: false }).decided_at)).not.toBeNaN();
  });

  it('treats a missing choice as a refusal', () => {
    expect(consentAllows(null, 'analytics')).toBe(false);
    expect(consentAllows(undefined, 'marketing')).toBe(false);
  });
});

describe('parseConsent', () => {
  it('round-trips a serialised choice', () => {
    const c = choice(true, true);
    expect(parseConsent(serializeConsent(c), NOW)).toEqual(c);
  });

  it('reads the current time when none is given', () => {
    const c = makeConsent({ analytics: true, marketing: false });
    expect(parseConsent(serializeConsent(c))).toEqual(c);
  });

  it.each([
    ['nothing stored', null],
    ['an empty string', ''],
    ['broken JSON', '{nope'],
    ['a bare number', '5'],
    ['JSON null', 'null'],
    ['a non-boolean category', '{"analytics":"yes","marketing":false,"decided_at":"2026-10-01"}'],
    ['a missing category', '{"analytics":true,"decided_at":"2026-10-01"}'],
    ['a missing date', '{"analytics":true,"marketing":false}'],
    ['an unreadable date', '{"analytics":true,"marketing":false,"decided_at":"soon"}'],
  ])('asks again for %s', (_label, raw) => {
    expect(parseConsent(raw, NOW)).toBeNull();
  });

  it('asks again once the renewal window has passed', () => {
    const old = new Date(NOW.getTime() - (CONSENT_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000);
    const stale = makeConsent({ analytics: true, marketing: true }, old);
    expect(parseConsent(serializeConsent(stale), NOW)).toBeNull();
  });
});

describe('consentHeaderValue', () => {
  it('lists exactly the granted categories', () => {
    expect(consentHeaderValue(choice(true, true))).toBe('analytics,marketing');
    expect(consentHeaderValue(choice(true, false))).toBe('analytics');
    expect(consentHeaderValue(choice(false, true))).toBe('marketing');
    expect(consentHeaderValue(choice(false, false))).toBe('none');
    expect(consentHeaderValue(null)).toBe('none');
  });
});

describe('consentCookieDomain', () => {
  it('shares the answer across every duncit.com host and nowhere else', () => {
    expect(consentCookieDomain('duncit.com')).toBe('.duncit.com');
    expect(consentCookieDomain('mweb.duncit.com')).toBe('.duncit.com');
    expect(consentCookieDomain('localhost')).toBeNull();
    expect(consentCookieDomain('notduncit.com')).toBeNull();
  });
});

describe('web storage of the choice', () => {
  it('writes a host-only cookie on a plain http host and reads it back', () => {
    const c = choice(true, false);
    writeWebConsent(c);
    expect(readWebConsent()).toEqual(c);
  });

  it('writes a shared, secure cookie on a duncit.com https host', () => {
    const doc = fakeDoc('mweb.duncit.com', 'https:');
    writeWebConsent(choice(false, true), doc);
    expect(doc.cookie).toContain(`${CONSENT_COOKIE}=`);
    expect(doc.cookie).toContain('domain=.duncit.com');
    expect(doc.cookie).toContain('Secure');
  });

  it('reads nothing when no choice was made, or the cookie is mangled', () => {
    expect(readWebConsent()).toBeNull();
    expect(readWebConsent(fakeDoc('duncit.com', 'https:', `a=1; ${CONSENT_COOKIE}=%E0%A4%A`))).toBeNull();
  });

  it('tells listeners on the page, until they unsubscribe', () => {
    const listener = vi.fn();
    const stop = onWebConsentChange(listener);
    const c = choice(true, true);
    writeWebConsent(c);
    expect(listener).toHaveBeenCalledWith(c);
    stop();
    writeWebConsent(choice(false, false));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('whenWebConsentAllows', () => {
  it('starts at once when the category is already allowed', () => {
    writeWebConsent(choice(true, false));
    const start = vi.fn();
    const stop = whenWebConsentAllows('analytics', start);
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop()).toBeUndefined();
  });

  it('waits for a grant, ignoring answers that refuse it', () => {
    const start = vi.fn();
    whenWebConsentAllows('marketing', start);
    writeWebConsent(choice(true, false));
    expect(start).not.toHaveBeenCalled();
    writeWebConsent(choice(false, true));
    expect(start).toHaveBeenCalledTimes(1);
    // Started once, then stopped listening.
    globalThis.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: choice(true, true) }));
    expect(start).toHaveBeenCalledTimes(1);
  });
});

describe('clearWithdrawnStorage', () => {
  it('deletes what a withdrawn category kept, and nothing else', () => {
    localStorage.setItem(SHORT_LINK_CLICK_KEY, 'c-1');
    localStorage.setItem(SHORT_LINK_SHARE_KEY, '1');
    localStorage.setItem(SHORT_LINK_UTM_KEY, '{}');
    localStorage.setItem('token', 'kept');
    clearWithdrawnStorage(choice(true, true));
    expect(localStorage.getItem(SHORT_LINK_CLICK_KEY)).toBe('c-1');
    clearWithdrawnStorage(choice(false, false));
    expect(localStorage.getItem(SHORT_LINK_CLICK_KEY)).toBeNull();
    expect(localStorage.getItem(SHORT_LINK_SHARE_KEY)).toBeNull();
    expect(localStorage.getItem(SHORT_LINK_UTM_KEY)).toBeNull();
    expect(localStorage.getItem('token')).toBe('kept');
  });
});
