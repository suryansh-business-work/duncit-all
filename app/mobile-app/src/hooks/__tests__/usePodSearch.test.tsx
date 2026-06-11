import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { usePodSearch } from '@/hooks/usePodSearch';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const pod = (id: string, title: string) => ({
  id,
  pod_id: `p-${id}`,
  pod_title: title,
  pod_date_time: '2030-01-01T00:00:00.000Z',
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  no_of_spots: 4,
  host_names: [],
  pod_images_and_videos: [],
  club_id: 'c1',
  club_slug: 's',
  location_id: null,
  pod_mode: null,
  place_label: null,
  place_detail: null,
});

beforeEach(() => {
  jest.useFakeTimers();
  mockRequest.mockReset();
});
afterEach(() => jest.useRealTimers());

describe('usePodSearch', () => {
  it('returns nothing and skips the server for an empty query', () => {
    const { result } = renderHook(() => usePodSearch('   '));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.hasQuery).toBe(false);
    expect(result.current.results).toEqual([]);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('debounces, then fetches matching pods from the server', async () => {
    mockRequest.mockResolvedValue({ pods: [pod('1', 'Sunset Yoga')] });
    const { result } = renderHook(() => usePodSearch('yoga'));
    expect(result.current.isLoading).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled(); // still inside the debounce window

    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { filter: { search: 'yoga', is_active: true } },
      { auth: true },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.results.map((p) => p.id)).toEqual(['1']);
  });

  it('only keeps the latest request when the query changes mid-flight', async () => {
    mockRequest
      .mockResolvedValueOnce({ pods: [pod('old', 'Old result')] })
      .mockResolvedValueOnce({ pods: [pod('new', 'New result')] });
    const { result, rerender } = renderHook((props: { q: string }) => usePodSearch(props.q), {
      initialProps: { q: 'yo' },
    });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    rerender({ q: 'yoga' });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.results.map((p) => p.id)).toEqual(['new']);
  });

  it('ignores a stale failure after the query changes', async () => {
    mockRequest
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ pods: [pod('new', 'New result')] });
    const { result, rerender } = renderHook((props: { q: string }) => usePodSearch(props.q), {
      initialProps: { q: 'yo' },
    });
    act(() => {
      jest.advanceTimersByTime(350); // request 1 fires, will reject as stale
    });
    rerender({ q: 'yoga' });
    act(() => {
      jest.advanceTimersByTime(350); // request 2 fires
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.results.map((p) => p.id)).toEqual(['new']);
  });

  it('clears the results when the search fails', async () => {
    mockRequest.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePodSearch('yoga'));
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.results).toEqual([]);
  });

  it('resets to empty when the query is cleared', async () => {
    mockRequest.mockResolvedValue({ pods: [pod('1', 'Sunset Yoga')] });
    const { result, rerender } = renderHook((props: { q: string }) => usePodSearch(props.q), {
      initialProps: { q: 'yoga' },
    });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    rerender({ q: '' });
    expect(result.current.hasQuery).toBe(false);
    expect(result.current.results).toEqual([]);
  });
});
