import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { gql } from '@apollo/client';

import { usePagedRows } from '../usePagedRows';

const h = vi.hoisted(() => {
  const query = vi.fn();
  return { query, client: { query } };
});

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useApolloClient: () => h.client,
}));

const DOC = gql`
  query T($page: Int) {
    thingsTable(page: $page) {
      total
    }
  }
`;

const page = (rows: string[], total: number) => ({ data: { thingsTable: { rows, total } } });

const setup = (search = 'a') =>
  renderHook(
    ({ term }) =>
      usePagedRows<string>({
        document: DOC,
        field: 'thingsTable',
        variables: (p) => ({ page: p, search: term }),
      }),
    { initialProps: { term: search } }
  );

beforeEach(() => {
  h.query.mockReset();
});

describe('usePagedRows', () => {
  it('loads page one on mount with the document, variables and network-only', async () => {
    h.query.mockResolvedValue(page(['r1', 'r2'], 3));
    const { result } = setup();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows).toEqual(['r1', 'r2']);
    expect(result.current.total).toBe(3);
    expect(result.current.hasMore).toBe(true);
    expect(h.query).toHaveBeenCalledWith({
      query: DOC,
      variables: { page: 1, search: 'a' },
      fetchPolicy: 'network-only',
    });
  });

  it('appends the next page on loadMore and stops when everything is loaded', async () => {
    h.query.mockResolvedValueOnce(page(['r1', 'r2'], 3)).mockResolvedValueOnce(page(['r3'], 3));
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.rows).toEqual(['r1', 'r2', 'r3']));
    expect(h.query.mock.calls[1][0].variables).toEqual({ page: 2, search: 'a' });
    expect(result.current.hasMore).toBe(false);
  });

  it('restarts from page one, replacing rows, when the variables change', async () => {
    h.query.mockResolvedValueOnce(page(['old'], 1)).mockResolvedValueOnce(page(['new'], 1));
    const { result, rerender } = setup('a');
    await waitFor(() => expect(result.current.rows).toEqual(['old']));
    rerender({ term: 'b' });
    await waitFor(() => expect(result.current.rows).toEqual(['new']));
    expect(h.query.mock.calls[1][0].variables).toEqual({ page: 1, search: 'b' });
  });

  it('reload re-reads page one', async () => {
    h.query.mockResolvedValueOnce(page(['a'], 1)).mockResolvedValueOnce(page(['b'], 1));
    const { result } = setup();
    await waitFor(() => expect(result.current.rows).toEqual(['a']));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.rows).toEqual(['b']));
  });

  it('reports a failed page as an error message and stops loading', async () => {
    h.query.mockRejectedValue(new Error('Server down'));
    const { result } = setup();
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.loading).toBe(false);
    expect(result.current.rows).toEqual([]);
  });

  it('treats an empty answer as no rows', async () => {
    h.query.mockResolvedValue({ data: undefined });
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  it('drops a slow stale answer that lands after a newer request', async () => {
    let resolveSlow: (v: unknown) => void = () => undefined;
    h.query
      .mockImplementationOnce(() => new Promise((resolve) => (resolveSlow = resolve)))
      .mockResolvedValueOnce(page(['fresh'], 1));
    const { result, rerender } = setup('slow');
    rerender({ term: 'fast' });
    await waitFor(() => expect(result.current.rows).toEqual(['fresh']));
    await act(async () => {
      resolveSlow(page(['stale'], 1));
    });
    expect(result.current.rows).toEqual(['fresh']);
    expect(result.current.loading).toBe(false);
  });

  it('drops a stale failure too', async () => {
    let rejectSlow: (e: unknown) => void = () => undefined;
    h.query
      .mockImplementationOnce(() => new Promise((_resolve, reject) => (rejectSlow = reject)))
      .mockResolvedValueOnce(page(['fresh'], 1));
    const { result, rerender } = setup('slow');
    rerender({ term: 'fast' });
    await waitFor(() => expect(result.current.rows).toEqual(['fresh']));
    await act(async () => {
      rejectSlow(new Error('late'));
    });
    expect(result.current.error).toBeNull();
  });
});
