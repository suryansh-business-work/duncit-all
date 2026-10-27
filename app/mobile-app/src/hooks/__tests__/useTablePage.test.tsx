import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useTablePage, type TablePage } from '@/hooks/useTablePage';

const page = (rows: string[], total: number): TablePage<string> => ({ rows, total });

describe('useTablePage', () => {
  it('loads page one, loading until it lands', async () => {
    const fetcher = jest.fn().mockResolvedValue(page(['a', 'b'], 3));
    const { result } = renderHook(() => useTablePage(fetcher));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetcher).toHaveBeenCalledWith(1);
    expect(result.current.rows).toEqual(['a', 'b']);
    expect(result.current.total).toBe(3);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('has no more once every row is shown', async () => {
    const fetcher = jest.fn().mockResolvedValue(page(['a'], 1));
    const { result } = renderHook(() => useTablePage(fetcher));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(false);
  });

  it('appends the next page under the rows already shown', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(page(['a', 'b'], 3));
    const { result } = renderHook(() => useTablePage(fetcher));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    fetcher.mockResolvedValueOnce(page(['c'], 3));
    act(() => result.current.loadMore());
    expect(result.current.isLoadingMore).toBe(true);
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
    expect(fetcher).toHaveBeenLastCalledWith(2);
    expect(result.current.rows).toEqual(['a', 'b', 'c']);
    expect(result.current.hasMore).toBe(false);
  });

  it('keeps the rows and flags an error when a further page fails', async () => {
    const fetcher = jest.fn().mockResolvedValueOnce(page(['a'], 3));
    const { result } = renderHook(() => useTablePage(fetcher));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    fetcher.mockRejectedValueOnce(new Error('offline'));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.rows).toEqual(['a']);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('flags an error when the first page fails and recovers on refetch', async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useTablePage(fetcher));
    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.rows).toEqual([]);
    fetcher.mockResolvedValueOnce(page(['a'], 1));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.rows).toEqual(['a']));
    expect(result.current.hasError).toBe(false);
  });

  it('starts again from page one with a new fetcher, replacing the rows', async () => {
    const first = jest.fn().mockResolvedValue(page(['a', 'b'], 2));
    const second = jest.fn().mockResolvedValue(page(['z'], 1));
    const { result, rerender } = renderHook(
      ({ fetcher }: { fetcher: (n: number) => Promise<TablePage<string>> }) =>
        useTablePage(fetcher),
      { initialProps: { fetcher: first } },
    );
    await waitFor(() => expect(result.current.rows).toEqual(['a', 'b']));
    rerender({ fetcher: second });
    await waitFor(() => expect(result.current.rows).toEqual(['z']));
    expect(second).toHaveBeenCalledWith(1);
    expect(result.current.total).toBe(1);
  });

  it('drops a slow answer that belongs to a previous fetcher', async () => {
    let finishSlow: (value: TablePage<string>) => void = () => undefined;
    const slow = jest.fn(() => new Promise<TablePage<string>>((resolve) => (finishSlow = resolve)));
    const fast = jest.fn().mockResolvedValue(page(['fresh'], 1));
    const { result, rerender } = renderHook(
      ({ fetcher }: { fetcher: (n: number) => Promise<TablePage<string>> }) =>
        useTablePage(fetcher),
      { initialProps: { fetcher: slow } },
    );
    rerender({ fetcher: fast });
    await waitFor(() => expect(result.current.rows).toEqual(['fresh']));
    await act(async () => finishSlow(page(['stale'], 1)));
    expect(result.current.rows).toEqual(['fresh']);
  });

  it('drops a failure that belongs to a previous fetcher', async () => {
    let failSlow: (reason: Error) => void = () => undefined;
    const slow = jest.fn(() => new Promise<TablePage<string>>((_, reject) => (failSlow = reject)));
    const fast = jest.fn().mockResolvedValue(page(['fresh'], 1));
    const { result, rerender } = renderHook(
      ({ fetcher }: { fetcher: (n: number) => Promise<TablePage<string>> }) =>
        useTablePage(fetcher),
      { initialProps: { fetcher: slow } },
    );
    rerender({ fetcher: fast });
    await waitFor(() => expect(result.current.rows).toEqual(['fresh']));
    await act(async () => failSlow(new Error('late')));
    expect(result.current.hasError).toBe(false);
  });
});
