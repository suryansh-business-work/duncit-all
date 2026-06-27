import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useEcommDashboard, useVenueDashboard } from '@/hooks/useStudioDashboards';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => mockRequest.mockReset());

describe('useVenueDashboard', () => {
  it('loads venues then the first venue’s pod dates', async () => {
    mockRequest
      .mockResolvedValueOnce({ myVenues: [{ id: 'v1', venue_name: 'Hall' }] })
      .mockResolvedValueOnce({ pods: [{ id: 'p1', pod_date_time: '2026-06-20T10:00:00Z' }] });
    const { result } = renderHook(() => useVenueDashboard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.venues).toHaveLength(1);
    expect(result.current.podDates).toEqual(['2026-06-20T10:00:00Z']);
  });

  it('skips the pods query without venues and tolerates a pods failure', async () => {
    mockRequest.mockResolvedValueOnce({ myVenues: [] });
    const first = renderHook(() => useVenueDashboard());
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    expect(mockRequest).toHaveBeenCalledTimes(1);

    mockRequest
      .mockResolvedValueOnce({ myVenues: [{ id: 'v1', venue_name: 'Hall' }] })
      .mockRejectedValueOnce(new Error('down'));
    const second = renderHook(() => useVenueDashboard());
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(second.result.current.podDates).toEqual([]);
  });

  it('swallows a full load failure and ignores post-unmount resolutions', async () => {
    mockRequest.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useVenueDashboard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.venues).toEqual([]);

    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => useVenueDashboard());
    unmount();
    await act(async () => {
      resolve({ myVenues: [] });
    });

    // Unmount between the venues and pods fetches — the pods result is dropped.
    let resolvePods!: (value: unknown) => void;
    mockRequest
      .mockResolvedValueOnce({ myVenues: [{ id: 'v1', venue_name: 'Hall' }] })
      .mockReturnValueOnce(
        new Promise((r) => {
          resolvePods = r;
        }),
      );
    const midway = renderHook(() => useVenueDashboard());
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(3));
    midway.unmount();
    await act(async () => {
      resolvePods({ pods: [] });
    });
  });
});

describe('useEcommDashboard', () => {
  it('loads the catalogue and swallows failures', async () => {
    mockRequest.mockResolvedValueOnce({ availablePodProducts: [{ id: 'p1' }] });
    const ok = renderHook(() => useEcommDashboard());
    await waitFor(() => expect(ok.result.current.isLoading).toBe(false));
    expect(ok.result.current.products).toHaveLength(1);

    mockRequest.mockRejectedValueOnce(new Error('down'));
    const bad = renderHook(() => useEcommDashboard());
    await waitFor(() => expect(bad.result.current.isLoading).toBe(false));
    expect(bad.result.current.products).toEqual([]);
  });

  it('skips the fetch entirely when disabled', () => {
    const { result } = renderHook(() => useEcommDashboard(false));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.products).toEqual([]);
  });
});
