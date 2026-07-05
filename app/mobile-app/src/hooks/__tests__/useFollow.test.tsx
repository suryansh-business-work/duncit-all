import { act, renderHook } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useClubFollow, useFollow } from '@/hooks/useFollow';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('useFollow', () => {
  it('toggles to following and back', async () => {
    const follow = jest.fn().mockResolvedValue(true);
    const unfollow = jest.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useFollow(false, follow, unfollow));
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.following).toBe(true);
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.following).toBe(false);
    expect(unfollow).toHaveBeenCalled();
  });

  it('reverts the optimistic state on failure', async () => {
    const follow = jest.fn().mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useFollow(false, follow, jest.fn()));
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.following).toBe(false);
  });

  it('ignores re-entrant toggles while a request is in flight', async () => {
    let resolveFollow!: (value: boolean) => void;
    const follow = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveFollow = resolve;
        }),
    );
    const { result } = renderHook(() => useFollow(false, follow, jest.fn()));
    act(() => {
      void result.current.toggle();
    });
    await act(async () => {
      await result.current.toggle();
    });
    expect(follow).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveFollow(true);
    });
  });

  it('syncs when the initial value changes', () => {
    const { result, rerender } = renderHook(
      ({ init }: { init: boolean }) => useFollow(init, jest.fn(), jest.fn()),
      { initialProps: { init: false } },
    );
    expect(result.current.following).toBe(false);
    rerender({ init: true });
    expect(result.current.following).toBe(true);
  });
});

describe('useClubFollow', () => {
  it('follows and unfollows a club via the server list', async () => {
    mockRequest.mockResolvedValueOnce({ followClub: { following_club_ids: ['c1'] } });
    const follow = renderHook(() => useClubFollow('c1', false));
    await act(async () => {
      await follow.result.current.toggle();
    });
    expect(follow.result.current.following).toBe(true);

    mockRequest.mockResolvedValueOnce({ unfollowClub: { following_club_ids: [] } });
    const unfollow = renderHook(() => useClubFollow('c1', true));
    await act(async () => {
      await unfollow.result.current.toggle();
    });
    expect(unfollow.result.current.following).toBe(false);
  });
});
