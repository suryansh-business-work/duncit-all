import { act, renderHook, waitFor } from '@testing-library/react-native';

import { OfficialStatusesDocument, RecordOfficialStatusViewDocument } from '@/graphql/official-status';
import { useOfficialStatus } from '@/hooks/useOfficialStatus';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockLocationState = { selectedId: 'loc1' };
jest.mock('@/stores/location.store', () => ({
  useLocationStore: (selector: (s: unknown) => unknown) => selector(mockLocationState),
}));

// `useRefreshRegistration` is a no-op with no ScreenRefreshProvider above it
// (see useActiveAds.test.tsx), so `refetch` itself is never reachable from a
// test unless the registration call is captured — mock it to grab the handler
// the hook hands over, and invoke it directly to simulate a pull-to-refresh.
const mockUseRefreshRegistration = jest.fn();
jest.mock('@/components/PullToRefresh', () => ({
  useRefreshRegistration: (fn: () => void) => mockUseRefreshRegistration(fn),
}));

const mockRequest = graphqlRequest as jest.Mock;

const status = {
  id: 's1',
  media_url: 'http://x/pic.jpg',
  media_type: 'IMAGE',
  caption: 'Hi',
  link_url: null,
  expires_at: null,
  seen_by_me: false,
};

beforeEach(() => {
  mockRequest.mockReset();
  mockUseRefreshRegistration.mockClear();
  mockLocationState.selectedId = 'loc1';
});

describe('useOfficialStatus', () => {
  it('fetches the live statuses for the selected location on mount', async () => {
    mockRequest.mockResolvedValueOnce({ officialStatuses: [status] });
    const { result } = renderHook(() => useOfficialStatus());
    await waitFor(() => expect(result.current.statuses).toEqual([status]));
    expect(mockRequest).toHaveBeenCalledWith(
      OfficialStatusesDocument,
      { locationId: 'loc1' },
      { auth: true },
    );
  });

  it('passes a null locationId when nothing is selected', async () => {
    mockLocationState.selectedId = '';
    mockRequest.mockResolvedValueOnce({ officialStatuses: [] });
    renderHook(() => useOfficialStatus());
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        OfficialStatusesDocument,
        { locationId: null },
        { auth: true },
      ),
    );
  });

  it('swallows a fetch failure, leaving statuses empty', async () => {
    mockRequest.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useOfficialStatus());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.statuses).toEqual([]);
  });

  it('drops a response that lands after unmount', async () => {
    let resolve!: (value: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result, unmount } = renderHook(() => useOfficialStatus());
    unmount();
    await act(async () => {
      resolve({ officialStatuses: [status] });
    });
    // The active-guard skips the post-unmount state update.
    expect(result.current.statuses).toEqual([]);
  });

  it('refetches when the selected location changes', async () => {
    mockRequest.mockResolvedValueOnce({ officialStatuses: [] });
    const { rerender } = renderHook(() => useOfficialStatus());
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));

    mockLocationState.selectedId = 'loc2';
    mockRequest.mockResolvedValueOnce({ officialStatuses: [status] });
    rerender();
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(mockRequest).toHaveBeenLastCalledWith(
      OfficialStatusesDocument,
      { locationId: 'loc2' },
      { auth: true },
    );
  });

  it('re-fetches when the registered pull-to-refresh handler runs', async () => {
    mockRequest.mockResolvedValueOnce({ officialStatuses: [] });
    renderHook(() => useOfficialStatus());
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));

    const refetch = mockUseRefreshRegistration.mock.calls.at(-1)?.[0] as (() => void) | undefined;
    expect(refetch).toBeDefined();
    mockRequest.mockResolvedValueOnce({ officialStatuses: [status] });
    await act(async () => {
      refetch?.();
    });
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
  });

  it('records a view once, updates seenIds optimistically, and posts the mutation', async () => {
    mockRequest.mockResolvedValueOnce({ officialStatuses: [] });
    mockRequest.mockResolvedValueOnce({ recordOfficialStatusView: true });
    const { result } = renderHook(() => useOfficialStatus());
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));

    act(() => result.current.recordView('s1'));
    expect(result.current.seenIds.has('s1')).toBe(true);
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(mockRequest).toHaveBeenLastCalledWith(
      RecordOfficialStatusViewDocument,
      { id: 's1' },
      { auth: true },
    );

    // Idempotent: an id already recorded never posts a second mutation.
    act(() => result.current.recordView('s1'));
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('swallows a recordView mutation failure', async () => {
    mockRequest.mockResolvedValueOnce({ officialStatuses: [] });
    mockRequest.mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => useOfficialStatus());
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));

    act(() => result.current.recordView('s2'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    // The optimistic state stays applied even though the mutation failed.
    expect(result.current.seenIds.has('s2')).toBe(true);
  });
});
