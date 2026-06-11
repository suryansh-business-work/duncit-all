import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useCreatePod } from '@/hooks/useCreatePod';
import { blankCreatePodForm } from '@/components/create-pod/create-pod.types';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const options = {
  myHost: { id: 'h1', status: 'APPROVED' },
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
};

beforeEach(() => mockRequest.mockReset());

describe('useCreatePod', () => {
  it('loads options and keeps only approved active venues', async () => {
    mockRequest.mockResolvedValueOnce(options);
    const { result } = renderHook(() => useCreatePod());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isApprovedHost).toBe(true);
    expect(result.current.clubs).toHaveLength(1);
    expect(result.current.venues.map((v) => v.id)).toEqual(['v1']);
  });

  it('reports non-hosts and survives a failed load', async () => {
    mockRequest.mockResolvedValueOnce({ ...options, myHost: null });
    const { result } = renderHook(() => useCreatePod());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isApprovedHost).toBe(false);

    mockRequest.mockRejectedValueOnce(new Error('boom'));
    const { result: failed } = renderHook(() => useCreatePod());
    await waitFor(() => expect(failed.current.isLoading).toBe(false));
    expect(failed.current.clubs).toEqual([]);
  });

  it('creates a pod from form values and returns the new id', async () => {
    mockRequest.mockResolvedValueOnce(options);
    const { result } = renderHook(() => useCreatePod());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockRequest.mockResolvedValueOnce({ createPartnerPod: { id: 'pod-9' } });
    let id = '';
    await act(async () => {
      id = await result.current.create({
        ...blankCreatePodForm,
        pod_title: 'Hike',
        club_id: 'c1',
        venue_id: 'v1',
        pod_description: 'A relaxed group hike.',
        pod_date_time_text: '2030-01-01 10:00',
      });
    });
    expect(id).toBe('pod-9');
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.anything(),
      { input: expect.objectContaining({ pod_title: 'Hike', club_id: 'c1' }) },
      { auth: true },
    );
  });
});
