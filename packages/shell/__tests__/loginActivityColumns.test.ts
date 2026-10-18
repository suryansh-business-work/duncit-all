/**
 * The words in a Login activity cell: whatever parts the user agent and the
 * geo-IP guess gave away, joined the way a person would say them, and
 * "Unknown" when there was nothing at all.
 */
import { describe, expect, it } from 'vitest';
import type { LoginActivityEntry } from '../src/chrome/ProfilePage/queries';
import { deviceValue, locationValue, signedInOnValue } from '../src/chrome/ProfilePage/activity/loginActivityColumns';
import { fallbackT } from '../src/i18n/fallback';

const entry = (over: Partial<LoginActivityEntry> = {}): LoginActivityEntry => ({
  id: 'login-1',
  signed_in_at: '2026-10-18T08:30:00Z',
  provider: 'EMAIL',
  ip: null,
  city: 'Lucknow',
  region: 'UP',
  country: 'IN',
  browser: 'Chrome',
  os: 'Windows',
  device_type: 'DESKTOP',
  surface: 'PORTAL',
  origin_host: null,
  ...over,
});

describe('login activity cell words', () => {
  it('describes the device from whatever the user agent gave away', () => {
    expect(deviceValue(fallbackT, entry({ device_type: 'TABLET', browser: 'Safari', os: 'iPadOS' }))).toBe(
      'Safari on iPadOS · Tablet',
    );
    expect(deviceValue(fallbackT, entry({ device_type: 'MOBILE', browser: null, os: 'Android' }))).toBe(
      'Android · Phone',
    );
    expect(deviceValue(fallbackT, entry({ device_type: null, browser: 'Firefox', os: null }))).toBe('Firefox');
    expect(deviceValue(fallbackT, entry({ device_type: 'BOT', browser: null, os: null }))).toBe('Unknown');
  });

  it('keeps only the location parts the geo-IP guess found', () => {
    expect(locationValue(fallbackT, entry({ city: null, region: 'Maharashtra', country: 'IN' }))).toBe(
      'Maharashtra, IN',
    );
    expect(locationValue(fallbackT, entry({ city: null, region: null, country: null }))).toBe('Unknown');
  });

  it('names the app and the website when the browser sent no host', () => {
    const noHost = { origin_host: null };
    expect(signedInOnValue(fallbackT, entry({ ...noHost, surface: 'NATIVE' }))).toBe('Duncit app');
    expect(signedInOnValue(fallbackT, entry({ ...noHost, surface: 'MWEB' }))).toBe('Duncit website');
    expect(signedInOnValue(fallbackT, entry({ ...noHost, surface: null }))).toBe('Unknown');
  });
});
