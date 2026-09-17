import { renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { useDeviceLocality } from '@/components/create-pod/steps/useDeviceLocality';
import type { CreatePodLocation } from '@/components/create-pod/create-pod.types';
import { detectDeviceLocation } from '@/utils/device-location';

jest.mock('@/utils/device-location', () => ({ detectDeviceLocation: jest.fn() }));
jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));

const detect = detectDeviceLocation as jest.Mock;
const logError = logs.mobileApp.error as jest.Mock;

const lucknow: CreatePodLocation = {
  id: 'loc-lucknow',
  location_name: 'Lucknow',
  city: 'Lucknow',
  state: 'Uttar Pradesh',
  location_zones: [{ zone_name: 'Gomti Nagar', pincode: '226010' }],
};
const LOCATIONS = [lucknow];

type HookProps = { locations: CreatePodLocation[]; enabled: boolean };

const renderLookup = (initial: HookProps, onFound = jest.fn()) => {
  const view = renderHook(
    ({ locations, enabled }: HookProps) => useDeviceLocality(locations, enabled, onFound),
    { initialProps: initial },
  );
  return { ...view, onFound };
};

beforeEach(() => jest.clearAllMocks());

describe('useDeviceLocality', () => {
  it('never asks the device when the lookup is off', () => {
    const { result } = renderLookup({ locations: LOCATIONS, enabled: false });

    expect(detect).not.toHaveBeenCalled();
    expect(result.current).toEqual({ detecting: false, failed: false });
  });

  it('waits for the cities to load before asking, then asks once', async () => {
    detect.mockResolvedValue({ status: 'DENIED' });
    const { rerender, result } = renderLookup({ locations: [], enabled: true });
    expect(detect).not.toHaveBeenCalled();

    rerender({ locations: LOCATIONS, enabled: true });
    await waitFor(() => expect(result.current.failed).toBe(true));
    // A fresh array (a refetch) re-runs the effect; the lookup is not repeated.
    rerender({ locations: [...LOCATIONS], enabled: true });

    expect(detect).toHaveBeenCalledTimes(1);
    expect(detect).toHaveBeenCalledWith(LOCATIONS);
  });

  it('hands a matched city and area to onFound while showing the lookup as busy', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    detect.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { result, onFound } = renderLookup({ locations: LOCATIONS, enabled: true });
    expect(result.current.detecting).toBe(true);

    resolve({ status: 'FOUND', city: 'Lucknow', location: lucknow, zone: 'Gomti Nagar' });

    await waitFor(() => expect(result.current.detecting).toBe(false));
    expect(onFound).toHaveBeenCalledWith('loc-lucknow', 'Gomti Nagar');
    expect(result.current.failed).toBe(false);
  });

  it('flags a city Duncit does not serve', async () => {
    detect.mockResolvedValue({ status: 'UNSERVED', city: 'Kanpur' });
    const { result, onFound } = renderLookup({ locations: LOCATIONS, enabled: true });

    await waitFor(() => expect(result.current).toEqual({ detecting: false, failed: true }));
    expect(onFound).not.toHaveBeenCalled();
  });

  it('flags and logs a lookup that throws', async () => {
    const failure = new Error('Location request timed out');
    detect.mockRejectedValue(failure);
    const { result, onFound } = renderLookup({ locations: LOCATIONS, enabled: true });

    await waitFor(() => expect(result.current).toEqual({ detecting: false, failed: true }));
    expect(onFound).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('create-pod', 'device-locality', { error: failure });
  });
});
