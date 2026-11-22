import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { TableQueryState } from '@duncit/table';
import { MIN_SCAN_MS, useLeadsTableFetch, useNearbyLeads } from '@/hooks/useNearbyLeads';

const query = vi.fn();
vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useApolloClient: () => ({ query }),
}));

const DOC = { kind: 'Document' };
const STATE: TableQueryState = { search: '', page: 1, pageSize: 25, sortBy: null, sortDir: 'asc', filters: [] };
const BANDRA = { latitude: 19.0596, longitude: 72.8295 };

type GeoSuccess = (position: { coords: typeof BANDRA }) => void;
type GeoFailure = (error: { code: number; PERMISSION_DENIED: number }) => void;
const getCurrentPosition = vi.fn<(ok: GeoSuccess, fail: GeoFailure, options: PositionOptions) => void>();

beforeEach(() => {
  vi.useFakeTimers();
  query.mockReset();
  getCurrentPosition.mockReset();
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition }, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'geolocation');
});

const page = (total: number, unplaced: number | null) => ({ data: { venueLeadsTable: { total, unplaced, rows: [] } } });
const placeSearch = { source: 'place' as const, city: 'Mumbai', area: 'Bandra', radius_km: 3 };

describe('useNearbyLeads', () => {
  it('centres on a picked city and area, then reports what the table read found once the radar has had its moment', async () => {
    const { result } = renderHook(() => useNearbyLeads('venueLeadsTable'));
    act(() => result.current.start(placeSearch));
    expect(result.current.near).toEqual({ city: 'Mumbai', area: 'Bandra', radius_km: 3 });
    expect(result.current.search).toEqual(placeSearch);
    expect(result.current.scan).toEqual({ phase: 'searching' });

    query.mockResolvedValue(page(4, 2));
    await act(() => result.current.client.query({ query: DOC, variables: { near: result.current.near } }));
    expect(result.current.scan).toEqual({ phase: 'searching' });
    await act(async () => vi.advanceTimersByTime(MIN_SCAN_MS));
    expect(result.current.scan).toEqual({ phase: 'done', total: 4, unplaced: 2 });
  });

  it('sends no area when only a city is picked', () => {
    const { result } = renderHook(() => useNearbyLeads('venueLeadsTable'));
    act(() => result.current.start({ ...placeSearch, area: '' }));
    expect(result.current.near).toEqual({ city: 'Mumbai', radius_km: 3 });
  });

  it('ignores table reads that are not nearby reads, and nearby reads nobody is waiting for', async () => {
    const { result } = renderHook(() => useNearbyLeads('venueLeadsTable'));
    query.mockResolvedValue(page(9, null));
    await act(() => result.current.client.query({ query: DOC, variables: { near: { city: 'Pune', radius_km: 2 } } }));
    await act(async () => vi.advanceTimersByTime(MIN_SCAN_MS));
    expect(result.current.scan).toEqual({ phase: 'idle' });

    act(() => result.current.start(placeSearch));
    await act(() => result.current.client.query({ query: DOC, variables: { query: {} } }));
    await act(async () => vi.advanceTimersByTime(MIN_SCAN_MS));
    expect(result.current.scan).toEqual({ phase: 'searching' });
  });

  it('counts a missing page as nothing found', async () => {
    const { result } = renderHook(() => useNearbyLeads('venueLeadsTable'));
    act(() => result.current.start(placeSearch));
    query.mockResolvedValue({ data: {} });
    await act(() => result.current.client.query({ query: DOC, variables: { near: result.current.near } }));
    await act(async () => vi.advanceTimersByTime(MIN_SCAN_MS));
    expect(result.current.scan).toEqual({ phase: 'done', total: 0, unplaced: null });
  });

  it('turns a failed nearby read into an error the dialog can show, and still lets the table see the failure', async () => {
    const { result } = renderHook(() => useNearbyLeads('venueLeadsTable'));
    act(() => result.current.start(placeSearch));
    query.mockRejectedValue(new Error('Radius must be between 0.5 and 50 km'));
    await act(async () => {
      await expect(result.current.client.query({ query: DOC, variables: { near: result.current.near } })).rejects.toThrow();
    });
    await act(async () => vi.advanceTimersByTime(MIN_SCAN_MS));
    expect(result.current.scan).toMatchObject({ phase: 'error', message: expect.stringContaining('Radius must be') });
  });

  it('asks the browser for my position and centres on it', () => {
    const { result } = renderHook(() => useNearbyLeads('venueLeadsTable'));
    act(() => result.current.start({ source: 'me', city: '', area: '', radius_km: 5 }));
    expect(result.current.scan).toEqual({ phase: 'locating' });
    expect(result.current.near).toBeNull();
    const [ok, , options] = getCurrentPosition.mock.calls[0];
    expect(options).toMatchObject({ enableHighAccuracy: true });
    act(() => ok({ coords: BANDRA }));
    expect(result.current.near).toEqual({ lat: 19.0596, lng: 72.8295, radius_km: 5 });
    expect(result.current.scan).toEqual({ phase: 'searching' });
  });

  it('explains a blocked or failed location lookup', () => {
    const { result } = renderHook(() => useNearbyLeads('venueLeadsTable'));
    const me = { source: 'me' as const, city: '', area: '', radius_km: 5 };
    act(() => result.current.start(me));
    act(() => getCurrentPosition.mock.calls[0][1]({ code: 1, PERMISSION_DENIED: 1 }));
    expect(result.current.scan).toEqual({ phase: 'error', message: expect.stringContaining('Location access is blocked') });
    act(() => result.current.start(me));
    act(() => getCurrentPosition.mock.calls[1][1]({ code: 3, PERMISSION_DENIED: 1 }));
    expect(result.current.scan).toEqual({ phase: 'error', message: expect.stringContaining('could not be found') });
    expect(result.current.near).toBeNull();
  });

  it('says so when the browser cannot share a location at all', () => {
    Reflect.deleteProperty(navigator, 'geolocation');
    const { result } = renderHook(() => useNearbyLeads('venueLeadsTable'));
    act(() => result.current.start({ source: 'me', city: '', area: '', radius_km: 5 }));
    expect(result.current.scan).toEqual({ phase: 'error', message: expect.stringContaining('cannot share your location') });
  });

  it('clears the search and drops an answer still on its way', async () => {
    const { result } = renderHook(() => useNearbyLeads('venueLeadsTable'));
    act(() => result.current.start(placeSearch));
    query.mockResolvedValue(page(4, 0));
    await act(() => result.current.client.query({ query: DOC, variables: { near: result.current.near } }));
    act(() => result.current.clear());
    await act(async () => vi.advanceTimersByTime(MIN_SCAN_MS));
    expect(result.current).toMatchObject({ near: null, search: null, scan: { phase: 'idle' } });
  });
});

describe('useLeadsTableFetch', () => {
  it('sends near only while a nearby search is on', async () => {
    query.mockResolvedValue(page(1, null));
    const { result } = renderHook(() => useLeadsTableFetch<{ id: string }>(DOC, 'venueLeadsTable'));
    await act(() => result.current.fetchRows(STATE));
    expect(query.mock.calls[0][0].variables).not.toHaveProperty('near');

    act(() => result.current.nearby.start(placeSearch));
    await act(() => result.current.fetchRows(STATE));
    expect(query.mock.calls[1][0].variables.near).toEqual({ city: 'Mumbai', area: 'Bandra', radius_km: 3 });
    expect(query.mock.calls[1][0].query).toBe(DOC);
  });
});
