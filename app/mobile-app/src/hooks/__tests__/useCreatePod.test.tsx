import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useCreatePod } from '@/hooks/useCreatePod';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const options = {
  me: { user_id: 'u1', roles: ['HOST'], selected_location_id: 'l2' },
  clubs: [{ id: 'c1', club_name: 'Runners', meetup_venues_id: [] }],
  locations: [
    { id: 'l1', location_name: 'Pune', city: 'Pune' },
    { id: 'l2', location_name: 'Mumbai', city: 'Mumbai' },
  ],
  publicVenues: [
    { id: 'v1', venue_name: 'Hall', location_id: 'l1', is_active: true },
    // Deactivated venue partners never show up in the picker.
    { id: 'v3', venue_name: 'Off', location_id: 'l1', is_active: false },
  ],
  myHost: {
    id: 'h1',
    status: 'APPROVED',
    host_categories: [
      { super_category_name: 'Sports', category_name: 'Running', sub_category_name: 'Trail' },
    ],
  },
  availablePodProducts: [{ id: 'p1', product_name: 'Water', unit_cost: 20, available_count: 9 }],
  publicFinanceSettings: { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '₹' },
};

beforeEach(() => mockRequest.mockReset());

describe('useCreatePod', () => {
  it('loads options, keeps active venue partners and defaults the pod location', async () => {
    mockRequest.mockResolvedValueOnce(options);
    const { result } = renderHook(() => useCreatePod());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isHost).toBe(true);
    expect(result.current.viewerUserId).toBe('u1');
    expect(result.current.clubs).toHaveLength(1);
    expect(result.current.products).toHaveLength(1);
    expect(result.current.venues.map((v) => v.id)).toEqual(['v1']);
    expect(result.current.hostCategories).toHaveLength(1);
    expect(result.current.finance.gst_pct).toBe(18);
    // Fresh pods start in the host's selected location.
    expect(result.current.initialValues.location_id).toBe('l2');
    expect(result.current.initialDraftId).toBeNull();
  });

  it('falls back to the first location when the selected one is unknown', async () => {
    mockRequest.mockResolvedValueOnce({
      ...options,
      me: { ...options.me, selected_location_id: 'gone' },
    });
    const { result } = renderHook(() => useCreatePod());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.initialValues.location_id).toBe('l1');
  });

  it('reports non-hosts, defaults finance when missing, and survives a failed load', async () => {
    mockRequest.mockResolvedValueOnce({
      ...options,
      me: { user_id: 'u1', roles: [], selected_location_id: null },
      // No cached HOST role AND no approved host profile → genuinely not a host.
      myHost: null,
      locations: null,
      publicFinanceSettings: null,
    });
    const { result } = renderHook(() => useCreatePod());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isHost).toBe(false);
    expect(result.current.initialValues.location_id).toBe('');
    expect(result.current.finance.currency_symbol).toBe('₹');

    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result: failed } = renderHook(() => useCreatePod());
    await waitFor(() => expect(failed.current.isLoading).toBe(false));
    expect(failed.current.clubs).toEqual([]);
    expect(failed.current.products).toEqual([]);
    expect(failed.current.hostCategories).toEqual([]);
  });

  it('treats an approved host profile as host access even without the cached HOST role', async () => {
    // Legacy / HOSTREQ-only hosts lack HOST in me.roles but are approved+active.
    mockRequest.mockResolvedValueOnce({
      ...options,
      me: { ...options.me, roles: [] },
      myHost: { id: 'h1', status: 'APPROVED', is_active: true, host_categories: [] },
    });
    const { result } = renderHook(() => useCreatePod());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isHost).toBe(true);
  });

  it('blocks an approved but deactivated host that has no HOST role', async () => {
    mockRequest.mockResolvedValueOnce({
      ...options,
      me: { ...options.me, roles: [] },
      myHost: { id: 'h1', status: 'APPROVED', is_active: false, host_categories: [] },
    });
    const { result } = renderHook(() => useCreatePod());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isHost).toBe(false);
  });

  it('hydrates and clamps a resumed draft', async () => {
    mockRequest.mockResolvedValueOnce(options).mockResolvedValueOnce({
      myPodDraft: { id: 'd9', step: 99, payload: JSON.stringify({ pod_title: 'Resumed' }) },
    });
    const { result } = renderHook(() => useCreatePod('d9'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.initialValues.pod_title).toBe('Resumed');
    expect(result.current.initialStep).toBe(3);
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
