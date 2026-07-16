import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook } from '@testing-library/react';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
  useQuery: useQueryMock,
}));

const { useAdminLocations } = await import('../src/queries');

describe('useAdminLocations', () => {
  beforeEach(() => {
    (useQueryMock as Mock).mockReset();
  });

  it('uses cache-first and passes through loading/error while data is absent', () => {
    useQueryMock.mockReturnValue({ data: undefined, loading: true, error: undefined });
    const { result } = renderHook(() => useAdminLocations());
    expect(result.current).toEqual({ locations: [], loading: true, error: undefined });
    expect(useQueryMock).toHaveBeenCalledWith(expect.anything(), { fetchPolicy: 'cache-first' });
  });

  it('defaults to an empty list when data has no locations field', () => {
    useQueryMock.mockReturnValue({ data: {}, loading: false, error: undefined });
    const { result } = renderHook(() => useAdminLocations());
    expect(result.current.locations).toEqual([]);
  });

  it('returns the fetched locations once loaded', () => {
    const locations = [{ id: 'loc-1', city: 'Bengaluru' }];
    const error = new Error('boom');
    useQueryMock.mockReturnValue({ data: { locations }, loading: false, error });
    const { result } = renderHook(() => useAdminLocations());
    expect(result.current).toEqual({ locations, loading: false, error });
  });
});
