import { renderHook, waitFor } from '@testing-library/react-native';

import { useMyVenues } from '@/hooks/useMyVenues';
import { graphqlRequest } from '@/services/graphql.client';
import { useSelectedVenueStore } from '@/stores/selected-venue.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const VENUES = [
  { id: 'v1', venue_name: 'Hall', city: 'Pune', status: 'APPROVED' },
  { id: 'v2', venue_name: 'Turf', city: 'Goa', status: 'APPROVED' },
];

beforeEach(() => {
  mockRequest.mockReset();
  useSelectedVenueStore.setState({ venueId: null, status: 'ready' });
});

describe('useMyVenues', () => {
  it('loads the venues and lands on the venue picked elsewhere', async () => {
    useSelectedVenueStore.setState({ venueId: 'v2', status: 'ready' });
    mockRequest.mockResolvedValueOnce({ myVenues: VENUES });
    const { result } = renderHook(() => useMyVenues());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.venues).toHaveLength(2);
    expect(result.current).toMatchObject({ venueId: 'v2', error: null });
  });

  it('surfaces a failed load as an error instead of an empty list', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Offline'));
    const { result } = renderHook(() => useMyVenues());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ venues: [], venue: null, error: 'Offline' });
  });
});
