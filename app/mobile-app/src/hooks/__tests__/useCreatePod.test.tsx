import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useCreatePod } from '@/hooks/useCreatePod';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const options = {
  me: { user_id: 'u1', roles: ['HOST'] },
  clubs: [{ id: 'c1', club_name: 'Runners', meetup_venues_id: [] }],
  myVenues: [
    {
      id: 'v1',
      venue_name: 'Hall',
      city: 'Pune',
      locality: null,
      status: 'APPROVED',
      is_active: true,
    },
    {
      id: 'v2',
      venue_name: 'Old',
      city: 'Pune',
      locality: null,
      status: 'PENDING',
      is_active: true,
    },
    {
      id: 'v3',
      venue_name: 'Off',
      city: 'Pune',
      locality: null,
      status: 'APPROVED',
      is_active: false,
    },
  ],
  availablePodProducts: [{ id: 'p1', product_name: 'Water', unit_cost: 20, available_count: 9 }],
};

beforeEach(() => mockRequest.mockReset());

describe('useCreatePod', () => {
  it('loads options and keeps only approved active venues + products', async () => {
    mockRequest.mockResolvedValueOnce(options);
    const { result } = renderHook(() => useCreatePod());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isHost).toBe(true);
    expect(result.current.clubs).toHaveLength(1);
    expect(result.current.products).toHaveLength(1);
    expect(result.current.venues.map((v) => v.id)).toEqual(['v1']);
    expect(result.current.initialDraftId).toBeNull();
  });

  it('reports non-hosts and survives a failed load', async () => {
    mockRequest.mockResolvedValueOnce({ ...options, me: { user_id: 'u1', roles: [] } });
    const { result } = renderHook(() => useCreatePod());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isHost).toBe(false);

    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result: failed } = renderHook(() => useCreatePod());
    await waitFor(() => expect(failed.current.isLoading).toBe(false));
    expect(failed.current.clubs).toEqual([]);
    expect(failed.current.products).toEqual([]);
  });

  it('hydrates and clamps a resumed draft', async () => {
    mockRequest.mockResolvedValueOnce(options).mockResolvedValueOnce({
      myPodDraft: { id: 'd9', step: 99, payload: JSON.stringify({ pod_title: 'Resumed' }) },
    });
    const { result } = renderHook(() => useCreatePod('d9'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.initialValues.pod_title).toBe('Resumed');
    expect(result.current.initialStep).toBe(7);
    expect(result.current.initialDraftId).toBe('d9');
  });

  it('ignores a missing draft and floors a negative step', async () => {
    mockRequest.mockResolvedValueOnce(options).mockResolvedValueOnce({ myPodDraft: null });
    const { result } = renderHook(() => useCreatePod('gone'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.initialStep).toBe(0);
  });

  it('saves and publishes drafts through the API', async () => {
    mockRequest.mockResolvedValueOnce(options);
    const { result } = renderHook(() => useCreatePod());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRequest.mockResolvedValueOnce({ savePodDraft: { id: 'draft-1' } });
    let id = '';
    await act(async () => {
      id = await result.current.saveDraft(null, {
        payload: '{}',
        pod_title: 'x',
        pod_mode: 'PHYSICAL',
        step: 1,
      });
    });
    expect(id).toBe('draft-1');

    mockRequest.mockResolvedValueOnce({ publishPodDraft: { id: 'pod-9' } });
    await act(async () => {
      await result.current.publish('draft-1', { pod_title: 'x' } as never);
    });
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.anything(),
      { draft_id: 'draft-1', input: { pod_title: 'x' } },
      { auth: true },
    );
  });

  it('ignores results that resolve after unmount', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mockRequest.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { unmount } = renderHook(() => useCreatePod());
    unmount();
    await act(async () => {
      resolve(options);
      await Promise.resolve();
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
