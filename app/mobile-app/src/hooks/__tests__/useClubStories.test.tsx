import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useClubStories } from '@/hooks/useClubStories';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => {
  mockRequest.mockReset();
  jest.useRealTimers();
});

const story = { id: 'cs1', club_id: 'c1', image_url: 'x.jpg' };

describe('useClubStories', () => {
  it("loads a club's live stories", async () => {
    mockRequest.mockResolvedValue({ clubStories: [story] });
    const { result } = renderHook(() => useClubStories('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stories).toEqual([story]);
    expect(mockRequest).toHaveBeenCalledWith(expect.anything(), { clubId: 'c1' }, { auth: true });
  });

  it('keeps the last list when the fetch fails — a poll must never surface an error', async () => {
    mockRequest.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useClubStories('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stories).toEqual([]);
  });

  it('does not fetch without a resolved club id', () => {
    renderHook(() => useClubStories(''));
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('re-polls so a story crossing its 24h boundary disappears', async () => {
    jest.useFakeTimers();
    mockRequest.mockResolvedValue({ clubStories: [story] });
    renderHook(() => useClubStories('c1'));
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(mockRequest.mock.calls.length).toBeGreaterThan(1);
    jest.useRealTimers();
  });

  it('refetches on demand after an upload', async () => {
    mockRequest.mockResolvedValue({ clubStories: [] });
    const { result } = renderHook(() => useClubStories('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const before = mockRequest.mock.calls.length;
    await act(async () => {
      await result.current.refetch();
    });
    expect(mockRequest.mock.calls.length).toBe(before + 1);
  });

  it('stops polling once the screen unmounts', async () => {
    jest.useFakeTimers();
    mockRequest.mockResolvedValue({ clubStories: [] });
    const { unmount } = renderHook(() => useClubStories('c1'));
    unmount();
    const after = mockRequest.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(120_000);
    });
    expect(mockRequest.mock.calls.length).toBe(after);
    jest.useRealTimers();
  });
});
