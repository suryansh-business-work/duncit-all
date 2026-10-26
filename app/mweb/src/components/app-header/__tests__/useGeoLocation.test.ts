import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useGeoLocation } from '../useGeoLocation';

const h = vi.hoisted(() => ({ key: 'KEY 1' }));
vi.mock('../../../config/runtimeConfig', () => ({ getGoogleMapsApiKey: () => h.key }));

const position = { coords: { latitude: 12.9, longitude: 77.6 } };

const stubGeo = (impl: (ok: (p: unknown) => void, fail: (e: unknown) => void) => void) =>
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: impl } });

const stubFetch = (body: unknown, ok = true) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: async () => body }));

const run = async () => {
  const hook = renderHook(() => useGeoLocation());
  await act(async () => {
    await hook.result.current.request();
  });
  return hook;
};

beforeEach(() => {
  h.key = 'KEY 1';
  stubGeo((ok) => ok(position));
});
afterEach(() => vi.unstubAllGlobals());

describe('useGeoLocation', () => {
  it('reverse-geocodes the position into city, state, country and pincode', async () => {
    stubFetch({
      status: 'OK',
      results: [
        {
          address_components: [
            { long_name: 'Bengaluru', short_name: 'BLR', types: ['postal_town'] },
            { long_name: 'Karnataka', short_name: 'KA', types: ['administrative_area_level_1'] },
            { long_name: 'India', short_name: 'IN', types: ['country'] },
            { long_name: '560001', short_name: '560001', types: ['postal_code'] },
          ],
        },
      ],
    });
    const { result } = await run();
    expect(result.current.geocoded).toEqual({
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
    });
    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(false);
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('latlng=12.9,77.6');
    expect(url).toContain('key=KEY%201');
  });

  it('returns empty fields when the result has no address components', async () => {
    stubFetch({ status: 'OK', results: [{}] });
    const { result } = await run();
    expect(result.current.geocoded).toEqual({ city: '', state: '', country: '', pincode: '' });
  });

  it('reset clears a previous result', async () => {
    stubFetch({ status: 'OK', results: [{}] });
    const { result } = await run();
    act(() => result.current.reset());
    expect(result.current.geocoded).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('errors when no map key is configured', async () => {
    h.key = '';
    const { result } = await run();
    expect(result.current.error).toBe('Map API key is not configured');
  });

  it('errors when the browser has no geolocation', async () => {
    vi.stubGlobal('navigator', {});
    const { result } = await run();
    expect(result.current.error).toBe('Geolocation is not supported in this browser');
  });

  it.each([
    [1, 'Location permission was denied'],
    [2, 'Could not determine your location'],
    [3, 'Timed out while getting your location'],
  ])('maps geolocation error code %i to a message', async (code, message) => {
    stubGeo((_ok, fail) => fail({ code }));
    const { result } = await run();
    expect(result.current.error).toBe(message);
    expect(result.current.geocoded).toBeNull();
  });

  it('falls back to a generic message for an error with no message or code', async () => {
    stubGeo((_ok, fail) => fail({}));
    const { result } = await run();
    expect(result.current.error).toBe('Could not get your location');
  });

  it('surfaces a geocoder transport failure', async () => {
    stubFetch({}, false);
    const { result } = await run();
    expect(result.current.error).toBe('Could not reach Google geocoder');
  });

  it('surfaces the geocoder error message, or a default when it gives none', async () => {
    stubFetch({ status: 'REQUEST_DENIED', error_message: 'Key rejected' });
    expect((await run()).result.current.error).toBe('Key rejected');
    stubFetch({ status: 'ZERO_RESULTS', results: [] });
    expect((await run()).result.current.error).toBe('Could not resolve your location');
    stubFetch({ status: 'OK', results: 'nope' });
    expect((await run()).result.current.error).toBe('Could not resolve your location');
  });
});
