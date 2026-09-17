import { renderHook, waitFor } from '@testing-library/react';
import { logs } from '@duncit/logs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GeocodedAddress } from '../../../../../components/app-header/useGeoLocation';
import type { CreatePodLocation } from '../../create-pod.types';
import { useDeviceLocality } from '../useDeviceLocality';

// The browser fix + reverse geocode are the header's, with their own coverage;
// this hook is about when it asks and what it does with the answer. gps-match
// stays real — matching a geocode to our cities is the behaviour under test.
const geo = vi.hoisted(() => ({
  busy: false,
  error: null as string | null,
  geocoded: null as GeocodedAddress | null,
  request: vi.fn(),
}));
vi.mock('../../../../../components/app-header/useGeoLocation', () => ({
  useGeoLocation: () => geo,
}));
vi.mock('@duncit/logs', () => ({ logs: { mWeb: { error: vi.fn() } } }));

const lucknow: CreatePodLocation = {
  id: 'loc-lucknow',
  location_name: 'Lucknow',
  city: 'Lucknow',
  state: 'Uttar Pradesh',
  location_pincode: '226001',
  location_zones: [
    { zone_name: 'Gomti Nagar', pincode: '226010' },
    { zone_name: 'Hazratganj', pincode: '226001' },
  ],
};
const LOCATIONS = [lucknow];
const inGomtiNagar: GeocodedAddress = {
  city: 'Lucknow',
  state: 'Uttar Pradesh',
  country: 'India',
  pincode: '226010',
};

type HookProps = { locations: CreatePodLocation[]; enabled: boolean };

function renderLookup(initial: HookProps) {
  const onFound = vi.fn();
  const view = renderHook(
    ({ locations, enabled }: HookProps) => useDeviceLocality(locations, enabled, onFound),
    { initialProps: initial },
  );
  return { ...view, onFound };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(geo, { busy: false, error: null, geocoded: null });
  geo.request.mockResolvedValue(undefined);
});

describe('useDeviceLocality', () => {
  it('never asks the browser when the lookup is off', () => {
    const { result } = renderLookup({ locations: LOCATIONS, enabled: false });

    expect(geo.request).not.toHaveBeenCalled();
    expect(result.current).toEqual({ detecting: false, failed: false });
  });

  it('waits for the cities to load, then asks exactly once', () => {
    const { rerender } = renderLookup({ locations: [], enabled: true });
    expect(geo.request).not.toHaveBeenCalled();

    rerender({ locations: LOCATIONS, enabled: true });
    const pune = { ...lucknow, id: 'loc-pune', location_name: 'Pune', city: 'Pune' };
    rerender({ locations: [...LOCATIONS, pune], enabled: true });

    expect(geo.request).toHaveBeenCalledTimes(1);
  });

  it('shows the lookup as busy while the browser works', () => {
    geo.busy = true;

    const { result } = renderLookup({ locations: LOCATIONS, enabled: true });

    expect(result.current).toEqual({ detecting: true, failed: false });
  });

  it('logs a lookup that rejects', async () => {
    const failure = new Error('geolocation unavailable');
    geo.request.mockRejectedValue(failure);

    renderLookup({ locations: LOCATIONS, enabled: true });

    await waitFor(() =>
      expect(logs.mWeb.error).toHaveBeenCalledWith('useDeviceLocality', 'request', {
        error: failure,
        msg: 'device location lookup failed',
      }),
    );
  });

  it('hands the matched city and its area to onFound, once', () => {
    geo.geocoded = inGomtiNagar;

    const { onFound, rerender, result } = renderLookup({ locations: LOCATIONS, enabled: true });
    // A refetched copy of the city is a new match; it is not handed on again.
    rerender({ locations: [{ ...lucknow }], enabled: true });

    expect(onFound).toHaveBeenCalledTimes(1);
    expect(onFound).toHaveBeenCalledWith('loc-lucknow', 'Gomti Nagar');
    expect(result.current.failed).toBe(false);
  });

  it('flags a place that is not one of our cities', () => {
    geo.geocoded = { city: 'Kanpur', state: 'Uttar Pradesh', country: 'India', pincode: '208001' };

    const { onFound, result } = renderLookup({ locations: LOCATIONS, enabled: true });

    expect(onFound).not.toHaveBeenCalled();
    expect(result.current).toEqual({ detecting: false, failed: true });
  });

  it('flags a refused or failed browser fix', () => {
    geo.error = 'Location permission was denied';

    const { onFound, result } = renderLookup({ locations: LOCATIONS, enabled: true });

    expect(onFound).not.toHaveBeenCalled();
    expect(result.current.failed).toBe(true);
  });
});
