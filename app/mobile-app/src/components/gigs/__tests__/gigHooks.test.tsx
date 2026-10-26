import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import {
  GigCategoriesDocument,
  GigJobDocument,
  GigJobsDocument,
  GigViewerDocument,
  MyGigJobsDocument,
} from '@/graphql/gigs';
import { graphqlRequest } from '@/services/graphql.client';
import { useGigContext } from '../useGigContext';
import { useGigJob } from '../useGigJob';
import { usePagedGigs } from '../usePagedGigs';
import { useRefetchOnReturn } from '../useRefetchOnReturn';

jest.mock('@duncit/logs', () => ({
  logs: { mobileApp: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } },
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// Screen focus: the effect runs on mount (the first focus) and again for every `refocus()`.
let mockFocusListeners: (() => void)[] = [];
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect: useReactEffect } = require('react');
    useReactEffect(() => {
      effect();
      mockFocusListeners.push(effect);
      return () => {
        mockFocusListeners = mockFocusListeners.filter((listener) => listener !== effect);
      };
    }, [effect]);
  },
}));
const refocus = () => act(() => mockFocusListeners.forEach((listener) => listener()));

const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;
const AUTH = { auth: true };

beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
  mockFocusListeners = [];
});

describe('useRefetchOnReturn', () => {
  it('skips the first focus, which the mount load already covers, and re-reads on every return', () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    renderHook(() => useRefetchOnReturn(refetch));
    expect(refetch).not.toHaveBeenCalled();
    refocus();
    expect(refetch).toHaveBeenCalledTimes(1);
    refocus();
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('keeps one identity across a changed refetch, so a new filter reads once, not twice', () => {
    const first = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ refetch }: { refetch: () => Promise<unknown> }) => useRefetchOnReturn(refetch),
      {
        initialProps: { refetch: first },
      },
    );
    rerender({ refetch: second });
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    refocus();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('logs a failed re-read instead of dropping it', async () => {
    const failure = new Error('offline');
    const refetch = jest.fn().mockRejectedValue(failure);
    renderHook(() => useRefetchOnReturn(refetch));
    refocus();
    await waitFor(() =>
      expect(logs.mobileApp.error).toHaveBeenCalledWith('fire-and-forget', 'fireAndForget', {
        error: failure,
      }),
    );
  });
});

describe('useGigContext', () => {
  const answer = () =>
    request.mockImplementation((doc: unknown) =>
      Promise.resolve(
        doc === GigCategoriesDocument
          ? { gigCategories: [{ id: 'cat1', title: 'DJ', examples: [] }] }
          : { gigViewer: { poster_roles: ['HOST'], is_freelancer: true, default_contact: {} } },
      ),
    );

  it('reads the categories and what the viewer may do, together', async () => {
    answer();
    const { result } = renderHook(() => useGigContext());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(request).toHaveBeenCalledWith(GigCategoriesDocument, {}, AUTH);
    expect(request).toHaveBeenCalledWith(GigViewerDocument, {}, AUTH);
    expect(result.current.categories).toEqual([{ id: 'cat1', title: 'DJ', examples: [] }]);
    expect(result.current.viewer).toMatchObject({ is_freelancer: true });
    expect(result.current.failed).toBe(false);
  });

  it('flags the failure, logs its cause and recovers on refetch', async () => {
    const failure = new Error('boom');
    request.mockRejectedValue(failure);
    const { result } = renderHook(() => useGigContext());
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(logs.mobileApp.error).toHaveBeenCalledWith(
      'GigJobs',
      'useGigContext',
      expect.objectContaining({ error: failure }),
    );
    answer();
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.failed).toBe(false);
    expect(result.current.categories).toHaveLength(1);
  });

  it('reads again when the screen is returned to', async () => {
    answer();
    const { result } = renderHook(() => useGigContext());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = request.mock.calls.length;
    refocus();
    await waitFor(() => expect(request.mock.calls.length).toBeGreaterThan(before));
  });
});

describe('useGigJob', () => {
  const job = { id: 'g1', title: 'Wedding DJ' };

  it('reads the gig', async () => {
    request.mockResolvedValue({ gigJob: job });
    const { result } = renderHook(() => useGigJob('g1'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.job).toEqual(job));
    expect(request).toHaveBeenCalledWith(GigJobDocument, { id: 'g1' }, AUTH);
    expect(result.current.missing).toBe(false);
    expect(result.current.failed).toBe(false);
  });

  it('says the gig is missing when the server has none', async () => {
    request.mockResolvedValue({ gigJob: null });
    const { result } = renderHook(() => useGigJob('g1'));
    await waitFor(() => expect(result.current.missing).toBe(true));
    expect(result.current.job).toBeNull();
  });

  it('flags a failed read', async () => {
    request.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useGigJob('g1'));
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.missing).toBe(false);
  });

  it('takes the copy a mutation answered with, without another request', async () => {
    request.mockResolvedValue({ gigJob: job });
    const { result } = renderHook(() => useGigJob('g1'));
    await waitFor(() => expect(result.current.job).toEqual(job));
    act(() => result.current.replace({ ...job, title: 'Closed' } as never));
    expect(result.current.job).toMatchObject({ title: 'Closed' });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('reads nothing while disabled, neither on mount nor on return', async () => {
    const { result } = renderHook(() => useGigJob('g1', false));
    refocus();
    await act(async () => undefined);
    expect(request).not.toHaveBeenCalled();
    expect(result.current.job).toBeNull();
  });

  it('reads again when the screen is returned to', async () => {
    request.mockResolvedValue({ gigJob: job });
    const { result } = renderHook(() => useGigJob('g1'));
    await waitFor(() => expect(result.current.job).toEqual(job));
    request.mockResolvedValue({ gigJob: { ...job, title: 'Updated' } });
    refocus();
    await waitFor(() => expect(result.current.job).toMatchObject({ title: 'Updated' }));
  });
});

describe('usePagedGigs', () => {
  const page = (ids: string[], total = ids.length) => ({ rows: ids.map((id) => ({ id })), total });

  it('reads the first page of the open board with the filter', async () => {
    request.mockResolvedValue({ gigJobs: page(['g1', 'g2'], 5) });
    const { result } = renderHook(() =>
      usePagedGigs('BOARD', { category_id: 'cat1', location_id: 'loc1', search: 'dj' }),
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'g1' }, { id: 'g2' }]));
    expect(request).toHaveBeenCalledWith(
      GigJobsDocument,
      { filter: { category_id: 'cat1', location_id: 'loc1', search: 'dj' }, offset: 0, limit: 20 },
      AUTH,
    );
    expect(result.current.total).toBe(5);
    expect(result.current.failed).toBe(false);
  });

  it('reads an unfiltered board when no filter is given', async () => {
    request.mockResolvedValue({ gigJobs: page(['g1']) });
    renderHook(() => usePagedGigs('BOARD'));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(request.mock.calls[0][1].filter).toEqual({
      category_id: undefined,
      location_id: undefined,
      search: undefined,
    });
  });

  it('reads the viewer own posts, with no filter', async () => {
    request.mockResolvedValue({ myGigJobs: page(['m1']) });
    const { result } = renderHook(() => usePagedGigs('MINE'));
    await waitFor(() => expect(result.current.rows).toEqual([{ id: 'm1' }]));
    expect(request).toHaveBeenCalledWith(MyGigJobsDocument, { offset: 0, limit: 20 }, AUTH);
  });

  it('widens the window by a page for load more, re-reading what is on screen', async () => {
    request.mockResolvedValue({ gigJobs: page(['g1'], 50) });
    const { result } = renderHook(() => usePagedGigs('BOARD'));
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    act(() => result.current.more());
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][1]).toMatchObject({ offset: 0, limit: 40 });
  });

  it('reads again when the filter changes', async () => {
    request.mockResolvedValue({ gigJobs: page(['g1']) });
    const { result, rerender } = renderHook(
      ({ search }: { search: string }) => usePagedGigs('BOARD', { search }),
      { initialProps: { search: 'a' } },
    );
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    rerender({ search: 'b' });
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    expect(request.mock.calls[1][1].filter.search).toBe('b');
  });

  it('flags a failed read, logs its source and recovers on retry', async () => {
    const failure = new Error('offline');
    request.mockRejectedValueOnce(failure);
    const { result } = renderHook(() => usePagedGigs('MINE'));
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(logs.mobileApp.error).toHaveBeenCalledWith(
      'GigJobs',
      'usePagedGigs',
      expect.objectContaining({ error: failure, source: 'MINE' }),
    );
    request.mockResolvedValueOnce({ myGigJobs: page(['m1']) });
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.failed).toBe(false);
    expect(result.current.rows).toEqual([{ id: 'm1' }]);
  });
});
