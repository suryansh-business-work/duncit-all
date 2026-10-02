import {
  NO_CONSENT,
  consentFromCookie,
  consentFromRequest,
  parseConsentHeader,
} from '@utils/consent';

const cookieFor = (value: unknown) =>
  `theme=dark; duncit_consent=${encodeURIComponent(JSON.stringify(value))}`;

describe('parseConsentHeader', () => {
  it('reads each granted category, case- and space-insensitively', () => {
    expect(parseConsentHeader('analytics,marketing')).toEqual({ analytics: true, marketing: true });
    expect(parseConsentHeader(' Analytics ')).toEqual({ analytics: true, marketing: false });
    expect(parseConsentHeader(['marketing'])).toEqual({ analytics: false, marketing: true });
  });

  it('allows nothing when the header is missing or says none', () => {
    expect(parseConsentHeader(undefined)).toBe(NO_CONSENT);
    expect(parseConsentHeader('none')).toEqual(NO_CONSENT);
    expect(parseConsentHeader([])).toBe(NO_CONSENT);
  });
});

describe('consentFromRequest', () => {
  it('reads the x-consent header', () => {
    expect(consentFromRequest({ headers: { 'x-consent': 'analytics' } })).toEqual({
      analytics: true,
      marketing: false,
    });
  });
});

describe('consentFromCookie', () => {
  it('reads the shared consent cookie', () => {
    expect(consentFromCookie(cookieFor({ analytics: true, marketing: true }))).toEqual({
      analytics: true,
      marketing: true,
    });
    expect(consentFromCookie(cookieFor({ analytics: 'yes', marketing: false }))).toEqual(NO_CONSENT);
  });

  it('allows nothing without a readable cookie', () => {
    expect(consentFromCookie(undefined)).toBe(NO_CONSENT);
    expect(consentFromCookie('theme=dark')).toBe(NO_CONSENT);
    expect(consentFromCookie('duncit_consent=%7Bnot-json')).toBe(NO_CONSENT);
    expect(consentFromCookie(cookieFor(null))).toEqual(NO_CONSENT);
  });
});
