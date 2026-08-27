import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserClientInfo, compactClient } from '../src/client-info';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A fixed Intl stub so the reported timezone never depends on the runner. */
const stubTimezone = (timeZone: string) => {
  vi.stubGlobal('Intl', {
    DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone }) }),
  });
};

describe('browserClientInfo', () => {
  it('reports everything a real browser exposes', () => {
    vi.stubGlobal('navigator', {
      language: 'hi-IN',
      onLine: true,
      connection: { effectiveType: '4g' },
    });
    stubTimezone('Asia/Kolkata');
    vi.stubGlobal('screen', { width: 360, height: 800 });
    vi.stubGlobal('innerWidth', 360);
    vi.stubGlobal('innerHeight', 640);
    vi.stubGlobal('document', { referrer: 'https://duncit.com/DUN-POD-4821' });

    expect(browserClientInfo()).toEqual({
      locale: 'hi-IN',
      timezone: 'Asia/Kolkata',
      screen: '360x800',
      viewport: '360x640',
      network: '4g',
      referrer: 'https://duncit.com/DUN-POD-4821',
    });
  });

  it('returns an empty object off the web (no navigator, screen, document or viewport)', () => {
    vi.stubGlobal('navigator', undefined);
    stubTimezone(''); // some engines report an empty zone → dropped
    expect(browserClientInfo()).toEqual({});
  });

  it('reports offline when the browser admits onLine === false', () => {
    vi.stubGlobal('navigator', { onLine: false, connection: { effectiveType: '4g' } });
    expect(browserClientInfo().network).toBe('offline');
  });

  it('falls back from effectiveType to connection.type', () => {
    vi.stubGlobal('navigator', { connection: { type: 'wifi' } });
    expect(browserClientInfo().network).toBe('wifi');
  });

  it('omits network when the browser has no connection info at all', () => {
    vi.stubGlobal('navigator', { language: 'en-IN' });
    expect(browserClientInfo().network).toBeUndefined();
    expect(browserClientInfo().locale).toBe('en-IN');
  });

  it('omits the timezone when Intl throws (no ICU data)', () => {
    vi.stubGlobal('Intl', {
      DateTimeFormat: () => {
        throw new Error('no ICU data');
      },
    });
    expect(browserClientInfo().timezone).toBeUndefined();
  });

  it('omits the viewport when only one dimension is a number', () => {
    vi.stubGlobal('innerWidth', 360);
    // innerHeight left undefined (node has neither by default)
    expect(browserClientInfo().viewport).toBeUndefined();
  });

  it('coerces an empty document.referrer to undefined', () => {
    vi.stubGlobal('document', { referrer: '' });
    expect(browserClientInfo().referrer).toBeUndefined();
  });
});

describe('compactClient', () => {
  it('drops undefined, null and empty-string fields but keeps real values', () => {
    expect(
      compactClient({
        app_version: '1.72.9',
        device_model: 'Pixel 8',
        locale: undefined,
        timezone: null as unknown as undefined,
        screen: '',
        network: 'wifi',
      }),
    ).toEqual({ app_version: '1.72.9', device_model: 'Pixel 8', network: 'wifi' });
  });
});
