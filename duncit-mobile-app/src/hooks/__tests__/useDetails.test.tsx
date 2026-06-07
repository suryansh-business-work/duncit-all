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

  it('handles a missing pod', async () => {
    mockRequest.mockResolvedValueOnce({ me: null, pod: null, publicVenues: [], locations: [] });
    const { result } = renderHook(() => usePodDetails('x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pod).toBeNull();
    expect(result.current.savedInitially).toBe(false);
    expect(result.current.venue).toBeNull();
    expect(result.current.location).toBeNull();
  });

  it('loads the club and its pods', async () => {
    mockRequest.mockResolvedValueOnce({ club: { id: 'c1' }, pods: [{ id: 'p1' }] });
    const { result } = renderHook(() => useClubDetails('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.club?.id).toBe('c1');
    expect(result.current.pods).toHaveLength(1);
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
