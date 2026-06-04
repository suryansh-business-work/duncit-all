import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useClubDetails, usePodActions, usePodDetails } from '@/hooks/useDetails';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));

const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('usePodDetails / useClubDetails', () => {
  it('loads the pod and the viewer saved flag', async () => {
    mockRequest.mockResolvedValueOnce({ me: { saved_pod_ids: ['p1'] }, pod: { id: 'p1' } });
    const { result } = renderHook(() => usePodDetails('p1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pod?.id).toBe('p1');
    expect(result.current.savedInitially).toBe(true);
  });

  it('handles a missing pod', async () => {
    mockRequest.mockResolvedValueOnce({ me: null, pod: null });
    const { result } = renderHook(() => usePodDetails('x'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pod).toBeNull();
    expect(result.current.savedInitially).toBe(false);
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
