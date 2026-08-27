import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureLogs, logs } from '../src/logs';
import { consoleTransport } from '../src/transport';
import type { LogRecord } from '../src/types';

let sink: LogRecord[];

beforeEach(() => {
  sink = [];
  // Reset the module-wide context to the web default before each test.
  configureLogs(
    (r) => {
      sink.push(r);
    },
    {
      platform: 'web',
      os: undefined,
      portal: undefined,
      environment: undefined,
      url: undefined,
      host: undefined,
      client: undefined,
      duid: undefined,
    },
  );
});

afterEach(() => {
  configureLogs(consoleTransport, { platform: 'web' });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('client context on emitted records', () => {
  it("layers the app's client facts OVER the auto-detected browser fields", () => {
    vi.stubGlobal('navigator', { language: 'hi-IN' });
    vi.stubGlobal('Intl', {
      DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'Asia/Kolkata' }) }),
    });
    configureLogs((r) => sink.push(r), {
      client: () => ({ app_version: '1.72.9', device_model: 'Pixel 8', locale: 'en-IN' }),
    });
    logs.mobileApp.error('PodDetails', 'BookBtn', { error: new Error('booking DUN-POD-4821 failed') });
    expect(sink[0].client).toEqual({
      app_version: '1.72.9',
      device_model: 'Pixel 8',
      locale: 'en-IN', // the app's locale wins over the browser's hi-IN
      timezone: 'Asia/Kolkata', // the browser field survives — the app never named it
    });
  });

  it('keeps the browser fields when the client resolver reports nothing', () => {
    vi.stubGlobal('navigator', { language: 'hi-IN' });
    vi.stubGlobal('Intl', {
      DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'Asia/Kolkata' }) }),
    });
    configureLogs((r) => sink.push(r), { client: () => undefined });
    logs.mWeb.info('shop', 'ProductCard', { priceInr: 2499 });
    expect(sink[0].client).toEqual({ locale: 'hi-IN', timezone: 'Asia/Kolkata' });
  });

  it('omits client entirely when neither the browser nor the app knows anything', () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('Intl', {
      DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: '' }) }),
    });
    logs.server.info('boot', 'AppSettings');
    expect(sink[0].client).toBeUndefined();
  });
});

describe('duid stamping', () => {
  it('stamps the same device id the surface sends the API as x-duid', () => {
    configureLogs((r) => sink.push(r), { duid: () => 'duid-8f3c2a1b9d7e' });
    logs.mWeb.warn('checkout', 'PayBtn', { amountInr: 2499 });
    expect(sink[0].duid).toBe('duid-8f3c2a1b9d7e');
    expect(sink[0].data).toEqual({ amountInr: 2499 });
  });

  it('leaves duid unset when the surface has no resolver', () => {
    logs.mWeb.warn('checkout', 'PayBtn');
    expect(sink[0].duid).toBeUndefined();
  });
});
