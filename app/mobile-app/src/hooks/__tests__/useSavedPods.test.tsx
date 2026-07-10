import { act, renderHook, waitFor } from '@testing-library/react-native';

import { SavedPodSort } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { useSavedPods } from '@/hooks/useSavedPods';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const savedPod = (id: string) => ({ id, pod_id: `p-${id}`, pod_title: `Pod ${id}` });
const result = (pods: unknown[]) => ({ mySavedPods: pods });

const args = (over: Partial<Parameters<typeof useSavedPods>[0]> = {}) => ({
  search: '',
  categoryId: null,
  sort: SavedPodSort.Recent,
  ...over,
});

describe('useSavedPods', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRequest.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('debounces the query and passes the trimmed search + category + sort args', async () => {
    mockRequest.mockResolvedValue(result([savedPod('1')]));
    const { result: hook } = renderHook(() =>
      useSavedPods(args({ search: '  yoga  ', categoryId: 'cat', sort: SavedPodSort.PriceLow })),
    );
    expect(hook.current.isLoading).toBe(true);
    expect(mockRequest).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { search: 'yoga', categoryId: 'cat', sort: SavedPodSort.PriceLow },
      { auth: true },
    );
    await waitFor(() => expect(hook.current.isLoading).toBe(false));
    expect(hook.current.pods.map((p) => p.id)).toEqual(['1']);
  });

  it('sends a null search when the field is empty/whitespace', () => {
    mockRequest.mockResolvedValue(result([]));
    renderHook(() => useSavedPods(args({ search: '   ' })));
    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { search: null, categoryId: null, sort: SavedPodSort.Recent },
      { auth: true },
    );
  });

  it('keeps only the latest response when the args change mid-flight', async () => {
    mockRequest
      .mockResolvedValueOnce(result([savedPod('old')]))
      .mockResolvedValueOnce(result([savedPod('new')]));
    const { result: hook, rerender } = renderHook(
      (props: { q: string }) => useSavedPods(args({ search: props.q })),
      { initialProps: { q: 'ba' } },
    );
    act(() => {
      jest.advanceTimersByTime(350);
    });
    rerender({ q: 'bad' });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(hook.current.isLoading).toBe(false));
    expect(hook.current.pods.map((p) => p.id)).toEqual(['new']);
  });

  it('ignores a stale failure after the args change', async () => {
    mockRequest
      .mockRejectedValueOnce(new Error('stale'))
      .mockResolvedValueOnce(result([savedPod('new')]));
    const { result: hook, rerender } = renderHook(
      (props: { q: string }) => useSavedPods(args({ search: props.q })),
      { initialProps: { q: 'ba' } },
    );
    act(() => {
      jest.advanceTimersByTime(350);
    });
    rerender({ q: 'bad' });
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(hook.current.pods.map((p) => p.id)).toEqual(['new']));
    expect(hook.current.error).toBeUndefined();
  });

  it('captures a live failure', async () => {
    mockRequest.mockRejectedValue(new Error('boom'));
    const { result: hook } = renderHook(() => useSavedPods(args()));
    act(() => {
      jest.advanceTimersByTime(350);
    });
    await waitFor(() => expect(hook.current.isLoading).toBe(false));
    expect(hook.current.error).toBeDefined();
    expect(hook.current.pods).toEqual([]);
  });
});
