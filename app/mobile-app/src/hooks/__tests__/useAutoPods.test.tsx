import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  ClubAdminAutoPodsDocument,
  HostAutoPodsDocument,
  VenueAutoPodsDocument,
} from '@/graphql/auto-pods';
import { useAutoPods } from '@/hooks/useAutoPods';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const node = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  stage: 'OPEN',
  pod_mode: 'PHYSICAL',
  sub_category_id: 'sub-1',
  pod_images_and_videos: [{ url: 'https://img/1.jpg', type: 'IMAGE' }],
  ...extra,
});

beforeEach(() => mockRequest.mockReset());

describe('useAutoPods', () => {
  it('reads the venue queue with the owner venue and normalises the row', async () => {
    mockRequest.mockResolvedValue({
      venueAutoPods: [
        node('a1', {
          venue_claim: { venue_id: 'v1' },
          location: { id: 'l1', bound_by: 'CITY' },
        }),
      ],
    });
    const { result } = renderHook(() =>
      useAutoPods('venue', { locationId: 'loc-1', venueId: 'v1' }),
    );
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockRequest.mock.calls[0][0]).toBe(VenueAutoPodsDocument);
    // The picked venue narrows the queue server-side.
    expect(mockRequest.mock.calls[0][1]).toEqual({ location_id: 'loc-1', venue_id: 'v1' });
    const row = result.current.rows[0] ?? ({} as Partial<(typeof result.current.rows)[number]>);
    expect(row.venue_claim).toMatchObject({ venue_id: 'v1', pod_end_date_time: null });
    expect(row.host_claim).toBeNull();
    expect(row.club_claim).toBeNull();
    expect(row.expires_at).toBeNull();
    expect(row.withdraw_penalty_points).toBeNull();
    expect(row.location).toMatchObject({ bound_by: 'CITY' });
    expect(row.pod_images_and_videos).toEqual([{ url: 'https://img/1.jpg', type: 'IMAGE' }]);
  });

  it('sends null for an empty selection and a sub-category for a host', async () => {
    mockRequest.mockResolvedValue({ hostAutoPods: [node('h1')] });
    const { result } = renderHook(() => useAutoPods('host', { subCategoryId: 'sub-9' }));
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(mockRequest.mock.calls[0][0]).toBe(HostAutoPodsDocument);
    expect(mockRequest.mock.calls[0][1]).toEqual({ location_id: null, sub_category_id: 'sub-9' });
    expect(result.current.rows[0]?.venue_claim).toBeNull();
    expect(result.current.rows[0]?.location).toBeNull();
  });

  it('reads the club admin queue', async () => {
    mockRequest.mockResolvedValue({ clubAdminAutoPods: [node('c1'), node('c2')] });
    const { result } = renderHook(() => useAutoPods('club_admin' as never));
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(mockRequest.mock.calls[0][0]).toBe(ClubAdminAutoPodsDocument);
    expect(mockRequest.mock.calls[0][1]).toEqual({ location_id: null });
  });

  it('flags an error when the queue cannot be read', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useAutoPods('host'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasError).toBe(true);
    expect(result.current.rows).toEqual([]);
  });

  it('refetch re-reads and clears the error once the server answers', async () => {
    mockRequest.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useAutoPods('host'));
    await waitFor(() => expect(result.current.hasError).toBe(true));
    mockRequest.mockResolvedValue({ hostAutoPods: [node('h1')] });
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.hasError).toBe(false);
  });

  it('refetch flags a failure without losing the rows already shown', async () => {
    mockRequest.mockResolvedValueOnce({ hostAutoPods: [node('h1')] });
    const { result } = renderHook(() => useAutoPods('host'));
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    mockRequest.mockRejectedValue(new Error('flaky'));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.rows).toHaveLength(1);
  });

  it('re-reads when the city changes', async () => {
    mockRequest.mockResolvedValue({ hostAutoPods: [] });
    const { rerender } = renderHook(
      ({ loc }: { loc: string }) => useAutoPods('host', { locationId: loc }),
      { initialProps: { loc: 'a' } },
    );
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    rerender({ loc: 'b' });
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(mockRequest.mock.calls[1][1]).toMatchObject({ location_id: 'b' });
  });
});
