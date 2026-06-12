import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useClubDetails, usePodActions, usePodComments, usePodDetails } from '@/hooks/useDetails';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('usePodDetails / useClubDetails', () => {
  it('loads the pod, the viewer + the resolved venue/location', async () => {
    mockRequest.mockResolvedValueOnce({
      me: { user_id: 'me', saved_pod_ids: ['p1'] },
      pod: { id: 'p1', venue_id: 'v1', location_id: 'l1' },
      publicVenues: [{ id: 'v1', venue_name: 'Hall' }],
      locations: [{ id: 'l1', location_name: 'City' }],
    });
    const { result } = renderHook(() => usePodDetails('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pod?.id).toBe('p1');
    expect(result.current.savedInitially).toBe(true);
    expect(result.current.viewerId).toBe('me');
    expect(result.current.venue?.id).toBe('v1');
    expect(result.current.location?.id).toBe('l1');
  });

  it('loads hosts + attendees public profiles for the avatar group', async () => {
    mockRequest
      .mockResolvedValueOnce({
        me: null,
        pod: { id: 'p1', pod_hosts_id: ['h1'], pod_attendees: ['h1', 'u1'] },
        publicVenues: [],
        locations: [],
      })
      .mockResolvedValueOnce({
        publicUsersByIds: [{ user_id: 'h1', full_name: 'Host', profile_photo: null }],
      });
    const { result } = renderHook(() => usePodDetails('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.people).toHaveLength(1);
    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.anything(),
      { ids: ['h1', 'u1'] },
      { auth: true },
    );
  });

  it('keeps an empty people list when the profile lookup fails', async () => {
    mockRequest
      .mockResolvedValueOnce({
        me: null,
        pod: { id: 'p1', pod_hosts_id: [], pod_attendees: ['u1'] },
        publicVenues: [],
        locations: [],
      })
      .mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => usePodDetails('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.people).toEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it('handles a missing pod', async () => {
    mockRequest.mockResolvedValueOnce({ me: null, pod: null, publicVenues: [], locations: [] });
    const { result } = renderHook(() => usePodDetails('x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pod).toBeNull();
    expect(result.current.savedInitially).toBe(false);
    expect(result.current.venue).toBeNull();
    expect(result.current.location).toBeNull();
  });

  it('loads the club and its pods (no attendees → no member lookup)', async () => {
    mockRequest.mockResolvedValueOnce({
      club: { id: 'c1' },
      pods: [{ id: 'p1', pod_attendees: [] }],
    });
    const { result } = renderHook(() => useClubDetails('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.club?.id).toBe('c1');
    expect(result.current.pods).toHaveLength(1);
    expect(result.current.members).toEqual([]);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('loads club members from its pods and tolerates a lookup failure', async () => {
    mockRequest
      .mockResolvedValueOnce({
        club: { id: 'c1' },
        pods: [{ id: 'p1', pod_attendees: ['u1', 'u2'] }],
      })
      .mockResolvedValueOnce({
        publicUsersByIds: [{ user_id: 'u1', full_name: 'Asha', profile_photo: null }],
      });
    const ok = renderHook(() => useClubDetails('c1'));
    await waitFor(() => expect(ok.result.current.isLoading).toBe(false));
    await waitFor(() => expect(ok.result.current.members).toHaveLength(1));

    mockRequest
      .mockResolvedValueOnce({
        club: { id: 'c1' },
        pods: [{ id: 'p1', pod_attendees: ['u1'] }],
      })
      .mockRejectedValueOnce(new Error('down'));
    const bad = renderHook(() => useClubDetails('c1'));
    await waitFor(() => expect(bad.result.current.isLoading).toBe(false));
    expect(bad.result.current.members).toEqual([]);
    expect(bad.result.current.error).toBeUndefined();
  });

  it('usePodDetails surfaces a load error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => usePodDetails('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });

  it('useClubDetails drops results that land after unmount', async () => {
    // Unmount before the club resolves.
    let resolveClub!: (value: unknown) => void;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolveClub = r;
      }),
    );
    const first = renderHook(() => useClubDetails('c1'));
    first.unmount();
    await act(async () => {
      resolveClub({ club: { id: 'c1' }, pods: [] });
    });

    // Unmount between the club and the member lookup.
    let resolvePeople!: (value: unknown) => void;
    mockRequest
      .mockResolvedValueOnce({ club: { id: 'c1' }, pods: [{ id: 'p1', pod_attendees: ['u1'] }] })
      .mockReturnValueOnce(
        new Promise((r) => {
          resolvePeople = r;
        }),
      );
    const second = renderHook(() => useClubDetails('c1'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(3));
    second.unmount();
    await act(async () => {
      resolvePeople({ publicUsersByIds: [] });
    });
  });

  it('useClubDetails surfaces a load error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useClubDetails('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });
});

describe('usePodActions', () => {
  const pod = { id: 'p1', liked_by_me: false, like_count: 2 } as never;

  it('toggles like and save against the server', async () => {
    mockRequest.mockResolvedValueOnce({ togglePodLike: { liked_by_me: true, like_count: 3 } });
    const { result } = renderHook(() => usePodActions(pod, false));
    await act(async () => {
      await result.current.toggleLike();
    });
    expect(result.current.liked).toBe(true);
    expect(result.current.likeCount).toBe(3);

    mockRequest.mockResolvedValueOnce({ toggleSavedPod: { saved: true } });
    await act(async () => {
      await result.current.toggleSave();
    });
    expect(result.current.saved).toBe(true);
    expect(result.current.savePending).toBe(false);
  });

  it('reverts like on error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => usePodActions(pod, false));
    await act(async () => {
      await result.current.toggleLike();
    });
    expect(result.current.liked).toBe(false);
  });

  it('decrements the count when unliking an already-liked pod', async () => {
    const likedPod = { id: 'p1', liked_by_me: true, like_count: 5 } as never;
    mockRequest.mockResolvedValueOnce({ togglePodLike: { liked_by_me: false, like_count: 4 } });
    const { result } = renderHook(() => usePodActions(likedPod, false));
    await waitFor(() => expect(result.current.liked).toBe(true));
    await act(async () => {
      await result.current.toggleLike();
    });
    expect(result.current.liked).toBe(false);
    expect(result.current.likeCount).toBe(4);
  });

  it('reverts save on error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('x'));
    const { result } = renderHook(() => usePodActions(pod, true));
    await act(async () => {
      await result.current.toggleSave();
    });
    expect(result.current.saved).toBe(true); // reverted back to initial
  });

  it('no-ops when there is no pod', async () => {
    const { result } = renderHook(() => usePodActions(null, false));
    await act(async () => {
      await result.current.toggleLike();
      await result.current.toggleSave();
    });
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

describe('usePodComments', () => {
  it('does not load while closed', () => {
    const { result } = renderHook(() => usePodComments('p1', false));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.comments).toEqual([]);
  });

  it('loads the thread when opened', async () => {
    mockRequest.mockResolvedValueOnce({ podComments: [{ id: 'c1', author_id: 'me', text: 'hi' }] });
    const { result } = renderHook(() => usePodComments('p1', true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.comments).toHaveLength(1);
  });

  it('surfaces a load error', async () => {
    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => usePodComments('p1', true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('boom');
  });

  it('prepends an added comment', async () => {
    mockRequest.mockResolvedValueOnce({ podComments: [] });
    const { result } = renderHook(() => usePodComments('p1', true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockRequest.mockResolvedValueOnce({ addPodComment: { id: 'c2', author_id: 'me', text: 'yo' } });
    await act(async () => {
      await result.current.add('yo');
    });
    expect(result.current.comments[0]?.id).toBe('c2');
  });

  it('removes a comment', async () => {
    mockRequest.mockResolvedValueOnce({ podComments: [{ id: 'c1', author_id: 'me', text: 'hi' }] });
    const { result } = renderHook(() => usePodComments('p1', true));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockRequest.mockResolvedValueOnce(true);
    await act(async () => {
      await result.current.remove('c1');
    });
    expect(result.current.comments).toHaveLength(0);
  });
});
